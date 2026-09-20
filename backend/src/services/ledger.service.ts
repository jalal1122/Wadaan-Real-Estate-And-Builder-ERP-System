import Decimal from 'decimal.js';
import { AccountCategory } from '@prisma/client';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { FiscalYearUtility } from '../utils/fiscal.util';

export interface LedgerTransactionRow {
  id: string;
  journalId: string;
  entryNumber: string;
  entryDate: Date;
  description: string;
  debitAmount: string;
  creditAmount: string;
  runningBalance: string;
}

export interface LedgerStatement {
  account: {
    id: string;
    accountCode: string;
    accountName: string;
    category: AccountCategory;
    isSystemLocked: boolean;
  };
  filter: {
    startDate: Date;
    endDate: Date;
  };
  openingBalance: string;
  closingBalance: string;
  totalDebits: string;
  totalCredits: string;
  transactions: LedgerTransactionRow[];
}

export class LedgerService {
  /**
   * Generates a chronological ledger statement for an account.
   *
   * Algorithm:
   * 1. Calculates the opening balance prior to `startDate`.
   * 2. Fetches all transactions within the `[startDate, endDate]` range ordered chronologically.
   * 3. Calculates the incremental running balance according to standard accounting conventions:
   *    - ASSET / EXPENSE: balance += (debit - credit)
   *    - LIABILITY / EQUITY / REVENUE: balance += (credit - debit)
   */
  static async generateChronologicalLedger(
    accountId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<LedgerStatement> {
    // 1. Verify account existence (supports either UUID id or accountCode)
    const account = await prisma.account.findFirst({
      where: {
        OR: [{ id: accountId }, { accountCode: accountId }]
      }
    });

    if (!account) {
      throw new AppError(`Account '${accountId}' not found.`, 404, 'ACCOUNT_NOT_FOUND');
    }

    const resolvedAccountId = account.id;

    // Default dates: current active fiscal year boundary
    const defaultBoundaries = FiscalYearUtility.getCurrentBoundary();
    const effectiveStartDate = startDate || defaultBoundaries.startDate;
    const effectiveEndDate = endDate || new Date(); // up to current time or supplied end date

    const isDebitNormal =
      account.category === AccountCategory.ASSET ||
      account.category === AccountCategory.EXPENSE;

    // 2. Step 1: Calculate Opening Balance (all transactions strictly before startDate)
    const priorLines = await prisma.journalLine.findMany({
      where: {
        accountId: resolvedAccountId,
        journal: {
          entryDate: {
            lt: effectiveStartDate
          }
        }
      },
      select: {
        debitAmount: true,
        creditAmount: true
      }
    });

    let openingBalance = new Decimal(0);
    for (const line of priorLines) {
      const debit = new Decimal(line.debitAmount.toString());
      const credit = new Decimal(line.creditAmount.toString());

      if (isDebitNormal) {
        openingBalance = openingBalance.plus(debit).minus(credit);
      } else {
        openingBalance = openingBalance.plus(credit).minus(debit);
      }
    }

    // 3. Step 2: Fetch transactions within the specified date range
    const periodLines = await prisma.journalLine.findMany({
      where: {
        accountId: resolvedAccountId,
        journal: {
          entryDate: {
            gte: effectiveStartDate,
            lte: effectiveEndDate
          }
        }
      },
      include: {
        journal: {
          select: {
            id: true,
            entryNumber: true,
            entryDate: true,
            description: true
          }
        }
      },
      orderBy: [
        {
          journal: {
            entryDate: 'asc'
          }
        },
        {
          id: 'asc'
        }
      ]
    });

    // 4. Step 3: Compute running totals
    let currentBalance = new Decimal(openingBalance);
    let totalDebits = new Decimal(0);
    let totalCredits = new Decimal(0);

    const transactionRows: LedgerTransactionRow[] = [];

    for (const line of periodLines) {
      const debit = new Decimal(line.debitAmount.toString());
      const credit = new Decimal(line.creditAmount.toString());

      totalDebits = totalDebits.plus(debit);
      totalCredits = totalCredits.plus(credit);

      if (isDebitNormal) {
        currentBalance = currentBalance.plus(debit).minus(credit);
      } else {
        currentBalance = currentBalance.plus(credit).minus(debit);
      }

      transactionRows.push({
        id: line.id,
        journalId: line.journal.id,
        entryNumber: line.journal.entryNumber,
        entryDate: line.journal.entryDate,
        description: line.journal.description,
        debitAmount: debit.toFixed(2),
        creditAmount: credit.toFixed(2),
        runningBalance: currentBalance.toFixed(2)
      });
    }

    return {
      account: {
        id: account.id,
        accountCode: account.accountCode,
        accountName: account.accountName,
        category: account.category,
        isSystemLocked: account.isSystemLocked
      },
      filter: {
        startDate: effectiveStartDate,
        endDate: effectiveEndDate
      },
      openingBalance: openingBalance.toFixed(2),
      closingBalance: currentBalance.toFixed(2),
      totalDebits: totalDebits.toFixed(2),
      totalCredits: totalCredits.toFixed(2),
      transactions: transactionRows
    };
  }
}
