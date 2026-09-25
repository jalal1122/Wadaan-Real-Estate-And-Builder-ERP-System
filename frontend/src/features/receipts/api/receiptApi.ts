import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/api';
import {
  Receipt,
  CreateReceiptPayload,
  ClearChequePayload,
  ApplyWalletPayload
} from '../types';

/**
 * Fetches all pending receipts in the Cheque Waiting Room.
 */
export const fetchWaitingRoom = async (): Promise<Receipt[]> => {
  const response = await apiClient.get<ApiResponse<Receipt[]>>('/receipts/waiting-room');
  return response.data.data!;
};

/**
 * Records a new customer receipt (Screen 9 fast inflow mutation).
 */
export const createReceipt = async (payload: CreateReceiptPayload): Promise<any> => {
  const response = await apiClient.post<ApiResponse<any>>('/receipts', payload);
  return response.data.data!;
};

/**
 * Clears a pending cheque from the waiting room and posts to ledger.
 */
export const clearCheque = async (id: string, payload: ClearChequePayload): Promise<any> => {
  const response = await apiClient.post<ApiResponse<any>>(`/receipts/${id}/clear`, payload);
  return response.data.data!;
};

/**
 * Marks a pending cheque as bounced, reverting invoice statuses.
 */
export const bounceCheque = async (id: string): Promise<any> => {
  const response = await apiClient.post<ApiResponse<any>>(`/receipts/${id}/bounce`);
  return response.data.data!;
};

/**
 * Applies customer wallet advance to a specific deal invoice.
 */
export const applyWalletAdvance = async (
  customerId: string,
  payload: ApplyWalletPayload
): Promise<any> => {
  const response = await apiClient.post<ApiResponse<any>>(
    `/customers/${customerId}/apply-wallet`,
    payload
  );
  return response.data.data!;
};
