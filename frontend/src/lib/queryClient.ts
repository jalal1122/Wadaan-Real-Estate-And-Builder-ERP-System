import { QueryClient } from '@tanstack/react-query';
import { ApiErrorPayload } from '../types/api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst', // Keep displaying cached balances during internet drops
      staleTime: 1000 * 60 * 2, // 2 minutes before refetching fresh ledgers
      retry: (failureCount, error: unknown) => {
        const err = error as Partial<ApiErrorPayload> | undefined;
        // Do not retry 401s or 429 locks
        if (err?.code === 'UNAUTHORIZED' || err?.code === 'ACCOUNT_LOCKED') return false;
        return failureCount < 2;
      },
    },
    mutations: {
      networkMode: 'online', // Block creating bills/payments while offline
    },
  },
});
