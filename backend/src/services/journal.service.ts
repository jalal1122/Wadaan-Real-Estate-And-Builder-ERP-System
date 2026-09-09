import Decimal from 'decimal.js';
import { Prisma, JournalEntry } from '@prisma/client';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import {
  CreateJournalInput,
  DoubleEntryValidator
} from '../utils/validation.util';

export class JournalService {
  /**
   * Posts a new double-entry manual journal voucher.
   *
   * Rules:
   * 1. Validates zero-sum: SUM(Debits) === SUM(Credits).
   * 2. Guards against modifying system-locked accounts (AP, WIP, Escrow, etc.).
   * 3. Generates a strictly sequential JV-XXXX voucher code.
   * 4. Supports external transactions (tx) for atomic cross-module operations.
   */
  static async postEntry(
    payload: CreateJournalInput,
    tx?: Prisma.TransactionClient,
    options?: { skipLockCheck?: boolean }
  ): Promise<JournalEntry> {
    const execute = async (client: Prisma.TransactionClient) => {
      // 1. Double-entry zero-sum mathematical validation
      DoubleEntryValidator.validate(payload.lines);

      // 2. Extract unique targeted account IDs
      const targetAccountIds = Array.from(
        new Set(payload.lines.map((line) => line.accountId))
      );

      // 3. Verify targeted accounts and enforce the System Lock Guard
      const accounts = await client.account.findMany({
        where: { id: { in: targetAccountIds } }
      });

      if (accounts.length !== targetAccountIds.length) {
        throw new AppError(
          'One or more specified accounts do not exist.',
          404,
          'ACCOUNT_NOT_FOUND'
        );
      }

      if (!options?.skipLockCheck) {
        for (const account of accounts) {
          if (account.isSystemLocked) {
            throw new AppError(
              `Account '${account.accountName}' (${account.accountCode}) is system-locked. Manual adjustments to this account are prohibited.`,
              403,
              'ERR_SYSTEM_ACCOUNT_LOCKED'
            );
          }
        }
      }

      // 4. Generate sequential voucher number (JV-XXXX)
      const count = await client.journalEntry.count();
      let nextNumber = count + 1;
      let entryNumber = `JV-${nextNumber.toString().padStart(4, '0')}`;

      // In case of any collision, find first unused sequence number
      let existing = await client.journalEntry.findUnique({
        where: { entryNumber }
      });
      while (existing) {
        nextNumber++;
        entryNumber = `JV-${nextNumber.toString().padStart(4, '0')}`;
        existing = await client.journalEntry.findUnique({
          where: { entryNumber }
        });
      }

      // 5. Create Journal Entry and Lines
      const createdEntry = await client.journalEntry.create({
        data: {
          entryNumber,
          entryDate: payload.entryDate ? new Date(payload.entryDate) : new Date(),
          description: payload.description,
          lines: {
            create: payload.lines.map((l) => ({
              accountId: l.accountId,
              debitAmount: new Decimal(l.debitAmount || 0),
              creditAmount: new Decimal(l.creditAmount || 0),
              memo: l.memo ?? null,
              customerId: l.customerId ?? null,
              vendorId: l.vendorId ?? null,
              projectId: l.projectId ?? null
            }))
          }
        },
        include: {
          lines: {
            include: {
              account: true
            }
          }
        }
      });

      return createdEntry;
    };

    if (tx) {
      return execute(tx);
    }

    return prisma.$transaction(async (innerTx) => {
      return execute(innerTx);
    });
  }

  /**
   * Reverses an existing journal entry by swapping debits and credits.
   * Never deletes records; creates a mirror entry with "[REVERSAL]" prefixed.
   */
  static async reverseEntry(journalId: string): Promise<JournalEntry> {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch original entry with all lines
      const original = await tx.journalEntry.findUnique({
        where: { id: journalId },
        include: { lines: true }
      });

      if (!original) {
        throw new AppError(
          `Journal entry with ID '${journalId}' not found.`,
          404,
          'NOT_FOUND'
        );
      }

      // 2. Generate sequential voucher number for reversal
      const count = await tx.journalEntry.count();
      let nextNumber = count + 1;
      let entryNumber = `JV-${nextNumber.toString().padStart(4, '0')}`;

      let existing = await tx.journalEntry.findUnique({
        where: { entryNumber }
      });
      while (existing) {
        nextNumber++;
        entryNumber = `JV-${nextNumber.toString().padStart(4, '0')}`;
        existing = await tx.journalEntry.findUnique({
          where: { entryNumber }
        });
      }

      // 3. Create reversal entry with inverted debits and credits
      const reversedLines = original.lines.map((line) => ({
        accountId: line.accountId,
        debitAmount: line.creditAmount, // Inverted: credit becomes debit
        creditAmount: line.debitAmount  // Inverted: debit becomes credit
      }));

      // Validate zero-sum on reversed lines
      DoubleEntryValidator.validate(reversedLines);

      const reversalEntry = await tx.journalEntry.create({
        data: {
          entryNumber,
          entryDate: new Date(),
          description: `[REVERSAL] ${original.description}`,
          lines: {
            create: reversedLines.map((l) => ({
              accountId: l.accountId,
              debitAmount: l.debitAmount,
              creditAmount: l.creditAmount
            }))
          }
        },
        include: {
          lines: {
            include: {
              account: true
            }
          }
        }
      });

      return reversalEntry;
    });
  }

  /**
   * Retrieves a paginated list of all journal entries, newest first.
   * Used by Screen 2 Journal Entry list view.
   */
  static async getEntries(
    page: number = 1,
    limit: number = 20
  ): Promise<{ entries: JournalEntry[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      prisma.journalEntry.findMany({
        skip,
        take: limit,
        orderBy: { entryDate: 'desc' },
        include: {
          lines: {
            include: {
              account: true,
              customer: { select: { id: true, fullName: true } },
              vendor: { select: { id: true, vendorName: true } },
              project: { select: { id: true, projectName: true } }
            }
          }
        }
      }),
      prisma.journalEntry.count()
    ]);

    return { entries, total, page, limit };
  }
}
