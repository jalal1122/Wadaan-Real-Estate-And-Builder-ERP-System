import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { apiClient } from '../lib/api';

vi.mock('../lib/api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes isFetchingUser alongside isLoadingUser and currentUser', async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          id: 'user-123',
          email: 'admin@wadaan.com.pk',
          fullName: 'Muhammad Jalal',
        },
      },
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isLoadingUser).toBe(true);
    expect(result.current.isFetchingUser).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoadingUser).toBe(false);
    });

    expect(result.current.isFetchingUser).toBe(false);
    expect(result.current.currentUser).toEqual({
      id: 'user-123',
      email: 'admin@wadaan.com.pk',
      fullName: 'Muhammad Jalal',
    });
  });

  it('populates query cache directly on login success to prevent race condition', async () => {
    // Initial fetch returns null (unauthenticated user on login screen)
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      code: 'UNAUTHORIZED',
      message: 'No active session found.',
    });

    const { queryClient, wrapper } = createWrapper();
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoadingUser).toBe(false);
    });
    expect(result.current.currentUser).toBeNull();

    const loggedInUser = {
      id: 'user-123',
      email: 'admin@wadaan.com.pk',
      fullName: 'Muhammad Jalal',
    };

    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        success: true,
        data: loggedInUser,
      },
    });

    await act(async () => {
      await result.current.login({ pin: '1234' });
    });

    // The cache should be immediately updated without needing an additional refetch
    expect(queryClient.getQueryData(['auth', 'me'])).toEqual(loggedInUser);
    await waitFor(() => {
      expect(result.current.currentUser).toEqual(loggedInUser);
    });
  });
});
