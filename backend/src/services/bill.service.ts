import Decimal from 'decimal.js';
import { PaymentStatus, PaymentType } from '@prisma/client';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { CreateBillInput } from '../utils/validation.util';
import { JournalService } from './journal.service';

export interface BillFilter {
  vendorId?: string;
  projectId?: string;
  paymentStatus?: PaymentStatus;
}

export class BillService {
  /**
   * Creates an Expense Bill (Screen 5) with automatic WIP vs Expense routing,
   * budget overrun calculation, and immediate GL double-entry posting.
   */
  static async createBill(data: CreateBillInput) {
    // 1. Verify vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: data.vendorId }
    });

    if (!vendor) {
      throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
    }

    // 2. Anti-duplicate check: [vendorId, invoiceNumber]
    const existingBill = await prisma.expenseBill.findUnique({
      where: {
        vendorId_invoiceNumber: {
          vendorId: data.vendorId,
          invoiceNumber: data.invoiceNumber
        }
      }
    });

    if (existingBill) {
      throw new AppError(
        `Invoice number '${data.invoiceNumber}' already exists for this vendor`,
        409,
        'DUPLICATE_INVOICE'
      );
    }

    // 3. Line items computation
    let calculatedGrandTotal = new Decimal(0);
    const lineItemsData = data.lineItems.map((item) => {
      const qty = Number(item.quantity);
      const unitPrice = new Decimal(item.unitPrice);
      const lineTotal = unitPrice.times(qty);
      calculatedGrandTotal = calculatedGrandTotal.plus(lineTotal);

      return {
        description: item.description,
        quantity: qty,
        unitPrice,
        lineTotal
      };
    });

    if (calculatedGrandTotal.lte(0)) {
      throw new AppError(
        'Grand total of the bill must be greater than 0',
        400,
        'INVALID_BILL_AMOUNT'
      );
    }

    // 4. Project and Capitalization (WIP vs Expense) Routing
    let project = null;
    let isOverBudget = false;
    let overBudgetAmount = new Decimal(0);

    if (data.projectId) {
      project = await prisma.project.findUnique({
        where: { id: data.projectId },
        include: { expenseBills: true }
      });

      if (!project) {
        throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
      }

      // Check budget overrun
      const currentSpent = project.expenseBills.reduce(
        (sum, b) => sum.plus(new Decimal(b.grandTotal)),
        new Decimal(0)
      );
      const newTotalSpent = currentSpent.plus(calculatedGrandTotal);
      const masterBOQ = new Decimal(project.masterBOQ);

      if (newTotalSpent.gt(masterBOQ)) {
        isOverBudget = true;
        overBudgetAmount = newTotalSpent.minus(masterBOQ);
      }
    }

    // 5. Determine payment status and pending amount
    const paymentStatus: PaymentStatus =
      data.paymentType === 'DIRECT_CASH' ? PaymentStatus.PAID : PaymentStatus.UNPAID;
    const pendingAmount =
      data.paymentType === 'DIRECT_CASH' ? new Decimal(0) : calculatedGrandTotal;

    const billDate = data.billDate ? new Date(data.billDate) : new Date();

    // 6. Execute atomic creation and GL posting
    return await prisma.$transaction(async (tx) => {
      // Find debit account: 1200 (WIP) for project, 5000 (COGS/Expense) for overhead
      const debitAccountCode = data.projectId ? '1200' : '5000';
      const debitAccount = await tx.account.findUnique({
        where: { accountCode: debitAccountCode }
      });

      if (!debitAccount) {
        throw new AppError(
          `GL Account ${debitAccountCode} not configured in system`,
          500,
          'ACCOUNT_CONFIG_ERROR'
        );
      }

      // Find credit account: 2000 (AP) for ACCOUNTS_PAYABLE, or sourceAccountId for DIRECT_CASH
      let creditAccountId: string;
      if (data.paymentType === 'ACCOUNTS_PAYABLE') {
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
        creditAccountId = apAccount.id;
      } else {
        // DIRECT_CASH
        const cashAccount = await tx.account.findUnique({
          where: { id: data.sourceAccountId! }
        });
        if (!cashAccount) {
          throw new AppError(
            'Source cash/bank account does not exist',
            404,
            'ACCOUNT_NOT_FOUND'
          );
        }
        creditAccountId = cashAccount.id;
      }

      // Create ExpenseBill with line items
      const bill = await tx.expenseBill.create({
        data: {
          vendorId: data.vendorId,
          projectId: data.projectId || null,
          invoiceNumber: data.invoiceNumber,
          billDate,
          paymentType: data.paymentType as PaymentType,
          paymentStatus,
          grandTotal: calculatedGrandTotal,
          pendingAmount,
          lineItems: {
            create: lineItemsData
          }
        },
        include: {
          lineItems: true,
          vendor: true,
          project: true
        }
      });

      // Post double-entry journal entry with skipLockCheck: true
      const journalDescription = data.projectId
        ? `Expense for Project: ${project?.projectName} (Invoice: ${data.invoiceNumber})`
        : `Office Overhead Expense (Invoice: ${data.invoiceNumber})`;

      const journalEntry = await JournalService.postEntry(
        {
          entryDate: billDate.toISOString(),
          description: journalDescription,
          lines: [
            {
              accountId: debitAccount.id,
              debitAmount: calculatedGrandTotal,
              creditAmount: new Decimal(0)
            },
            {
              accountId: creditAccountId,
              debitAmount: new Decimal(0),
              creditAmount: calculatedGrandTotal
            }
          ]
        },
        tx,
        { skipLockCheck: true }
      );

      return {
        bill,
        isOverBudget,
        overBudgetAmount,
        journalEntry
      };
    }, { maxWait: 10000, timeout: 30000 });
  }

  /**
   * Fetches all bills with optional filtering.
   */
  static async getAllBills(filter?: BillFilter) {
    const where: any = {};
    if (filter?.vendorId) where.vendorId = filter.vendorId;
    if (filter?.projectId) where.projectId = filter.projectId;
    if (filter?.paymentStatus) where.paymentStatus = filter.paymentStatus;

    return await prisma.expenseBill.findMany({
      where,
      include: {
        vendor: true,
        project: true,
        lineItems: true
      },
      orderBy: { billDate: 'desc' }
    });
  }

  /**
   * Fetches a single bill by ID.
   */
  static async getBillById(id: string) {
    const bill = await prisma.expenseBill.findUnique({
      where: { id },
      include: {
        vendor: true,
        project: true,
        lineItems: true
      }
    });

    if (!bill) {
      throw new AppError('Bill not found', 404, 'BILL_NOT_FOUND');
    }

    return bill;
  }
}
