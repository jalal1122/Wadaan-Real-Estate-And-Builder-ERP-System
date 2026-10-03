import Decimal from 'decimal.js';
import { PaymentStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { CreatePaymentInput, UpdatePaymentInput } from '../utils/validation.util';
import { JournalService } from './journal.service';
import { bustCache } from '../utils/cache.util';

export interface SettledBillReport {
  billId: string;
  invoiceNumber: string;
  amountApplied: Decimal;
  previousPending: Decimal;
  newPending: Decimal;
  status: PaymentStatus;
}

export class FifoService {
  /**
   * Processes a vendor payment run via strict First-In-First-Out (FIFO) waterfall.
   * Decrements pending balances, updates payment statuses, records VendorPayment,
   * and posts balancing double-entry journal (Debit AP 2000, Credit Source Bank/Cash).
   */
  static async processPaymentRun(data: CreatePaymentInput) {
    const isSelective = !!(data.invoiceAllocations && data.invoiceAllocations.length > 0);
    const totalPayment = isSelective
      ? data.invoiceAllocations!.reduce(
          (sum, item) => sum.plus(new Decimal(item.amount)),
          new Decimal(0)
        )
      : new Decimal(data.amountPaid!);

    if (totalPayment.lte(0)) {
      throw new AppError(
        'Payment amount must be greater than zero',
        400,
        'INVALID_PAYMENT_AMOUNT'
      );
    }

    // 1. Verify vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: data.vendorId }
    });

    if (!vendor) {
      throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
    }

    // 2. Verify source account exists
    const sourceAccount = await prisma.account.findUnique({
      where: { id: data.sourceAccountId }
    });

    if (!sourceAccount) {
      throw new AppError(
        'Source cash/bank account not found',
        404,
        'ACCOUNT_NOT_FOUND'
      );
    }

    // 3. Execute atomic payment run in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Find AP account (2000)
      const apAccount = await tx.account.findUnique({
        where: { accountCode: '2000' }
      });

      if (!apAccount) {
        throw new AppError(
          'Accounts Payable (2000) account not configured in system',
          500,
          'ACCOUNT_CONFIG_ERROR'
        );
      }

      const settledBills: SettledBillReport[] = [];
      let totalRemainingOutstanding = new Decimal(0);

      if (isSelective) {
        // Selective invoice settlement
        for (const allocation of data.invoiceAllocations!) {
          const allocAmt = new Decimal(allocation.amount);
          if (allocAmt.lte(0)) continue;

          const bill = await tx.expenseBill.findUnique({
            where: { id: allocation.billId }
          });

          if (!bill || bill.vendorId !== data.vendorId) {
            throw new AppError(
              `Bill ${allocation.billId} not found or does not belong to this vendor`,
              400,
              'BILL_NOT_FOUND'
            );
          }

          const billPending = new Decimal(bill.pendingAmount);
          if (allocAmt.gt(billPending)) {
            throw new AppError(
              `Allocation amount (${allocAmt.toFixed(2)}) exceeds pending amount (${billPending.toFixed(2)}) for invoice ${bill.invoiceNumber}`,
              400,
              'ALLOCATION_EXCEEDS_BILL_PENDING'
            );
          }

          const newPending = billPending.minus(allocAmt);
          const newStatus: PaymentStatus = newPending.isZero()
            ? PaymentStatus.PAID
            : PaymentStatus.PARTIAL;

          await tx.expenseBill.update({
            where: { id: bill.id },
            data: {
              pendingAmount: newPending,
              paymentStatus: newStatus
            }
          });

          settledBills.push({
            billId: bill.id,
            invoiceNumber: bill.invoiceNumber,
            amountApplied: allocAmt,
            previousPending: billPending,
            newPending,
            status: newStatus
          });
        }

        const remainingUnpaidBills = await tx.expenseBill.findMany({
          where: {
            vendorId: data.vendorId,
            paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
            pendingAmount: { gt: 0 }
          }
        });

        totalRemainingOutstanding = remainingUnpaidBills.reduce(
          (sum, b) => sum.plus(new Decimal(b.pendingAmount)),
          new Decimal(0)
        );
      } else {
        // Strict FIFO waterfall allocation across all unpaid bills
        const unpaidBills = await tx.expenseBill.findMany({
          where: {
            vendorId: data.vendorId,
            paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
            pendingAmount: { gt: 0 }
          },
          orderBy: [
            { billDate: 'asc' },
            { id: 'asc' }
          ]
        });

        const totalOutstanding = unpaidBills.reduce(
          (sum, b) => sum.plus(new Decimal(b.pendingAmount)),
          new Decimal(0)
        );

        // Overpayment guard
        if (totalPayment.gt(totalOutstanding)) {
          throw new AppError(
            `Payment amount (${totalPayment.toFixed(2)}) exceeds total outstanding payable balance (${totalOutstanding.toFixed(2)}) for this vendor`,
            400,
            'PAYMENT_EXCEEDS_OUTSTANDING'
          );
        }

        let remainingPool = new Decimal(totalPayment);

        for (const bill of unpaidBills) {
          if (remainingPool.isZero()) break;

          const billPending = new Decimal(bill.pendingAmount);
          const deduct = Decimal.min(remainingPool, billPending);
          const newPending = billPending.minus(deduct);
          const newStatus: PaymentStatus = newPending.isZero()
            ? PaymentStatus.PAID
            : PaymentStatus.PARTIAL;

          await tx.expenseBill.update({
            where: { id: bill.id },
            data: {
              pendingAmount: newPending,
              paymentStatus: newStatus
            }
          });

          settledBills.push({
            billId: bill.id,
            invoiceNumber: bill.invoiceNumber,
            amountApplied: deduct,
            previousPending: billPending,
            newPending,
            status: newStatus
          });

          remainingPool = remainingPool.minus(deduct);
        }

        totalRemainingOutstanding = totalOutstanding.minus(totalPayment);
      }

      const paymentDate = data.paymentDate ? new Date(data.paymentDate) : new Date();

      // Create VendorPayment record
      const payment = await tx.vendorPayment.create({
        data: {
          vendorId: data.vendorId,
          sourceAccountId: data.sourceAccountId,
          amountPaid: totalPayment,
          chequeRef: data.chequeRef || null,
          transactionId: data.transactionId || null,
          paymentDate
        },
        include: {
          vendor: true
        }
      });

      // Post double-entry journal entry: Debit AP (2000), Credit Cash/Bank (sourceAccountId)
      const refNote = data.transactionId
        ? ` (Online: ${data.transactionId})`
        : data.chequeRef
        ? ` (Cheque: ${data.chequeRef})`
        : '';
      const journalDescription = `Vendor Payment to ${vendor.vendorName}${refNote}`;

      const journalEntry = await JournalService.postEntry(
        {
          entryDate: paymentDate.toISOString(),
          description: journalDescription,
          lines: [
            {
              accountId: apAccount.id,
              debitAmount: totalPayment,
              creditAmount: new Decimal(0)
            },
            {
              accountId: sourceAccount.id,
              debitAmount: new Decimal(0),
              creditAmount: totalPayment
            }
          ]
        },
        tx,
        { skipLockCheck: true }
      );

      return {
        payment,
        settledBills,
        journalEntry,
        totalSettled: totalPayment,
        remainingVendorOutstanding: totalRemainingOutstanding
      };
    }, { maxWait: 10000, timeout: 30000 });

    bustCache('reports');
    bustCache('accounts');
    bustCache('ledger');
    bustCache('projects');
    bustCache('deals');
    bustCache('vendors');
    bustCache('journals');
    return result;
  }

  /**
   * Fetches payment history with optional vendor filtering.
   */
  static async getAllPayments(vendorId?: string) {
    const where: any = {};
    if (vendorId) where.vendorId = vendorId;

    return await prisma.vendorPayment.findMany({
      where,
      include: {
        vendor: true
      },
      orderBy: { paymentDate: 'desc' }
    });
  }

  /**
   * Fetches single payment detail by ID.
   */
  static async getPaymentById(id: string) {
    const payment = await prisma.vendorPayment.findUnique({
      where: { id },
      include: {
        vendor: true
      }
    });

    if (!payment) {
      throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
    }

    return payment;
  }

  /**
   * Updates a posted Vendor Payment.
   * Supports modifying paymentDate, sourceAccountId (disbursement safe/bank),
   * chequeRef / transactionId, and amountPaid.
   * Synchronizes the linked General Ledger journal entry and adjusts bill pending balances.
   */
  static async updatePayment(id: string, data: UpdatePaymentInput) {
    const existingPayment = await prisma.vendorPayment.findUnique({
      where: { id },
      include: { vendor: true }
    });

    if (!existingPayment) {
      throw new AppError(`Vendor payment with ID '${id}' not found`, 404, 'PAYMENT_NOT_FOUND');
    }

    if (data.sourceAccountId) {
      const acc = await prisma.account.findUnique({ where: { id: data.sourceAccountId } });
      if (!acc) {
        throw new AppError('Source account not found', 404, 'ACCOUNT_NOT_FOUND');
      }
      if (acc.category !== 'ASSET') {
        throw new AppError('Source account must be an ASSET account', 400, 'INVALID_ACCOUNT_CATEGORY');
      }
    }

    const updatedDate = data.paymentDate ? new Date(data.paymentDate) : existingPayment.paymentDate;
    const updatedSourceAccountId = data.sourceAccountId || existingPayment.sourceAccountId;
    const updatedChequeRef = data.chequeRef !== undefined ? data.chequeRef : existingPayment.chequeRef;
    const updatedTransactionId = data.transactionId !== undefined ? data.transactionId : existingPayment.transactionId;
    const oldAmount = new Decimal(existingPayment.amountPaid);
    const newAmount = data.amountPaid !== undefined ? new Decimal(data.amountPaid) : oldAmount;
    const diff = newAmount.minus(oldAmount);

    const result = await prisma.$transaction(async (tx) => {
      // If amount changed:
      if (diff.gt(0)) {
        // Paying more: apply diff to oldest unpaid bills for this vendor
        let pool = new Decimal(diff);
        const unpaidBills = await tx.expenseBill.findMany({
          where: {
            vendorId: existingPayment.vendorId,
            pendingAmount: { gt: 0 }
          },
          orderBy: { billDate: 'asc' }
        });

        for (const bill of unpaidBills) {
          if (pool.lte(0)) break;
          const pending = new Decimal(bill.pendingAmount);
          const deduct = Decimal.min(pool, pending);
          const remainingPending = pending.minus(deduct);
          const status = remainingPending.eq(0) ? PaymentStatus.PAID : PaymentStatus.PARTIAL;

          await tx.expenseBill.update({
            where: { id: bill.id },
            data: {
              pendingAmount: remainingPending,
              paymentStatus: status
            }
          });
          pool = pool.minus(deduct);
        }
      } else if (diff.lt(0)) {
        // Paying less: restore abs(diff) to the most recently settled bills for this vendor
        let returnPool = diff.abs();
        const settledBills = await tx.expenseBill.findMany({
          where: {
            vendorId: existingPayment.vendorId
          },
          orderBy: { billDate: 'desc' }
        });

        for (const bill of settledBills) {
          if (returnPool.lte(0)) break;
          const grandTotal = new Decimal(bill.grandTotal);
          const pending = new Decimal(bill.pendingAmount);
          const roomToRestore = grandTotal.minus(pending);
          if (roomToRestore.lte(0)) continue;

          const restore = Decimal.min(returnPool, roomToRestore);
          const newPending = pending.plus(restore);
          const status = newPending.eq(grandTotal)
            ? PaymentStatus.UNPAID
            : PaymentStatus.PARTIAL;

          await tx.expenseBill.update({
            where: { id: bill.id },
            data: {
              pendingAmount: newPending,
              paymentStatus: status
            }
          });
          returnPool = returnPool.minus(restore);
        }
      }

      // Update payment record
      const updatedPayment = await tx.vendorPayment.update({
        where: { id },
        data: {
          paymentDate: updatedDate,
          sourceAccountId: updatedSourceAccountId,
          chequeRef: updatedChequeRef,
          transactionId: updatedTransactionId,
          amountPaid: newAmount
        },
        include: {
          vendor: true
        }
      });

      // Synchronize linked Journal Entry
      const linkedJournal = await tx.journalEntry.findFirst({
        where: {
          description: {
            contains: `Vendor Payment to ${existingPayment.vendor.vendorName}`
          },
          lines: {
            some: {
              accountId: existingPayment.sourceAccountId,
              creditAmount: oldAmount
            }
          }
        },
        include: {
          lines: true
        }
      });

      if (linkedJournal) {
        const refNote = updatedTransactionId
          ? ` (Online: ${updatedTransactionId})`
          : updatedChequeRef
          ? ` (Cheque: ${updatedChequeRef})`
          : '';
        const newJournalDesc = `Vendor Payment to ${existingPayment.vendor.vendorName}${refNote}`;

        await tx.journalEntry.update({
          where: { id: linkedJournal.id },
          data: {
            entryDate: updatedDate,
            description: newJournalDesc
          }
        });

        for (const line of linkedJournal.lines) {
          const isDebit = new Decimal(line.debitAmount).gt(0);
          if (isDebit) {
            // Debit line: AP 2000
            await tx.journalLine.update({
              where: { id: line.id },
              data: {
                debitAmount: newAmount
              }
            });
          } else {
            // Credit line: Source account
            await tx.journalLine.update({
              where: { id: line.id },
              data: {
                accountId: updatedSourceAccountId,
                creditAmount: newAmount
              }
            });
          }
        }
      }

      return updatedPayment;
    }, { maxWait: 10000, timeout: 30000 });

    bustCache('bills');
    bustCache('vendors');
    bustCache('reports');
    bustCache('accounts');
    bustCache('ledger');
    bustCache('journals');
    return result;
  }
}
