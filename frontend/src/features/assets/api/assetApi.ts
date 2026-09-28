import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/api';
import { WadaanAsset, CreateAssetPayload, UpdateAssetPayload, ReacquireAssetPayload, AssetStatus } from '../types';

/**
 * Fetches all assets with optional status filtering (AVAILABLE, RESERVED, SOLD).
 */
export const fetchAssets = async (status?: AssetStatus | string): Promise<WadaanAsset[]> => {
  const params = status ? { status } : undefined;
  const response = await apiClient.get<ApiResponse<WadaanAsset[]>>('/assets', { params });
  return response.data.data!;
};

/**
 * Fetches single asset by ID.
 */
export const fetchAssetById = async (id: string): Promise<WadaanAsset> => {
  const response = await apiClient.get<ApiResponse<WadaanAsset>>(`/assets/${id}`);
  return response.data.data!;
};

/**
 * Registers a new company-owned asset.
 */
export const createAsset = async (payload: CreateAssetPayload): Promise<WadaanAsset> => {
  const response = await apiClient.post<ApiResponse<WadaanAsset>>('/assets', payload);
  return response.data.data!;
};

/**
 * Updates an AVAILABLE asset's metadata.
 */
export const updateAsset = async (id: string, payload: UpdateAssetPayload): Promise<WadaanAsset> => {
  const response = await apiClient.put<ApiResponse<WadaanAsset>>(`/assets/${id}`, payload);
  return response.data.data!;
};

/**
 * Deletes an AVAILABLE asset.
 */
export const deleteAsset = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.delete<ApiResponse<{ success: boolean; message: string }>>(`/assets/${id}`);
  return response.data.data ?? { success: true, message: response.data.message || 'Asset deleted' };
};

/**
 * Re-acquires / re-lists a SOLD property into inventory at a new acquisition cost.
 */
export const reacquireAsset = async (id: string, payload: ReacquireAssetPayload): Promise<WadaanAsset> => {
  const response = await apiClient.post<ApiResponse<WadaanAsset>>(`/assets/${id}/reacquire`, payload);
  return response.data.data!;
};
