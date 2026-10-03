import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchCustomers,
  fetchCustomerById,
  createCustomer,
  updateCustomer,
  applyCustomerWallet
} from '../api/customerApi';
import {
  Customer,
  CustomerDetail,
  CreateCustomerPayload,
  UpdateCustomerPayload,
  ApplyWalletPayload
} from '../types';

/**
 * Hook to fetch all customers with wallet balances.
 */
export const useCustomers = () => {
  return useQuery<Customer[], Error>({
    queryKey: ['customers'],
    queryFn: fetchCustomers,
    staleTime: 1000 * 30, // 30s
  });
};

/**
 * Hook to fetch customer detail with Khaata portfolio history.
 */
export const useCustomer = (id: string | null | undefined) => {
  return useQuery<CustomerDetail, Error>({
    queryKey: ['customers', id],
    queryFn: () => fetchCustomerById(id!),
    enabled: !!id,
  });
};

/**
 * Hook to create a new customer.
 */
export const useCreateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCustomerPayload) => createCustomer(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};

/**
 * Hook to update customer details (fullName, phone).
 */
export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload
    }: {
      id: string;
      payload: UpdateCustomerPayload;
    }) => updateCustomer(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};

/**
 * Hook to apply customer advance wallet balance towards an invoice.
 */
export const useApplyCustomerWallet = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      customerId,
      payload
    }: {
      customerId: string;
      payload: ApplyWalletPayload;
    }) => applyCustomerWallet(customerId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers', variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['financial-snapshot'] });
      queryClient.invalidateQueries({ queryKey: ['ar-aging'] });
      queryClient.invalidateQueries({ queryKey: ['journals'] });
    },
  });
};
