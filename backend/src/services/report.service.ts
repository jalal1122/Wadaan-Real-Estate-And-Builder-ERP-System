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
  assetCost: string;
  assetTitle: string | null;
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
  partyName?: string | null;
  projectName?: string | null;
}

export interface PartnerDrawingSummary {
  partnerName: string;
  accountCode: string;
  accountName: string;
  isProvisioned: boolean;
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
  general?: PartnerDrawingSummary;
  grandTotal: string;
}

interface RawDealMarginRow {
  dealId: string;
  dealType: DealType;
  totalValue: Decimal | string | number;
  customerName: string;
  projectName: string | null;
  assetTitle?: string | null;
  assetCost?: Decimal | string | number;
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
        wa."assetTitle" AS "assetTitle",
        COALESCE(wa."acquisitionCost", 0) AS "assetCost",
        COALESCE(SUM(di.amount) FILTER (WHERE di."paymentStatus" = 'PAID'), 0) AS "revenueCollected",
        COALESCE((
          SELECT SUM(eb."grandTotal")
          FROM "ExpenseBill" eb
          WHERE eb."projectId" = d."projectId"
        ), 0) AS "totalProjectCost"
      FROM "Deal" d
      JOIN "Customer" c ON d."customerId" = c.id
      LEFT JOIN "Project" p ON d."projectId" = p.id
      LEFT JOIN "WadaanAsset" wa ON wa."dealId" = d.id
      LEFT JOIN "DealInvoice" di ON di."dealId" = d.id
      ${statusClause}
      GROUP BY d.id, d."dealType", d."totalValue", c."fullName", p."projectName", wa."assetTitle", wa."acquisitionCost", d."createdAt"
      ORDER BY d."createdAt" DESC
    `;

    const result: DealMarginItem[] = rows.map((row) => {
      const revenue = new Decimal(row.revenueCollected ?? 0);
      const cost = new Decimal(row.totalProjectCost ?? 0);
      const assetCost = new Decimal(row.assetCost ?? 0);
      const totalVal = new Decimal(row.totalValue ?? 0);
      const grossProfit = revenue.minus(cost).minus(assetCost);
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
        assetCost: assetCost.toFixed(2),
        assetTitle: row.assetTitle ?? null,
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
          SELECT SUM(revenue - cost - "assetCost") FROM (
            SELECT
              COALESCE(SUM(di.amount) FILTER (WHERE di."paymentStatus" = 'PAID'), 0) AS revenue,
              COALESCE((SELECT SUM(eb."grandTotal") FROM "ExpenseBill" eb WHERE eb."projectId" = d."projectId"), 0) AS cost,
              COALESCE(wa."acquisitionCost", 0) AS "assetCost"
            FROM "Deal" d
            LEFT JOIN "WadaanAsset" wa ON wa."dealId" = d.id
            LEFT JOIN "DealInvoice" di ON di."dealId" = d.id
            WHERE d."createdAt" >= ${start} AND d."createdAt" <= ${end}
            GROUP BY d.id, wa."acquisitionCost"
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
   * Tracks forensic drawings debited against partner equity accounts (Account 3010 for Arshad, Account 3020 for Zeeshan)
   * or general director drawings (Account 3030 / Owner Drawings).
   * Gracefully returns unprovisioned empty state if specific partner accounts have not been provisioned yet.
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

    // 1. Identify specific partner accounts
    const arshadAcc = equityAccounts.find(
      (a) =>
        a.accountName.toLowerCase().includes('arshad') ||
        (a.accountCode === '3010-01' && a.accountName.toLowerCase().includes('arshad'))
    );

    const zeeshanAcc = equityAccounts.find(
      (a) =>
        a.accountName.toLowerCase().includes('zeeshan') ||
        a.accountCode === '3020' ||
        a.accountCode === '3020-01'
    );

    // 2. Identify general/unallocated director/owner drawing accounts
    // (Accounts with 'drawing' or 'distribution' in name, or codes 3010/3030 that are NOT specifically Arshad/Zeeshan)
    const generalAccs = equityAccounts.filter(
      (a) =>
        a.id !== arshadAcc?.id &&
        a.id !== zeeshanAcc?.id &&
        (a.accountName.toLowerCase().includes('drawing') ||
          a.accountName.toLowerCase().includes('distribution') ||
          a.accountCode.startsWith('3010') ||
          a.accountCode.startsWith('3030'))
    );
    const primaryGeneralAcc = generalAccs[0];

    // Relevant account IDs to query
    const targetAccountIds: string[] = [];
    if (arshadAcc) targetAccountIds.push(arshadAcc.id);
    if (zeeshanAcc) targetAccountIds.push(zeeshanAcc.id);
    for (const g of generalAccs) {
      targetAccountIds.push(g.id);
    }

    const journalDateFilter: Prisma.JournalEntryWhereInput = {};
    if (startDate || endDate) {
      journalDateFilter.entryDate = {};
      if (startDate) journalDateFilter.entryDate.gte = startDate;
      if (endDate) journalDateFilter.entryDate.lte = endDate;
    }

    // Fetch lines for all target equity accounts
    const lines = targetAccountIds.length > 0
      ? await prisma.journalLine.findMany({
          where: {
            accountId: { in: targetAccountIds },
            debitAmount: { gt: 0 },
            journal: journalDateFilter
          },
          include: {
            account: true,
            journal: {
              select: {
                entryNumber: true,
                entryDate: true,
                description: true,
                lines: {
                  select: {
                    vendor: { select: { vendorName: true } },
                    customer: { select: { fullName: true } },
                    project: { select: { projectName: true, projectPrefix: true } }
                  }
                }
              }
            },
            vendor: { select: { vendorName: true } },
            customer: { select: { fullName: true } },
            project: { select: { projectName: true, projectPrefix: true } }
          },
          orderBy: {
            journal: { entryDate: 'desc' }
          }
        })
      : [];

    const mapLineItem = (line: typeof lines[0]): EquityDrawingLineItem => {
      const debitDec = new Decimal(line.debitAmount.toString());

      // Resolve party name from line or sibling lines in the same journal entry
      let partyName: string | null = null;
      if (line.vendor?.vendorName) {
        partyName = `${line.vendor.vendorName} (Vendor)`;
      } else if (line.customer?.fullName) {
        partyName = `${line.customer.fullName} (Customer)`;
      } else {
        const siblingWithVendor = line.journal.lines.find((sl) => sl.vendor?.vendorName);
        const siblingWithCustomer = line.journal.lines.find((sl) => sl.customer?.fullName);
        if (siblingWithVendor?.vendor?.vendorName) {
          partyName = `${siblingWithVendor.vendor.vendorName} (Vendor)`;
        } else if (siblingWithCustomer?.customer?.fullName) {
          partyName = `${siblingWithCustomer.customer.fullName} (Customer)`;
        }
      }

      // Resolve project from line or sibling lines
      let projectName: string | null = null;
      if (line.project?.projectName) {
        projectName = `${line.project.projectName} (${line.project.projectPrefix})`;
      } else {
        const siblingWithProj = line.journal.lines.find((sl) => sl.project?.projectName);
        if (siblingWithProj?.project?.projectName) {
          projectName = `${siblingWithProj.project.projectName} (${siblingWithProj.project.projectPrefix})`;
        }
      }

      return {
        id: line.id,
        date: line.journal.entryDate.toISOString(),
        reference: line.journal.entryNumber,
        memo: line.memo || line.journal.description,
        accountCode: line.account.accountCode,
        amount: debitDec.toFixed(2),
        partyName,
        projectName
      };
    };

    // Attribute lines to Arshad, Zeeshan, or General
    const arshadLines: EquityDrawingLineItem[] = [];
    const zeeshanLines: EquityDrawingLineItem[] = [];
    const generalLines: EquityDrawingLineItem[] = [];

    for (const line of lines) {
      const item = mapLineItem(line);
      const textToSearch = `${line.memo || ''} ${line.journal.description || ''}`.toLowerCase();

      if (arshadAcc && line.accountId === arshadAcc.id) {
        arshadLines.push(item);
      } else if (zeeshanAcc && line.accountId === zeeshanAcc.id) {
        zeeshanLines.push(item);
      } else {
        // Line in general drawings account: check if memo/description specifies partner
        if (textToSearch.includes('arshad')) {
          arshadLines.push(item);
        } else if (textToSearch.includes('zeeshan')) {
          zeeshanLines.push(item);
        } else {
          generalLines.push(item);
        }
      }
    }

    const sumTotal = (items: EquityDrawingLineItem[]) =>
      items.reduce((acc, it) => acc.plus(new Decimal(it.amount)), new Decimal(0)).toFixed(2);

    const arshadSummary: PartnerDrawingSummary = {
      partnerName: 'Arshad Khalil',
      accountCode: arshadAcc?.accountCode || '3010-01',
      accountName: arshadAcc?.accountName || 'Not Provisioned in Chart of Accounts',
      isProvisioned: !!arshadAcc,
      lines: arshadLines,
      totalDrawings: sumTotal(arshadLines)
    };

    const zeeshanSummary: PartnerDrawingSummary = {
      partnerName: 'Zeeshan Yousafzai',
      accountCode: zeeshanAcc?.accountCode || '3020-01',
      accountName: zeeshanAcc?.accountName || 'Not Provisioned in Chart of Accounts',
      isProvisioned: !!zeeshanAcc,
      lines: zeeshanLines,
      totalDrawings: sumTotal(zeeshanLines)
    };

    let generalSummary: PartnerDrawingSummary | undefined = undefined;
    if (primaryGeneralAcc || generalLines.length > 0) {
      generalSummary = {
        partnerName: 'General Director / Owner Drawings',
        accountCode: primaryGeneralAcc?.accountCode || '3010-01',
        accountName: primaryGeneralAcc?.accountName || 'Owner Drawings',
        isProvisioned: !!primaryGeneralAcc,
        lines: generalLines,
        totalDrawings: sumTotal(generalLines)
      };
    }

    const grandTotalDec = new Decimal(arshadSummary.totalDrawings)
      .plus(new Decimal(zeeshanSummary.totalDrawings))
      .plus(new Decimal(generalSummary?.totalDrawings || '0'));

    const result: EquityLedgerReport = {
      period: {
        startDate: startDate ? startDate.toISOString() : undefined,
        endDate: endDate ? endDate.toISOString() : undefined
      },
      arshad: arshadSummary,
      zeeshan: zeeshanSummary,
      general: generalSummary,
      grandTotal: grandTotalDec.toFixed(2)
    };

    setCache(CACHE_KEY, result, 120_000); // 2-minute TTL
    return result;
  }
}
