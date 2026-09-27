import Decimal from 'decimal.js';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { CreateProjectInput, UpdateProjectStatusInput } from '../utils/validation.util';
import { getCache, setCache, bustCache } from '../utils/cache.util';

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

    const newProject = await prisma.project.create({
      data: {
        projectName: data.projectName,
        projectPrefix: data.projectPrefix,
        masterBOQ: new Decimal(data.masterBOQ),
        status: 'ACTIVE'
      }
    });

    bustCache('projects');
    return newProject;
  }

  /**
   * Fetches master grid of projects with calculated live health metrics.
   */
  static async getAllProjects() {
    const CACHE_KEY = 'projects:all';
    const cached = getCache<any[]>(CACHE_KEY);
    if (cached) {
      return cached;
    }

    const projects = await prisma.project.findMany({
      include: {
        expenseBills: {
          select: {
            grandTotal: true
          }
        },
        journalLines: {
          select: {
            debitAmount: true,
            creditAmount: true,
            account: {
              select: {
                category: true,
                accountName: true,
                accountCode: true
              }
            }
          }
        },
        deals: {
          select: {
            totalValue: true,
            dealType: true,
            customer: {
              select: {
                fullName: true,
                phone: true
              }
            },
            invoices: {
              select: {
                amount: true,
                paidAmount: true,
                paymentStatus: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const result = projects.map((project) => {
      // Calculate spentToDate from journal lines that hit EXPENSE or WIP (ASSET) accounts, with fallback to expenseBills
      const spentToDate = (project.journalLines && project.journalLines.length > 0)
        ? project.journalLines.reduce((sum, line) => {
            const isExpenseOrWIP = 
              line.account.category === 'EXPENSE' || 
              (line.account.category === 'ASSET' && line.account.accountName.toUpperCase().includes('WIP')) ||
              line.account.accountCode === '5000'; // Hardcode fallback for standard COGS
              
            if (isExpenseOrWIP) {
              return sum.plus(new Decimal(line.debitAmount)).minus(new Decimal(line.creditAmount));
            }
            return sum;
          }, new Decimal(0))
        : (project.expenseBills || []).reduce(
            (sum, b) => sum.plus(new Decimal(b.grandTotal)),
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

    setCache(CACHE_KEY, result, 120_000); // 2-minute TTL
    return result;
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
        journalLines: {
          include: {
            account: true
          }
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

    const spentToDate = (project.journalLines && project.journalLines.length > 0)
      ? project.journalLines.reduce((sum, line) => {
          const isExpenseOrWIP = 
            line.account.category === 'EXPENSE' || 
            (line.account.category === 'ASSET' && line.account.accountName.toUpperCase().includes('WIP')) ||
            line.account.accountCode === '5000';
            
          if (isExpenseOrWIP) {
            return sum.plus(new Decimal(line.debitAmount)).minus(new Decimal(line.creditAmount));
          }
          return sum;
        }, new Decimal(0))
      : (project.expenseBills || []).reduce(
          (sum, b) => sum.plus(new Decimal(b.grandTotal)),
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

    const updated = await prisma.project.update({
      where: { id },
      data: { status: input.status }
    });

    bustCache('projects');
    return updated;
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

  /**
   * Fetches the comprehensive project report including financial summary,
   * client receipts breakdown, vendor expense breakdown, and GL audit trail.
   */
  static async getProjectReport(id: string) {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        expenseBills: {
          include: {
            vendor: true,
            lineItems: true
          },
          orderBy: { billDate: 'asc' }
        },
        deals: {
          include: {
            customer: true,
            invoices: {
              include: {
                receipt: {
                  include: { customer: true }
                }
              },
              orderBy: { dueDate: 'asc' }
            }
          }
        },
        journalLines: {
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
        }
      }
    });

    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    // 1. Calculate spent to date from journal lines (WIP/Expense), with fallback to expenseBills
    const spentToDate = (project.journalLines && project.journalLines.length > 0)
      ? project.journalLines.reduce((sum, line) => {
          const isExpenseOrWIP = 
            line.account.category === 'EXPENSE' || 
            (line.account.category === 'ASSET' && line.account.accountName.toUpperCase().includes('WIP')) ||
            line.account.accountCode === '5000';
            
          if (isExpenseOrWIP) {
            return sum.plus(new Decimal(line.debitAmount)).minus(new Decimal(line.creditAmount));
          }
          return sum;
        }, new Decimal(0))
      : (project.expenseBills || []).reduce(
          (sum, b) => sum.plus(new Decimal(b.grandTotal)),
          new Decimal(0)
        );

    const masterBOQ = new Decimal(project.masterBOQ);
    const budgetVariance = masterBOQ.minus(spentToDate);
    const isOverBudget = spentToDate.gt(masterBOQ);
    const budgetBurnPct = masterBOQ.gt(0)
      ? spentToDate.dividedBy(masterBOQ).times(100).toDecimalPlaces(2).toNumber()
      : 0;

    // 2. Client Receipts Breakdown
    let totalReceivedFromClients = new Decimal(0);
    let totalInvoiceCount = 0;

    const clientReceipts = (project.deals || []).map((deal) => {
      let clientTotalPaid = new Decimal(0);
      let clientTotalPending = new Decimal(0);

      const payments = (deal.invoices || []).map((inv) => {
        totalInvoiceCount++;
        const invAmount = new Decimal(inv.amount);
        const paid = new Decimal(inv.paidAmount || (inv.paymentStatus === 'PAID' ? inv.amount : 0));
        clientTotalPaid = clientTotalPaid.plus(paid);
        const pending = invAmount.minus(paid);
        if (pending.gt(0)) {
          clientTotalPending = clientTotalPending.plus(pending);
        }

        return {
          invoiceDescription: inv.description,
          dueDate: inv.dueDate,
          receiptDate: inv.receipt?.receiptDate || null,
          amount: invAmount,
          paidAmount: paid,
          paymentStatus: inv.paymentStatus,
          paymentMethod: inv.receipt?.paymentMethod || null,
          bankRefNumber: inv.receipt?.bankRefNumber || null,
          paidByCustomerName: inv.receipt?.customer?.fullName || null
        };
      });

      totalReceivedFromClients = totalReceivedFromClients.plus(clientTotalPaid);

      return {
        customerId: deal.customerId,
        customerName: deal.customer?.fullName || 'Client',
        customerPhone: deal.customer?.phone || null,
        dealType: deal.dealType,
        contractValue: new Decimal(deal.totalValue),
        payments,
        totalPaid: clientTotalPaid,
        totalPending: clientTotalPending
      };
    });

    const netCashMargin = totalReceivedFromClients.minus(spentToDate);

    // 3. Vendor Expenses Breakdown
    const vendorMap = new Map<string, {
      vendorId: string;
      vendorName: string;
      vendorPhone: string | null;
      bills: Array<{
        invoiceNumber: string;
        billDate: Date;
        grandTotal: Decimal;
        pendingAmount: Decimal;
        paymentStatus: string;
        lineItems: Array<{
          description: string;
          quantity: number;
          unitPrice: Decimal;
          lineTotal: Decimal;
        }>;
      }>;
      totalBilled: Decimal;
      totalPaid: Decimal;
      totalPending: Decimal;
    }>();

    for (const bill of (project.expenseBills || [])) {
      const vId = bill.vendorId;
      if (!vendorMap.has(vId)) {
        vendorMap.set(vId, {
          vendorId: vId,
          vendorName: bill.vendor?.vendorName || 'Unknown Vendor',
          vendorPhone: bill.vendor?.phone || null,
          bills: [],
          totalBilled: new Decimal(0),
          totalPaid: new Decimal(0),
          totalPending: new Decimal(0)
        });
      }

      const vGroup = vendorMap.get(vId)!;
      const billTotal = new Decimal(bill.grandTotal);
      const pending = new Decimal(bill.pendingAmount || 0);
      const paid = billTotal.minus(pending);

      vGroup.totalBilled = vGroup.totalBilled.plus(billTotal);
      vGroup.totalPaid = vGroup.totalPaid.plus(paid.gt(0) ? paid : new Decimal(0));
      vGroup.totalPending = vGroup.totalPending.plus(pending);

      vGroup.bills.push({
        invoiceNumber: bill.invoiceNumber,
        billDate: bill.billDate,
        grandTotal: billTotal,
        pendingAmount: pending,
        paymentStatus: bill.paymentStatus,
        lineItems: (bill.lineItems || []).map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: new Decimal(item.unitPrice),
          lineTotal: new Decimal(item.lineTotal)
        }))
      });
    }

    const vendorExpenses = Array.from(vendorMap.values());
    const grandTotalToVendors = vendorExpenses.reduce((sum, v) => sum.plus(v.totalBilled), new Decimal(0));

    // 4. GL Audit Trail
    let runningBalance = new Decimal(0);
    const glTransactions = project.journalLines.map((line) => {
      const debit = new Decimal(line.debitAmount);
      const credit = new Decimal(line.creditAmount);
      runningBalance = runningBalance.plus(debit).minus(credit);

      return {
        id: line.id,
        journalId: line.journal.id,
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

    const glSummary = {
      totalDebit: project.journalLines.reduce((sum, l) => sum.plus(new Decimal(l.debitAmount)), new Decimal(0)),
      totalCredit: project.journalLines.reduce((sum, l) => sum.plus(new Decimal(l.creditAmount)), new Decimal(0)),
      netBalance: runningBalance
    };

    return {
      project: {
        id: project.id,
        projectName: project.projectName,
        projectPrefix: project.projectPrefix,
        status: project.status,
        masterBOQ: project.masterBOQ,
        createdAt: project.createdAt
      },
      summary: {
        totalSpentWIP: spentToDate,
        totalReceivedFromClients,
        netCashMargin,
        budgetVariance,
        isOverBudget,
        budgetBurnPct,
        totalVendorBillCount: (project.expenseBills || []).length,
        totalInvoiceCount
      },
      clientReceipts,
      grandTotalFromClients: totalReceivedFromClients,
      vendorExpenses,
      grandTotalToVendors,
      glSummary,
      glTransactions
    };
  }
}
