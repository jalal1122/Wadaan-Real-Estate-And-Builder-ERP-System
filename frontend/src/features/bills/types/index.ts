/**
 * Module 2: Expense Bills Types
 */
export type PaymentType = 'ACCOUNTS_PAYABLE' | 'DIRECT_CASH';
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

export interface BillLineItemPayload {
  description: string;
  quantity: number;
  unitPrice: number | string;
}

export interface BillLineItemItem {
  id: string;
  billId: string;
  description: string;
  quantity: number;
  unitPrice: string | number;
  lineTotal: string | number;
  createdAt: string;
}

export interface CreateBillPayload {
  vendorId: string;
  projectId?: string | null;
  invoiceNumber: string;
  billDate?: string;
  paymentType: PaymentType;
  sourceAccountId?: string | null;
  transactionRef?: string | null;
  lineItems: BillLineItemPayload[];
}

export interface ExpenseBillItem {
  id: string;
  vendorId: string;
  projectId: string | null;
  invoiceNumber: string;
  billDate: string;
  paymentType: PaymentType;
  paymentStatus: PaymentStatus;
  grandTotal: string | number;
  pendingAmount: string | number;
  createdAt: string;
  updatedAt: string;
  lineItems?: BillLineItemItem[];
  vendor?: {
    id: string;
    vendorName: string;
    phone: string | null;
  };
  project?: {
    id: string;
    projectName: string;
    projectPrefix: string;
  } | null;
}

export interface CreateBillResponse {
  bill: ExpenseBillItem;
  isOverBudget: boolean;
  overBudgetAmount: string | number;
  journalEntry: any;
}

export interface BillFilter {
  vendorId?: string;
  projectId?: string;
  paymentStatus?: PaymentStatus;
}
