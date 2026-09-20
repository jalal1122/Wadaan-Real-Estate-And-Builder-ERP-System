import Decimal from 'decimal.js';
import { PaymentStatus } from '@prisma/client';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { CreatePaymentInput } from '../utils/validation.util';
import { JournalService } from './journal.service';

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
    return await prisma.$transaction(async (tx) => {
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
}
