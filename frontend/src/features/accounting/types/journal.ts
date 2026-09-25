/**
 * Journal Entry types for Screen 2 — Manual General Journal
 */

export interface JournalLinePayload {
  accountId: string;
  debitAmount: number;
  creditAmount: number;
  memo?: string | null;
  customerId?: string | null;
  vendorId?: string | null;
  projectId?: string | null;
}

export interface CreateJournalPayload {
  entryDate: string;   // ISO date string e.g. "2026-09-09"
  description: string;
  lines: JournalLinePayload[];
}

export interface JournalLineDetail {
  id: string;
  accountId: string;
  debitAmount: string;
  creditAmount: string;
  memo: string | null;
  customerId: string | null;
  vendorId: string | null;
  projectId: string | null;
  account: {
    id: string;
    accountCode: string;
    accountName: string;
    category: string;
  };
  customer: { id: string; fullName: string } | null;
  vendor: { id: string; vendorName: string } | null;
  project: { id: string; projectName: string } | null;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  lines: JournalLineDetail[];
}

export interface JournalEntriesResponse {
  entries: JournalEntry[];
  total: number;
  page: number;
  limit: number;
}
