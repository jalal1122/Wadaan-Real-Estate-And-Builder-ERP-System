import Decimal from 'decimal.js';
import { Prisma, AccountCategory, PaymentStatus, DealType } from '@prisma/client';
import { prisma } from '../config/db';
import { DateUtility, MathUtility } from '../utils/aggregation.util';
import { FiscalYearUtility } from '../utils/fiscal.util';

export interface TrialBalanceLineItem {
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

    const permanentCategories = [
      AccountCategory.ASSET,
      AccountCategory.LIABILITY,
      AccountCategory.EQUITY
    ];
    const annualCategories = [AccountCategory.REVENUE, AccountCategory.EXPENSE];

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

      const debitCol = isDebitNormal ? netBalance.toFixed(2) : '0.00';
      const creditCol = isDebitNormal ? '0.00' : netBalance.toFixed(2);

      grandTotalDebit = grandTotalDebit.plus(new Decimal(debitCol));
      grandTotalCredit = grandTotalCredit.plus(new Decimal(creditCol));

      lines.push({
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
}
