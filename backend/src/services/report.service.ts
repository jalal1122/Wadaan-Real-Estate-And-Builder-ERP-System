import Decimal from 'decimal.js';
import { Prisma, AccountCategory, PaymentStatus, DealType } from '@prisma/client';
import { prisma } from '../config/db';
import { DateUtility, MathUtility } from '../utils/aggregation.util';
import { FiscalYearUtility } from '../utils/fiscal.util';
import { getCache, setCache, bustCache } from '../utils/cache.util';

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
    const CACHE_KEY = 'reports:snapshot';
    const cached = getCache<ExecutiveSnapshot>(CACHE_KEY);
    if (cached) return cached;

    const rows = await prisma.$queryRaw<
      Array<{
        liquidCash: string | number | Decimal;
        clientFundsHeld: string | number | Decimal;
        totalAR: string | number | Decimal;
        totalAP: string | number | Decimal;
      }>
    >`
      SELECT
        COALESCE((
          SELECT SUM(jl."debitAmount" - jl."creditAmount")
          FROM "JournalLine" jl
          JOIN "Account" a ON jl."accountId" = a.id
          WHERE a.category = 'ASSET' AND a."accountCode" LIKE '10%'
        ), 0) AS "liquidCash",
        
        COALESCE((SELECT SUM("walletBalance") FROM "Customer"), 0) +
        COALESCE((
          SELECT SUM(jl."creditAmount" - jl."debitAmount")
          FROM "JournalLine" jl
          JOIN "Account" a ON jl."accountId" = a.id
          WHERE a."accountCode" = '2100'
        ), 0) AS "clientFundsHeld",
        
        COALESCE((
          SELECT SUM("amount")
          FROM "DealInvoice"
          WHERE "paymentStatus" != 'PAID'
        ), 0) AS "totalAR",

        COALESCE((
          SELECT SUM("pendingAmount")
          FROM "ExpenseBill"
          WHERE "paymentStatus" != 'PAID'
        ), 0) AS "totalAP"
    `;

    const row = rows[0];

    const result: ExecutiveSnapshot = {
      liquidCash: new Decimal(row?.liquidCash || 0).toFixed(2),
      clientFundsHeld: new Decimal(row?.clientFundsHeld || 0).toFixed(2),
      totalAR: new Decimal(row?.totalAR || 0).toFixed(2),
      totalAP: new Decimal(row?.totalAP || 0).toFixed(2)
    };

    setCache(CACHE_KEY, result, 30_000); // 30s TTL
    return result;
  }

  /**
   * 2. Deal Margins
   * Uses parameterized raw SQL query to perform 3-level aggregation join.
   * Accrual basis: all ExpenseBills by projectId are summed as project cost.
   * Calculates gross profit, margin percentage (safe against div-by-zero), and WIP flag.
   */
  static async calculateDealMargins(status?: string): Promise<DealMarginItem[]> {
    const CACHE_KEY = `reports:deal-margins:${status ?? 'all'}`;
    const cached = getCache<DealMarginItem[]>(CACHE_KEY);
    if (cached) return cached;

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

    const result: DealMarginItem[] = rows.map((row) => {
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

    setCache(CACHE_KEY, result, 120_000); // 2-minute TTL
    return result;
  }

  /**
   * 3. Aging Radar
   * Returns overdue Receivables (from DealInvoice) and Payables (from ExpenseBill),
   * sorted by daysOverdue DESC.
   */
  static async getAgingRadar(): Promise<AgingRadarResponse> {
    const CACHE_KEY = 'reports:aging-radar';
    const cached = getCache<AgingRadarResponse>(CACHE_KEY);
    if (cached) return cached;

    const now = new Date();

    const rows = await prisma.$queryRaw<
      Array<{
        receivables: Array<{
          id: string;
          description: string;
          amount: string | Decimal;
          dueDate: string;
          customerName: string;
        }>;
        payables: Array<{
          id: string;
          invoiceNumber: string;
          pendingAmount: string | Decimal;
          billDate: string;
          vendorName: string;
        }>;
      }>
    >`
      SELECT
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', di.id,
              'description', di.description,
              'amount', di.amount,
              'dueDate', di."dueDate",
              'customerName', c."fullName"
            ) ORDER BY di."dueDate" ASC
          ), '[]'::json)
          FROM "DealInvoice" di
          JOIN "Deal" d ON di."dealId" = d.id
          JOIN "Customer" c ON d."customerId" = c.id
          WHERE di."paymentStatus" IN ('UNPAID', 'PARTIAL')
        ) AS receivables,
        (
          SELECT COALESCE(json_agg(
            json_build_object(
              'id', eb.id,
              'invoiceNumber', eb."invoiceNumber",
              'pendingAmount', eb."pendingAmount",
              'billDate', eb."billDate",
              'vendorName', v."vendorName"
            ) ORDER BY eb."billDate" ASC
          ), '[]'::json)
          FROM "ExpenseBill" eb
          JOIN "Vendor" v ON eb."vendorId" = v.id
          WHERE eb."paymentStatus" IN ('UNPAID', 'PARTIAL')
        ) AS payables
    `;

    const rawReceivables = rows[0]?.receivables || [];
    const rawPayables = rows[0]?.payables || [];

    const receivables: AgingReceivableItem[] = rawReceivables.map((inv) => {
      const dueDateObj = new Date(inv.dueDate);
      const days = DateUtility.daysBetween(dueDateObj, now);
      return {
        invoiceId: inv.id,
        customerName: inv.customerName,
        description: inv.description,
        amount: new Decimal(inv.amount).toFixed(2),
        dueDate: dueDateObj.toISOString(),
        daysOverdue: days > 0 ? days : 0
      };
    });

    const payables: AgingPayableItem[] = rawPayables.map((bill) => {
      const billDateObj = new Date(bill.billDate);
      const days = DateUtility.daysBetween(billDateObj, now);
      return {
        billId: bill.id,
        vendorName: bill.vendorName,
        invoiceNumber: bill.invoiceNumber,
        pendingAmount: new Decimal(bill.pendingAmount).toFixed(2),
        billDate: billDateObj.toISOString(),
        daysOverdue: days > 0 ? days : 0
      };
    });

    // Sort descending by daysOverdue
    receivables.sort((a, b) => b.daysOverdue - a.daysOverdue);
    payables.sort((a, b) => b.daysOverdue - a.daysOverdue);

    const result: AgingRadarResponse = { receivables, payables };
    setCache(CACHE_KEY, result, 60_000); // 60s TTL
    return result;
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

    const CACHE_KEY = `reports:net-income:${start.toISOString()}:${end.toISOString()}`;
    const cached = getCache<NetIncomeReport>(CACHE_KEY);
    if (cached) return cached;


    // Combined Single Query for True Net Income components
    const rows = await prisma.$queryRaw<
      Array<{
        grossDealProfit: Decimal | number | string;
        brokerageCommissions: Decimal | number | string;
        generalOverhead: Decimal | number | string;
      }>
    >`
      SELECT
        COALESCE((
          SELECT SUM(revenue - cost) FROM (
            SELECT
              COALESCE(SUM(di.amount) FILTER (WHERE di."paymentStatus" = 'PAID'), 0) AS revenue,
              COALESCE((SELECT SUM(eb."grandTotal") FROM "ExpenseBill" eb WHERE eb."projectId" = d."projectId"), 0) AS cost
            FROM "Deal" d
            LEFT JOIN "DealInvoice" di ON di."dealId" = d.id
            WHERE d."createdAt" >= ${start} AND d."createdAt" <= ${end}
            GROUP BY d.id
          ) sub WHERE revenue > 0
        ), 0) AS "grossDealProfit",

        COALESCE((
          SELECT SUM("commissionAmount") FROM "Deal"
          WHERE "dealType" = 'BROKERAGE' AND "createdAt" >= ${start} AND "createdAt" <= ${end}
        ), 0) AS "brokerageCommissions",

        COALESCE((
          SELECT SUM("grandTotal") FROM "ExpenseBill"
          WHERE "projectId" IS NULL AND "billDate" >= ${start} AND "billDate" <= ${end}
        ), 0) AS "generalOverhead"
    `;

    const row = rows[0];
    const grossDealProfit = new Decimal(row?.grossDealProfit || 0);
    const brokerageCommissions = new Decimal(row?.brokerageCommissions || 0);
    const generalOverhead = new Decimal(row?.generalOverhead || 0);

    // 4. Net Income formula
    const netIncome = grossDealProfit.plus(brokerageCommissions).minus(generalOverhead);

    const result: NetIncomeReport = {
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      },
      grossDealProfit: grossDealProfit.toFixed(2),
      brokerageCommissions: brokerageCommissions.toFixed(2),
      generalOverhead: generalOverhead.toFixed(2),
      netIncome: netIncome.toFixed(2)
    };

    setCache(CACHE_KEY, result, 120_000); // 2-minute TTL
    return result;
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

    const CACHE_KEY = `reports:trial-balance:${periodStart.toISOString()}:${periodEnd.toISOString()}`;
    const cached = getCache<TrialBalanceReport>(CACHE_KEY);
    if (cached) return cached;

    // Single roundtrip Raw SQL to aggregate Trial Balance with fiscal boundaries
    const dateFilter = Prisma.sql`
      AND (
        (a.category IN ('ASSET'::"AccountCategory", 'LIABILITY'::"AccountCategory", 'EQUITY'::"AccountCategory") AND (SELECT "entryDate" FROM "JournalEntry" WHERE id = jl."journalId") <= ${periodEnd})
        OR
        (a.category IN ('REVENUE'::"AccountCategory", 'EXPENSE'::"AccountCategory") AND (SELECT "entryDate" FROM "JournalEntry" WHERE id = jl."journalId") >= ${periodStart} AND (SELECT "entryDate" FROM "JournalEntry" WHERE id = jl."journalId") <= ${periodEnd})
      )
    `;

    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        accountCode: string;
        accountName: string;
        category: AccountCategory;
        totalDebit: Decimal | number | string;
        totalCredit: Decimal | number | string;
      }>
    >`
      SELECT 
        a.id, 
        a."accountCode", 
        a."accountName", 
        a.category,
        COALESCE(SUM(jl."debitAmount"), 0) AS "totalDebit",
        COALESCE(SUM(jl."creditAmount"), 0) AS "totalCredit"
      FROM "Account" a
      LEFT JOIN "JournalLine" jl ON jl."accountId" = a.id ${dateFilter}
      WHERE a."isArchived" = false
      GROUP BY a.id, a."accountCode", a."accountName", a.category
      ORDER BY a."accountCode" ASC
    `;

    let grandTotalDebit = new Decimal(0);
    let grandTotalCredit = new Decimal(0);
    const lines: TrialBalanceLineItem[] = [];

    for (const row of rows) {
      const acc = row;
      const totals = { 
        debit: new Decimal(row.totalDebit || 0), 
        credit: new Decimal(row.totalCredit || 0) 
      };

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

    const result: TrialBalanceReport = {
      period: {
        startDate: periodStart.toISOString(),
        endDate: periodEnd.toISOString()
      },
      accounts: lines,
      grandTotalDebit: grandTotalDebit.toFixed(2),
      grandTotalCredit: grandTotalCredit.toFixed(2),
      isBalanced: grandTotalDebit.equals(grandTotalCredit)
    };

    setCache(CACHE_KEY, result, 60_000); // 60s TTL
    return result;
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
    const CACHE_KEY = `reports:project-ledger:${projectId}:${startDate?.toISOString() ?? 'all'}:${endDate?.toISOString() ?? 'all'}`;
    const cached = getCache<ProjectLedgerReport>(CACHE_KEY);
    if (cached) return cached;

    const startFilter = startDate ? Prisma.sql`AND eb."billDate" >= ${startDate}` : Prisma.empty;
    const endFilter = endDate ? Prisma.sql`AND eb."billDate" <= ${endDate}` : Prisma.empty;

    const rows = await prisma.$queryRaw<
      Array<{
        projectId: string;
        projectName: string;
        projectPrefix: string;
        lines: Array<{
          billId: string;
          lineItemId: string;
          billDate: string;
          vendorName: string;
          invoiceNumber: string;
          description: string;
          quantity: string | number | Decimal;
          unitPrice: string | number | Decimal;
          lineTotal: string | number | Decimal;
        }>;
      }>
    >`
      SELECT 
        p.id AS "projectId", 
        p."projectName", 
        p."projectPrefix",
        COALESCE((
          SELECT json_agg(
            json_build_object(
              'billId', eb.id,
              'lineItemId', bli.id,
              'billDate', eb."billDate",
              'vendorName', COALESCE(v."vendorName", 'Direct Vendor'),
              'invoiceNumber', eb."invoiceNumber",
              'description', bli.description,
              'quantity', bli.quantity,
              'unitPrice', bli."unitPrice",
              'lineTotal', bli."lineTotal"
            ) ORDER BY eb."billDate" DESC
          )
          FROM "ExpenseBill" eb
          JOIN "BillLineItem" bli ON bli."billId" = eb.id
          LEFT JOIN "Vendor" v ON v.id = eb."vendorId"
          WHERE eb."projectId" = p.id
            ${startFilter} ${endFilter}
        ), '[]'::json) AS lines
      FROM "Project" p
      WHERE p.id = ${projectId}
    `;

    const row = rows[0];
    if (!row) {
      throw new Error(`Project with ID ${projectId} not found`);
    }

    let totalCost = new Decimal(0);
    const lineItems: ProjectLedgerLineItem[] = [];

    for (const line of row.lines) {
      const lineTotalDec = new Decimal(line.lineTotal?.toString() || '0');
      totalCost = totalCost.plus(lineTotalDec);

      lineItems.push({
        billId: line.billId,
        lineItemId: line.lineItemId,
        billDate: new Date(line.billDate).toISOString(),
        vendorName: line.vendorName,
        invoiceNumber: line.invoiceNumber,
        description: line.description,
        quantity: line.quantity.toString(),
        unitPrice: line.unitPrice.toString(),
        lineTotal: lineTotalDec.toFixed(2)
      });
    }

    const result: ProjectLedgerReport = {
      project: {
        id: row.projectId,
        projectName: row.projectName,
        projectPrefix: row.projectPrefix
      },
      period: {
        startDate: startDate ? startDate.toISOString() : undefined,
        endDate: endDate ? endDate.toISOString() : undefined
      },
      lineItems,
      totalProjectCost: totalCost.toFixed(2)
    };

    setCache(CACHE_KEY, result, 60_000);
    return result;
  }

  /**
   * 7. Office Overhead Ledger
   * Non-project operational expenses (ExpenseBill WHERE projectId IS NULL).
   */
  static async getOverheadLedger(
    startDate?: Date,
    endDate?: Date
  ): Promise<OverheadLedgerReport> {
    const CACHE_KEY = `reports:overhead-ledger:${startDate?.toISOString() ?? 'all'}:${endDate?.toISOString() ?? 'all'}`;
    const cached = getCache<OverheadLedgerReport>(CACHE_KEY);
    if (cached) return cached;

    const startFilter = startDate ? Prisma.sql`AND eb."billDate" >= ${startDate}` : Prisma.empty;
    const endFilter = endDate ? Prisma.sql`AND eb."billDate" <= ${endDate}` : Prisma.empty;

    const rows = await prisma.$queryRaw<
      Array<{
        billId: string;
        billDate: string;
        vendorName: string;
        invoiceNumber: string;
        grandTotal: string | number | Decimal;
        paymentStatus: PaymentStatus;
      }>
    >`
      SELECT
        eb.id AS "billId",
        eb."billDate",
        COALESCE(v."vendorName", 'General Supplier') AS "vendorName",
        eb."invoiceNumber",
        eb."grandTotal",
        eb."paymentStatus"
      FROM "ExpenseBill" eb
      LEFT JOIN "Vendor" v ON v.id = eb."vendorId"
      WHERE eb."projectId" IS NULL
        ${startFilter} ${endFilter}
      ORDER BY eb."billDate" DESC
    `;

    let totalOverhead = new Decimal(0);
    const ledgerItems: OverheadLedgerItem[] = [];

    for (const row of rows) {
      const gt = new Decimal(row.grandTotal?.toString() || '0');
      totalOverhead = totalOverhead.plus(gt);

      ledgerItems.push({
        billId: row.billId,
        billDate: new Date(row.billDate).toISOString(),
        vendorName: row.vendorName,
        invoiceNumber: row.invoiceNumber,
        grandTotal: gt.toFixed(2),
        paymentStatus: row.paymentStatus
      });
    }

    const result: OverheadLedgerReport = {
      period: {
        startDate: startDate ? startDate.toISOString() : undefined,
        endDate: endDate ? endDate.toISOString() : undefined
      },
      bills: ledgerItems,
      totalOverhead: totalOverhead.toFixed(2)
    };

    setCache(CACHE_KEY, result, 120_000); // 2-minute TTL
    return result;
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
    const CACHE_KEY = `reports:equity-ledger:${startDate?.toISOString() ?? 'all'}:${endDate?.toISOString() ?? 'all'}`;
    const cached = getCache<EquityLedgerReport>(CACHE_KEY);
    if (cached) return cached;

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

    const [arshadSummary, zeeshanSummary] = await Promise.all([
      fetchPartnerLines('Arshad Khalil', '3010', arshadAcc),
      fetchPartnerLines('Zeeshan Yousafzai', '3020', zeeshanAcc)
    ]);

    const grandTotal = new Decimal(arshadSummary.totalDrawings)
      .plus(new Decimal(zeeshanSummary.totalDrawings))
      .toFixed(2);

    const result: EquityLedgerReport = {
      period: {
        startDate: startDate ? startDate.toISOString() : undefined,
        endDate: endDate ? endDate.toISOString() : undefined
      },
      arshad: arshadSummary,
      zeeshan: zeeshanSummary,
      grandTotal
    };

    setCache(CACHE_KEY, result, 120_000); // 2-minute TTL
    return result;
  }
}
