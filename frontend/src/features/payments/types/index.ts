/**
 * Module 2: Payments & FIFO Types
 */
import { PaymentStatus } from '../../bills/types';

export interface UnpaidBillItem {
  id: string;
  vendorId: string;
  projectId: string | null;
  invoiceNumber: string;
  billDate: string;
  paymentType: string;
  paymentStatus: PaymentStatus;
  grandTotal: string | number;
  pendingAmount: string | number;
  createdAt: string;
  project?: {
    id: string;
    projectName: string;
    projectPrefix: string;
  } | null;
  lineItems?: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: string | number;
    lineTotal: string | number;
  }>;
}

export interface VendorUnpaidQueueResponse {
  vendorId: string;
  vendorName: string;
  totalOutstanding: string | number;
  bills: UnpaidBillItem[];
}

export type PaymentMode = 'CHEQUE' | 'ONLINE' | 'CASH';

export interface InvoiceAllocationItem {
  billId: string;
  amount: number | string;
}

export interface ProcessPaymentPayload {
  vendorId: string;
  sourceAccountId: string;
  amountPaid?: number | string;
  invoiceAllocations?: InvoiceAllocationItem[];
  chequeRef?: string | null;
  transactionId?: string | null;
  paymentDate?: string;
}

export interface SettledBillReport {
  billId: string;
  invoiceNumber: string;
  amountApplied: string | number;
  previousPending: string | number;
  newPending: string | number;
  status: PaymentStatus;
}

export interface VendorPaymentItem {
  id: string;
  vendorId: string;
  sourceAccountId: string;
  amountPaid: string | number;
  chequeRef: string | null;
  transactionId: string | null;
  paymentDate: string;
  createdAt?: string;
  vendor?: {
    id: string;
    vendorName: string;
  };
}

export interface PaymentRunResponse {
  payment: VendorPaymentItem;
  settledBills: SettledBillReport[];
  journalEntry: any;
  totalSettled: string | number;
  remainingVendorOutstanding: string | number;
}
