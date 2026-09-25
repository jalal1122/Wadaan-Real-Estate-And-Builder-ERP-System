/**
 * Module 4: Executive Analytics and Reports Types
 */

export interface ExecutiveSnapshot {
  liquidCash: string;
  clientFundsHeld: string;
  totalAR: string;
  totalAP: string;
}

export type DealType = 'WADAAN_SALE' | 'CONSTRUCTION' | 'BROKERAGE';

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

// Screen 3: Trial Balance types
export type AccountCategory = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

export interface TrialBalanceLineItem {
  accountId?: string;
  accountCode: string;
  accountName: string;
  category: AccountCategory;
  debit: string;   // Populated for ASSET and EXPENSE (normal debit balance)
  credit: string;  // Populated for LIABILITY, EQUITY, REVENUE (normal credit balance)
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

export interface LedgerTransactionRow {
  id: string;
  journalId: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  debitAmount: string;
  creditAmount: string;
  runningBalance: string;
}

export interface LedgerStatement {
  account: {
    id: string;
    accountCode: string;
    accountName: string;
    category: AccountCategory;
    isSystemLocked: boolean;
  };
  filter: {
    startDate: string;
    endDate: string;
  };
  openingBalance: string;
  closingBalance: string;
  totalDebits: string;
  totalCredits: string;
  transactions: LedgerTransactionRow[];
}

// Master Reports Hub: Tab 3 (Project Costs)
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

// Master Reports Hub: Tab 4 (Overhead Ledger)
export interface OverheadLedgerItem {
  billId: string;
  billDate: string;
  vendorName: string;
  invoiceNumber: string;
  grandTotal: string;
  paymentStatus: string;
}

export interface OverheadLedgerReport {
  period?: {
    startDate?: string;
    endDate?: string;
  };
  bills: OverheadLedgerItem[];
  totalOverhead: string;
}

// Master Reports Hub: Tab 5 (Partner Drawings)
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


