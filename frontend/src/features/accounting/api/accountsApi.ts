import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/api';
import {
  AccountsResponse,
  CreateAccountPayload,
  UpdateAccountPayload,
  DeleteAccountResponse,
  AccountWithBalance
} from '../types';

/**
 * Fetches the master Chart of Accounts with live computed balances.
 * @param fy When true, filters REVENUE and EXPENSE accounts from current fiscal year start (July 1st).
 */
export const fetchAccounts = async (fy: boolean = false): Promise<AccountsResponse> => {
  const query = fy ? '?fy=true' : '';
  const response = await apiClient.get<ApiResponse<AccountsResponse>>(`/accounts${query}`);
  return response.data.data!;
};

/**
 * Creates a new custom Chart of Accounts bucket.
 */
export const createAccount = async (payload: CreateAccountPayload): Promise<AccountWithBalance> => {
  const response = await apiClient.post<ApiResponse<AccountWithBalance>>('/accounts', payload);
  return response.data.data!;
};

/**
 * Updates an existing account's name or category.
 */
export const updateAccount = async (
  id: string,
  payload: UpdateAccountPayload
): Promise<AccountWithBalance> => {
  const response = await apiClient.patch<ApiResponse<AccountWithBalance>>(`/accounts/${id}`, payload);
  return response.data.data!;
};

/**
 * Deletes or archives an account.
 */
export const deleteAccount = async (
  id: string
): Promise<{ message: string; data: DeleteAccountResponse }> => {
  const response = await apiClient.delete<ApiResponse<DeleteAccountResponse>>(`/accounts/${id}`);
  return {
    message: response.data.message || 'Account processed successfully.',
    data: response.data.data!
  };
};
