'use client';

import React, { useEffect } from 'react';
import { useAccountLedger } from '@/features/reports/hooks/useReports';
import { TrialBalanceLineItem } from '@/features/reports/types';
import { formatPKR } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import {
  X,
  BookOpen,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Layers,
  RotateCcw,
  CheckCircle2,
  Printer,
} from 'lucide-react';

interface AccountLedgerPanelProps {
  account: TrialBalanceLineItem | null;
  startDate?: string;
  endDate?: string;
  onClose: () => void;
}

export const AccountLedgerPanel: React.FC<AccountLedgerPanelProps> = ({
  account,
  startDate,
  endDate,
  onClose,
}) => {
  // Use accountId if available, fallback to accountCode
  const lookupId = account?.accountId || account?.accountCode;

  const { data: ledger, isLoading, isFetching, refetch } = useAccountLedger(
    lookupId,
    startDate,
    endDate
  );

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!account) return null;

  const isDebitNormal =
    account.category === 'ASSET' || account.category === 'EXPENSE';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden print:static print:h-auto print:overflow-visible">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 no-print"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 print:static print:p-0 print:w-full print:block">
        <div
          data-testid="account-ledger-panel"
          className="w-screen max-w-3xl bg-white shadow-2xl border-l border-slate-200 flex flex-col justify-between animate-in slide-in-from-right duration-300 print:w-full print:max-w-none print:shadow-none print:border-none print:animate-none"
        >
          {/* Header */}
          <div className="no-print px-6 py-5 bg-[#0F172A] text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                  {account.accountCode}
                </span>
                <h2 className="text-base font-bold text-white tracking-tight">
                  {account.accountName}
                </h2>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {account.category}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Ledger statement period:{' '}
                <span className="text-slate-300 font-medium">
                  {startDate || 'All-Time'} &mdash; {endDate || 'Current'}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                title="Print Export"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                title="Refresh Ledger"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
              >
                <RotateCcw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                title="Close (Esc)"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 print:overflow-visible print:bg-white print:p-0">
            
            {/* PRINT-ONLY INSTITUTIONAL LETTERHEAD */}
            <div className="print-only mb-6 pb-4 border-b-2 border-slate-800">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-[#0F172A] uppercase">
                    Wadaan Real Estate & Builders (Pvt) Ltd.
                  </h1>
                  <h2 className="text-base font-bold text-slate-700 mt-0.5">
                    Account Ledger Report
                  </h2>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300">
                      {account.accountCode}
                    </span>
                    <span className="text-sm font-bold text-slate-800 tracking-tight">
                      {account.accountName}
                    </span>
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-300">
                      {account.category}
                    </span>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500 font-mono space-y-1">
                  <p>
                    <span className="font-semibold text-slate-700">Period: </span>
                    {startDate || 'All-Time'} &mdash; {endDate || 'Current'}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">Generated: </span>
                    {new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Opening Balance */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Opening Balance
                </span>
                <span className="text-sm font-black font-mono text-slate-900 mt-1 block">
                  {isLoading ? (
                    <Skeleton className="h-5 w-20 mt-1" />
                  ) : (
                    formatPKR(ledger?.openingBalance ?? 0)
                  )}
                </span>
              </div>

              {/* Total Debits */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" /> Debits
                </span>
                <span className="text-sm font-black font-mono text-blue-900 mt-1 block">
                  {isLoading ? (
                    <Skeleton className="h-5 w-20 mt-1" />
                  ) : (
                    formatPKR(ledger?.totalDebits ?? 0)
                  )}
                </span>
              </div>

              {/* Total Credits */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block flex items-center gap-1">
                  <ArrowDownLeft className="w-3 h-3" /> Credits
                </span>
                <span className="text-sm font-black font-mono text-amber-900 mt-1 block">
                  {isLoading ? (
                    <Skeleton className="h-5 w-20 mt-1" />
                  ) : (
                    formatPKR(ledger?.totalCredits ?? 0)
                  )}
                </span>
              </div>

              {/* Closing Balance */}
              <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-2xs">
                <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Closing Net
                </span>
                <span className="text-sm font-black font-mono text-emerald-950 mt-1 block">
                  {isLoading ? (
                    <Skeleton className="h-5 w-20 mt-1" />
                  ) : (
                    formatPKR(ledger?.closingBalance ?? 0)
                  )}
                </span>
              </div>
            </div>

            {/* Transactions Ledger Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-slate-500" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Chronological Transaction Entries
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {ledger?.transactions?.length ?? 0} Transactions
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10.5px] font-semibold select-none">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Entry #</th>
                      <th className="py-2.5 px-3">Description / Memo</th>
                      <th className="py-2.5 px-3 text-right">Debit</th>
                      <th className="py-2.5 px-3 text-right">Credit</th>
                      <th className="py-2.5 px-3 text-right font-bold">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="py-3 px-3"><Skeleton className="h-4 w-16" /></td>
                          <td className="py-3 px-3"><Skeleton className="h-4 w-20" /></td>
                          <td className="py-3 px-3"><Skeleton className="h-4 w-40" /></td>
                          <td className="py-3 px-3 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                          <td className="py-3 px-3 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                          <td className="py-3 px-3 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                        </tr>
                      ))
                    ) : !ledger?.transactions || ledger.transactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                          <Layers className="w-6 h-6 mx-auto text-slate-300 mb-1.5" />
                          No journal transactions recorded for this account in the selected period.
                        </td>
                      </tr>
                    ) : (
                      ledger.transactions.map((tx) => {
                        const txDate = new Date(tx.entryDate).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        });
                        const hasDebit = parseFloat(tx.debitAmount) > 0;
                        const hasCredit = parseFloat(tx.creditAmount) > 0;

                        return (
                          <tr
                            key={tx.id}
                            className="hover:bg-slate-50/70 transition-colors"
                          >
                            <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                              {txDate}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">
                              {tx.entryNumber}
                            </td>
                            <td className="py-2.5 px-3 text-slate-800 max-w-[220px] truncate" title={tx.description}>
                              {tx.description}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                              {hasDebit ? (
                                formatPKR(tx.debitAmount)
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                              {hasCredit ? (
                                formatPKR(tx.creditAmount)
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 bg-slate-50/50">
                              {formatPKR(tx.runningBalance)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="no-print px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs text-slate-600">
            <span>
              Zero-sum balanced Ledger &bull; Standard Double-Entry Accounting
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs"
            >
              Close Panel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
