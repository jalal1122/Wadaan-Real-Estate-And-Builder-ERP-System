'use client';

import React, { useState, useMemo } from 'react';
import {
  SlidersHorizontal,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Printer,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import GLNavTabs from '@/components/accounting/GLNavTabs';
import { useTrialBalance } from '@/features/reports/hooks/useReports';
import { formatPKR } from '@/lib/formatters';
import { TrialBalanceLineItem, AccountCategory } from '@/features/reports/types';
import { Skeleton } from '@/components/ui/skeleton';
import { AccountLedgerPanel } from '@/components/accounting/AccountLedgerPanel';

// ────────────────────────────────────────────────────────────────────────────
// Date Preset helpers
// ────────────────────────────────────────────────────────────────────────────

type Preset = 'all-time' | 'this-month' | 'this-year' | 'custom';

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

/**
 * Formats a plain date string (YYYY-MM-DD) or ISO timestamp without timezone
 * shift. Using `new Date('2026-07-01')` in PKT (UTC+5) would roll back to
 * June 30 — this helper avoids that by reading date parts directly.
 */
function formatUTCDate(dateStr: string): string {
  // Grab just the date portion if an ISO timestamp was passed
  const datePart = dateStr.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  // Build a local Date from explicit parts — no UTC shift
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getPresetDates(preset: Preset): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed

  switch (preset) {
    case 'all-time':
      return { start: '2000-01-01', end: toDateStr(now) };
    case 'this-month':
      return {
        start: toDateStr(new Date(y, m, 1)),
        end: toDateStr(new Date(y, m + 1, 0)),
      };
    case 'this-year': {
      // Pakistani fiscal year: July 1 → June 30
      const fyStart = m >= 6 ? new Date(y, 6, 1) : new Date(y - 1, 6, 1);
      const fyEnd = new Date(fyStart.getFullYear() + 1, 5, 30);
      return { start: toDateStr(fyStart), end: toDateStr(fyEnd) };
    }
    default:
      return { start: '', end: '' };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Category metadata for visual grouping
// ────────────────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<AccountCategory, { label: string; badgeClass: string }> = {
  ASSET: { label: 'Asset', badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200' },
  LIABILITY: { label: 'Liability', badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200' },
  EQUITY: { label: 'Equity', badgeClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
  REVENUE: { label: 'Revenue', badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  EXPENSE: { label: 'Expense', badgeClass: 'bg-orange-50 text-orange-700 border border-orange-200' },
};

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────

export default function TrialBalancePage() {
  const [preset, setPreset] = useState<Preset>('this-year');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [search, setSearch] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<TrialBalanceLineItem | null>(null);

  // Derive active date range from preset
  const { start: activeStart, end: activeEnd } = useMemo(() => {
    if (preset === 'custom') return { start: customStart, end: customEnd };
    return getPresetDates(preset);
  }, [preset, customStart, customEnd]);

  const { data, isLoading, error, refetch } = useTrialBalance(
    activeStart || undefined,
    activeEnd || undefined
  );

  // Client-side search filter
  const filteredAccounts: TrialBalanceLineItem[] = useMemo(() => {
    if (!data?.accounts) return [];
    if (!search.trim()) return data.accounts;
    const q = search.toLowerCase();
    return data.accounts.filter(
      (a) =>
        a.accountCode.toLowerCase().includes(q) ||
        a.accountName.toLowerCase().includes(q)
    );
  }, [data, search]);

  const grandDebit = data?.grandTotalDebit ?? '0.00';
  const grandCredit = data?.grandTotalCredit ?? '0.00';
  const isBalanced = data?.isBalanced ?? false;

  // ────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* PAGE HEADER */}
      <div className="no-print flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Trial Balance</h1>
          <p className="text-xs text-slate-500 mt-1">
            Mathematical proof that Wadaan&apos;s books are balanced — read-only, real-time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh */}
          <button
            onClick={() => refetch()}
            className="p-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-2xs"
            title="Refresh trial balance"
            aria-label="Refresh trial balance"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Print / Export */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0F172A] rounded-lg hover:bg-slate-800 transition shadow-sm"
            aria-label="Print trial balance report"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-400" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* GL NAVIGATION */}
      <div className="no-print">
        <GLNavTabs />
      </div>

      {/* DATE FILTER BAR */}
      <div className="no-print flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="text-xs font-semibold text-slate-600 mr-2">Period:</span>

        {(['all-time', 'this-month', 'this-year', 'custom'] as Preset[]).map((p) => (
          <button
            key={p}
            onClick={() => setPreset(p)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
              preset === p
                ? 'bg-[#0F172A] text-white border-[#0F172A]'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {p === 'all-time' ? 'All Time' : p === 'this-month' ? 'This Month' : p === 'this-year' ? 'This Year (FY)' : 'Custom Range'}
          </button>
        ))}

        {/* Custom date inputs */}
        {preset === 'custom' && (
          <div className="flex items-center gap-2 ml-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 focus:border-[#0F172A] transition"
              aria-label="Start date"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 focus:border-[#0F172A] transition"
              aria-label="End date"
            />
          </div>
        )}

        {/* Period display */}
        {activeStart && activeEnd && (
          <span className="ml-auto text-[10px] text-slate-400 font-mono">
            {formatUTCDate(activeStart)}
            {' — '}
            {formatUTCDate(activeEnd)}
          </span>
        )}
      </div>

      {/* SEARCH BAR */}
      <div className="no-print flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter accounts by name or code..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 focus:border-[#0F172A] transition"
          />
        </div>
        <div className="text-xs text-slate-400">
          {filteredAccounts.length} accounts with non-zero balances
        </div>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div className="no-print p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>Failed to load Trial Balance. Please check connection and try again.</span>
          </div>
          <button
            onClick={() => refetch()}
            className="px-3 py-1 bg-white border border-rose-300 rounded text-rose-800 font-semibold hover:bg-rose-100 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* PRINT-ONLY INSTITUTIONAL LETTERHEAD */}
      <div className="print-only mb-6 pb-4 border-b-2 border-slate-800" data-testid="print-letterhead">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-black tracking-tight text-[#0F172A] uppercase">
              Wadaan Real Estate &amp; Builders (Pvt) Ltd.
            </h1>
            <h2 className="text-base font-bold text-slate-700 mt-0.5">
              Trial Balance Report
            </h2>
          </div>
          <div className="text-right text-xs text-slate-500 font-mono space-y-1">
            <p>
              <span className="font-semibold text-slate-700">Period: </span>
              {activeStart && activeEnd
                ? `${formatUTCDate(activeStart)} — ${formatUTCDate(activeEnd)}`
                : 'All Time'}
            </p>
            <p>
              <span className="font-semibold text-slate-700">Generated: </span>
              {new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Executive Grand Total Summary in Print Letterhead */}
        <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-3 gap-4" data-testid="print-grand-total-summary">
          <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Grand Total Debit
            </span>
            <span className="text-sm font-bold font-mono text-slate-900">
              {formatPKR(grandDebit)}
            </span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Grand Total Credit
            </span>
            <span className="text-sm font-bold font-mono text-slate-900">
              {formatPKR(grandCredit)}
            </span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded border border-slate-200 flex flex-col justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Audit Balance Status
            </span>
            <span className={`text-xs font-bold font-mono ${isBalanced ? 'text-emerald-700' : 'text-rose-700'}`}>
              {isBalanced ? '✓ BALANCES MATCH' : `⚠ DIFFERENCE: ${formatPKR(Math.abs(parseFloat(grandDebit) - parseFloat(grandCredit)))}`}
            </span>
          </div>
        </div>
      </div>

      {/* TRIAL BALANCE TABLE */}
      <div id="trial-balance-printable" className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">

        {/* Table Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#059669]" />
            <span className="text-sm font-bold text-[#0F172A]">Account Balances</span>
          </div>
          <span className="text-xs text-slate-400 italic">Read-only — edit data at the source</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <th className="py-3 px-6 w-28">Code</th>
                <th className="py-3 px-6">Account Name</th>
                <th className="py-3 px-4 w-28">Type</th>
                <th className="py-3 px-6 text-right w-44">Debit (PKR)</th>
                <th className="py-3 px-6 text-right w-44">Credit (PKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                [1, 2, 3, 4, 5, 6].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-6"><Skeleton className="h-4 w-12" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-40" /></td>
                    <td className="py-4 px-4"><Skeleton className="h-4 w-16 rounded" /></td>
                    <td className="py-4 px-6 text-right"><Skeleton className="h-4 w-24 ml-auto" /></td>
                    <td className="py-4 px-6 text-right"><Skeleton className="h-4 w-24 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-xs text-slate-400 italic">
                    {search ? `No accounts match "${search}"` : 'No balances for the selected period.'}
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((account) => {
                  const meta = CATEGORY_META[account.category];
                  const hasDebit = parseFloat(account.debit) > 0;
                  const hasCredit = parseFloat(account.credit) > 0;
                  return (
                    <tr
                      key={account.accountCode}
                      onClick={() => setSelectedAccount(account)}
                      className="hover:bg-emerald-50/60 cursor-pointer transition-colors group"
                      title="Click to drill down into chronological ledger transactions"
                    >
                      <td className="py-3 px-6 font-mono font-semibold text-slate-600 group-hover:text-emerald-700">
                        {account.accountCode}
                      </td>
                      <td className="py-3 px-6 font-medium text-slate-900 group-hover:text-emerald-950">
                        <div className="flex items-center justify-between">
                          <span>{account.accountName}</span>
                          <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:text-emerald-600 transition-opacity" />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${meta.badgeClass}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-right font-mono font-bold text-slate-800">
                        {hasDebit ? formatPKR(account.debit) : (
                          <span className="text-slate-300 font-normal">—</span>
                        )}
                      </td>
                      <td className="py-3 px-6 text-right font-mono font-bold text-slate-800">
                        {hasCredit ? formatPKR(account.credit) : (
                          <span className="text-slate-300 font-normal">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Grand Total Footer */}
            <tfoot className="border-t-2 border-slate-900" data-testid="print-grand-total">
              <tr className="bg-slate-100/90 border-b border-slate-300">
                <td colSpan={3} className="py-4 px-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Grand Total
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <span className="text-sm font-black font-mono text-slate-900">
                    {formatPKR(grandDebit)}
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <span className="text-sm font-black font-mono text-slate-900">
                    {formatPKR(grandCredit)}
                  </span>
                </td>
              </tr>

              {/* Balance indicator */}
              <tr className="border-t border-slate-200">
                <td colSpan={5} className="py-3 px-6">
                  <div className="flex justify-end">
                    {isLoading ? null : isBalanced ? (
                      <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Balances Match — Books are perfectly balanced
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Out of Balance — Difference: {formatPKR(Math.abs(parseFloat(grandDebit) - parseFloat(grandCredit)))}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Account Ledger Slide-over Drill-Down */}
      {selectedAccount && (
        <AccountLedgerPanel
          account={selectedAccount}
          startDate={activeStart || undefined}
          endDate={activeEnd || undefined}
          onClose={() => setSelectedAccount(null)}
        />
      )}
    </div>
  );
}
