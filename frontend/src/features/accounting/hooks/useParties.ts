import { useQuery } from '@tanstack/react-query';
import { fetchCustomerParties, fetchVendorParties, PartyOption } from '../api/partiesApi';

/**
 * Hook to fetch all customers as party options (stale for 5 minutes — these rarely change).
 */
export const useCustomers = () => {
  return useQuery<PartyOption[], Error>({
    queryKey: ['parties', 'customers'],
    queryFn: fetchCustomerParties,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Hook to fetch all vendors as party options (stale for 5 minutes).
 */
export const useVendors = () => {
  return useQuery<PartyOption[], Error>({
    queryKey: ['parties', 'vendors'],
    queryFn: fetchVendorParties,
    staleTime: 1000 * 60 * 5,
  });
};
