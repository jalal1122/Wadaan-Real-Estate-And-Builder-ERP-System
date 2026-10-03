import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchVendors, createVendor, updateVendor } from '../api/vendorApi';
import { VendorItem, CreateVendorPayload, UpdateVendorPayload } from '../types';

/**
 * Hook to fetch suppliers and their outstanding payables.
 */
export const useVendors = () => {
  return useQuery<VendorItem[], Error>({
    queryKey: ['vendors'],
    queryFn: fetchVendors,
    retry: false,
    staleTime: 1000 * 60, // 60 seconds
  });
};

/**
 * Hook to create a new vendor.
 */
export const useCreateVendor = () => {
  const queryClient = useQueryClient();

  return useMutation<VendorItem, Error, CreateVendorPayload>({
    mutationFn: (payload: CreateVendorPayload) => createVendor(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
};

/**
 * Hook to update an existing vendor.
 */
export const useUpdateVendor = () => {
  const queryClient = useQueryClient();

  return useMutation<VendorItem, Error, { id: string; payload: UpdateVendorPayload }>({
    mutationFn: ({ id, payload }) => updateVendor(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};
