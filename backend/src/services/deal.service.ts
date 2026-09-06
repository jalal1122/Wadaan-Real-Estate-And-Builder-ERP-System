import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { CreateDealInput, TransferFileInput } from '../utils/validation.util';
import { RevenueSplitUtility } from '../utils/revenue.util';
import { JournalService } from './journal.service';

export class DealService {
  /**
   * Initializes a new financial contract (Sale, Construction, or Brokerage).
   * Runs inside a database transaction with timeout safeguards.
   * Posts double-entry journal entries:
   *   - WADAAN_SALE / CONSTRUCTION: DR AR (1100) / CR Revenue (4000)
   *   - BROKERAGE: DR AR (1100) / CR Revenue (4000) [Commission] + CR Escrow Holdings (2200) [Seller funds]
   */
  static async initializeContract(data: CreateDealInput) {
    return prisma.$transaction(
      async (tx) => {
        // 1. Validate customer exists
        const customer = await tx.customer.findUnique({
          where: { id: data.customerId }
        });
        if (!customer) {
          throw new AppError(`Customer with ID '${data.customerId}' not found`, 404, 'CUSTOMER_NOT_FOUND');
        }

        // 2. Validate project exists and is ACTIVE if provided
        if (data.projectId) {
          const project = await tx.project.findUnique({
            where: { id: data.projectId }
          });
          if (!project) {
            throw new AppError(`Project with ID '${data.projectId}' not found`, 404, 'PROJECT_NOT_FOUND');
          }
          if (project.status === 'COMPLETED' || project.status === 'SUSPENDED') {
            throw new AppError(
              `Cannot attach a deal to a project with status '${project.status}'. Project must be ACTIVE.`,
              400,
              'PROJECT_NOT_ACTIVE'
            );
          }
        }

        // 3. Mathematical validation: sum of invoices must equal totalValue
        const totalValue = new Decimal(data.totalValue);
        const invoicesSum = data.invoices.reduce(
          (sum, inv) => sum.plus(new Decimal(inv.amount)),
          new Decimal(0)
        );

        if (!totalValue.equals(invoicesSum)) {
          throw new AppError(
            `Invoice total (Rs. ${invoicesSum}) must equal total contract value (Rs. ${totalValue}) exactly`,
            400,
            'INVOICES_SUM_MISMATCH'
          );
        }

        // 4. Brokerage validation & splitting
        let commissionDecimal: Decimal | null = null;
        let brokerageSplit: { wadaanRevenue: Decimal; escrowLiability: Decimal } | null = null;

        if (data.dealType === 'BROKERAGE') {
          if (data.commissionAmount === undefined || data.commissionAmount === null) {
            throw new AppError(
              'commissionAmount is required for BROKERAGE contracts',
              400,
              'COMMISSION_REQUIRED'
            );
          }
          commissionDecimal = new Decimal(data.commissionAmount);
          brokerageSplit = RevenueSplitUtility.calculateBrokerageSplit(totalValue, commissionDecimal);
        }

        // 5. Create Deal record with nested DealInvoices
        const deal = await tx.deal.create({
          data: {
            customerId: data.customerId,
            projectId: data.projectId || null,
            dealType: data.dealType,
            totalValue,
            commissionAmount: commissionDecimal,
            invoices: {
              create: data.invoices.map((inv) => ({
                description: inv.description,
                amount: new Decimal(inv.amount),
                dueDate: new Date(inv.dueDate),
                paymentStatus: 'UNPAID'
              }))
            }
          },
          include: {
            customer: true,
            project: true,
            invoices: true
          }
        });

        // 6. Post Double-Entry Journal Entry
        const arAccount = await tx.account.findUnique({ where: { accountCode: '1100' } });
        const revenueAccount = await tx.account.findUnique({ where: { accountCode: '4000' } });

        if (!arAccount || !revenueAccount) {
          throw new AppError('System accounts (1100 or 4000) not initialized', 500, 'SYSTEM_ACCOUNTS_MISSING');
        }

        if (data.dealType === 'BROKERAGE' && brokerageSplit) {
          const escrowAccount = await tx.account.findUnique({ where: { accountCode: '2200' } });
          if (!escrowAccount) {
            throw new AppError('System account 2200 (Escrow Holdings) not initialized', 500, 'SYSTEM_ACCOUNTS_MISSING');
          }

          await JournalService.postEntry(
            {
              description: `Contract Initialized: BROKERAGE deal for ${customer.fullName} (Revenue: Rs. ${brokerageSplit.wadaanRevenue}, Escrow: Rs. ${brokerageSplit.escrowLiability})`,
              entryDate: new Date().toISOString(),
              lines: [
                {
                  accountId: arAccount.id,
                  debitAmount: totalValue,
                  creditAmount: new Decimal(0)
                },
                {
                  accountId: revenueAccount.id,
                  debitAmount: new Decimal(0),
                  creditAmount: brokerageSplit.wadaanRevenue
                },
                {
                  accountId: escrowAccount.id,
                  debitAmount: new Decimal(0),
                  creditAmount: brokerageSplit.escrowLiability
                }
              ]
            },
            tx,
            { skipLockCheck: true }
          );
        } else {
          await JournalService.postEntry(
            {
              description: `Contract Initialized: ${deal.dealType} deal for ${customer.fullName} (Total: Rs. ${totalValue})`,
              entryDate: new Date().toISOString(),
              lines: [
                {
                  accountId: arAccount.id,
                  debitAmount: totalValue,
                  creditAmount: new Decimal(0)
                },
                {
                  accountId: revenueAccount.id,
                  debitAmount: new Decimal(0),
                  creditAmount: totalValue
                }
              ]
            },
            tx,
            { skipLockCheck: true }
          );
        }

        return deal;
      },
      { maxWait: 10000, timeout: 30000 }
    );
  }

  /**
   * Fetches master deal grid with dynamically calculated pending balances.
   */
  static async getAllDeals() {
    const deals = await prisma.deal.findMany({
      include: {
        customer: true,
        project: true,
        invoices: {
          include: {
            receipt: true
          },
          orderBy: { dueDate: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return deals.map((deal) => {
      const pendingBalance = deal.invoices
        .filter((inv) => inv.paymentStatus !== 'PAID')
        .reduce((sum, inv) => sum.plus(new Decimal(inv.amount)), new Decimal(0));

      return {
        ...deal,
        pendingBalance
      };
    });
  }

  /**
   * Fetches single deal with dynamic pending balance.
   */
  static async getDealById(id: string) {
    const deal = await prisma.deal.findUnique({
      where: { id },
      include: {
        customer: true,
        project: true,
        invoices: {
          include: {
            receipt: true
          },
          orderBy: { dueDate: 'asc' }
        }
      }
    });

    if (!deal) {
      throw new AppError(`Deal with ID '${id}' not found`, 404, 'DEAL_NOT_FOUND');
    }

    const pendingBalance = deal.invoices
      .filter((inv) => inv.paymentStatus !== 'PAID')
      .reduce((sum, inv) => sum.plus(new Decimal(inv.amount)), new Decimal(0));

    return {
      ...deal,
      pendingBalance
    };
  }

  /**
   * Executes the File Transfer (Resale) logic.
   * Reassigns an active Deal to a new client.
   * Guardrail: Rejects with ERR_PENDING_FUNDS_LOCKED if any invoice is PENDING_CLEARANCE.
   * Adds an invoice for the transfer fee and routes to Wadaan Revenue (4000).
   */
  static async executeFileTransfer(dealId: string, data: TransferFileInput) {
    return prisma.$transaction(
      async (tx) => {
        const deal = await tx.deal.findUnique({
          where: { id: dealId },
          include: {
            customer: true,
            invoices: true
          }
        });

        if (!deal) {
          throw new AppError(`Deal with ID '${dealId}' not found`, 404, 'DEAL_NOT_FOUND');
        }

        if (deal.customerId === data.newCustomerId) {
          throw new AppError('Cannot transfer file to the existing owner', 400, 'SAME_CUSTOMER_TRANSFER');
        }

        const newCustomer = await tx.customer.findUnique({
          where: { id: data.newCustomerId }
        });

        if (!newCustomer) {
          throw new AppError(`Target customer with ID '${data.newCustomerId}' not found`, 404, 'NEW_CUSTOMER_NOT_FOUND');
        }

        // GUARD: Cannot transfer file while a cheque or payment is pending clearance
        const pendingInvoice = deal.invoices.find((inv) => inv.paymentStatus === 'PENDING_CLEARANCE');
        if (pendingInvoice) {
          throw new AppError(
            'Cannot transfer file while a cheque or payment is pending clearance. Please clear or bounce the pending receipt first.',
            400,
            'ERR_PENDING_FUNDS_LOCKED'
          );
        }

        const oldCustomerName = deal.customer.fullName;

        // 1. Reassign Deal customerId
        const updatedDeal = await tx.deal.update({
          where: { id: dealId },
          data: {
            customerId: data.newCustomerId
          },
          include: {
            customer: true,
            project: true,
            invoices: true
          }
        });

        // 2. Process Transfer Fee (if any)
        const feeAmount = new Decimal(data.transferFeeAmount || 0);
        let feeInvoice = null;

        if (feeAmount.gt(0)) {
          feeInvoice = await tx.dealInvoice.create({
            data: {
              dealId,
              description: `File Transfer Fee (from ${oldCustomerName} to ${newCustomer.fullName})`,
              amount: feeAmount,
              dueDate: new Date(),
              paymentStatus: 'UNPAID'
            }
          });

          // Update deal totalValue
          await tx.deal.update({
            where: { id: dealId },
            data: {
              totalValue: { increment: feeAmount }
            }
          });

          // GL Journal Entry: DR AR (1100) / CR Revenue (4000)
          const arAccount = await tx.account.findUnique({ where: { accountCode: '1100' } });
          const revenueAccount = await tx.account.findUnique({ where: { accountCode: '4000' } });

          if (!arAccount || !revenueAccount) {
            throw new AppError('System accounts (1100 or 4000) not initialized', 500, 'SYSTEM_ACCOUNTS_MISSING');
          }

          await JournalService.postEntry(
            {
              description: `File Transfer Fee: Deal ${dealId} transferred from ${oldCustomerName} to ${newCustomer.fullName}`,
              entryDate: new Date().toISOString(),
              lines: [
                {
                  accountId: arAccount.id,
                  debitAmount: feeAmount,
                  creditAmount: new Decimal(0)
                },
                {
                  accountId: revenueAccount.id,
                  debitAmount: new Decimal(0),
                  creditAmount: feeAmount
                }
              ]
            },
            tx,
            { skipLockCheck: true }
          );
        }

        return {
          deal: updatedDeal,
          previousCustomerId: deal.customerId,
          previousCustomerName: oldCustomerName,
          newCustomer: {
            id: newCustomer.id,
            fullName: newCustomer.fullName
          },
          feeInvoice
        };
      },
      { maxWait: 10000, timeout: 30000 }
    );
  }
}
