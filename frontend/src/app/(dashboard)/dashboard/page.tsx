'use client';

import React from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Receipt as ReceiptIcon,
  RefreshCw,
  AlertCircle,
  Coins,
  ArrowDownRight,
  ChevronRight,
  Landmark
} from 'lucide-react';
import {
  useExecutiveSnapshot,
  useDealMargins,
  useAgingRadar,
  useNetIncome
} from '@/features/reports/hooks/useReports';
import { useWaitingRoom } from '@/features/receipts/hooks/useReceipts';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { useSystemInit } from '@/hooks/useSystemInit';
import { formatPKR } from '@/lib/formatters';

const getFeedErrorMessage = (error: unknown, defaultMessage = 'Offline / Unavailable') => {
  const apiError = error as { code?: string; message?: string } | null;
  if (apiError?.code === 'UNAUTHORIZED' || apiError?.code === 'TOKEN_EXPIRED') {
    return 'Session Required';
  }
  if (apiError?.code === 'NETWORK_OFFLINE') {
    return 'Backend Offline';
  }
  return defaultMessage;
};

export default function DashboardPage() {
  const {
    data: snapshot,
    isLoading: snapshotLoading,
    error: snapshotError,
    refetch: refetchSnapshot
  } = useExecutiveSnapshot();

  const {
    data: dealMargins,
    isLoading: dealsLoading,
    error: dealsError,
    refetch: refetchDeals
  } = useDealMargins();

  const {
    data: agingRadar,
    isLoading: agingLoading,
    error: agingError,
    refetch: refetchAging
  } = useAgingRadar();

  const {
    data: netIncome,
    isLoading: incomeLoading,
    error: incomeError,
    refetch: refetchIncome
  } = useNetIncome();

  const {
    data: waitingRoom,
    isLoading: waitingLoading,
    error: waitingError,
    refetch: refetchWaiting
  } = useWaitingRoom();

  const {
    data: projects,
    isLoading: projectsLoading,
    error: projectsError,
    refetch: refetchProjects
  } = useProjects();

  const { status } = useSystemInit();

  const handleRefreshAll = () => {
    refetchSnapshot();
    refetchDeals();
    refetchAging();
    refetchIncome();
    refetchWaiting();
    refetchProjects();
  };

  const getDealTypeBadge = (dealType: string) => {
    switch (dealType) {
      case 'CONSTRUCTION':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            CONSTRUCTION
          </span>
        );
      case 'WADAAN_SALE':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            WADAAN SALE
          </span>
        );
      case 'BROKERAGE':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            BROKERAGE
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {dealType}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* ROW 1: HEADER & ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            Executive Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time liquidity, liabilities, deal margins, and institutional project health.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefreshAll}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-2xs"
            title="Refresh all metrics"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Sync Feeds</span>
          </button>

          <Link
            href="/reports"
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0F172A] rounded-lg hover:bg-slate-800 transition shadow-sm"
          >
            <span>Generate Executive Report</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ROW 2: SURVIVAL SNAPSHOT (4 KPI CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Liquid Cash */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Liquid Cash
              </span>
              <div className="p-2 rounded-lg bg-emerald-50 text-[#059669]">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            {snapshotLoading ? (
              <div className="h-8 w-36 bg-slate-200 animate-pulse rounded mt-2" />
            ) : snapshotError ? (
              <div className="text-xs text-amber-600 mt-2">{getFeedErrorMessage(snapshotError)}</div>
            ) : (
              <div className="text-2xl font-bold text-[#059669] font-mono mt-2 tracking-tight">
                {formatPKR(snapshot?.liquidCash ?? 0)}
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
              Bank + Safe Combined ↑
            </span>
          </div>
        </div>

        {/* Card 2: Client Funds Held */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Client Funds Held
              </span>
              <div className="p-2 rounded-lg bg-red-50 text-red-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            {snapshotLoading ? (
              <div className="h-8 w-36 bg-slate-200 animate-pulse rounded mt-2" />
            ) : snapshotError ? (
              <div className="text-xs text-amber-600 mt-2">{getFeedErrorMessage(snapshotError)}</div>
            ) : (
              <div className="text-2xl font-bold text-red-600 font-mono mt-2 tracking-tight">
                {formatPKR(snapshot?.clientFundsHeld ?? 0)}
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center">
            <span className="text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded flex items-center gap-1">
              <span>DO NOT SPEND</span>
              <span className="text-[10px] font-normal">• Escrow / Advances</span>
            </span>
          </div>
        </div>

        {/* Card 3: Total Receivables */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Receivables
              </span>
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Coins className="w-4 h-4" />
              </div>
            </div>
            {snapshotLoading ? (
              <div className="h-8 w-36 bg-slate-200 animate-pulse rounded mt-2" />
            ) : snapshotError ? (
              <div className="text-xs text-amber-600 mt-2">{getFeedErrorMessage(snapshotError)}</div>
            ) : (
              <div className="text-2xl font-bold text-blue-600 font-mono mt-2 tracking-tight">
                {formatPKR(snapshot?.totalAR ?? 0)}
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded">
              {agingRadar?.receivables.length ?? 0} Pending Invoices
            </span>
          </div>
        </div>

        {/* Card 4: Total Payables */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Payables
              </span>
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <ReceiptIcon className="w-4 h-4" />
              </div>
            </div>
            {snapshotLoading ? (
              <div className="h-8 w-36 bg-slate-200 animate-pulse rounded mt-2" />
            ) : snapshotError ? (
              <div className="text-xs text-amber-600 mt-2">{getFeedErrorMessage(snapshotError)}</div>
            ) : (
              <div className="text-2xl font-bold text-amber-600 font-mono mt-2 tracking-tight">
                {formatPKR(snapshot?.totalAP ?? 0)}
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
              Thursday Run Queue Due
            </span>
          </div>
        </div>
      </div>

      {/* ROW 3: TWO-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: DEAL MARGIN LEDGER (60% width -> 7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">
                Deal Margin Ledger
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Gross profitability computed across active ventures and sales files.
              </p>
            </div>
            <Link
              href="/receivables"
              className="text-xs font-semibold text-[#0F172A] hover:text-[#059669] flex items-center gap-1 transition"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 overflow-x-auto">
            {dealsLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 bg-slate-100 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : dealsError ? (
              <div className="p-6 text-center text-xs text-amber-600 flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{getFeedErrorMessage(dealsError, 'Unable to load deal margins. Verify backend connectivity.')}</span>
              </div>
            ) : dealMargins && dealMargins.length > 0 ? (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                    <th className="py-3 px-4">Deal / Customer</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-4 text-right">Revenue Billed</th>
                    <th className="py-3 px-4 text-right">Gross Profit</th>
                    <th className="py-3 px-4 text-right">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dealMargins.map((item) => (
                    <tr key={item.dealId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">
                          {item.projectName ? item.projectName : 'Commission Deal'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {item.customerName}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {getDealTypeBadge(item.dealType)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-700">
                        {item.isWipAsset ? '—' : formatPKR(item.revenueCollected)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold">
                        {item.isWipAsset ? (
                          <span className="text-slate-400 font-normal">—</span>
                        ) : parseFloat(item.grossProfit) >= 0 ? (
                          <span className="text-emerald-600">
                            {formatPKR(item.grossProfit)}
                          </span>
                        ) : (
                          <span className="text-rose-600">
                            {formatPKR(item.grossProfit)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {item.isWipAsset ? (
                          <span className="italic text-slate-400 font-normal">
                            In Progress
                          </span>
                        ) : parseFloat(item.marginPercentage) >= 0 ? (
                          <span className="text-emerald-700">
                            {item.marginPercentage}%
                          </span>
                        ) : (
                          <span className="text-rose-600">
                            {item.marginPercentage}%
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No deal margin records available yet.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: AGING RADAR & NET INCOME (40% width -> 5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* TOP CARD: AGING RADAR */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Aging Radar</h3>
                <p className="text-[11px] text-slate-400">
                  Critical overdue collections and vendor dues.
                </p>
              </div>
              <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">
                Priority Filter
              </span>
            </div>

            <div className="p-4 space-y-4">
              {agingLoading ? (
                <div className="space-y-2">
                  <div className="h-6 bg-slate-100 animate-pulse rounded" />
                  <div className="h-6 bg-slate-100 animate-pulse rounded" />
                  <div className="h-6 bg-slate-100 animate-pulse rounded" />
                </div>
              ) : agingError ? (
                <div className="text-xs text-amber-600 text-center py-2">
                  {getFeedErrorMessage(agingError, 'Unable to load aging radar data.')}
                </div>
              ) : (
                <>
                  {/* Overdue Receivables */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Overdue Receivables
                      </span>
                      <Link
                        href="/receivables"
                        className="text-[11px] font-semibold text-blue-600 hover:underline"
                      >
                        All ({agingRadar?.receivables.length ?? 0})
                      </Link>
                    </div>

                    {agingRadar?.receivables && agingRadar.receivables.length > 0 ? (
                      <div className="space-y-1.5">
                        {agingRadar.receivables.slice(0, 3).map((item) => (
                          <div
                            key={item.invoiceId}
                            className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-semibold text-slate-800 truncate">
                                {item.customerName}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {item.description}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="font-mono font-bold text-slate-800">
                                {formatPKR(item.amount)}
                              </div>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                  item.daysOverdue > 0
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {item.daysOverdue > 0
                                  ? `${item.daysOverdue}d overdue`
                                  : 'Due Today'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 py-1 italic">
                        No overdue client invoices.
                      </div>
                    )}
                  </div>

                  {/* Pending Payables */}
                  <div className="pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Pending Vendor Payables
                      </span>
                      <Link
                        href="/payables"
                        className="text-[11px] font-semibold text-amber-600 hover:underline"
                      >
                        All ({agingRadar?.payables.length ?? 0})
                      </Link>
                    </div>

                    {agingRadar?.payables && agingRadar.payables.length > 0 ? (
                      <div className="space-y-1.5">
                        {agingRadar.payables.slice(0, 3).map((item) => (
                          <div
                            key={item.billId}
                            className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-semibold text-slate-800 truncate">
                                {item.vendorName}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                #{item.invoiceNumber}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="font-mono font-bold text-slate-800">
                                {formatPKR(item.pendingAmount)}
                              </div>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                  item.daysOverdue > 0
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {item.daysOverdue > 0
                                  ? `${item.daysOverdue}d overdue`
                                  : 'Current'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 py-1 italic">
                        No pending vendor bills.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* BOTTOM CARD: TRUE NET INCOME */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">
                  True Net Income
                </h3>
                <p className="text-[11px] text-slate-400">
                  Overhead subtracted from closed venture profits.
                </p>
              </div>
              <span className="text-[10px] font-semibold bg-emerald-50 text-[#059669] border border-emerald-200 px-2 py-0.5 rounded">
                FYTD July 1
              </span>
            </div>

            {incomeLoading ? (
              <div className="py-4 space-y-2">
                <div className="h-5 bg-slate-100 animate-pulse rounded" />
                <div className="h-5 bg-slate-100 animate-pulse rounded" />
                <div className="h-8 bg-slate-100 animate-pulse rounded" />
              </div>
            ) : incomeError ? (
              <div className="text-xs text-amber-600 text-center py-4">
                {getFeedErrorMessage(incomeError, 'Unable to load net income report.')}
              </div>
            ) : (
              <div className="pt-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Gross Deal Profit</span>
                  <span className="font-mono font-semibold text-emerald-600">
                    {formatPKR(netIncome?.grossDealProfit ?? 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span>Brokerage Commissions</span>
                  <span className="font-mono font-semibold text-slate-700">
                    {formatPKR(netIncome?.brokerageCommissions ?? 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span>— General Overhead</span>
                  <span className="font-mono font-semibold text-rose-600">
                    {formatPKR(netIncome?.generalOverhead ?? 0)}
                  </span>
                </div>

                <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">
                    NET INCOME
                  </span>
                  <span className="font-mono font-bold text-xl text-[#059669]">
                    {formatPKR(netIncome?.netIncome ?? 0)}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 text-right">
                  Fiscal period:{' '}
                  {netIncome?.period?.startDate
                    ? new Date(netIncome.period.startDate).toLocaleDateString()
                    : 'July 1'}
                  {' — '}
                  {netIncome?.period?.endDate
                    ? new Date(netIncome.period.endDate).toLocaleDateString()
                    : 'Present'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ROW 4: BOTTOM STRIP (3 CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card A: Cheque Waiting Room */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#0F172A]">
                  Cheque Waiting Room
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full">
                  {waitingRoom?.length ?? 0}
                </span>
              </div>
              <Link
                href="/receipts"
                className="text-[11px] font-semibold text-[#0F172A] hover:text-[#059669] flex items-center gap-0.5 transition"
              >
                <span>Clearances</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="pt-3">
              {waitingLoading ? (
                <div className="space-y-2">
                  <div className="h-6 bg-slate-100 animate-pulse rounded" />
                  <div className="h-6 bg-slate-100 animate-pulse rounded" />
                </div>
              ) : waitingError ? (
                <div className="text-xs text-amber-600 py-2">
                  {getFeedErrorMessage(waitingError, 'Unable to load waiting room.')}
                </div>
              ) : waitingRoom && waitingRoom.length > 0 ? (
                <div className="space-y-2">
                  {waitingRoom.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="p-2 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-slate-800 truncate">
                          {item.customer.fullName}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {item.bankName || 'Bank'} • {item.referenceNo || 'Cheque'}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-mono font-bold text-slate-800">
                          {formatPKR(item.totalAmount ?? 0)}
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {new Date(item.receiptDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <CheckCircle2 className="w-8 h-8 text-[#059669] mb-2" />
                  <span className="text-xs font-semibold text-slate-700">
                    All cheques cleared
                  </span>
                  <span className="text-[10px] text-slate-400">
                    No pending instrument clearances in escrow.
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 mt-3">
            <Link
              href="/receipts"
              className="text-xs text-[#059669] hover:underline font-semibold block text-center"
            >
              Manage Post-Dated Cheques →
            </Link>
          </div>
        </div>

        {/* Card B: Active Projects */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#0F172A]">
                  Active Projects
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded-full">
                  {projects?.length ?? 0}
                </span>
              </div>
              <Link
                href="/projects"
                className="text-[11px] font-semibold text-[#0F172A] hover:text-[#059669] flex items-center gap-0.5 transition"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="pt-3">
              {projectsLoading ? (
                <div className="space-y-3">
                  <div className="h-8 bg-slate-100 animate-pulse rounded" />
                  <div className="h-8 bg-slate-100 animate-pulse rounded" />
                </div>
              ) : projectsError ? (
                <div className="text-xs text-amber-600 py-2">
                  {getFeedErrorMessage(projectsError, 'Unable to load active projects.')}
                </div>
              ) : projects && projects.length > 0 ? (
                <div className="space-y-3">
                  {projects.slice(0, 3).map((item) => {
                    const burn = Math.min(item.budgetBurnPercentage || 0, 100);
                    const isRed = item.isOverBudget || burn >= 100;
                    const isAmber = !isRed && burn >= 80;

                    return (
                      <div key={item.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 min-w-0 pr-2">
                            <span className="font-semibold text-slate-800 truncate">
                              {item.projectName}
                            </span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono font-medium flex-shrink-0">
                              {item.projectPrefix}
                            </span>
                          </div>
                          <span
                            className={`text-[11px] font-mono font-bold ${
                              isRed
                                ? 'text-red-600'
                                : isAmber
                                ? 'text-amber-600'
                                : 'text-[#059669]'
                            }`}
                          >
                            {item.budgetBurnPercentage}%
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              isRed
                                ? 'bg-red-500'
                                : isAmber
                                ? 'bg-amber-500'
                                : 'bg-[#059669]'
                            }`}
                            style={{ width: `${burn}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>
                            Spent: {formatPKR(item.spentToDate)}
                          </span>
                          <span>BOQ: {formatPKR(item.masterBOQ)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-slate-400 italic">
                  No active construction sites found.
                </div>
              )}
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 mt-3">
            <Link
              href="/projects"
              className="text-xs text-[#059669] hover:underline font-semibold block text-center"
            >
              Open Site WIP Ledgers →
            </Link>
          </div>
        </div>

        {/* Card C: Institutional System Status */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-[#0F172A]">
                System Governance
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-ping" />
                <span>Operational</span>
              </span>
            </div>

            <div className="pt-3 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">ACID Ledger Status</span>
                <span className="font-semibold text-emerald-700">
                  Active &amp; Balanced
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Go-Live Initialized</span>
                <span className="font-mono text-slate-700">
                  {status?.goLiveDate
                    ? new Date(status.goLiveDate).toLocaleDateString()
                    : 'Active'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Enclave Security</span>
                <span className="text-slate-700 font-medium">
                  TLS 1.3 / DPAPI
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Database Engine</span>
                <span className="text-slate-700 font-medium">
                  Cloud PostgreSQL (Supabase)
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-[11px] text-slate-400">
            <span>Hardware Enclave Protected</span>
            <span className="font-semibold text-slate-600">v1.3 Institutional</span>
          </div>
        </div>
      </div>
    </div>
  );
}
