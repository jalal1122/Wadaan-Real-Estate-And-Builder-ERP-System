import Decimal from 'decimal.js';
import { Prisma, AccountCategory, PaymentStatus, DealType } from '@prisma/client';
import { prisma } from '../config/db';
import { DateUtility, MathUtility } from '../utils/aggregation.util';
import { FiscalYearUtility } from '../utils/fiscal.util';

export interface TrialBalanceLineItem {
  accountId: string;
  accountCode: string;
  accountName: string;
  category: AccountCategory;
  debit: string;   // Populated for ASSET and EXPENSE accounts
  credit: string;  // Populated for LIABILITY, EQUITY, and REVENUE accounts
}

export interface TrialBalanceReport {
  period: {
    startDate: string;
    endDate: string;
  };
  accounts: TrialBalanceLineItem[];
  grandTotalDebit: string;
  grandTotalCredit: string;
  isBalanced: boolean;
}

export interface ExecutiveSnapshot {
  liquidCash: string;
  clientFundsHeld: string;
  totalAR: string;
  totalAP: string;
}

export interface DealMarginItem {
  dealId: string;
  dealType: DealType;
  customerName: string;
  projectName: string | null;
  totalValue: string;
  revenueCollected: string;
  totalProjectCost: string;
  grossProfit: string;
  marginPercentage: string;
  isWipAsset: boolean;
}

export interface AgingReceivableItem {
  invoiceId: string;
  customerName: string;
  description: string;
  amount: string;
  dueDate: string;
  daysOverdue: number;
}

export interface AgingPayableItem {
  billId: string;
  vendorName: string;
  invoiceNumber: string;
  pendingAmount: string;
  billDate: string;
  daysOverdue: number;
}

export interface AgingRadarResponse {
  receivables: AgingReceivableItem[];
  payables: AgingPayableItem[];
}

export interface NetIncomeReport {
  period: {
    startDate: string;
    endDate: string;
  };
  grossDealProfit: string;
  brokerageCommissions: string;
  generalOverhead: string;
  netIncome: string;
}

export interface ProjectLedgerLineItem {
  billId: string;
  lineItemId: string;
  billDate: string;
  vendorName: string;
  invoiceNumber: string;
  description: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
}

export interface ProjectLedgerReport {
  project: {
    id: string;
    projectName: string;
    projectPrefix?: string;
  };
  period?: {
    startDate?: string;
    endDate?: string;
  };
  lineItems: ProjectLedgerLineItem[];
  totalProjectCost: string;
}

export interface OverheadLedgerItem {
  billId: string;
  billDate: string;
  vendorName: string;
  invoiceNumber: string;
  grandTotal: string;
  paymentStatus: PaymentStatus;
}

export interface OverheadLedgerReport {
  period?: {
    startDate?: string;
    endDate?: string;
  };
  bills: OverheadLedgerItem[];
  totalOverhead: string;
}

export interface EquityDrawingLineItem {
  id: string;
  date: string;
  reference: string;
  memo: string;
  accountCode: string;
  amount: string;
}

export interface PartnerDrawingSummary {
  partnerName: string;
  accountCode: string;
  accountName: string;
  lines: EquityDrawingLineItem[];
  totalDrawings: string;
}

export interface EquityLedgerReport {
  period?: {
    startDate?: string;
    endDate?: string;
  };
  arshad: PartnerDrawingSummary;
  zeeshan: PartnerDrawingSummary;
  grandTotal: string;
}

interface RawDealMarginRow {
  dealId: string;
  dealType: DealType;
  totalValue: Decimal | string | number;
  customerName: string;
  projectName: string | null;
  revenueCollected: Decimal | string | number;
  totalProjectCost: Decimal | string | number;
}

export class ReportService {
  /**
   * 1. Executive Snapshot
   * Parallel execution of 4 sub-aggregations:
   * - Liquid Cash: ASSET accounts with code starting with '10' (debits - credits)
   * - Client Funds Held: Customer wallet balances + Escrow Liability account 2100 (credits - debits)
   * - Total AR: DealInvoice where paymentStatus != 'PAID'
   * - Total AP: ExpenseBill pendingAmount where paymentStatus != 'PAID'
   */
  static async calculateSnapshot(): Promise<ExecutiveSnapshot> {
    const [liquidCash, clientFundsHeld, totalAR, totalAP] = await Promise.all([
      this.getLiquidCash(),
      this.getClientFundsHeld(),
      this.getTotalAR(),
      this.getTotalAP()
    ]);

    return {
      liquidCash: liquidCash.toFixed(2),
      clientFundsHeld: clientFundsHeld.toFixed(2),
      totalAR: totalAR.toFixed(2),
      totalAP: totalAP.toFixed(2)
    };
  }

  private static async getLiquidCash(): Promise<Decimal> {
    // Liquid cash accounts: category ASSET and accountCode starts with '10' (e.g. 1001-1099 range)
    const liquidAccounts = await prisma.account.findMany({
      where: {
        category: AccountCategory.ASSET,
        accountCode: { startsWith: '10' }
      },
      select: { id: true }
    });

    if (liquidAccounts.length === 0) {
      return new Decimal(0);
    }

    const accountIds = liquidAccounts.map((a) => a.id);

    const aggregates = await prisma.journalLine.groupBy({
      by: ['accountId'],
      _sum: {
        debitAmount: true,
        creditAmount: true
      },
      where: {
        accountId: { in: accountIds }
      }
    });

    let total = new Decimal(0);
    for (const agg of aggregates) {
      const debit = agg._sum.debitAmount ? new Decimal(agg._sum.debitAmount) : new Decimal(0);
      const credit = agg._sum.creditAmount ? new Decimal(agg._sum.creditAmount) : new Decimal(0);
      // For Asset accounts, balance = Debits - Credits
      total = total.plus(debit.minus(credit));
    }

    return total;
  }

  private static async getClientFundsHeld(): Promise<Decimal> {
    // 1. Customer wallets sum
    const customerWalletAgg = await prisma.customer.aggregate({
      _sum: {
        walletBalance: true
      }
    });
    const walletSum = customerWalletAgg._sum.walletBalance
      ? new Decimal(customerWalletAgg._sum.walletBalance)
      : new Decimal(0);

    // 2. Escrow Liability account (accountCode '2100')
    const escrowAccount = await prisma.account.findFirst({
      where: { accountCode: '2100' },
      select: { id: true }
    });

    let escrowBalance = new Decimal(0);
    if (escrowAccount) {
      const escrowAgg = await prisma.journalLine.groupBy({
        by: ['accountId'],
        _sum: {
          debitAmount: true,
          creditAmount: true
        },
        where: {
          accountId: escrowAccount.id
        }
      });

      if (escrowAgg.length > 0) {
        const debit = escrowAgg[0]._sum.debitAmount
          ? new Decimal(escrowAgg[0]._sum.debitAmount)
          : new Decimal(0);
        const credit = escrowAgg[0]._sum.creditAmount
          ? new Decimal(escrowAgg[0]._sum.creditAmount)
          : new Decimal(0);
        // For Liability accounts, balance = Credits - Debits
        escrowBalance = credit.minus(debit);
      }
    }

    const total = walletSum.plus(escrowBalance);
    return total.isNegative() ? new Decimal(0) : total;
  }

  private static async getTotalAR(): Promise<Decimal> {
    const arAgg = await prisma.dealInvoice.aggregate({
      _sum: {
        amount: true
      },
      where: {
        paymentStatus: {
          not: PaymentStatus.PAID
        }
      }
    });

    return arAgg._sum.amount ? new Decimal(arAgg._sum.amount) : new Decimal(0);
  }

  private static async getTotalAP(): Promise<Decimal> {
    const apAgg = await prisma.expenseBill.aggregate({
      _sum: {
        pendingAmount: true
      },
      where: {
        paymentStatus: {
          not: PaymentStatus.PAID
        }
      }
    });

    return apAgg._sum.pendingAmount ? new Decimal(apAgg._sum.pendingAmount) : new Decimal(0);
  }

  /**
   * 2. Deal Margins
   * Uses parameterized raw SQL query to perform 3-level aggregation join.
   * Accrual basis: all ExpenseBills by projectId are summed as project cost.
   * Calculates gross profit, margin percentage (safe against div-by-zero), and WIP flag.
   */
  static async calculateDealMargins(status?: string): Promise<DealMarginItem[]> {
    const statusClause = status
      ? Prisma.sql`WHERE p.status = ${status}`
      : Prisma.empty;

    const rows = await prisma.$queryRaw<RawDealMarginRow[]>`
      SELECT
        d.id            AS "dealId",
        d."dealType",
        d."totalValue",
        c."fullName"    AS "customerName",
        p."projectName",
        COALESCE(SUM(di.amount) FILTER (WHERE di."paymentStatus" = 'PAID'), 0) AS "revenueCollected",
        COALESCE((
          SELECT SUM(eb."grandTotal")
          FROM "ExpenseBill" eb
          WHERE eb."projectId" = d."projectId"
        ), 0) AS "totalProjectCost"
      FROM "Deal" d
      JOIN "Customer" c ON d."customerId" = c.id
      LEFT JOIN "Project" p ON d."projectId" = p.id
      LEFT JOIN "DealInvoice" di ON di."dealId" = d.id
      ${statusClause}
      GROUP BY d.id, d."dealType", d."totalValue", c."fullName", p."projectName", d."createdAt"
      ORDER BY d."createdAt" DESC
    `;

    return rows.map((row) => {
      const revenue = new Decimal(row.revenueCollected ?? 0);
      const cost = new Decimal(row.totalProjectCost ?? 0);
      const totalVal = new Decimal(row.totalValue ?? 0);
      const grossProfit = revenue.minus(cost);
      const marginPercentage = MathUtility.safePercentage(grossProfit, revenue);
      const isWipAsset = revenue.isZero();

      return {
        dealId: row.dealId,
        dealType: row.dealType,
        customerName: row.customerName,
        projectName: row.projectName ?? null,
        totalValue: totalVal.toFixed(2),
        revenueCollected: revenue.toFixed(2),
        totalProjectCost: cost.toFixed(2),
        grossProfit: grossProfit.toFixed(2),
        marginPercentage,
        isWipAsset
      };
    });
  }

  /**
   * 3. Aging Radar
   * Returns overdue Receivables (from DealInvoice) and Payables (from ExpenseBill),
   * sorted by daysOverdue DESC.
   */
  static async getAgingRadar(): Promise<AgingRadarResponse> {
    const now = new Date();

    const [unpaidInvoices, unpaidBills] = await Promise.all([
      prisma.dealInvoice.findMany({
        where: {
          paymentStatus: {
            in: [PaymentStatus.UNPAID, PaymentStatus.PARTIAL]
          }
        },
        include: {
          deal: {
            include: {
              customer: true
            }
          }
        },
        orderBy: { dueDate: 'asc' }
      }),
      prisma.expenseBill.findMany({
        where: {
          paymentStatus: {
            in: [PaymentStatus.UNPAID, PaymentStatus.PARTIAL]
          }
        },
        include: {
          vendor: true
        },
        orderBy: { billDate: 'asc' }
      })
    ]);

    const receivables: AgingReceivableItem[] = unpaidInvoices.map((inv) => {
      const days = DateUtility.daysBetween(inv.dueDate, now);
      return {
        invoiceId: inv.id,
        customerName: inv.deal.customer.fullName,
        description: inv.description,
        amount: new Decimal(inv.amount).toFixed(2),
        dueDate: inv.dueDate.toISOString(),
        daysOverdue: days > 0 ? days : 0
      };
    });

    const payables: AgingPayableItem[] = unpaidBills.map((bill) => {
      const days = DateUtility.daysBetween(bill.billDate, now);
      return {
        billId: bill.id,
        vendorName: bill.vendor.vendorName,
        invoiceNumber: bill.invoiceNumber,
        pendingAmount: new Decimal(bill.pendingAmount).toFixed(2),
        billDate: bill.billDate.toISOString(),
        daysOverdue: days > 0 ? days : 0
      };
    });

    // Sort descending by daysOverdue
    receivables.sort((a, b) => b.daysOverdue - a.daysOverdue);
    payables.sort((a, b) => b.daysOverdue - a.daysOverdue);

    return {
      receivables,
      payables
    };
  }

  /**
   * 4. True Net Income
   * netIncome = (grossDealProfit + brokerageCommissions) - generalOverhead
   * Excludes WIP assets (deals with zero revenue collected) from recognized gross profit.
   */
  static async calculateTrueNetIncome(
    startDate?: Date,
    endDate?: Date
  ): Promise<NetIncomeReport> {
    const { startDate: defaultStart, endDate: defaultEnd } = FiscalYearUtility.getCurrentBoundary();
    const start = startDate ?? defaultStart;
    const end = endDate ?? defaultEnd;

    // 1. Gross Profit from Deals created in period
    const dealRows = await prisma.$queryRaw<RawDealMarginRow[]>`
      SELECT
        d.id            AS "dealId",
        d."dealType",
        d."totalValue",
        c."fullName"    AS "customerName",
        p."projectName",
        COALESCE(SUM(di.amount) FILTER (WHERE di."paymentStatus" = 'PAID'), 0) AS "revenueCollected",
        COALESCE((
          SELECT SUM(eb."grandTotal")
          FROM "ExpenseBill" eb
          WHERE eb."projectId" = d."projectId"
        ), 0) AS "totalProjectCost"
      FROM "Deal" d
      JOIN "Customer" c ON d."customerId" = c.id
      LEFT JOIN "Project" p ON d."projectId" = p.id
      LEFT JOIN "DealInvoice" di ON di."dealId" = d.id
      WHERE d."createdAt" >= ${start} AND d."createdAt" <= ${end}
      GROUP BY d.id, d."dealType", d."totalValue", c."fullName", p."projectName", d."createdAt"
    `;

    let grossDealProfit = new Decimal(0);
    for (const row of dealRows) {
      const revenue = new Decimal(row.revenueCollected ?? 0);
      const cost = new Decimal(row.totalProjectCost ?? 0);
      // Capitalized WIP asset guardrail: exclude projects that have zero recognized revenue
      if (!revenue.isZero()) {
        grossDealProfit = grossDealProfit.plus(revenue.minus(cost));
      }
    }

    // 2. Brokerage commissions in period
    const brokerageAgg = await prisma.deal.aggregate({
      _sum: {
        commissionAmount: true
      },
      where: {
        dealType: DealType.BROKERAGE,
        createdAt: {
          gte: start,
          lte: end
        }
      }
    });
    const brokerageCommissions = brokerageAgg._sum.commissionAmount
      ? new Decimal(brokerageAgg._sum.commissionAmount)
      : new Decimal(0);

    // 3. General Office Overhead in period (ExpenseBills without projectId)
    const overheadAgg = await prisma.expenseBill.aggregate({
      _sum: {
        grandTotal: true
      },
      where: {
        projectId: null,
        billDate: {
          gte: start,
          lte: end
        }
      }
    });
    const generalOverhead = overheadAgg._sum.grandTotal
      ? new Decimal(overheadAgg._sum.grandTotal)
      : new Decimal(0);

    // 4. Net Income formula
    const netIncome = grossDealProfit.plus(brokerageCommissions).minus(generalOverhead);

    return {
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      },
      grossDealProfit: grossDealProfit.toFixed(2),
      brokerageCommissions: brokerageCommissions.toFixed(2),
      generalOverhead: generalOverhead.toFixed(2),
      netIncome: netIncome.toFixed(2)
    };
  }

  /**
   * 5. Trial Balance Report
   *
   * Accounting boundary rules:
   * - ASSET, LIABILITY, EQUITY (permanent): Cumulative balance from the beginning
   *   of time up to endDate. startDate is IGNORED for these — they never reset.
   * - REVENUE, EXPENSE (annual): Balance strictly between startDate and endDate.
   *   If no startDate provided, defaults to the current fiscal year start.
   *
   * Zero-balance accounts are filtered from the result.
   */
  static async getTrialBalance(
    startDate?: Date,
    endDate?: Date
  ): Promise<TrialBalanceReport> {
    const { startDate: defaultStart, endDate: defaultEnd } = FiscalYearUtility.getCurrentBoundary();
    const periodStart = startDate ?? defaultStart;
    const periodEnd = endDate ?? defaultEnd;

    // Fetch all active (non-archived) accounts
    const allAccounts = await prisma.account.findMany({
      where: { isArchived: false },
      orderBy: { accountCode: 'asc' }
    });

    const permanentCategories: AccountCategory[] = [
      AccountCategory.ASSET,
      AccountCategory.LIABILITY,
      AccountCategory.EQUITY
    ];
    const annualCategories: AccountCategory[] = [AccountCategory.REVENUE, AccountCategory.EXPENSE];

    const permanentIds = allAccounts
      .filter((a) => permanentCategories.includes(a.category))
      .map((a) => a.id);
    const annualIds = allAccounts
      .filter((a) => annualCategories.includes(a.category))
      .map((a) => a.id);

    // Permanent: all-time up to endDate (balance sheet is continuous)
    const permanentAgg = permanentIds.length > 0
      ? await prisma.journalLine.groupBy({
          by: ['accountId'],
          _sum: { debitAmount: true, creditAmount: true },
          where: {
            accountId: { in: permanentIds },
            journal: { entryDate: { lte: periodEnd } }
          }
        })
      : [];

    // Annual: strictly between startDate and endDate (P&L period)
    const annualAgg = annualIds.length > 0
      ? await prisma.journalLine.groupBy({
          by: ['accountId'],
          _sum: { debitAmount: true, creditAmount: true },
          where: {
            accountId: { in: annualIds },
            journal: { entryDate: { gte: periodStart, lte: periodEnd } }
          }
        })
      : [];

    // Build a totals lookup map
    const totalsMap = new Map<string, { debit: Decimal; credit: Decimal }>();
    for (const row of [...permanentAgg, ...annualAgg]) {
      totalsMap.set(row.accountId, {
        debit: new Decimal(row._sum.debitAmount?.toString() || '0'),
        credit: new Decimal(row._sum.creditAmount?.toString() || '0')
      });
    }

    let grandTotalDebit = new Decimal(0);
    let grandTotalCredit = new Decimal(0);
    const lines: TrialBalanceLineItem[] = [];

    for (const acc of allAccounts) {
      const totals = totalsMap.get(acc.id) ?? { debit: new Decimal(0), credit: new Decimal(0) };

      // Normal balance direction determines which column the net balance sits in
      const isDebitNormal =
        acc.category === AccountCategory.ASSET ||
        acc.category === AccountCategory.EXPENSE;

      const netBalance = isDebitNormal
        ? totals.debit.minus(totals.credit)
        : totals.credit.minus(totals.debit);

      // Filter out zero-balance accounts
      if (netBalance.isZero()) continue;

      let debitCol: string;
      let creditCol: string;

      if (isDebitNormal) {
        if (netBalance.gte(0)) {
          debitCol = netBalance.toFixed(2);
          creditCol = '0.00';
        } else {
          debitCol = '0.00';
          creditCol = netBalance.abs().toFixed(2);
        }
      } else {
        if (netBalance.gte(0)) {
          debitCol = '0.00';
          creditCol = netBalance.toFixed(2);
        } else {
          debitCol = netBalance.abs().toFixed(2);
          creditCol = '0.00';
        }
      }

      grandTotalDebit = grandTotalDebit.plus(new Decimal(debitCol));
      grandTotalCredit = grandTotalCredit.plus(new Decimal(creditCol));

      lines.push({
        accountId: acc.id,
        accountCode: acc.accountCode,
        accountName: acc.accountName,
        category: acc.category,
        debit: debitCol,
        credit: creditCol
      });
    }

      return {
      period: {
        startDate: periodStart.toISOString(),
        endDate: periodEnd.toISOString()
      },
      accounts: lines,
      grandTotalDebit: grandTotalDebit.toFixed(2),
      grandTotalCredit: grandTotalCredit.toFixed(2),
      isBalanced: grandTotalDebit.equals(grandTotalCredit)
    };
  }

  /**
   * 6. Project Cost Ledger (Line-by-line Construction Costs)
   * Fetches all ExpenseBill items associated with a project, flattened to line items.
   */
  static async getProjectLedger(
    projectId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ProjectLedgerReport> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, projectName: true, projectPrefix: true }
    });

    if (!project) {
      throw new Error(`Project with ID ${projectId} not found`);
    }

    const where: Prisma.ExpenseBillWhereInput = {
      projectId
    };

    if (startDate || endDate) {
      where.billDate = {};
      if (startDate) where.billDate.gte = startDate;
      if (endDate) where.billDate.lte = endDate;
    }

    const bills = await prisma.expenseBill.findMany({
      where,
      include: {
        vendor: { select: { vendorName: true } },
        lineItems: true
      },
      orderBy: { billDate: 'desc' }
    });

    let totalCost = new Decimal(0);
    const lineItems: ProjectLedgerLineItem[] = [];

    for (const bill of bills) {
      const vendorName = bill.vendor?.vendorName || 'Direct Vendor';
      const billDateStr = bill.billDate.toISOString();

      for (const line of bill.lineItems) {
        const lineTotalDec = new Decimal(line.lineTotal.toString());
        totalCost = totalCost.plus(lineTotalDec);

        lineItems.push({
          billId: bill.id,
          lineItemId: line.id,
          billDate: billDateStr,
          vendorName,
          invoiceNumber: bill.invoiceNumber,
          description: line.description,
          quantity: line.quantity.toString(),
          unitPrice: line.unitPrice.toString(),
          lineTotal: lineTotalDec.toFixed(2)
        });
      }
    }

    return {
      project: {
        id: project.id,
        projectName: project.projectName,
        projectPrefix: project.projectPrefix
      },
      period: {
        startDate: startDate ? startDate.toISOString() : undefined,
        endDate: endDate ? endDate.toISOString() : undefined
      },
      lineItems,
      totalProjectCost: totalCost.toFixed(2)
    };
  }

  /**
   * 7. Office Overhead Ledger
   * Non-project operational expenses (ExpenseBill WHERE projectId IS NULL).
   */
  static async getOverheadLedger(
    startDate?: Date,
    endDate?: Date
  ): Promise<OverheadLedgerReport> {
    const where: Prisma.ExpenseBillWhereInput = {
      projectId: null
    };

    if (startDate || endDate) {
      where.billDate = {};
      if (startDate) where.billDate.gte = startDate;
      if (endDate) where.billDate.lte = endDate;
    }

    const bills = await prisma.expenseBill.findMany({
      where,
      include: {
        vendor: { select: { vendorName: true } }
      },
      orderBy: { billDate: 'desc' }
    });

    let totalOverhead = new Decimal(0);
    const ledgerItems: OverheadLedgerItem[] = [];

    for (const bill of bills) {
      const grandTotalDec = new Decimal(bill.grandTotal.toString());
      totalOverhead = totalOverhead.plus(grandTotalDec);

      ledgerItems.push({
        billId: bill.id,
        billDate: bill.billDate.toISOString(),
        vendorName: bill.vendor?.vendorName || 'General Supplier',
        invoiceNumber: bill.invoiceNumber,
        grandTotal: grandTotalDec.toFixed(2),
        paymentStatus: bill.paymentStatus
      });
    }

    return {
      period: {
        startDate: startDate ? startDate.toISOString() : undefined,
        endDate: endDate ? endDate.toISOString() : undefined
      },
      bills: ledgerItems,
      totalOverhead: totalOverhead.toFixed(2)
    };
  }

  /**
   * 8. Partner Drawings (Equity Ledger)
   * Tracks drawings debited against partner equity accounts (Account 3010 for Arshad, Account 3020 for Zeeshan).
   * Gracefully returns empty arrays if specific partner accounts have not been provisioned yet.
   */
  static async getEquityLedger(
    startDate?: Date,
    endDate?: Date
  ): Promise<EquityLedgerReport> {
    const equityAccounts = await prisma.account.findMany({
      where: {
        category: AccountCategory.EQUITY
      }
    });

    // Find Arshad account: '3010', '3010-01', or name matching 'Arshad' or general 'Owner Drawings'
    const arshadAcc = equityAccounts.find(
      (a) =>
        a.accountCode === '3010' ||
        a.accountCode.startsWith('3010') ||
        a.accountName.toLowerCase().includes('arshad')
    ) || equityAccounts.find((a) => a.accountName.toLowerCase().includes('drawings'));

    // Find Zeeshan account: '3020', '3020-01', or name matching 'Zeeshan'
    const zeeshanAcc = equityAccounts.find(
      (a) =>
        a.accountCode === '3020' ||
        a.accountCode.startsWith('3020') ||
        a.accountName.toLowerCase().includes('zeeshan')
    );

    const fetchPartnerLines = async (
      partnerName: string,
      targetCode: string,
      account?: typeof equityAccounts[0]
    ): Promise<PartnerDrawingSummary> => {
      if (!account) {
        return {
          partnerName,
          accountCode: targetCode,
          accountName: `${partnerName} Drawings (${targetCode})`,
          lines: [],
          totalDrawings: '0.00'
        };
      }

      const journalDateFilter: Prisma.JournalEntryWhereInput = {};
      if (startDate || endDate) {
        journalDateFilter.entryDate = {};
        if (startDate) journalDateFilter.entryDate.gte = startDate;
        if (endDate) journalDateFilter.entryDate.lte = endDate;
      }

      const lines = await prisma.journalLine.findMany({
        where: {
          accountId: account.id,
          debitAmount: { gt: 0 },
          journal: journalDateFilter
        },
        include: {
          journal: {
            select: {
              entryNumber: true,
              entryDate: true,
              description: true
            }
          }
        },
        orderBy: {
          journal: { entryDate: 'desc' }
        }
      });

      let total = new Decimal(0);
      const items: EquityDrawingLineItem[] = lines.map((line) => {
        const debitDec = new Decimal(line.debitAmount.toString());
        total = total.plus(debitDec);
        return {
          id: line.id,
          date: line.journal.entryDate.toISOString(),
          reference: line.journal.entryNumber,
          memo: line.memo || line.journal.description,
          accountCode: account.accountCode,
          amount: debitDec.toFixed(2)
        };
      });

      return {
        partnerName,
        accountCode: account.accountCode,
        accountName: account.accountName,
        lines: items,
        totalDrawings: total.toFixed(2)
      };
    };

    const arshadSummary = await fetchPartnerLines('Arshad Khalil', '3010', arshadAcc);
    const zeeshanSummary = await fetchPartnerLines('Zeeshan Yousafzai', '3020', zeeshanAcc);

    const grandTotal = new Decimal(arshadSummary.totalDrawings)
      .plus(new Decimal(zeeshanSummary.totalDrawings))
      .toFixed(2);

    return {
      period: {
        startDate: startDate ? startDate.toISOString() : undefined,
        endDate: endDate ? endDate.toISOString() : undefined
      },
      arshad: arshadSummary,
      zeeshan: zeeshanSummary,
      grandTotal
    };
  }
}
