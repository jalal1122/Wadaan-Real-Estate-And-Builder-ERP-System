import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { JournalService } from '../services/journal.service';

export interface BrokerageSplitResult {
  wadaanRevenue: Decimal;
  escrowLiability: Decimal;
}

export class RevenueSplitUtility {
  /**
   * Pure math calculation: splits total deal value into Wadaan Commission Revenue
   * and Seller Escrow Liability.
   */
  static calculateBrokerageSplit(
    totalValue: Decimal | number | string,
    commissionAmount: Decimal | number | string
  ): BrokerageSplitResult {
    const total = new Decimal(totalValue);
    const commission = new Decimal(commissionAmount);

    if (total.lessThan(0)) {
      throw new AppError('Total deal value cannot be negative', 400, 'INVALID_DEAL_VALUE');
    }

    if (commission.lessThan(0)) {
      throw new AppError('Commission amount cannot be negative', 400, 'INVALID_COMMISSION');
    }

    if (commission.greaterThan(total)) {
      throw new AppError(
        'Commission amount cannot exceed total deal value',
        400,
        'INVALID_COMMISSION_SPLIT'
      );
    }

    const escrowLiability = total.minus(commission);

    return {
      wadaanRevenue: commission,
      escrowLiability
    };
  }
}

export class WalletManager {
  /**
   * Applies an advance from a customer's wallet balance toward a specific DealInvoice.
   * Decrements customer.walletBalance.
   * Updates dealInvoice status (PAID if fully paid, PARTIAL if partially paid).
   * Posts journal entry:
   *   DR Customer Advances (2100) [Liability decreases]
   *   CR Accounts Receivable (1100) [Asset decreases]
   */
  static async consumeAdvance(
    customerId: string,
    amount: Decimal | number | string,
    invoiceId: string,
    tx: Prisma.TransactionClient,
    customNarration?: string
  ): Promise<{ walletBalanceRemaining: Decimal; invoicePaid: boolean }> {
    const decAmount = new Decimal(amount);
    if (decAmount.lessThanOrEqualTo(0)) {
      throw new AppError('Amount to consume must be greater than zero', 400, 'INVALID_WALLET_AMOUNT');
    }

    const customer = await tx.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      throw new AppError(`Customer with ID '${customerId}' not found`, 404, 'CUSTOMER_NOT_FOUND');
    }

    if (new Decimal(customer.walletBalance).lessThan(decAmount)) {
      throw new AppError(
        `Insufficient customer wallet balance. Available: Rs. ${customer.walletBalance}, Requested: Rs. ${decAmount}`,
        400,
        'INSUFFICIENT_WALLET_BALANCE'
      );
    }

    const invoice = await tx.dealInvoice.findUnique({
      where: { id: invoiceId },
      include: { deal: true }
    });

    if (!invoice) {
      throw new AppError(`Invoice with ID '${invoiceId}' not found`, 404, 'INVOICE_NOT_FOUND');
    }

    if (invoice.deal.customerId !== customerId) {
      throw new AppError('Invoice does not belong to the specified customer', 400, 'CUSTOMER_MISMATCH');
    }

    if (invoice.paymentStatus === 'PAID') {
      throw new AppError('Invoice is already fully paid', 400, 'INVOICE_ALREADY_PAID');
    }

    const invoiceAmount = new Decimal(invoice.amount);
    const currentPaid = new Decimal(invoice.paidAmount || 0);
    const remainingBalance = invoiceAmount.minus(currentPaid);

    if (decAmount.greaterThan(remainingBalance)) {
      throw new AppError(
        `Consumption amount (Rs. ${decAmount}) cannot exceed remaining invoice amount (Rs. ${remainingBalance})`,
        400,
        'EXCEEDS_INVOICE_AMOUNT'
      );
    }

    // Lookup 2100 (Customer Advances) and 1100 (Accounts Receivable)
    const walletAccount = await tx.account.findUnique({
      where: { accountCode: '2100' }
    });
    const arAccount = await tx.account.findUnique({
      where: { accountCode: '1100' }
    });

    if (!walletAccount || !arAccount) {
      throw new AppError('System accounts (2100 or 1100) not initialized', 500, 'SYSTEM_ACCOUNTS_MISSING');
    }

    // 1. Post GL Journal Entry: DR 2100 / CR 1100
    await JournalService.postEntry(
      {
        description: customNarration || `Wallet Advance applied to invoice ${invoice.description} (Deal ${invoice.dealId})`,
        entryDate: new Date().toISOString(),
        lines: [
          {
            accountId: walletAccount.id,
            debitAmount: decAmount,
            creditAmount: new Decimal(0)
          },
          {
            accountId: arAccount.id,
            debitAmount: new Decimal(0),
            creditAmount: decAmount
          }
        ]
      },
      tx,
      { skipLockCheck: true }
    );

    // 2. Decrement Customer wallet balance
    const updatedCustomer = await tx.customer.update({
      where: { id: customerId },
      data: {
        walletBalance: { decrement: decAmount }
      }
    });

    // 3. Update Invoice status & paidAmount
    const newPaidAmount = currentPaid.plus(decAmount);
    const isFullyPaid = newPaidAmount.greaterThanOrEqualTo(invoiceAmount);
    await tx.dealInvoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: newPaidAmount,
        paymentStatus: isFullyPaid ? 'PAID' : 'PARTIAL'
      }
    });

    return {
      walletBalanceRemaining: new Decimal(updatedCustomer.walletBalance),
      invoicePaid: isFullyPaid
    };
  }
}
