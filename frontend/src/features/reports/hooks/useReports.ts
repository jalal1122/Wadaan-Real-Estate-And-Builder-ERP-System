import { useQuery } from '@tanstack/react-query';
import {
  fetchExecutiveSnapshot,
  fetchDealMargins,
  fetchAgingRadar,
  fetchNetIncome,
  fetchTrialBalance,
  fetchAccountLedger,
  fetchProjectLedger,
  fetchOverheadLedger,
  fetchEquityLedger,
} from '../api/reportApi';
import {
  ExecutiveSnapshot,
  DealMarginItem,
  AgingRadarResponse,
  NetIncomeReport,
  TrialBalanceReport,
  LedgerStatement,
  ProjectLedgerReport,
  OverheadLedgerReport,
  EquityLedgerReport,
} from '../types';


/**
 * Hook for Executive Liquidity & Liability Snapshot (Row 2).
 * Refetches automatically every 30 seconds for real-time monitoring when healthy.
 * Halts polling if an error (such as 401 UNAUTHORIZED) is encountered.
 */
export const useExecutiveSnapshot = () => {
  return useQuery<ExecutiveSnapshot, Error>({
    queryKey: ['reports', 'snapshot'],
    queryFn: fetchExecutiveSnapshot,
    retry: false,
    refetchInterval: (query) => (query.state.status === 'error' ? false : 30000),
    staleTime: 15000,
  });
};

/**
 * Hook for Deal Margin Matrix (Row 3 Left).
 */
export const useDealMargins = (status?: string) => {
  return useQuery<DealMarginItem[], Error>({
    queryKey: ['reports', 'deal-margins', status],
    queryFn: () => fetchDealMargins(status),
    retry: false,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

/**
 * Hook for Receivables and Payables Aging Radar (Row 3 Right Top).
 * Refetches every 60 seconds when healthy; halts polling on query error.
 */
export const useAgingRadar = () => {
  return useQuery<AgingRadarResponse, Error>({
    queryKey: ['reports', 'aging-radar'],
    queryFn: fetchAgingRadar,
    retry: false,
    refetchInterval: (query) => (query.state.status === 'error' ? false : 60000),
    staleTime: 30000,
  });
};

/**
 * Hook for True Net Income Report (Row 3 Right Bottom).
 */
export const useNetIncome = (startDate?: string, endDate?: string) => {
  return useQuery<NetIncomeReport, Error>({
    queryKey: ['reports', 'net-income', { startDate, endDate }],
    queryFn: () => fetchNetIncome(startDate, endDate),
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Hook to fetch the Trial Balance report for Screen 3.
 * Re-fetches when startDate or endDate changes.
 * - Permanent accounts (Asset/Liability/Equity): cumulative up to endDate.
 * - Annual accounts (Revenue/Expense): strictly between startDate and endDate.
 */
export const useTrialBalance = (startDate?: string, endDate?: string) => {
  return useQuery<TrialBalanceReport, Error>({
    queryKey: ['trial-balance', { startDate, endDate }],
    queryFn: () => fetchTrialBalance(startDate, endDate),
    staleTime: 1000 * 30, // 30 seconds — financial data should stay fresh
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook to fetch the Chronological Account Ledger statement (drill-down).
 * Enabled only when accountId is provided.
 */
export const useAccountLedger = (
  accountId?: string,
  startDate?: string,
  endDate?: string
) => {
  return useQuery<LedgerStatement, Error>({
    queryKey: ['account-ledger', accountId, { startDate, endDate }],
    queryFn: () => fetchAccountLedger(accountId!, startDate, endDate),
    enabled: Boolean(accountId),
    staleTime: 1000 * 30,
  });
};

/**
 * Hook to fetch line-by-line project construction cost ledger.
 * Enabled only when projectId is provided.
 */
export const useProjectLedger = (
  projectId?: string,
  startDate?: string,
  endDate?: string
) => {
  return useQuery<ProjectLedgerReport, Error>({
    queryKey: ['reports', 'project-ledger', projectId, { startDate, endDate }],
    queryFn: () => fetchProjectLedger(projectId!, startDate, endDate),
    enabled: Boolean(projectId),
    staleTime: 1000 * 30,
  });
};

/**
 * Hook to fetch office overhead ledger.
 */
export const useOverheadLedger = (startDate?: string, endDate?: string) => {
  return useQuery<OverheadLedgerReport, Error>({
    queryKey: ['reports', 'overhead-ledger', { startDate, endDate }],
    queryFn: () => fetchOverheadLedger(startDate, endDate),
    staleTime: 1000 * 30,
  });
};

/**
 * Hook to fetch partner equity drawings ledger.
 */
export const useEquityLedger = (startDate?: string, endDate?: string) => {
  return useQuery<EquityLedgerReport, Error>({
    queryKey: ['reports', 'equity-drawings', { startDate, endDate }],
    queryFn: () => fetchEquityLedger(startDate, endDate),
    staleTime: 1000 * 30,
  });
};


