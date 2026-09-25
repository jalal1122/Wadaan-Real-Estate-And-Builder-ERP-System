import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchVendors, createVendor } from '../api/vendorApi';
import { VendorItem, CreateVendorPayload } from '../types';

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
