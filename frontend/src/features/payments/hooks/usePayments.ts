import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchVendorUnpaidBills,
  executePaymentRun,
  fetchPayments,
  updatePayment,
} from '../api/paymentApi';
import {
  VendorUnpaidQueueResponse,
  ProcessPaymentPayload,
  PaymentRunResponse,
  VendorPaymentItem,
  UpdatePaymentPayload,
} from '../types';

/**
 * Hook to fetch unpaid bills for a specific vendor in strict FIFO queue order.
 */
export const useVendorUnpaidBills = (vendorId: string | null | undefined) => {
  return useQuery<VendorUnpaidQueueResponse, Error>({
    queryKey: ['vendor-unpaid', vendorId],
    queryFn: () => fetchVendorUnpaidBills(vendorId!),
    enabled: !!vendorId,
    retry: false,
    staleTime: 1000 * 30, // 30 seconds
  });
};

/**
 * Hook to execute a payment run against a vendor's debt.
 * Invalidates vendors, vendor-unpaid, accounts, and bills cache.
 */
export const useExecutePaymentRun = () => {
  const queryClient = useQueryClient();

  return useMutation<PaymentRunResponse, Error, ProcessPaymentPayload>({
    mutationFn: (payload: ProcessPaymentPayload) => executePaymentRun(payload),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-unpaid'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['trial-balance'] });
      queryClient.invalidateQueries({ queryKey: ['account-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['journals'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
};

/**
 * Hook to fetch vendor payment run history.
 */
export const usePayments = (vendorId?: string) => {
  return useQuery<VendorPaymentItem[], Error>({
    queryKey: ['payments', vendorId],
    queryFn: () => fetchPayments(vendorId),
    retry: false,
  });
};

/**
 * Hook to update a posted vendor payment.
 * Automatically invalidates vendors, vendor-unpaid, accounts, bills, payments, and reports cache.
 */
export const useUpdatePayment = () => {
  const queryClient = useQueryClient();

  return useMutation<VendorPaymentItem, Error, { id: string; payload: UpdatePaymentPayload }>({
    mutationFn: ({ id, payload }) => updatePayment(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-unpaid'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['trial-balance'] });
      queryClient.invalidateQueries({ queryKey: ['account-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['journals'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
};

