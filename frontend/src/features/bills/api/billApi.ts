import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/api';
import { CreateBillPayload, CreateBillResponse, ExpenseBillItem, BillFilter } from '../types';

/**
 * Creates an expense bill with GL journal entry and WIP/overhead routing.
 */
export const createBill = async (payload: CreateBillPayload): Promise<CreateBillResponse> => {
  const response = await apiClient.post<ApiResponse<CreateBillResponse>>('/bills', payload);
  return response.data.data!;
};

/**
 * Fetches all expense bills with optional filters.
 */
export const fetchBills = async (filters?: BillFilter): Promise<ExpenseBillItem[]> => {
  const response = await apiClient.get<ApiResponse<ExpenseBillItem[]>>('/bills', {
    params: filters,
  });
  return response.data.data!;
};

/**
 * Fetches a single bill by ID.
 */
export const fetchBillById = async (id: string): Promise<ExpenseBillItem> => {
  const response = await apiClient.get<ApiResponse<ExpenseBillItem>>(`/bills/${id}`);
  return response.data.data!;
};
