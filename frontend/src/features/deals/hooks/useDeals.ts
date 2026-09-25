import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchDeals,
  fetchDealById,
  createDeal,
  transferFile
} from '../api/dealApi';
import {
  Deal,
  CreateDealPayload,
  TransferFilePayload,
  TransferFileResult
} from '../types';

/**
 * Hook to fetch all deals.
 */
export const useDeals = () => {
  return useQuery<Deal[], Error>({
    queryKey: ['deals'],
    queryFn: fetchDeals,
    staleTime: 1000 * 30, // 30 seconds
  });
};

/**
 * Hook to fetch a single deal by ID.
 */
export const useDeal = (id: string | null | undefined) => {
  return useQuery<Deal, Error>({
    queryKey: ['deals', id],
    queryFn: () => fetchDealById(id!),
    enabled: !!id,
  });
};

/**
 * Hook to initialize a new deal contract.
 */
export const useCreateDeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateDealPayload) => createDeal(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['financial-snapshot'] });
      queryClient.invalidateQueries({ queryKey: ['ar-aging'] });
      queryClient.invalidateQueries({ queryKey: ['journals'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};

/**
 * Hook to execute file transfer on a deal.
 */
export const useTransferFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      dealId,
      payload
    }: {
      dealId: string;
      payload: TransferFilePayload;
    }) => transferFile(dealId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['financial-snapshot'] });
      queryClient.invalidateQueries({ queryKey: ['journals'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};
