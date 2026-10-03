import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createBill, updateBill, fetchBills, fetchBillById } from '../api/billApi';
import {
  CreateBillPayload,
  CreateBillResponse,
  ExpenseBillItem,
  BillFilter,
  UpdateBillPayload,
} from '../types';

/**
 * Hook to fetch expense bills with optional filters.
 */
export const useBills = (filters?: BillFilter) => {
  return useQuery<ExpenseBillItem[], Error>({
    queryKey: ['bills', filters],
    queryFn: () => fetchBills(filters),
    retry: false,
    staleTime: 1000 * 60, // 60s
  });
};

/**
 * Hook to fetch a single bill by ID.
 */
export const useBillById = (id: string | null | undefined) => {
  return useQuery<ExpenseBillItem, Error>({
    queryKey: ['bills', id],
    queryFn: () => fetchBillById(id!),
    enabled: !!id,
    retry: false,
  });
};

/**
 * Hook to create a new expense bill.
 * Automatically invalidates projects, vendors, accounts, and bills cache.
 */
export const useCreateBill = () => {
  const queryClient = useQueryClient();

  return useMutation<CreateBillResponse, Error, CreateBillPayload>({
    mutationFn: (payload: CreateBillPayload) => createBill(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};

/**
 * Hook to update a posted expense bill.
 * Automatically invalidates projects, vendors, accounts, bills, and reports cache.
 */
export const useUpdateBill = () => {
  const queryClient = useQueryClient();

  return useMutation<ExpenseBillItem, Error, { id: string; payload: UpdateBillPayload }>({
    mutationFn: ({ id, payload }) => updateBill(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['journals'] });
    },
  });
};

