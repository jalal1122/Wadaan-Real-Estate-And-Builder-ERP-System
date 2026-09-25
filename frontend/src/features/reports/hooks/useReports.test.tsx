import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useExecutiveSnapshot,
  useDealMargins,
  useAgingRadar,
  useNetIncome,
} from './useReports';
import * as reportApi from '../api/reportApi';

vi.mock('../api/reportApi', () => ({
  fetchExecutiveSnapshot: vi.fn(),
  fetchDealMargins: vi.fn(),
  fetchAgingRadar: vi.fn(),
  fetchNetIncome: vi.fn(),
}));

describe('useReports Hooks Resilience & Configuration', () => {
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

  describe('useExecutiveSnapshot', () => {
    it('fetches snapshot and exposes data on success', async () => {
      const mockSnapshot = {
        liquidCash: '15000000',
        clientFundsHeld: '4500000',
        totalAR: '8200000',
        totalAP: '3100000',
      };

      vi.mocked(reportApi.fetchExecutiveSnapshot).mockResolvedValueOnce(mockSnapshot);

      const { result } = renderHook(() => useExecutiveSnapshot(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockSnapshot);
    });

    it('fails fast without retry when an error occurs', async () => {
      const authError = {
        code: 'UNAUTHORIZED',
        message: 'No active session found.',
      };

      vi.mocked(reportApi.fetchExecutiveSnapshot).mockRejectedValueOnce(authError);

      const { result } = renderHook(() => useExecutiveSnapshot(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(reportApi.fetchExecutiveSnapshot).toHaveBeenCalledTimes(1);
      expect(result.current.error).toEqual(authError);
    });
  });

  describe('useDealMargins', () => {
    it('fetches deal margins and passes optional status', async () => {
      const mockMargins = [
        {
          dealId: 'd-1',
          projectName: 'Gulberg Heights',
          customerName: 'Ahmad Khan',
          dealType: 'CONSTRUCTION' as const,
          revenueCollected: '5000000',
          grossProfit: '1200000',
          marginPercentage: '24.0',
          isWipAsset: false,
        },
      ];

      vi.mocked(reportApi.fetchDealMargins).mockResolvedValueOnce(mockMargins);

      const { result } = renderHook(() => useDealMargins('ACTIVE'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(reportApi.fetchDealMargins).toHaveBeenCalledWith('ACTIVE');
      expect(result.current.data).toEqual(mockMargins);
    });
  });

  describe('useAgingRadar', () => {
    it('fetches overdue receivables and payables', async () => {
      const mockRadar = {
        receivables: [
          {
            invoiceId: 'inv-1',
            customerName: 'Malik Enterprises',
            amount: '750000',
            daysOverdue: 14,
            description: 'Milestone 2',
          },
        ],
        payables: [],
      };

      vi.mocked(reportApi.fetchAgingRadar).mockResolvedValueOnce(mockRadar);

      const { result } = renderHook(() => useAgingRadar(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockRadar);
    });

    it('fails immediately on error without retry loop', async () => {
      vi.mocked(reportApi.fetchAgingRadar).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAgingRadar(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(reportApi.fetchAgingRadar).toHaveBeenCalledTimes(1);
    });
  });

  describe('useNetIncome', () => {
    it('fetches net income report with date boundaries', async () => {
      const mockIncome = {
        grossDealProfit: '12000000',
        brokerageCommissions: '3500000',
        generalOverhead: '2100000',
        netIncome: '13400000',
        period: {
          startDate: '2026-07-01T00:00:00.000Z',
          endDate: '2026-09-09T00:00:00.000Z',
        },
      };

      vi.mocked(reportApi.fetchNetIncome).mockResolvedValueOnce(mockIncome);

      const { result } = renderHook(
        () => useNetIncome('2026-07-01', '2026-09-09'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(reportApi.fetchNetIncome).toHaveBeenCalledWith('2026-07-01', '2026-09-09');
      expect(result.current.data).toEqual(mockIncome);
    });
  });
});
