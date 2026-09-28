import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAssets,
  fetchAssetById,
  createAsset,
  updateAsset,
  deleteAsset
} from '../api/assetApi';
import { WadaanAsset, CreateAssetPayload, UpdateAssetPayload, AssetStatus } from '../types';

/**
 * Hook to fetch assets list with optional status filtering.
 */
export const useAssets = (status?: AssetStatus | string) => {
  return useQuery<WadaanAsset[], Error>({
    queryKey: ['assets', status ?? 'all'],
    queryFn: () => fetchAssets(status),
    staleTime: 1000 * 30, // 30 seconds
  });
};

/**
 * Hook to fetch single asset detail by ID.
 */
export const useAsset = (id: string | null | undefined) => {
  return useQuery<WadaanAsset, Error>({
    queryKey: ['assets', 'detail', id],
    queryFn: () => fetchAssetById(id!),
    enabled: !!id,
  });
};

/**
 * Hook to register a new owned asset.
 */
export const useCreateAsset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAssetPayload) => createAsset(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};

/**
 * Hook to update an existing AVAILABLE asset.
 */
export const useUpdateAsset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAssetPayload }) =>
      updateAsset(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};

/**
 * Hook to delete an AVAILABLE asset.
 */
export const useDeleteAsset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteAsset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};
