'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Landmark,
  Plus,
  Search,
  Lock,
  CheckCircle2,
  MoreHorizontal,
  FileText,
  AlertCircle,
  RefreshCw,
  Calendar,
  Edit3,
  Trash2,
  Archive
} from 'lucide-react';
import { useChartOfAccounts } from '@/features/accounting/hooks/useAccounting';
import { AccountCategory, AccountWithBalance } from '@/features/accounting/types';
import { formatPKR } from '@/lib/formatters';
import CreateAccountModal from './_components/CreateAccountModal';
import EditAccountModal from './_components/EditAccountModal';
import DeleteAccountDialog from './_components/DeleteAccountDialog';
import GLNavTabs from '@/components/accounting/GLNavTabs';
import { Skeleton } from '@/components/ui/skeleton';

const CATEGORY_ORDER: AccountCategory[] = [
  'ASSET',
  'LIABILITY',
  'EQUITY',
  'REVENUE',
  'EXPENSE',
];

const CATEGORY_META: Record<
  AccountCategory,
  { label: string; badgeClass: string; headerClass: string }
> = {
  ASSET: {
    label: 'Assets',
    badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200',
    headerClass: 'text-blue-900 bg-blue-50/50',
  },
  LIABILITY: {
    label: 'Liabilities',
    badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200',
    headerClass: 'text-rose-900 bg-rose-50/50',
  },
  EQUITY: {
    label: 'Equity',
    badgeClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    headerClass: 'text-indigo-900 bg-indigo-50/50',
  },
  REVENUE: {
    label: 'Revenue',
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    headerClass: 'text-emerald-900 bg-emerald-50/50',
  },
  EXPENSE: {
    label: 'Expenses',
    badgeClass: 'bg-orange-50 text-orange-700 border border-orange-200',
    headerClass: 'text-orange-900 bg-orange-50/50',
  },
};

export default function AccountsPage() {
  const [fyMode, setFyMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountWithBalance | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<AccountWithBalance | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useChartOfAccounts(fyMode);

  // Filter accounts inside each category by search query
  const getFilteredAccounts = (accounts: AccountWithBalance[] = []) => {
    if (!searchQuery.trim()) return accounts;
    const query = searchQuery.toLowerCase().trim();
    return accounts.filter(
      (acc) =>
        acc.accountCode.toLowerCase().includes(query) ||
        acc.accountName.toLowerCase().includes(query)
    );
  };

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Chart of Accounts
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            General ledger account master grid, institutional anchor codes, and live computed balances.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Fiscal Year Toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={fyMode}
            onClick={() => setFyMode((prev) => !prev)}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
              fyMode
                ? 'bg-emerald-50 text-[#059669] border-emerald-300 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Calendar className={`w-3.5 h-3.5 ${fyMode ? 'text-[#059669]' : 'text-slate-400'}`} />
            <span>FY Boundary (July 1st)</span>
            <span
              className={`w-2 h-2 rounded-full ${
                fyMode ? 'bg-[#059669]' : 'bg-slate-300'
              }`}
            />
          </button>

          {/* Refresh */}
          <button
            onClick={() => refetch()}
            className="p-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-2xs"
            title="Refresh accounts"
            aria-label="Refresh accounts"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Add Account CTA */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0F172A] rounded-lg hover:bg-slate-800 transition shadow-sm"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* GENERAL LEDGER SUB-TAB NAVIGATION */}
      <GLNavTabs />

      {/* SUMMARY CARDS (3 KPI CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Assets */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Assets
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-[#059669]">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          {isLoading ? (
            <div className="h-8 w-36 bg-slate-200 animate-pulse rounded mt-2" />
          ) : (
            <div className="text-2xl font-bold text-[#059669] font-mono mt-2 tracking-tight">
              {formatPKR(data?.summary.totalAssets ?? 0)}
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Current + Fixed + WIP Assets
          </div>
        </div>

        {/* Total Liabilities */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Liabilities
            </span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          {isLoading ? (
            <div className="h-8 w-36 bg-slate-200 animate-pulse rounded mt-2" />
          ) : (
            <div className="text-2xl font-bold text-rose-600 font-mono mt-2 tracking-tight">
              {formatPKR(data?.summary.totalLiabilities ?? 0)}
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Payables + Advances + Escrows
          </div>
        </div>

        {/* Owner's Equity */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Owner&apos;s Equity
            </span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          {isLoading ? (
            <div className="h-8 w-36 bg-slate-200 animate-pulse rounded mt-2" />
          ) : (
            <div className="text-2xl font-bold text-blue-600 font-mono mt-2 tracking-tight">
              {formatPKR(data?.summary.totalEquity ?? 0)}
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Capital + Retained Earnings
          </div>
        </div>
      </div>

      {/* SEARCH AND CONTROLS BAR */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter accounts by name or code..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 focus:border-[#0F172A] transition"
          />
        </div>

        <div className="text-xs text-slate-400">
          Showing {data?.accounts.length ?? 0} total accounts across 5 groups
        </div>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>Failed to load accounts. Please check connection and try again.</span>
          </div>
          <button
            onClick={() => refetch()}
            className="px-3 py-1 bg-white border border-rose-300 rounded text-rose-800 font-semibold hover:bg-rose-100 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* GROUPED CATEGORY TABLES */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-slate-100 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          CATEGORY_ORDER.map((category) => {
            const allCategoryAccounts = data?.grouped?.[category] || [];
            const filteredAccounts = getFilteredAccounts(allCategoryAccounts);
            const meta = CATEGORY_META[category];

            // Subtotal for the category
            const subtotal = allCategoryAccounts.reduce(
              (sum, acc) => sum + parseFloat(acc.balance || '0'),
              0
            );

            return (
              <section
                key={category}
                className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
              >
                {/* Section Header */}
                <div className={`px-6 py-3.5 border-b border-slate-200 flex items-center justify-between ${meta.headerClass}`}>
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm font-bold uppercase tracking-wider">
                      {meta.label}
                    </h2>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/80 border border-slate-200/80 text-slate-700">
                      {filteredAccounts.length}{' '}
                      {filteredAccounts.length === 1 ? 'account' : 'accounts'}
                    </span>
                  </div>

                  <div className="text-xs font-mono font-bold text-slate-800">
                    <span className="text-[10px] font-normal uppercase text-slate-500 mr-2">
                      Subtotal:
                    </span>
                    {formatPKR(subtotal)}
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                        <th className="py-3 px-6 w-32">Account Code</th>
                        <th className="py-3 px-6">Account Name</th>
                        <th className="py-3 px-4 w-32">Category</th>
                        <th className="py-3 px-6 text-right w-44">Live Balance</th>
                        <th className="py-3 px-4 text-center w-28">Status</th>
                        <th className="py-3 px-4 text-right w-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <tr key={i} className="animate-pulse">
                            <td className="py-3 px-6"><Skeleton className="h-4 w-16" /></td>
                            <td className="py-3 px-6"><Skeleton className="h-4 w-40" /></td>
                            <td className="py-3 px-4"><Skeleton className="h-4 w-20 rounded" /></td>
                            <td className="py-3 px-6 text-right"><Skeleton className="h-4 w-24 ml-auto" /></td>
                            <td className="py-3 px-4 text-center"><Skeleton className="h-4 w-14 mx-auto rounded-full" /></td>
                            <td className="py-3 px-4 text-right"><Skeleton className="h-4 w-6 ml-auto" /></td>
                          </tr>
                        ))
                      ) : filteredAccounts.length > 0 ? (
                        filteredAccounts.map((account) => (
                          <tr
                            key={account.id}
                            className="hover:bg-slate-50/70 transition-colors group"
                          >
                            <td className="py-3 px-6 font-mono font-semibold text-slate-600">
                              {account.accountCode}
                            </td>
                            <td className="py-3 px-6 font-medium text-slate-900">
                              {account.accountName}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${meta.badgeClass}`}
                              >
                                {account.category}
                              </span>
                            </td>
                            <td className="py-3 px-6 text-right font-mono font-bold text-slate-800">
                              {formatPKR(account.balance)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {account.isSystemLocked ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                  <Lock className="w-3 h-3 text-slate-400" />
                                  <span>Locked</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-[#059669]" />
                                  <span>Active</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right relative">
                              <button
                                onClick={() =>
                                  setOpenDropdownId(
                                    openDropdownId === account.id ? null : account.id
                                  )
                                }
                                aria-label={`Actions for ${account.accountName}`}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>

                              {openDropdownId === account.id && (
                                <div className="absolute right-4 top-10 w-44 bg-white rounded-lg shadow-lg border border-slate-200 z-20 py-1 text-left animate-in fade-in zoom-in-95 duration-100">
                                  <Link
                                    href={`/accounts/${account.id}/ledger`}
                                    onClick={() => setOpenDropdownId(null)}
                                    className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                                    <span>View Ledger</span>
                                  </Link>
                                  <button
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      setEditingAccount(account);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition text-left"
                                  >
                                    <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Edit Account</span>
                                  </button>
                                  {!account.isSystemLocked && (
                                    <button
                                      onClick={() => {
                                        setOpenDropdownId(null);
                                        setDeletingAccount(account);
                                      }}
                                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition text-left border-t border-slate-100 ${
                                        parseFloat(account.totalDebit || '0') > 0 ||
                                        parseFloat(account.totalCredit || '0') > 0
                                          ? 'text-amber-700 hover:bg-amber-50'
                                          : 'text-rose-600 hover:bg-rose-50'
                                      }`}
                                    >
                                      {parseFloat(account.totalDebit || '0') > 0 ||
                                      parseFloat(account.totalCredit || '0') > 0 ? (
                                        <>
                                          <Archive className="w-3.5 h-3.5 text-amber-600" />
                                          <span>Archive Account</span>
                                        </>
                                      ) : (
                                        <>
                                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                          <span>Delete Account</span>
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={6}
                            className="py-6 px-6 text-center text-xs text-slate-400 italic"
                          >
                            No accounts found in this category matching &quot;{searchQuery}&quot;.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })
        )}
      </div>

      {/* CREATE ACCOUNT MODAL */}
      <CreateAccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        existingCodes={data?.accounts.map((a) => a.accountCode) ?? []}
      />

      {/* EDIT ACCOUNT MODAL */}
      <EditAccountModal
        account={editingAccount}
        isOpen={!!editingAccount}
        onClose={() => setEditingAccount(null)}
      />

      {/* DELETE / ARCHIVE DIALOG */}
      <DeleteAccountDialog
        account={deletingAccount}
        isOpen={!!deletingAccount}
        onClose={() => setDeletingAccount(null)}
      />
    </div>
  );
}
