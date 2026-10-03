import Decimal from 'decimal.js';
import { PaymentStatus, PaymentType } from '@prisma/client';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { CreateBillInput, UpdateBillInput } from '../utils/validation.util';
import { JournalService } from './journal.service';
import { bustCache, getCache, setCache } from '../utils/cache.util';

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
    const createdBillResult = await prisma.$transaction(async (tx) => {
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
      let journalDescription = data.projectId
        ? `Expense for Project: ${project?.projectName} (Invoice: ${data.invoiceNumber})`
        : `Office Overhead Expense (Invoice: ${data.invoiceNumber})`;

      if (data.transactionRef) {
        journalDescription += ` [Trx Ref: ${data.transactionRef}]`;
      }

      const journalEntry = await JournalService.postEntry(
        {
          entryDate: billDate.toISOString(),
          description: journalDescription,
          lines: [
            {
              accountId: debitAccount.id,
              debitAmount: calculatedGrandTotal,
              creditAmount: new Decimal(0),
              projectId: data.projectId || null,
              vendorId: data.vendorId || null
            },
            {
              accountId: creditAccountId,
              debitAmount: new Decimal(0),
              creditAmount: calculatedGrandTotal,
              projectId: data.projectId || null,
              vendorId: data.vendorId || null
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

    bustCache('projects');
    bustCache('deals');
    bustCache('reports');
    bustCache('accounts');
    bustCache('ledger');
    bustCache('journals');
    bustCache('bills');
    return createdBillResult;
  }

  /**
   * Fetches all bills with optional filtering.
   */
  static async getAllBills(filter?: BillFilter) {
    const CACHE_KEY = `bills:all:${JSON.stringify(filter || {})}`;
    const cached = getCache<any>(CACHE_KEY);
    if (cached) return cached;

    const where: any = {};
    if (filter?.vendorId) where.vendorId = filter.vendorId;
    if (filter?.projectId) where.projectId = filter.projectId;
    if (filter?.paymentStatus) where.paymentStatus = filter.paymentStatus;

    const results = await prisma.expenseBill.findMany({
      where,
      include: {
        vendor: true,
        project: true,
        lineItems: true
      },
      orderBy: { billDate: 'desc' }
    });

    setCache(CACHE_KEY, results, 60_000);
    return results;
  }

  /**
   * Fetches a single bill by ID.
   */
  static async getBillById(id: string) {
    const CACHE_KEY = `bills:${id}`;
    const cached = getCache<any>(CACHE_KEY);
    if (cached) return cached;

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

    setCache(CACHE_KEY, bill, 60_000);
    return bill;
  }

  /**
   * Updates a posted Expense Bill.
   * Supports modifying invoiceNumber, billDate, project allocation (WIP vs Overhead),
   * and line items / amounts.
   * Synchronizes the linked double-entry General Ledger journal entry so WIP, overhead,
   * and AP balances remain 100% accurate.
   */
  static async updateBill(id: string, data: UpdateBillInput) {
    const existingBill = await prisma.expenseBill.findUnique({
      where: { id },
      include: {
        lineItems: true,
        vendor: true,
        project: true
      }
    });

    if (!existingBill) {
      throw new AppError(`Expense bill with ID '${id}' not found`, 404, 'BILL_NOT_FOUND');
    }

    // 1. Check invoiceNumber uniqueness if changed
    if (data.invoiceNumber && data.invoiceNumber !== existingBill.invoiceNumber) {
      const duplicate = await prisma.expenseBill.findUnique({
        where: {
          vendorId_invoiceNumber: {
            vendorId: existingBill.vendorId,
            invoiceNumber: data.invoiceNumber
          }
        }
      });
      if (duplicate && duplicate.id !== id) {
        throw new AppError(
          `Invoice number '${data.invoiceNumber}' already exists for this vendor`,
          409,
          'DUPLICATE_INVOICE'
        );
      }
    }

    // 2. Check project existence if changing project
    let newProject = existingBill.project;
    if (data.projectId !== undefined) {
      if (data.projectId) {
        newProject = await prisma.project.findUnique({
          where: { id: data.projectId }
        });
        if (!newProject) {
          throw new AppError('Target project not found', 404, 'PROJECT_NOT_FOUND');
        }
      } else {
        newProject = null;
      }
    }

    // 3. Compute line items and grand total if line items are updated
    let newGrandTotal = new Decimal(existingBill.grandTotal);
    let newPendingAmount = new Decimal(existingBill.pendingAmount);
    let newPaymentStatus = existingBill.paymentStatus;
    let lineItemsData: any[] | null = null;

    if (data.lineItems && data.lineItems.length > 0) {
      let calculatedTotal = new Decimal(0);
      lineItemsData = data.lineItems.map((item) => {
        const qty = Number(item.quantity);
        const unitPrice = new Decimal(item.unitPrice);
        const lineTotal = unitPrice.times(qty);
        calculatedTotal = calculatedTotal.plus(lineTotal);
        return {
          description: item.description,
          quantity: qty,
          unitPrice,
          lineTotal
        };
      });

      if (calculatedTotal.lte(0)) {
        throw new AppError('Grand total of the bill must be greater than 0', 400, 'INVALID_BILL_AMOUNT');
      }

      const amountAlreadyPaid = new Decimal(existingBill.grandTotal).minus(new Decimal(existingBill.pendingAmount));
      if (calculatedTotal.lt(amountAlreadyPaid)) {
        throw new AppError(
          `Cannot reduce bill grand total below already settled amount of Rs. ${amountAlreadyPaid.toString()}`,
          400,
          'INVALID_BILL_AMOUNT'
        );
      }

      newGrandTotal = calculatedTotal;
      newPendingAmount = calculatedTotal.minus(amountAlreadyPaid);
      newPaymentStatus = newPendingAmount.eq(0)
        ? PaymentStatus.PAID
        : newPendingAmount.lt(calculatedTotal)
        ? PaymentStatus.PARTIAL
        : PaymentStatus.UNPAID;
    }

    const updatedInvoiceNumber = data.invoiceNumber || existingBill.invoiceNumber;
    const updatedBillDate = data.billDate ? new Date(data.billDate) : existingBill.billDate;
    const updatedProjectId = data.projectId !== undefined ? data.projectId : existingBill.projectId;

    // 4. Execute atomic update
    const result = await prisma.$transaction(async (tx) => {
      // If line items updated, delete and re-create
      if (lineItemsData) {
        await tx.billLineItem.deleteMany({ where: { billId: id } });
        await tx.billLineItem.createMany({
          data: lineItemsData.map((li) => ({
            ...li,
            billId: id
          }))
        });
      }

      const updatedBill = await tx.expenseBill.update({
        where: { id },
        data: {
          invoiceNumber: updatedInvoiceNumber,
          billDate: updatedBillDate,
          projectId: updatedProjectId,
          grandTotal: newGrandTotal,
          pendingAmount: newPendingAmount,
          paymentStatus: newPaymentStatus
        },
        include: {
          lineItems: true,
          vendor: true,
          project: true
        }
      });

      // Synchronize linked Journal Entry
      const linkedJournal = await tx.journalEntry.findFirst({
        where: {
          description: {
            contains: `(Invoice: ${existingBill.invoiceNumber})`
          },
          lines: {
            some: {
              vendorId: existingBill.vendorId
            }
          }
        },
        include: {
          lines: true
        }
      });

      if (linkedJournal) {
        // Construct new description
        let newJournalDescription = updatedProjectId
          ? `Expense for Project: ${newProject?.projectName} (Invoice: ${updatedInvoiceNumber})`
          : `Office Overhead Expense (Invoice: ${updatedInvoiceNumber})`;

        // Preserve transaction ref if existing had [Trx Ref: ...]
        const trxRefMatch = linkedJournal.description.match(/\[Trx Ref: [^\]]+\]/);
        if (trxRefMatch) {
          newJournalDescription += ` ${trxRefMatch[0]}`;
        }

        // Update journal date and description
        await tx.journalEntry.update({
          where: { id: linkedJournal.id },
          data: {
            entryDate: updatedBillDate,
            description: newJournalDescription
          }
        });

        // Determine correct debit account
        const targetDebitCode = updatedProjectId ? '1200' : '5000';
        const targetDebitAccount = await tx.account.findUnique({
          where: { accountCode: targetDebitCode }
        });

        // Update lines
        for (const line of linkedJournal.lines) {
          const isDebit = new Decimal(line.debitAmount).gt(0);
          if (isDebit) {
            // Debit line: WIP or Overhead
            await tx.journalLine.update({
              where: { id: line.id },
              data: {
                accountId: targetDebitAccount ? targetDebitAccount.id : line.accountId,
                debitAmount: newGrandTotal,
                projectId: updatedProjectId
              }
            });
          } else {
            // Credit line: AP or Cash
            await tx.journalLine.update({
              where: { id: line.id },
              data: {
                creditAmount: newGrandTotal,
                projectId: updatedProjectId
              }
            });
          }
        }
      }

      return updatedBill;
    }, { maxWait: 10000, timeout: 30000 });

    bustCache('bills');
    bustCache('vendors');
    bustCache('projects');
    bustCache('reports');
    bustCache('accounts');
    bustCache('ledger');
    bustCache('journals');
    return result;
  }
}
