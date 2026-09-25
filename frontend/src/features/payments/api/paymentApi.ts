import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/api';
import {
  VendorUnpaidQueueResponse,
  ProcessPaymentPayload,
  PaymentRunResponse,
  VendorPaymentItem,
} from '../types';

/**
 * Fetches unpaid and partially paid bills for a specific vendor in strict FIFO order.
 */
export const fetchVendorUnpaidBills = async (vendorId: string): Promise<VendorUnpaidQueueResponse> => {
  const response = await apiClient.get<ApiResponse<VendorUnpaidQueueResponse>>(`/vendors/${vendorId}/unpaid-bills`);
  return response.data.data!;
};

/**
 * Executes an atomic FIFO payment run against a vendor's outstanding debt.
 */
export const executePaymentRun = async (payload: ProcessPaymentPayload): Promise<PaymentRunResponse> => {
  const response = await apiClient.post<ApiResponse<PaymentRunResponse>>('/payments/vendor', payload);
  return response.data.data!;
};

/**
 * Fetches vendor payment history.
 */
export const fetchPayments = async (vendorId?: string): Promise<VendorPaymentItem[]> => {
  const response = await apiClient.get<ApiResponse<VendorPaymentItem[]>>('/payments/vendor', {
    params: vendorId ? { vendorId } : undefined,
  });
  return response.data.data!;
};
