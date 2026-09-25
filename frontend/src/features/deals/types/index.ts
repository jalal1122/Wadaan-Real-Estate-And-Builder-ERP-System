/**
 * Module 3: Deal Hub & Financial Contracts Types
 */

export type DealType = 'WADAAN_SALE' | 'CONSTRUCTION' | 'BROKERAGE';
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'PENDING_CLEARANCE';

export interface DealInvoice {
  id: string;
  dealId: string;
  description: string;
  amount: string | number;
  paidAmount?: string | number;
  dueDate: string;
  paymentStatus: PaymentStatus;
  receiptId?: string | null;
  receipt?: {
    id: string;
    amount: string | number;
    paymentMethod: string;
    bankRefNumber: string | null;
    clearanceStatus: string;
    receiptDate: string;
  } | null;
}

export interface DealCustomer {
  id: string;
  fullName: string;
  phone: string;
  walletBalance: string | number;
}

export interface DealProject {
  id: string;
  name?: string;
  projectName?: string;
  code?: string;
  projectPrefix?: string;
  status: string;
  masterBOQ: string | number;
  spentToDate?: string | number;
}

export interface Deal {
  id: string;
  customerId: string;
  projectId?: string | null;
  dealType: DealType;
  totalValue: string | number;
  commissionAmount?: string | number | null;
  createdAt: string;
  pendingBalance: string | number;
  totalCollected?: string | number;
  spentOnSite?: string | number;
  netMargin?: string | number;
  customer: DealCustomer;
  project?: DealProject | null;
  invoices: DealInvoice[];
}

export interface CreateDealInvoiceInput {
  description: string;
  amount: number | string;
  dueDate: string;
}

export interface CreateDealPayload {
  customerId: string;
  dealType: DealType;
  projectId?: string | null;
  totalValue: number | string;
  commissionAmount?: number | string | null;
  invoices: CreateDealInvoiceInput[];
}

export interface TransferFilePayload {
  newCustomerId: string;
  transferFeeAmount: number | string;
}

export interface TransferFileResult {
  deal: Deal;
  oldCustomer: { id: string; fullName: string };
  newCustomer: { id: string; fullName: string };
  transferFeeRevenue: number | string;
  journalEntryId: string;
}
