import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import {
  SystemStatus,
  GoLivePayload,
  GoLiveResponse,
  ApiResponse,
  ApiErrorPayload,
} from '../types/api';

export function useSystemInit() {
  const queryClient = useQueryClient();
  const statusQuery = useQuery<SystemStatus>({
    queryKey: ['system', 'status'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<SystemStatus>>('/system/status');
      return res.data.data ?? { isInitialized: false, goLiveDate: null };
    },
    staleTime: 1000 * 60, // 1 minute
    retry: (failureCount, error: unknown) => {
      const apiErr = error as Partial<ApiErrorPayload> | undefined;
      if (apiErr?.code === 'NETWORK_OFFLINE') return false;
      return failureCount < 2;
    },
  });

  const initializeMutation = useMutation({
    mutationFn: async (payload: GoLivePayload): Promise<GoLiveResponse> => {
      const res = await apiClient.post<GoLiveResponse>('/system/initialize', payload);
      return res.data;
    },
  });

  const completeInitialization = async () => {
    await queryClient.invalidateQueries({ queryKey: ['system', 'status'] });
    await queryClient.invalidateQueries({ queryKey: ['accounts'] });
  };

  return {
    status: statusQuery.data,
    isLoadingStatus: statusQuery.isLoading,
    statusError: statusQuery.error as ApiErrorPayload | null,
    refetchStatus: statusQuery.refetch,
    initializeSystem: initializeMutation.mutateAsync,
    completeInitialization,
    isInitializing: initializeMutation.isPending,
    initializeError: initializeMutation.error as ApiErrorPayload | null,
  };
}
