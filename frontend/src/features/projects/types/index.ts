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
