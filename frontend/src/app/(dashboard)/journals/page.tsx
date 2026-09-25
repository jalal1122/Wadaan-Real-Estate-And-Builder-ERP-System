'use client';

import React, { useState, useCallback } from 'react';
import {
  Plus,
  Trash2,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import GLNavTabs from '@/components/accounting/GLNavTabs';
import { useChartOfAccounts } from '@/features/accounting/hooks/useAccounting';
import { useCreateJournal, useJournalEntries } from '@/features/accounting/hooks/useJournals';
import { useCustomers, useVendors } from '@/features/accounting/hooks/useParties';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { formatPKR } from '@/lib/formatters';
import { JournalLinePayload } from '@/features/accounting/types/journal';
import { Skeleton } from '@/components/ui/skeleton';

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0];
const generateLineId = () => Math.random().toString(36).slice(2, 9);

interface LineRow {
  _id: string;
  accountId: string;
  debitAmount: string;
  creditAmount: string;
  memo: string;
  partyId: string;       // combined: "customer:uuid" | "vendor:uuid" | ""
  projectId: string;
}

const emptyLine = (): LineRow => ({
  _id: generateLineId(),
  accountId: '',
  debitAmount: '',
  creditAmount: '',
  memo: '',
  partyId: '',
  projectId: '',
});

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────

export default function JournalsPage() {
  const [entryDate, setEntryDate] = useState(today());
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<LineRow[]>([emptyLine(), emptyLine()]);
  const [successMsg, setSuccessMsg] = useState('');

  const [journalPage, setJournalPage] = useState(1);

  // Data sources for dropdowns
  const { data: accountsData } = useChartOfAccounts();
  const { data: customers = [] } = useCustomers();
  const { data: vendors = [] } = useVendors();
  const { data: projectsList = [] } = useProjects();
  const { data: journalList, isLoading: listLoading, refetch: refetchList } = useJournalEntries(journalPage, 25);

  const totalPages = Math.max(1, Math.ceil((journalList?.total ?? 0) / (journalList?.limit || 25)));

  const { mutate: postJournal, isPending, error: postError } = useCreateJournal();

  // Filter out system-locked accounts from the dropdown per screen2JournalEntry.md rules
  const availableAccounts = (accountsData?.accounts ?? []).filter(
    (a) => !a.isSystemLocked && !a.isArchived
  );

  // ── Balance calculation ──────────────────────────────────────────────────
  const totalDebits = lines.reduce((s, l) => s + (parseFloat(l.debitAmount) || 0), 0);
  const totalCredits = lines.reduce((s, l) => s + (parseFloat(l.creditAmount) || 0), 0);
  const difference = Math.abs(totalDebits - totalCredits);
  const isBalanced = totalDebits > 0 && Math.abs(totalDebits - totalCredits) < 0.001;
  const canPost = isBalanced && description.trim().length > 0 && lines.every((l) => l.accountId);

  // ── Line update helpers ──────────────────────────────────────────────────
  const updateLine = useCallback((id: string, field: keyof LineRow, value: string) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l._id !== id) return l;
        const updated = { ...l, [field]: value };
        // Mutual exclusivity: clear the other side when a value is entered
        if (field === 'debitAmount' && value && parseFloat(value) > 0) {
          updated.creditAmount = '';
        }
        if (field === 'creditAmount' && value && parseFloat(value) > 0) {
          updated.debitAmount = '';
        }
        return updated;
      })
    );
  }, []);

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);

  const removeLine = (id: string) => {
    if (lines.length <= 2) return; // minimum 2 lines
    setLines((prev) => prev.filter((l) => l._id !== id));
  };

  const resetForm = () => {
    setEntryDate(today());
    setDescription('');
    setLines([emptyLine(), emptyLine()]);
    setSuccessMsg('');
  };

  // ── Submission ───────────────────────────────────────────────────────────
  const handlePost = () => {
    if (!canPost) return;

    const payload: JournalLinePayload[] = lines.map((l) => {
      let customerId: string | null = null;
      let vendorId: string | null = null;
      if (l.partyId.startsWith('customer:')) customerId = l.partyId.replace('customer:', '');
      if (l.partyId.startsWith('vendor:')) vendorId = l.partyId.replace('vendor:', '');

      return {
        accountId: l.accountId,
        debitAmount: parseFloat(l.debitAmount) || 0,
        creditAmount: parseFloat(l.creditAmount) || 0,
        memo: l.memo || null,
        customerId,
        vendorId,
        projectId: l.projectId || null,
      };
    });

    postJournal(
      { entryDate, description, lines: payload },
      {
        onSuccess: (data) => {
          resetForm();
          setSuccessMsg(`Journal entry ${data.entryNumber} posted successfully.`);
          setJournalPage(1);
          refetchList();
        },
      }
    );
  };

  // ────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">General Journal</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manual double-entry adjustments — owner withdrawals, opening balances, error corrections.
          </p>
        </div>
        <button
          onClick={() => refetchList()}
          className="p-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-2xs"
          title="Refresh journal list"
          aria-label="Refresh journal list"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* GL NAVIGATION */}
      <GLNavTabs />

      {/* SUCCESS BANNER */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="ml-auto text-emerald-600 hover:text-emerald-800 font-bold">×</button>
        </div>
      )}

      {/* ERROR BANNER */}
      {postError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{(postError as { message: string }).message || 'Failed to post journal entry.'}</span>
        </div>
      )}

      {/* ── CREATE JOURNAL ENTRY PANEL ────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">

        {/* Panel Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#059669]" />
            <span className="text-sm font-bold text-[#0F172A]">New Journal Voucher</span>
          </div>
          <span className="text-xs text-slate-400 font-mono">JV-#### (auto-generated)</span>
        </div>

        <div className="p-6 space-y-6">
          {/* Entry Meta Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Entry Date</label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 focus:border-[#0F172A] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Description <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Owner withdrawal for personal use"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 focus:border-[#0F172A] transition"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <th className="py-3 px-4 w-[22%]">Account <span className="text-rose-400">*</span></th>
                  <th className="py-3 px-4 w-[20%]">Party (Customer / Vendor)</th>
                  <th className="py-3 px-4 w-[14%]">Project</th>
                  <th className="py-3 px-4 w-[14%] text-right">Debit (PKR)</th>
                  <th className="py-3 px-4 w-[14%] text-right">Credit (PKR)</th>
                  <th className="py-3 px-4 w-[12%]">Memo</th>
                  <th className="py-3 px-4 w-[4%]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((line, idx) => {
                  const hasDebit = parseFloat(line.debitAmount) > 0;
                  const hasCredit = parseFloat(line.creditAmount) > 0;
                  return (
                    <tr key={line._id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Account */}
                      <td className="py-2 px-3">
                        <div className="relative">
                          <select
                            value={line.accountId}
                            onChange={(e) => updateLine(line._id, 'accountId', e.target.value)}
                            className="w-full appearance-none pl-2 pr-6 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 focus:border-[#0F172A] transition"
                          >
                            <option value="">— Select account —</option>
                            {['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].map((cat) => {
                              const catAccs = availableAccounts.filter((a) => a.category === cat);
                              if (!catAccs.length) return null;
                              return (
                                <optgroup key={cat} label={cat}>
                                  {catAccs.map((a) => (
                                    <option key={a.id} value={a.id}>
                                      {a.accountCode} — {a.accountName}
                                    </option>
                                  ))}
                                </optgroup>
                              );
                            })}
                          </select>
                          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                        </div>
                      </td>

                      {/* Party */}
                      <td className="py-2 px-3">
                        <div className="relative">
                          <select
                            value={line.partyId}
                            onChange={(e) => updateLine(line._id, 'partyId', e.target.value)}
                            className="w-full appearance-none pl-2 pr-6 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 focus:border-[#0F172A] transition"
                          >
                            <option value="">— None —</option>
                            {customers.length > 0 && (
                              <optgroup label="Customers">
                                {customers.map((c) => (
                                  <option key={c.id} value={`customer:${c.id}`}>{c.label}</option>
                                ))}
                              </optgroup>
                            )}
                            {vendors.length > 0 && (
                              <optgroup label="Vendors">
                                {vendors.map((v) => (
                                  <option key={v.id} value={`vendor:${v.id}`}>{v.label}</option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                        </div>
                      </td>

                      {/* Project */}
                      <td className="py-2 px-3">
                        <div className="relative">
                          <select
                            value={line.projectId}
                            onChange={(e) => updateLine(line._id, 'projectId', e.target.value)}
                            className="w-full appearance-none pl-2 pr-6 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 focus:border-[#0F172A] transition"
                          >
                            <option value="">— None —</option>
                            {projectsList.map((p) => (
                              <option key={p.id} value={p.id}>{p.projectName}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                        </div>
                      </td>

                      {/* Debit */}
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.debitAmount}
                          disabled={hasCredit}
                          onChange={(e) => updateLine(line._id, 'debitAmount', e.target.value)}
                          placeholder="0.00"
                          className="w-full text-right px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-white font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 focus:border-[#0F172A] transition disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                        />
                      </td>

                      {/* Credit */}
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.creditAmount}
                          disabled={hasDebit}
                          onChange={(e) => updateLine(line._id, 'creditAmount', e.target.value)}
                          placeholder="0.00"
                          className="w-full text-right px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-white font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 focus:border-[#0F172A] transition disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                        />
                      </td>

                      {/* Memo */}
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={line.memo}
                          maxLength={200}
                          onChange={(e) => updateLine(line._id, 'memo', e.target.value)}
                          placeholder="Optional note"
                          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 focus:border-[#0F172A] transition"
                        />
                      </td>

                      {/* Remove */}
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => removeLine(line._id)}
                          disabled={lines.length <= 2}
                          className="p-1 text-slate-300 hover:text-rose-500 disabled:opacity-30 disabled:cursor-not-allowed transition"
                          aria-label={`Remove line ${idx + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Balance Footer */}
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td colSpan={3} className="py-3 px-4">
                    <button
                      onClick={addLine}
                      className="flex items-center gap-1.5 text-xs font-medium text-[#059669] hover:text-emerald-700 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Line Item
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Total Debit</div>
                    <div className="text-sm font-bold font-mono text-slate-800">{formatPKR(totalDebits)}</div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Total Credit</div>
                    <div className="text-sm font-bold font-mono text-slate-800">{formatPKR(totalCredits)}</div>
                  </td>
                  <td colSpan={2} className="py-3 px-4 text-center">
                    {totalDebits > 0 || totalCredits > 0 ? (
                      isBalanced ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Balanced
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertCircle className="w-3 h-3" /> Diff: {formatPKR(difference)}
                        </span>
                      )
                    ) : null}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              Clear Form
            </button>
            <button
              onClick={handlePost}
              disabled={!canPost || isPending}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#0F172A] rounded-lg hover:bg-slate-800 transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Posting…</span>
                </>
              ) : (
                <>
                  <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Post Journal Entry</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── JOURNAL HISTORY TABLE ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm font-bold text-[#0F172A]">Recent Journal Entries</span>
          <span className="text-xs text-slate-400">{journalList?.total ?? 0} total entries</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <th className="py-3 px-6 w-28">Voucher #</th>
                <th className="py-3 px-6 w-28">Date</th>
                <th className="py-3 px-6">Description</th>
                <th className="py-3 px-6 text-right w-32">Total Dr</th>
                <th className="py-3 px-6 text-right w-32">Total Cr</th>
                <th className="py-3 px-4 w-20">Lines</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {listLoading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-6"><Skeleton className="h-4 w-20" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-48" /></td>
                    <td className="py-4 px-6 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                    <td className="py-4 px-6 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                    <td className="py-4 px-4 text-center"><Skeleton className="h-4 w-8 mx-auto rounded" /></td>
                  </tr>
                ))
              ) : journalList?.entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 px-6 text-center text-xs text-slate-400 italic">
                    No journal entries yet. Post your first entry above.
                  </td>
                </tr>
              ) : (
                journalList?.entries.map((entry) => {
                  const dr = entry.lines.reduce((s, l) => s + parseFloat(l.debitAmount || '0'), 0);
                  const cr = entry.lines.reduce((s, l) => s + parseFloat(l.creditAmount || '0'), 0);
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-6 font-mono font-bold text-[#059669]">{entry.entryNumber}</td>
                      <td className="py-3 px-6 text-slate-600">
                        {new Date(entry.entryDate).toLocaleDateString('en-PK', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </td>
                      <td className="py-3 px-6 text-slate-800">{entry.description}</td>
                      <td className="py-3 px-6 text-right font-mono text-slate-700">{formatPKR(dr)}</td>
                      <td className="py-3 px-6 text-right font-mono text-slate-700">{formatPKR(cr)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold">
                          {entry.lines.length}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <p className="text-xs text-slate-500">
            Showing{' '}
            <span className="font-semibold text-slate-700">
              {(journalList?.total ?? 0) === 0 ? 0 : (journalPage - 1) * 25 + 1}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-slate-700">
              {Math.min(journalPage * 25, journalList?.total ?? 0)}
            </span>{' '}
            of <span className="font-semibold text-slate-700">{journalList?.total ?? 0}</span> entries
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setJournalPage((p) => Math.max(1, p - 1))}
              disabled={journalPage <= 1 || listLoading}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <span className="text-xs font-medium text-slate-600 px-2">
              Page {journalPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setJournalPage((p) => Math.min(totalPages, p + 1))}
              disabled={journalPage >= totalPages || listLoading}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
