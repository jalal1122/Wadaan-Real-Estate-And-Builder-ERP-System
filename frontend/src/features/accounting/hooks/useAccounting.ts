import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAccounts, createAccount, updateAccount, deleteAccount } from '../api/accountsApi';
import {
  CreateAccountPayload,
  UpdateAccountPayload,
  DeleteAccountResponse,
  AccountsResponse,
  AccountWithBalance
} from '../types';

/**
 * Hook to fetch the Chart of Accounts with live balances.
 * @param fy When true, isolates Revenue and Expense balances to the current fiscal year.
 */
export const useChartOfAccounts = (fy: boolean = false) => {
  return useQuery<AccountsResponse, Error>({
    queryKey: ['accounts', { fy }],
    queryFn: () => fetchAccounts(fy),
    staleTime: 1000 * 60 * 2, // 2 minutes stale time
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook to create a new Chart of Accounts record.
 * Automatically invalidates the accounts query cache on success.
 */
export const useCreateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation<AccountWithBalance, Error, CreateAccountPayload>({
    mutationFn: (payload: CreateAccountPayload) => createAccount(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};

/**
 * Hook to update an existing Chart of Accounts record.
 * Automatically invalidates the accounts query cache on success.
 */
export const useUpdateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation<AccountWithBalance, Error, { id: string; payload: UpdateAccountPayload }>({
    mutationFn: ({ id, payload }) => updateAccount(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};

/**
 * Hook to delete or archive a Chart of Accounts record.
 * Automatically invalidates the accounts query cache on success.
 */
export const useDeleteAccount = () => {
  const queryClient = useQueryClient();

  return useMutation<{ message: string; data: DeleteAccountResponse }, Error, string>({
    mutationFn: (id: string) => deleteAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};
