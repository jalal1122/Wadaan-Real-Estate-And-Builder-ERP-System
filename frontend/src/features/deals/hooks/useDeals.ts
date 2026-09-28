import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchDeals,
  fetchDealById,
  createDeal,
  transferFile,
  fetchDealCoClients,
  addDealCoClient,
  updateCoClientLabel,
  removeDealCoClient
} from '../api/dealApi';
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
      queryClient.invalidateQueries({ queryKey: ['assets'] });
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
      queryClient.invalidateQueries({ queryKey: ['projects'] }); // Bust project card clientInfo & PDF report after transfer
      queryClient.invalidateQueries({ queryKey: ['financial-snapshot'] });
      queryClient.invalidateQueries({ queryKey: ['journals'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};

/**
 * Hook to fetch co-clients of a deal.
 */
export const useDealCoClients = (dealId: string | null | undefined) => {
  return useQuery<DealClientEntry[], Error>({
    queryKey: ['deals', dealId, 'clients'],
    queryFn: () => fetchDealCoClients(dealId!),
    enabled: !!dealId,
    staleTime: 1000 * 30,
  });
};

/**
 * Hook to add a co-client to a deal.
 */
export const useAddCoClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      dealId,
      payload
    }: {
      dealId: string;
      payload: AddCoClientPayload;
    }) => addDealCoClient(dealId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deals', variables.dealId] });
      queryClient.invalidateQueries({ queryKey: ['deals', variables.dealId, 'clients'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};

/**
 * Hook to update a co-client's share label.
 */
export const useUpdateCoClientLabel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      dealId,
      clientId,
      payload
    }: {
      dealId: string;
      clientId: string;
      payload: UpdateCoClientPayload;
    }) => updateCoClientLabel(dealId, clientId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deals', variables.dealId] });
      queryClient.invalidateQueries({ queryKey: ['deals', variables.dealId, 'clients'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};

/**
 * Hook to remove a co-client from a deal.
 */
export const useRemoveCoClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      dealId,
      clientId
    }: {
      dealId: string;
      clientId: string;
    }) => removeDealCoClient(dealId, clientId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deals', variables.dealId] });
      queryClient.invalidateQueries({ queryKey: ['deals', variables.dealId, 'clients'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};

