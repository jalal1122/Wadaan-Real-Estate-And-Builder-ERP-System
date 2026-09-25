import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/api';

export interface PartyOption {
  id: string;
  label: string;
  type: 'customer' | 'vendor';
}

interface CustomerRaw {
  id: string;
  fullName: string;
}

interface VendorRaw {
  id: string;
  vendorName: string;
}

/**
 * Fetches all customers as party options (for the Journal Entry Party dropdown).
 * GET /api/v1/customers
 */
export const fetchCustomerParties = async (): Promise<PartyOption[]> => {
  const response = await apiClient.get<ApiResponse<CustomerRaw[]>>('/customers');
  return (response.data.data || []).map((c) => ({
    id: c.id,
    label: c.fullName,
    type: 'customer' as const,
  }));
};

/**
 * Fetches all vendors as party options (for the Journal Entry Party dropdown).
 * GET /api/v1/vendors
 */
export const fetchVendorParties = async (): Promise<PartyOption[]> => {
  const response = await apiClient.get<ApiResponse<VendorRaw[]>>('/vendors');
  return (response.data.data || []).map((v) => ({
    id: v.id,
    label: v.vendorName,
    type: 'vendor' as const,
  }));
};
