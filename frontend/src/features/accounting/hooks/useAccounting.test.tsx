import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useChartOfAccounts, useCreateAccount } from './useAccounting';
import * as accountsApi from '../api/accountsApi';

vi.mock('../api/accountsApi', () => ({
  fetchAccounts: vi.fn(),
  createAccount: vi.fn(),
}));

describe('useAccounting Hooks', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useChartOfAccounts', () => {
    it('fetches accounts with fy=false by default and populates data', async () => {
      const mockData = {
        accounts: [
          {
            id: 'acc-1',
            accountCode: '1010',
            accountName: 'Cash on Hand',
            category: 'ASSET' as const,
            isSystemLocked: true,
            totalDebit: '1000',
            totalCredit: '0',
            balance: '1000',
          },
        ],
        grouped: {
          ASSET: [],
          LIABILITY: [],
          EQUITY: [],
          REVENUE: [],
          EXPENSE: [],
        },
        summary: {
          totalAssets: '1000',
          totalLiabilities: '0',
          totalEquity: '1000',
          totalRevenue: '0',
          totalExpenses: '0',
        },
      };

      vi.mocked(accountsApi.fetchAccounts).mockResolvedValueOnce(mockData);

      const { result } = renderHook(() => useChartOfAccounts(false), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(accountsApi.fetchAccounts).toHaveBeenCalledWith(false);
      expect(result.current.data).toEqual(mockData);
    });

    it('passes fy=true when requested for fiscal year boundaries', async () => {
      const mockData = {
        accounts: [],
        grouped: {
          ASSET: [],
          LIABILITY: [],
          EQUITY: [],
          REVENUE: [],
          EXPENSE: [],
        },
        summary: {
          totalAssets: '0',
          totalLiabilities: '0',
          totalEquity: '0',
          totalRevenue: '0',
          totalExpenses: '0',
        },
      };

      vi.mocked(accountsApi.fetchAccounts).mockResolvedValueOnce(mockData);

      const { result } = renderHook(() => useChartOfAccounts(true), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(accountsApi.fetchAccounts).toHaveBeenCalledWith(true);
    });
  });

  describe('useCreateAccount', () => {
    it('creates account and invalidates accounts query cache', async () => {
      const wrapper = createWrapper();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const newAccount = {
        id: 'new-acc',
        accountCode: '5200',
        accountName: 'Site Marketing',
        category: 'EXPENSE' as const,
        isSystemLocked: false,
        totalDebit: '0',
        totalCredit: '0',
        balance: '0',
      };

      vi.mocked(accountsApi.createAccount).mockResolvedValueOnce(newAccount);

      const { result } = renderHook(() => useCreateAccount(), { wrapper });

      await result.current.mutateAsync({
        accountCode: '5200',
        accountName: 'Site Marketing',
        category: 'EXPENSE',
      });

      expect(accountsApi.createAccount).toHaveBeenCalledWith({
        accountCode: '5200',
        accountName: 'Site Marketing',
        category: 'EXPENSE',
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['accounts'] });
    });
  });
});
