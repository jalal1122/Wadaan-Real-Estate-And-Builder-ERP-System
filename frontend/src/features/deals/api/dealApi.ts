import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/api';
import {
  Deal,
  CreateDealPayload,
  TransferFilePayload,
  TransferFileResult,
  DealClientEntry,
  AddCoClientPayload,
  UpdateCoClientPayload
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

/**
 * Fetches all registered co-clients for a specific deal.
 */
export const fetchDealCoClients = async (dealId: string): Promise<DealClientEntry[]> => {
  const response = await apiClient.get<ApiResponse<DealClientEntry[]>>(`/deals/${dealId}/clients`);
  return response.data.data!;
};

/**
 * Registers a new co-client on a deal.
 */
export const addDealCoClient = async (
  dealId: string,
  payload: AddCoClientPayload
): Promise<DealClientEntry> => {
  const response = await apiClient.post<ApiResponse<DealClientEntry>>(
    `/deals/${dealId}/clients`,
    payload
  );
  return response.data.data!;
};

/**
 * Updates a co-client's share description label.
 */
export const updateCoClientLabel = async (
  dealId: string,
  clientId: string,
  payload: UpdateCoClientPayload
): Promise<DealClientEntry> => {
  const response = await apiClient.patch<ApiResponse<DealClientEntry>>(
    `/deals/${dealId}/clients/${clientId}`,
    payload
  );
  return response.data.data!;
};

/**
 * Removes a co-client from a deal.
 */
export const removeDealCoClient = async (
  dealId: string,
  clientId: string
): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.delete<ApiResponse<{ success: boolean; message: string }>>(
    `/deals/${dealId}/clients/${clientId}`
  );
  return response.data.data!;
};

