/**
 * Module 3: Receipts & Cheque Waiting Room Types
 */

export type PaymentMethod = 'CASH' | 'CHEQUE' | 'ONLINE';
export type ClearanceStatus = 'PENDING' | 'CLEARED' | 'BOUNCED';

export interface CustomerSummary {
  id: string;
  fullName: string;
  phone: string;
  walletBalance?: string | number;
}

export interface DealInvoiceSummary {
  id: string;
  dealId: string;
  description: string;
  amount: string | number;
  dueDate: string;
  paymentStatus: string;
  deal?: {
    id: string;
    dealType: string;
    totalValue: string | number;
  };
}

export interface Receipt {
  id: string;
  customerId: string;
  amount: string | number;
  totalAmount?: string | number; // Backward compatibility alias
  paymentMethod: PaymentMethod;
  bankRefNumber: string | null;
  referenceNo?: string | null; // Backward compatibility alias
  bankName?: string | null; // Backward compatibility alias
  chequeDate?: string | null; // Backward compatibility alias
  clearanceStatus: ClearanceStatus;
  receiptDate: string;
  customer: CustomerSummary;
  invoices?: DealInvoiceSummary[];
}

export interface CreateReceiptPayload {
  customerId: string;
  invoiceIds?: string[];
  amount: number | string;
  paymentMethod: PaymentMethod;
  bankRefNumber?: string | null;
  targetAccountId?: string | null;
}

export interface ClearChequePayload {
  targetBankAccountId: string;
}

export interface ApplyWalletPayload {
  invoiceId: string;
  amount: number | string;
}

export interface LogReceiptResult {
  receipt: Receipt;
  walletAdvanceCredited?: number;
  journalEntryId?: string;
}
