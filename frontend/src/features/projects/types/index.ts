/**
 * Module 2: Projects & WIP Types
 */

export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ON_HOLD';

export interface ProjectClientInfo {
  customerName: string;
  customerPhone?: string | null;
  dealType: string;
  contractValue: number | string;
  totalCollected: number | string;
  pendingReceivable: number | string;
  netCashMargin: number | string;
}

export interface ProjectItem {
  id: string;
  projectName: string;
  projectPrefix: string;
  masterBOQ: string | number;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  spentToDate: string | number;
  budgetVariance: string | number;
  isOverBudget: boolean;
  budgetBurnPercentage: number;
  clientInfo?: ProjectClientInfo | null;
}

export interface CreateProjectPayload {
  projectName: string;
  projectPrefix: string;
  masterBOQ: string | number;
}

export interface ProjectTransactionItem {
  id: string;
  journalId: string;
  entryNumber: string;
  entryDate: string;
  journalDescription: string;
  memo?: string | null;
  accountCode: string;
  accountName: string;
  accountCategory: string;
  debitAmount: number | string;
  creditAmount: number | string;
  runningBalance: number | string;
  partyName?: string | null;
}

export interface ProjectTransactionsResponse {
  project: {
    id: string;
    projectName: string;
    projectPrefix: string;
    status: ProjectStatus;
    masterBOQ: string | number;
    createdAt: string;
  };
  totalDebit: number | string;
  totalCredit: number | string;
  netBalance: number | string;
  transactions: ProjectTransactionItem[];
}

export interface ProjectReportClientPayment {
  invoiceDescription: string;
  dueDate: string;
  receiptDate: string | null;
  amount: number | string;
  paidAmount: number | string;
  paymentStatus: string;
  paymentMethod: string | null;
  bankRefNumber: string | null;
  paidByCustomerName: string | null;
}

export interface ProjectReportClientSection {
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  dealType: string;
  contractValue: number | string;
  payments: ProjectReportClientPayment[];
  totalPaid: number | string;
  totalPending: number | string;
}

export interface ProjectReportVendorBill {
  invoiceNumber: string;
  billDate: string;
  grandTotal: number | string;
  pendingAmount: number | string;
  paymentStatus: string;
  lineItems: { description: string; quantity: number; unitPrice: number | string; lineTotal: number | string }[];
}

export interface ProjectReportVendorSection {
  vendorId: string;
  vendorName: string;
  vendorPhone?: string | null;
  bills: ProjectReportVendorBill[];
  totalBilled: number | string;
  totalPaid: number | string;
  totalPending: number | string;
}

export interface ProjectReportSummary {
  totalSpentWIP: number | string;
  totalReceivedFromClients: number | string;
  netCashMargin: number | string;
  budgetVariance: number | string;
  isOverBudget: boolean;
  budgetBurnPct: number;
  totalVendorBillCount: number;
  totalInvoiceCount: number;
}

export interface ProjectReportResponse {
  project: {
    id: string;
    projectName: string;
    projectPrefix: string;
    status: ProjectStatus;
    masterBOQ: number | string;
    createdAt: string;
  };
  summary: ProjectReportSummary;
  clientReceipts: ProjectReportClientSection[];
  grandTotalFromClients: number | string;
  vendorExpenses: ProjectReportVendorSection[];
  grandTotalToVendors: number | string;
  glSummary: {
    totalDebit: number | string;
    totalCredit: number | string;
    netBalance: number | string;
  };
  glTransactions: ProjectTransactionItem[];
}

