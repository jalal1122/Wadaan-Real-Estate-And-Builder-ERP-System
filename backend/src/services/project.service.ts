import Decimal from 'decimal.js';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { CreateProjectInput, UpdateProjectStatusInput } from '../utils/validation.util';

export class ProjectService {
  /**
   * Initializes a new construction site.
   */
  static async createProject(data: CreateProjectInput) {
    const existing = await prisma.project.findUnique({
      where: { projectPrefix: data.projectPrefix }
    });

    if (existing) {
      throw new AppError(
        `Project with prefix '${data.projectPrefix}' already exists`,
        409,
        'DUPLICATE_PROJECT_PREFIX'
      );
    }

    return await prisma.project.create({
      data: {
        projectName: data.projectName,
        projectPrefix: data.projectPrefix,
        masterBOQ: new Decimal(data.masterBOQ),
        status: 'ACTIVE'
      }
    });
  }

  /**
   * Fetches master grid of projects with calculated live health metrics.
   */
  static async getAllProjects() {
    const projects = await prisma.project.findMany({
      include: {
        expenseBills: true,
        deals: {
          include: {
            customer: true,
            invoices: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return projects.map((project) => {
      const spentToDate = project.expenseBills.reduce(
        (sum, bill) => sum.plus(new Decimal(bill.grandTotal)),
        new Decimal(0)
      );
      const masterBOQ = new Decimal(project.masterBOQ);
      const budgetVariance = masterBOQ.minus(spentToDate);
      const isOverBudget = spentToDate.gt(masterBOQ);
      const budgetBurnPercentage = masterBOQ.gt(0)
        ? spentToDate.dividedBy(masterBOQ).times(100).toDecimalPlaces(2).toNumber()
        : 0;

      let clientInfo = null;
      if (project.deals && project.deals.length > 0) {
        const primaryDeal = project.deals[0];
        const contractValue = project.deals.reduce(
          (sum, d) => sum.plus(new Decimal(d.totalValue)),
          new Decimal(0)
        );
        const totalCollected = project.deals.reduce((dealSum, d) => {
          const invCollected = d.invoices.reduce((sum, inv) => {
            const paid = new Decimal(inv.paidAmount || (inv.paymentStatus === 'PAID' ? inv.amount : 0));
            return sum.plus(paid);
          }, new Decimal(0));
          return dealSum.plus(invCollected);
        }, new Decimal(0));

        const pendingReceivable = contractValue.minus(totalCollected);

        clientInfo = {
          customerName: primaryDeal.customer?.fullName || 'Client',
          customerPhone: primaryDeal.customer?.phone || null,
          dealType: primaryDeal.dealType,
          contractValue,
          totalCollected,
          pendingReceivable,
          netCashMargin: totalCollected.minus(spentToDate)
        };
      }

      return {
        ...project,
        spentToDate,
        budgetVariance,
        isOverBudget,
        budgetBurnPercentage,
        clientInfo
      };
    });
  }

  /**
   * Fetches single project detail with associated bills and computed metrics.
   */
  static async getProjectById(id: string) {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        expenseBills: {
          include: {
            lineItems: true,
            vendor: true
          },
          orderBy: { billDate: 'desc' }
        },
        deals: {
          include: {
            customer: true,
            invoices: true
          }
        }
      }
    });

    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    const spentToDate = project.expenseBills.reduce(
      (sum, bill) => sum.plus(new Decimal(bill.grandTotal)),
      new Decimal(0)
    );
    const masterBOQ = new Decimal(project.masterBOQ);
    const budgetVariance = masterBOQ.minus(spentToDate);
    const isOverBudget = spentToDate.gt(masterBOQ);
    const budgetBurnPercentage = masterBOQ.gt(0)
      ? spentToDate.dividedBy(masterBOQ).times(100).toDecimalPlaces(2).toNumber()
      : 0;

    let clientInfo = null;
    if (project.deals && project.deals.length > 0) {
      const primaryDeal = project.deals[0];
      const contractValue = project.deals.reduce(
        (sum, d) => sum.plus(new Decimal(d.totalValue)),
        new Decimal(0)
      );
      const totalCollected = project.deals.reduce((dealSum, d) => {
        const invCollected = d.invoices.reduce((sum, inv) => {
          const paid = new Decimal(inv.paidAmount || (inv.paymentStatus === 'PAID' ? inv.amount : 0));
          return sum.plus(paid);
        }, new Decimal(0));
        return dealSum.plus(invCollected);
      }, new Decimal(0));

      const pendingReceivable = contractValue.minus(totalCollected);

      clientInfo = {
        customerName: primaryDeal.customer?.fullName || 'Client',
        customerPhone: primaryDeal.customer?.phone || null,
        dealType: primaryDeal.dealType,
        contractValue,
        totalCollected,
        pendingReceivable,
        netCashMargin: totalCollected.minus(spentToDate)
      };
    }

    return {
      ...project,
      spentToDate,
      budgetVariance,
      isOverBudget,
      budgetBurnPercentage,
      clientInfo
    };
  }

  /**
   * Updates project status (e.g. ACTIVE -> COMPLETED / ON_HOLD).
   */
  static async updateProjectStatus(id: string, input: UpdateProjectStatusInput) {
    const project = await prisma.project.findUnique({ where: { id } });

    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    return await prisma.project.update({
      where: { id },
      data: { status: input.status }
    });
  }

  /**
   * Fetches all General Ledger transactions (JournalLines) linked to this project.
   */
  static async getProjectTransactions(id: string) {
    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        projectName: true,
        projectPrefix: true,
        status: true,
        masterBOQ: true,
        createdAt: true
      }
    });

    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    const lines = await prisma.journalLine.findMany({
      where: { projectId: id },
      include: {
        journal: {
          select: {
            id: true,
            entryNumber: true,
            entryDate: true,
            description: true
          }
        },
        account: {
          select: {
            id: true,
            accountCode: true,
            accountName: true,
            category: true
          }
        },
        vendor: {
          select: {
            id: true,
            vendorName: true
          }
        },
        customer: {
          select: {
            id: true,
            fullName: true
          }
        }
      },
      orderBy: [
        { journal: { entryDate: 'asc' } },
        { id: 'asc' }
      ]
    });

    let runningBalance = new Decimal(0);
    const transactions = lines.map((line) => {
      const debit = new Decimal(line.debitAmount);
      const credit = new Decimal(line.creditAmount);
      runningBalance = runningBalance.plus(debit).minus(credit);

      return {
        id: line.id,
        journalId: line.journalId,
        entryNumber: line.journal.entryNumber,
        entryDate: line.journal.entryDate,
        journalDescription: line.journal.description,
        memo: line.memo,
        accountCode: line.account.accountCode,
        accountName: line.account.accountName,
        accountCategory: line.account.category,
        debitAmount: debit,
        creditAmount: credit,
        runningBalance: runningBalance,
        partyName: line.vendor?.vendorName || line.customer?.fullName || null
      };
    });

    return {
      project,
      totalDebit: lines.reduce((sum, l) => sum.plus(new Decimal(l.debitAmount)), new Decimal(0)),
      totalCredit: lines.reduce((sum, l) => sum.plus(new Decimal(l.creditAmount)), new Decimal(0)),
      netBalance: runningBalance,
      transactions
    };
  }
}
