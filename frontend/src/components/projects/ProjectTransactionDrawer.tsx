'use client';

import React from 'react';
import { useProjectTransactions } from '@/features/projects/hooks/useProjects';
import { formatPKR, formatDate } from '@/lib/format';
import {
  X,
  Building2,
  AlertCircle,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';

interface ProjectTransactionDrawerProps {
  projectId: string | null;
  onClose: () => void;
}

export const ProjectTransactionDrawer: React.FC<ProjectTransactionDrawerProps> = ({
  projectId,
  onClose,
}) => {
  const { data, isLoading, isError, refetch } = useProjectTransactions(projectId);

  if (!projectId) return null;

  const project = data?.project;
  const transactions = data?.transactions || [];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Drawer Panel */}
      <div 
        className="fixed inset-y-0 right-0 z-50 w-full max-w-4xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
        data-testid="project-transaction-drawer"
      >
        {/* Header */}
        <div className="p-6 bg-[#0F172A] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200">
              <Building2 className="w-5 h-5 text-[#059669]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white leading-tight">
                  {project?.projectName || 'Project Ledger Entries'}
                </h2>
                {project?.projectPrefix && (
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-emerald-400 font-semibold tracking-wider">
                    {project.projectPrefix}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                <span>General Ledger Project Cost Center</span>
                <span>•</span>
                <span className="capitalize">{project?.status || 'Active'}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            data-testid="close-project-drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="space-y-6 animate-pulse" data-testid="project-transactions-skeleton">
              {/* Financial KPI Strip Skeleton */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="h-20 bg-slate-100 rounded-xl"></div>
                <div className="h-20 bg-slate-100 rounded-xl"></div>
                <div className="h-20 bg-slate-100 rounded-xl"></div>
              </div>

              {/* Table Skeleton */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="h-6 w-48 bg-slate-200 rounded-md"></div>
                <div className="h-10 bg-slate-100 rounded-md"></div>
                <div className="h-10 bg-slate-100 rounded-md"></div>
                <div className="h-10 bg-slate-100 rounded-md"></div>
                <div className="h-10 bg-slate-100 rounded-md"></div>
              </div>
            </div>
          ) : isError ? (
            <div className="text-center py-16 flex flex-col items-center gap-3">
              <AlertCircle className="w-10 h-10 text-red-500" />
              <h3 className="text-base font-bold text-slate-800">Failed to load project transactions</h3>
              <p className="text-xs text-slate-500">There was an error communicating with the accounting ledger.</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-2 px-4 py-2 text-xs font-semibold bg-[#0F172A] text-white rounded-lg hover:bg-slate-800"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Cost Summary Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider">
                    <span>Total Debits (Cost)</span>
                    <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="mt-2 text-xl font-bold font-mono text-slate-900">
                    {formatPKR(data?.totalDebit ?? 0)}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider">
                    <span>Total Credits (Offsets)</span>
                    <ArrowDownLeft className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="mt-2 text-xl font-bold font-mono text-slate-900">
                    {formatPKR(data?.totalCredit ?? 0)}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-4 border border-slate-700">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    <span>Net Project WIP Balance</span>
                    <Layers className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="mt-2 text-xl font-bold font-mono text-emerald-400">
                    {formatPKR(data?.netBalance ?? 0)}
                  </div>
                </div>
              </div>

              {/* Transactions Table Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-slate-600" />
                    General Ledger Entries ({transactions.length})
                  </h3>
                  <span className="text-xs text-slate-400">Accrual-basis journal audit</span>
                </div>

                {transactions.length === 0 ? (
                  <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center space-y-2">
                    <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700">No GL transactions recorded yet</p>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      When vendor bills or manual journal entries are allocated to this project cost center, they will appear here with running balance audit.
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">JV Number</th>
                            <th className="py-2.5 px-3">Account</th>
                            <th className="py-2.5 px-3">Description / Memo</th>
                            <th className="py-2.5 px-3">Party</th>
                            <th className="py-2.5 px-3 text-right">Debit</th>
                            <th className="py-2.5 px-3 text-right">Credit</th>
                            <th className="py-2.5 px-3 text-right">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {transactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-medium">
                                {formatDate(tx.entryDate)}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap font-mono font-semibold text-slate-900">
                                {tx.entryNumber}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className="font-mono text-[11px] text-slate-500 mr-1.5">{tx.accountCode}</span>
                                <span className="text-slate-800 font-medium">{tx.accountName}</span>
                              </td>
                              <td className="py-2.5 px-3 max-w-xs truncate text-slate-600" title={tx.memo || tx.journalDescription}>
                                {tx.memo || tx.journalDescription}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                                {tx.partyName || '—'}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-slate-800">
                                {Number(tx.debitAmount) > 0 ? formatPKR(tx.debitAmount) : '—'}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-slate-800">
                                {Number(tx.creditAmount) > 0 ? formatPKR(tx.creditAmount) : '—'}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono font-semibold text-emerald-700">
                                {formatPKR(tx.runningBalance)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};
