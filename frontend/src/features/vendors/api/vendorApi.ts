import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/api';
import { VendorItem, CreateVendorPayload, UpdateVendorPayload } from '../types';

/**
 * Fetches all vendors with calculated live outstanding balances.
 */
export const fetchVendors = async (): Promise<VendorItem[]> => {
  const response = await apiClient.get<ApiResponse<VendorItem[]>>('/vendors');
  return response.data.data!;
};

/**
 * Creates a new vendor.
 */
export const createVendor = async (payload: CreateVendorPayload): Promise<VendorItem> => {
  const response = await apiClient.post<ApiResponse<VendorItem>>('/vendors', payload);
  return response.data.data!;
};

/**
 * Updates an existing vendor's name and/or phone.
 */
export const updateVendor = async (id: string, payload: UpdateVendorPayload): Promise<VendorItem> => {
  const response = await apiClient.patch<ApiResponse<VendorItem>>(`/vendors/${id}`, payload);
  return response.data.data!;
};
