/**
 * Module 3: Customer Portfolio & Khaata Types
 */

import { Deal } from '@/features/deals/types';
import { Receipt } from '@/features/receipts/types';

export interface CustomerCount {
  deals: number;
  receipts: number;
}

export interface Customer {
  id: string;
  fullName: string;
  phone: string;
  walletBalance: string | number;
  _count?: CustomerCount;
}

export interface CustomerDetail extends Customer {
  deals: Deal[];
  receipts: Receipt[];
}

export interface CreateCustomerPayload {
  fullName: string;
  phone: string;
}

export interface ApplyWalletPayload {
  invoiceId: string;
  amount: number | string;
}
