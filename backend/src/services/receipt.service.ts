import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { CreateReceiptInput } from '../utils/validation.util';
import { JournalService } from './journal.service';

export class ReceiptService {
  /**
   * Logs physical money crossing the desk (CASH, CHEQUE, ONLINE).
   * - CASH: Instantly CLEARED. Invoices set to PAID. GL posted immediately.
   * - CHEQUE/ONLINE: Enters Waiting Room with status PENDING.
   *   Invoices set to PENDING_CLEARANCE. NO GL posted until bank settlement.
   * - Overpayment: Excess amount is safely routed to Customer.walletBalance (CR Customer Advances 2100).
   */
  static async logInflow(data: CreateReceiptInput) {
    return prisma.$transaction(
      async (tx) => {
        // 1. Verify customer exists
        const customer = await tx.customer.findUnique({
          where: { id: data.customerId }
        });
        if (!customer) {
          throw new AppError(`Customer with ID '${data.customerId}' not found`, 404, 'CUSTOMER_NOT_FOUND');
        }

        const receiptAmount = new Decimal(data.amount);

        // 2. Validate and sum invoices if provided
        let invoices: any[] = [];
        let invoiceSum = new Decimal(0);

        if (data.invoiceIds && data.invoiceIds.length > 0) {
          invoices = await tx.dealInvoice.findMany({
            where: { id: { in: data.invoiceIds } },
            include: { deal: true }
          });

          if (invoices.length !== data.invoiceIds.length) {
            throw new AppError('One or more requested invoices do not exist', 404, 'INVOICE_NOT_FOUND');
          }

          for (const inv of invoices) {
            if (inv.deal.customerId !== data.customerId) {
              throw new AppError(
                `Invoice '${inv.description}' does not belong to customer '${customer.fullName}'`,
                400,
                'INVOICE_CUSTOMER_MISMATCH'
              );
            }
            if (inv.paymentStatus === 'PAID') {
              throw new AppError(
                `Invoice '${inv.description}' has already been paid`,
                400,
                'INVOICE_ALREADY_PAID'
              );
            }
            if (inv.paymentStatus === 'PENDING_CLEARANCE') {
              throw new AppError(
                `Invoice '${inv.description}' is already awaiting bank clearance from a previous receipt`,
                400,
                'INVOICE_ALREADY_PENDING'
              );
            }
          }

          invoiceSum = invoices.reduce(
            (sum, inv) => sum.plus(new Decimal(inv.amount)),
            new Decimal(0)
          );

          if (receiptAmount.lessThan(invoiceSum)) {
            throw new AppError(
              `Receipt amount (Rs. ${receiptAmount}) cannot be less than total invoice amount (Rs. ${invoiceSum})`,
              400,
              'UNDERPAYMENT_NOT_ALLOWED'
            );
          }
        }

        const excess = receiptAmount.minus(invoiceSum);

        // 3. Method Branching
        if (data.paymentMethod === 'CASH') {
          // A. Create CLEARED Receipt
          const receipt = await tx.receipt.create({
            data: {
              customerId: data.customerId,
              amount: receiptAmount,
              paymentMethod: 'CASH',
              bankRefNumber: data.bankRefNumber || null,
              clearanceStatus: 'CLEARED'
            }
          });

          // B. Settle linked invoices
          if (data.invoiceIds && data.invoiceIds.length > 0) {
            await tx.dealInvoice.updateMany({
              where: { id: { in: data.invoiceIds } },
              data: {
                paymentStatus: 'PAID',
                receiptId: receipt.id
              }
            });
          }

          // C. Inject excess into customer wallet if overpaid
          if (excess.gt(0)) {
            await tx.customer.update({
              where: { id: data.customerId },
              data: {
                walletBalance: { increment: excess }
              }
            });
          }

          // D. Resolve Cash Account for Debit
          let cashAccountId = data.targetAccountId;
          if (!cashAccountId) {
            const defaultCash = await tx.account.findFirst({
              where: {
                category: 'ASSET',
                isSystemLocked: false
              },
              orderBy: { accountCode: 'asc' }
            });
            if (!defaultCash) {
              throw new AppError('No asset cash/bank account found to receive cash payment', 500, 'NO_CASH_ACCOUNT');
            }
            cashAccountId = defaultCash.id;
          }

          // E. GL Double-Entry Posting
          const journalLines: { accountId: string; debitAmount: Decimal; creditAmount: Decimal }[] = [
            {
              accountId: cashAccountId,
              debitAmount: receiptAmount,
              creditAmount: new Decimal(0)
            }
          ];

          if (invoiceSum.gt(0)) {
            const arAccount = await tx.account.findUnique({ where: { accountCode: '1100' } });
            if (!arAccount) {
              throw new AppError('System account 1100 (AR) not initialized', 500, 'SYSTEM_ACCOUNTS_MISSING');
            }
            journalLines.push({
              accountId: arAccount.id,
              debitAmount: new Decimal(0),
              creditAmount: invoiceSum
            });
          }

          if (excess.gt(0)) {
            const walletAccount = await tx.account.findUnique({ where: { accountCode: '2100' } });
            if (!walletAccount) {
              throw new AppError('System account 2100 (Customer Advances) not initialized', 500, 'SYSTEM_ACCOUNTS_MISSING');
            }
            journalLines.push({
              accountId: walletAccount.id,
              debitAmount: new Decimal(0),
              creditAmount: excess
            });
          }

          await JournalService.postEntry(
            {
              description: `Cash Receipt from ${customer.fullName} (Settled: Rs. ${invoiceSum}, Advance: Rs. ${excess})`,
              entryDate: new Date().toISOString(),
              lines: journalLines
            },
            tx,
            { skipLockCheck: true }
          );

          return {
            receipt,
            status: 'CLEARED',
            invoicesPaid: invoices.length,
            excessInjectedToWallet: excess
          };
        } else {
          // CHEQUE or ONLINE -> WAITING ROOM
          // A. Create PENDING Receipt
          const receipt = await tx.receipt.create({
            data: {
              customerId: data.customerId,
              amount: receiptAmount,
              paymentMethod: data.paymentMethod,
              bankRefNumber: data.bankRefNumber,
              clearanceStatus: 'PENDING'
            }
          });

          // B. Set linked invoices to PENDING_CLEARANCE
          if (data.invoiceIds && data.invoiceIds.length > 0) {
            await tx.dealInvoice.updateMany({
              where: { id: { in: data.invoiceIds } },
              data: {
                paymentStatus: 'PENDING_CLEARANCE',
                receiptId: receipt.id
              }
            });
          }

          // C. NO JOURNAL ENTRY IS CREATED YET
          return {
            receipt,
            status: 'PENDING',
            invoicesPendingClearance: invoices.length,
            message: 'Payment logged to Cheque Waiting Room. General Ledger remains untouched until bank clearance.'
          };
        }
      },
      { maxWait: 10000, timeout: 30000 }
    );
  }

  /**
   * Confirms bank settlement, moving money from "Waiting" into the live General Ledger.
   * Screen 9 (The Cash & Cheque Gateway).
   */
  static async settlePendingCheque(receiptId: string, targetBankAccountId: string) {
    return prisma.$transaction(
      async (tx) => {
        // 1. Verify receipt is PENDING
        const receipt = await tx.receipt.findUnique({
          where: { id: receiptId },
          include: { customer: true }
        });

        if (!receipt) {
          throw new AppError(`Receipt with ID '${receiptId}' not found`, 404, 'RECEIPT_NOT_FOUND');
        }

        if (receipt.clearanceStatus !== 'PENDING') {
          throw new AppError(
            `Receipt cannot be cleared because current status is '${receipt.clearanceStatus}'`,
            400,
            'RECEIPT_NOT_PENDING'
          );
        }

        // 2. Verify target bank account is a valid ASSET account
        const bankAccount = await tx.account.findUnique({
          where: { id: targetBankAccountId }
        });

        if (!bankAccount || bankAccount.category !== 'ASSET') {
          throw new AppError('targetBankAccountId must be a valid ASSET account', 400, 'INVALID_BANK_ACCOUNT');
        }

        // 3. Mark Receipt as CLEARED
        const updatedReceipt = await tx.receipt.update({
          where: { id: receiptId },
          data: {
            clearanceStatus: 'CLEARED'
          }
        });

        // 4. Find all DealInvoices tied to this receipt marked PENDING_CLEARANCE
        const linkedInvoices = await tx.dealInvoice.findMany({
          where: {
            receiptId,
            paymentStatus: 'PENDING_CLEARANCE'
          }
        });

        const invoiceSum = linkedInvoices.reduce(
          (sum, inv) => sum.plus(new Decimal(inv.amount)),
          new Decimal(0)
        );

        const receiptAmount = new Decimal(receipt.amount);
        const excess = receiptAmount.minus(invoiceSum);

        // 5. Mark linked invoices as PAID
        if (linkedInvoices.length > 0) {
          await tx.dealInvoice.updateMany({
            where: {
              receiptId,
              paymentStatus: 'PENDING_CLEARANCE'
            },
            data: {
              paymentStatus: 'PAID'
            }
          });
        }

        // 6. Inject excess into Customer wallet if overpaid
        if (excess.gt(0)) {
          await tx.customer.update({
            where: { id: receipt.customerId },
            data: {
              walletBalance: { increment: excess }
            }
          });
        }

        // 7. Post GL Double-Entry Journal Entry
        const journalLines: { accountId: string; debitAmount: Decimal; creditAmount: Decimal }[] = [
          {
            accountId: targetBankAccountId,
            debitAmount: receiptAmount,
            creditAmount: new Decimal(0)
          }
        ];

        if (invoiceSum.gt(0)) {
          const arAccount = await tx.account.findUnique({ where: { accountCode: '1100' } });
          if (!arAccount) {
            throw new AppError('System account 1100 (AR) not initialized', 500, 'SYSTEM_ACCOUNTS_MISSING');
          }
          journalLines.push({
            accountId: arAccount.id,
            debitAmount: new Decimal(0),
            creditAmount: invoiceSum
          });
        }

        if (excess.gt(0)) {
          const walletAccount = await tx.account.findUnique({ where: { accountCode: '2100' } });
          if (!walletAccount) {
            throw new AppError('System account 2100 (Customer Advances) not initialized', 500, 'SYSTEM_ACCOUNTS_MISSING');
          }
          journalLines.push({
            accountId: walletAccount.id,
            debitAmount: new Decimal(0),
            creditAmount: excess
          });
        }

        const journalEntry = await JournalService.postEntry(
          {
            description: `Cheque Cleared: ${receipt.paymentMethod} (Ref: ${receipt.bankRefNumber || 'N/A'}) from ${receipt.customer.fullName}`,
            entryDate: new Date().toISOString(),
            lines: journalLines
          },
          tx,
          { skipLockCheck: true }
        );

        return {
          receipt: updatedReceipt,
          clearedInvoicesCount: linkedInvoices.length,
          settledAmount: invoiceSum,
          excessInjectedToWallet: excess,
          journalEntry
        };
      },
      { maxWait: 10000, timeout: 30000 }
    );
  }

  /**
   * Rejects a dishonored cheque without destroying the accounting ledgers.
   * Invoices revert from PENDING_CLEARANCE to UNPAID.
   * No journal entry was ever made, so no GL reversal needed.
   */
  static async bounceCheque(receiptId: string) {
    return prisma.$transaction(
      async (tx) => {
        const receipt = await tx.receipt.findUnique({
          where: { id: receiptId }
        });

        if (!receipt) {
          throw new AppError(`Receipt with ID '${receiptId}' not found`, 404, 'RECEIPT_NOT_FOUND');
        }

        if (receipt.clearanceStatus !== 'PENDING') {
          throw new AppError(
            `Cannot bounce receipt with status '${receipt.clearanceStatus}'. Must be PENDING.`,
            400,
            'RECEIPT_NOT_PENDING'
          );
        }

        // Revert linked invoices from PENDING_CLEARANCE back to UNPAID and unlink receiptId
        await tx.dealInvoice.updateMany({
          where: {
            receiptId,
            paymentStatus: 'PENDING_CLEARANCE'
          },
          data: {
            paymentStatus: 'UNPAID',
            receiptId: null
          }
        });

        // Set Receipt to BOUNCED
        const updatedReceipt = await tx.receipt.update({
          where: { id: receiptId },
          data: {
            clearanceStatus: 'BOUNCED'
          }
        });

        return {
          receipt: updatedReceipt,
          message: 'Cheque marked as BOUNCED. Linked invoices reverted to UNPAID. Ledgers untouched.'
        };
      },
      { maxWait: 10000, timeout: 30000 }
    );
  }

  /**
   * Fetches all receipts currently in the Cheque Waiting Room (clearanceStatus === 'PENDING').
   */
  static async getWaitingRoom() {
    return prisma.receipt.findMany({
      where: { clearanceStatus: 'PENDING' },
      include: {
        customer: true,
        invoices: {
          include: {
            deal: true
          }
        }
      },
      orderBy: { receiptDate: 'asc' }
    });
  }
}
