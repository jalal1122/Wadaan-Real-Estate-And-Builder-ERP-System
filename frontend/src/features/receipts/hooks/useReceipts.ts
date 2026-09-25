import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchWaitingRoom,
  createReceipt,
  clearCheque,
  bounceCheque,
  applyWalletAdvance
} from '../api/receiptApi';
import {
  Receipt,
  CreateReceiptPayload,
  ClearChequePayload,
  ApplyWalletPayload
} from '../types';

/**
 * Hook to monitor pending uncleared cheques in the waiting room.
 * Halts polling if an error (e.g. 401 UNAUTHORIZED) is returned.
 */
export const useWaitingRoom = () => {
  return useQuery<Receipt[], Error>({
    queryKey: ['receipts', 'waiting-room'],
    queryFn: fetchWaitingRoom,
    retry: false,
    staleTime: 1000 * 30, // 30s stale time
    refetchInterval: (query) => (query.state.status === 'error' ? false : 30000), // 30s polling
  });
};

/**
 * Hook to record a new receipt (Fast Inflow / Screen 9).
 */
export const useLogReceipt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateReceiptPayload) => createReceipt(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts', 'waiting-room'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['financial-snapshot'] });
      queryClient.invalidateQueries({ queryKey: ['ar-aging'] });
      queryClient.invalidateQueries({ queryKey: ['journals'] });
    },
  });
};

export const useCreateReceipt = useLogReceipt;

/**
 * Hook to clear a pending cheque into the selected bank account.
 */
export const useClearCheque = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ClearChequePayload }) =>
      clearCheque(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts', 'waiting-room'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['financial-snapshot'] });
      queryClient.invalidateQueries({ queryKey: ['ar-aging'] });
      queryClient.invalidateQueries({ queryKey: ['journals'] });
    },
  });
};

/**
 * Hook to bounce a pending cheque.
 */
export const useBounceCheque = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => bounceCheque(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts', 'waiting-room'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['ar-aging'] });
    },
  });
};

/**
 * Hook to apply customer wallet balance against an invoice.
 */
export const useApplyWallet = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      customerId,
      payload
    }: {
      customerId: string;
      payload: ApplyWalletPayload;
    }) => applyWalletAdvance(customerId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['financial-snapshot'] });
      queryClient.invalidateQueries({ queryKey: ['ar-aging'] });
      queryClient.invalidateQueries({ queryKey: ['journals'] });
    },
  });
};
