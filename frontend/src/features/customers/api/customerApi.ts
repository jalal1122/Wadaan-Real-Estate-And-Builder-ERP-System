import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/api';
import {
  Customer,
  CustomerDetail,
  CreateCustomerPayload,
  ApplyWalletPayload
} from '../types';

/**
 * Fetches all customers with their active wallet balances and deal counts.
 */
export const fetchCustomers = async (): Promise<Customer[]> => {
  const response = await apiClient.get<ApiResponse<Customer[]>>('/customers');
  return response.data.data!;
};

/**
 * Fetches a single customer with their full Khaata (deals, invoices, receipts).
 */
export const fetchCustomerById = async (id: string): Promise<CustomerDetail> => {
  const response = await apiClient.get<ApiResponse<CustomerDetail>>(`/customers/${id}`);
  return response.data.data!;
};

/**
 * Creates a new customer account.
 */
export const createCustomer = async (payload: CreateCustomerPayload): Promise<Customer> => {
  const response = await apiClient.post<ApiResponse<Customer>>('/customers', payload);
  return response.data.data!;
};

/**
 * Consumes customer wallet advance against a specific deal installment invoice.
 */
export const applyCustomerWallet = async (
  customerId: string,
  payload: ApplyWalletPayload
): Promise<any> => {
  const response = await apiClient.post<ApiResponse<any>>(
    `/customers/${customerId}/apply-wallet`,
    payload
  );
  return response.data.data!;
};
