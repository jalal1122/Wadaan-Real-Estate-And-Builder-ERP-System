import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/api';
import {
  Deal,
  CreateDealPayload,
  TransferFilePayload,
  TransferFileResult
} from '../types';

/**
 * Fetches all deals with their customers, projects, and invoices.
 */
export const fetchDeals = async (): Promise<Deal[]> => {
  const response = await apiClient.get<ApiResponse<Deal[]>>('/deals');
  return response.data.data!;
};

/**
 * Fetches a single deal by ID.
 */
export const fetchDealById = async (id: string): Promise<Deal> => {
  const response = await apiClient.get<ApiResponse<Deal>>(`/deals/${id}`);
  return response.data.data!;
};

/**
 * Creates a new deal contract and posts initializing journal entry.
 */
export const createDeal = async (payload: CreateDealPayload): Promise<Deal> => {
  const response = await apiClient.post<ApiResponse<Deal>>('/deals', payload);
  return response.data.data!;
};

/**
 * Transfers deal file ownership to a new customer, assessing transfer fee revenue.
 */
export const transferFile = async (
  dealId: string,
  payload: TransferFilePayload
): Promise<TransferFileResult> => {
  const response = await apiClient.post<ApiResponse<TransferFileResult>>(
    `/deals/${dealId}/transfer`,
    payload
  );
  return response.data.data!;
};
