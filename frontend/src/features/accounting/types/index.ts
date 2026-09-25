/**
 * Module 1: Core Accounting Type Contracts
 */

export type AccountCategory = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

export interface AccountWithBalance {
  id: string;
  accountCode: string;
  accountName: string;
  category: AccountCategory;
  isSystemLocked: boolean;
  isArchived?: boolean;
  totalDebit: string;
  totalCredit: string;
  balance: string;
}

export interface GroupedAccounts {
  ASSET: AccountWithBalance[];
  LIABILITY: AccountWithBalance[];
  EQUITY: AccountWithBalance[];
  REVENUE: AccountWithBalance[];
  EXPENSE: AccountWithBalance[];
}

export interface AccountsSummary {
  totalAssets: string;
  totalLiabilities: string;
  totalEquity: string;
  totalRevenue: string;
  totalExpenses: string;
}

export interface AccountsResponse {
  accounts: AccountWithBalance[];
  grouped: GroupedAccounts;
  summary: AccountsSummary;
}

export interface CreateAccountPayload {
  accountCode: string;
  accountName: string;
  category: AccountCategory;
}

export interface UpdateAccountPayload {
  accountName?: string;
  category?: AccountCategory;
}

export interface DeleteAccountResponse {
  action: 'DELETED' | 'ARCHIVED';
}
