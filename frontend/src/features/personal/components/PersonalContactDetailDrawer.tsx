'use client';

import React, { useState, useEffect } from 'react';
import { usePersonalContact, useDeleteLoan } from '@/features/personal/hooks/usePersonal';
import { CreateLoanModal } from './CreateLoanModal';
import { AddRepaymentModal } from './AddRepaymentModal';
import { PersonalLoanItem } from '@/features/personal/types';
import { formatPKR, formatDate } from '@/lib/format';
import {
  X,
  User,
  Phone,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  FileText,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface PersonalContactDetailDrawerProps {
  contactId: string | null;
  onClose: () => void;
}

export const PersonalContactDetailDrawer: React.FC<PersonalContactDetailDrawerProps> = ({
  contactId,
  onClose,
}) => {
  const { data, isLoading, isError, refetch } = usePersonalContact(contactId || '');
  const deleteLoanMutation = useDeleteLoan();

  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [repaymentTargetLoan, setRepaymentTargetLoan] = useState<PersonalLoanItem | null>(null);
  const [expandedLoanIds, setExpandedLoanIds] = useState<Record<string, boolean>>({});

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoanModalOpen && !repaymentTargetLoan) {
        onClose();
      }
    };
    if (contactId) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [contactId, isLoanModalOpen, repaymentTargetLoan, onClose]);

  if (!contactId) return null;

  const toggleExpand = (loanId: string) => {
    setExpandedLoanIds((prev) => ({
      ...prev,
      [loanId]: !prev[loanId],
    }));
  };

  const handleDeleteLoan = async (loanId: string) => {
    if (confirm('Are you sure you want to delete this loan entry and its repayments?')) {
      await deleteLoanMutation.mutateAsync({ contactId, loanId });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer content panel */}
      <div className="relative w-full max-w-2xl bg-slate-50 h-full shadow-2xl flex flex-col z-10 overflow-hidden border-l border-slate-200 animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="bg-[#0F172A] text-white p-5 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              <User className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white leading-tight">
                  {isLoading ? 'Loading Ledger...' : data?.contact.name}
                </h2>
                {data?.contact.relation && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {data.contact.relation}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {data?.contact.phone ? `Phone: ${data.contact.phone}` : 'Private Financial Ledger'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isLoading && data && (
              <button
                type="button"
                onClick={() => setIsLoanModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#059669] hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                New Loan
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {isLoading && (
            <div className="space-y-4 animate-pulse">
              <div className="h-24 bg-white border border-slate-200 rounded-xl p-4"></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="h-20 bg-white border border-slate-200 rounded-xl"></div>
                <div className="h-20 bg-white border border-slate-200 rounded-xl"></div>
                <div className="h-20 bg-white border border-slate-200 rounded-xl"></div>
              </div>
              <div className="h-48 bg-white border border-slate-200 rounded-xl"></div>
            </div>
          )}

          {isError && (
            <div className="p-8 bg-red-50 border border-red-200 rounded-xl text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
              <h3 className="text-sm font-bold text-red-900">Personal Contact Not Found</h3>
              <p className="text-xs text-red-600">The requested personal ledger account could not be retrieved.</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="px-4 py-2 bg-[#0F172A] text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
              >
                Retry
              </button>
            </div>
          )}

          {!isLoading && !isError && data && (
            <>
              {/* Profile & Notes */}
              {data.contact.notes && (
                <div className="bg-white rounded-xl border border-slate-200 p-3.5 text-xs text-slate-600 flex items-start gap-2 shadow-xs">
                  <span className="font-semibold text-slate-700 shrink-0">Notes:</span>
                  <span>{data.contact.notes}</span>
                </div>
              )}

              {/* KPI Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                    <span>Lent (They Owe)</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="mt-1 text-lg font-bold font-mono text-amber-600">
                    {formatPKR(data.summary.outstandingGiven)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Principal: {formatPKR(data.summary.totalGiven)}
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                    <span>Borrowed (We Owe)</span>
                    <ArrowDownLeft className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <div className="mt-1 text-lg font-bold font-mono text-blue-600">
                    {formatPKR(data.summary.outstandingReceived)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Principal: {formatPKR(data.summary.totalReceived)}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-3.5 border border-slate-700 shadow-xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                    <span>Net Balance</span>
                    <span className="font-mono text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-emerald-400">
                      OFF-BS
                    </span>
                  </div>
                  <div
                    className={`mt-1 text-lg font-bold font-mono ${
                      Number(data.summary.netBalance) > 0
                        ? 'text-emerald-400'
                        : Number(data.summary.netBalance) < 0
                        ? 'text-amber-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {Number(data.summary.netBalance) > 0
                      ? `+${formatPKR(data.summary.netBalance)}`
                      : Number(data.summary.netBalance) < 0
                      ? `${formatPKR(data.summary.netBalance)}`
                      : 'Settled'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {Number(data.summary.netBalance) > 0
                      ? 'Owes Us (Receivable)'
                      : Number(data.summary.netBalance) < 0
                      ? 'We Owe (Payable)'
                      : 'All balanced'}
                  </div>
                </div>
              </div>

              {/* Loans List Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    Loan Transactions ({data.loans.length})
                  </h3>
                  <span className="text-[10px] text-slate-400">Private ledger records</span>
                </div>

                {data.loans.length === 0 ? (
                  <div className="bg-white border border-dashed border-slate-200 rounded-xl p-8 text-center space-y-2">
                    <FileText className="w-6 h-6 text-slate-400 mx-auto" />
                    <h4 className="text-xs font-semibold text-slate-800">No loans recorded yet</h4>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                      Record money given to or received from {data.contact.name} to track repayments.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsLoanModalOpen(true)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#0F172A] text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Record First Loan
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {data.loans.map((loan) => {
                      const outstanding = Number(loan.outstandingAmount) || 0;
                      const isSettled = loan.status === 'SETTLED';
                      const isExpanded = !!expandedLoanIds[loan.id];

                      return (
                        <div
                          key={loan.id}
                          className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs hover:border-slate-300 transition-colors"
                        >
                          {/* Loan Item Header */}
                          <div className="p-3.5 flex items-center justify-between gap-3">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                  loan.direction === 'GIVEN'
                                    ? 'bg-amber-50 border border-amber-200 text-amber-700'
                                    : 'bg-blue-50 border border-blue-200 text-blue-700'
                                }`}
                              >
                                {loan.direction === 'GIVEN' ? (
                                  <ArrowUpRight className="w-4 h-4" />
                                ) : (
                                  <ArrowDownLeft className="w-4 h-4" />
                                )}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded-sm uppercase tracking-wider ${
                                      loan.direction === 'GIVEN'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-blue-100 text-blue-800'
                                    }`}
                                  >
                                    {loan.direction === 'GIVEN' ? 'Given (Lent)' : 'Received (Borrowed)'}
                                  </span>

                                  <span
                                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider ${
                                      loan.status === 'SETTLED'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : loan.status === 'PARTIAL'
                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                        : 'bg-red-50 text-red-700 border border-red-200'
                                    }`}
                                  >
                                    {loan.status}
                                  </span>

                                  <span className="text-[10px] text-slate-400">
                                    {formatDate(loan.loanDate)}
                                  </span>
                                </div>

                                <h4 className="text-xs font-semibold text-slate-900 mt-1 truncate">
                                  {loan.description || 'Loan transaction'}
                                </h4>
                              </div>
                            </div>

                            {/* Amount & Actions */}
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                <div className="text-[10px] text-slate-400">Remaining</div>
                                <div
                                  className={`font-mono text-xs font-bold ${
                                    isSettled
                                      ? 'text-emerald-600'
                                      : loan.direction === 'GIVEN'
                                      ? 'text-amber-600'
                                      : 'text-blue-600'
                                  }`}
                                >
                                  {formatPKR(outstanding)}
                                </div>
                                <div className="text-[9px] text-slate-400 font-mono">
                                  of {formatPKR(loan.principalAmount)}
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                {!isSettled && (
                                  <button
                                    type="button"
                                    onClick={() => setRepaymentTargetLoan(loan)}
                                    className="px-2.5 py-1 bg-[#059669] hover:bg-emerald-600 text-white rounded-md text-[11px] font-semibold transition-colors shadow-2xs"
                                  >
                                    + Repay
                                  </button>
                                )}

                                {loan.repayments?.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => toggleExpand(loan.id)}
                                    className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                                    title="View repayments"
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleDeleteLoan(loan.id)}
                                  className="p-1 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                                  title="Delete loan"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Expanded Repayment History */}
                          {isExpanded && loan.repayments?.length > 0 && (
                            <div className="bg-slate-50 border-t border-slate-200 p-3 space-y-1.5 text-xs">
                              <div className="font-semibold text-slate-600 text-[10px] uppercase tracking-wider">
                                Repayment History ({loan.repayments.length})
                              </div>
                              <div className="divide-y divide-slate-200/60 bg-white rounded-lg border border-slate-200 overflow-hidden">
                                {loan.repayments.map((rep) => (
                                  <div
                                    key={rep.id}
                                    className="p-2 flex items-center justify-between text-xs hover:bg-slate-50"
                                  >
                                    <div className="flex items-center gap-2">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                      <div>
                                        <span className="font-mono font-bold text-slate-900 text-[11px]">
                                          {formatPKR(rep.amount)}
                                        </span>
                                        {rep.notes && (
                                          <span className="text-slate-500 ml-1.5 text-[10px]">
                                            • {rep.notes}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <span className="text-slate-400 text-[10px]">
                                      {formatDate(rep.repaidDate)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 bg-white border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Record Loan Modal */}
      {data && (
        <CreateLoanModal
          isOpen={isLoanModalOpen}
          onClose={() => setIsLoanModalOpen(false)}
          contactId={contactId}
          contactName={data.contact.name}
        />
      )}

      {/* Add Repayment Modal */}
      {data && (
        <AddRepaymentModal
          isOpen={!!repaymentTargetLoan}
          onClose={() => setRepaymentTargetLoan(null)}
          contactId={contactId}
          contactName={data.contact.name}
          loan={repaymentTargetLoan}
        />
      )}
    </div>
  );
};
