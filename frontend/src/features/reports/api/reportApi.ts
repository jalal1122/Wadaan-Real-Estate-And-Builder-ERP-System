import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/api';
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
 * Fetches real-time executive liquidity and liability snapshot (Row 2 KPI cards).
 */
export const fetchExecutiveSnapshot = async (): Promise<ExecutiveSnapshot> => {
  const response = await apiClient.get<ApiResponse<ExecutiveSnapshot>>('/reports/snapshot');
  return response.data.data!;
};

/**
 * Fetches deal margin matrix with WIP project asset guards.
 */
export const fetchDealMargins = async (status?: string): Promise<DealMarginItem[]> => {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const response = await apiClient.get<ApiResponse<DealMarginItem[]>>(`/reports/deal-margins${query}`);
  return response.data.data!;
};

/**
 * Fetches aging analysis for overdue receivables and pending vendor payables.
 */
export const fetchAgingRadar = async (): Promise<AgingRadarResponse> => {
  const response = await apiClient.get<ApiResponse<AgingRadarResponse>>('/reports/aging-radar');
  return response.data.data!;
};

/**
 * Fetches true net income report with overhead subtraction.
 */
export const fetchNetIncome = async (
  startDate?: string,
  endDate?: string
): Promise<NetIncomeReport> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  const query = params.toString() ? `?${params.toString()}` : '';

  const response = await apiClient.get<ApiResponse<NetIncomeReport>>(`/reports/net-income${query}`);
  return response.data.data!;
};

/**
 * Fetches Trial Balance report.
 * - Permanent accounts (Asset/Liability/Equity): cumulative up to endDate.
 * - Annual accounts (Revenue/Expense): strictly between startDate and endDate.
 */
export const fetchTrialBalance = async (
  startDate?: string,
  endDate?: string
): Promise<TrialBalanceReport> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  const query = params.toString() ? `?${params.toString()}` : '';

  const response = await apiClient.get<ApiResponse<TrialBalanceReport>>(
    `/reports/trial-balance${query}`
  );
  return response.data.data!;
};

/**
 * Fetches chronological ledger statement for an account (drill-down).
 */
export const fetchAccountLedger = async (
  accountId: string,
  startDate?: string,
  endDate?: string
): Promise<LedgerStatement> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  const query = params.toString() ? `?${params.toString()}` : '';

  const response = await apiClient.get<ApiResponse<LedgerStatement>>(
    `/journals/ledger/${encodeURIComponent(accountId)}${query}`
  );
  return response.data.data!;
};

/**
 * Fetches line-by-line construction cost ledger for a project.
 */
export const fetchProjectLedger = async (
  projectId: string,
  startDate?: string,
  endDate?: string
): Promise<ProjectLedgerReport> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  const query = params.toString() ? `?${params.toString()}` : '';

  const response = await apiClient.get<ApiResponse<ProjectLedgerReport>>(
    `/reports/project-ledger/${encodeURIComponent(projectId)}${query}`
  );
  return response.data.data!;
};

/**
 * Fetches non-project office overhead expenses.
 */
export const fetchOverheadLedger = async (
  startDate?: string,
  endDate?: string
): Promise<OverheadLedgerReport> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  const query = params.toString() ? `?${params.toString()}` : '';

  const response = await apiClient.get<ApiResponse<OverheadLedgerReport>>(
    `/reports/overhead-ledger${query}`
  );
  return response.data.data!;
};

/**
 * Fetches partner equity drawings for Arshad Khalil & Zeeshan Yousafzai.
 */
export const fetchEquityLedger = async (
  startDate?: string,
  endDate?: string
): Promise<EquityLedgerReport> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  const query = params.toString() ? `?${params.toString()}` : '';

  const response = await apiClient.get<ApiResponse<EquityLedgerReport>>(
    `/reports/equity-drawings${query}`
  );
  return response.data.data!;
};



