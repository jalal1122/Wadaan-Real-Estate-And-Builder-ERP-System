'use client';

import React, { useState } from 'react';
import { X, AlertTriangle, Trash2, Archive, ShieldAlert } from 'lucide-react';
import { useDeleteAccount } from '@/features/accounting/hooks/useAccounting';
import { AccountWithBalance } from '@/features/accounting/types';
import { ApiErrorPayload } from '@/types/api';
import axios from 'axios';

interface DeleteAccountDialogProps {
  account: AccountWithBalance | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DeleteAccountDialog({
  account,
  isOpen,
  onClose,
}: DeleteAccountDialogProps) {
  const [generalError, setGeneralError] = useState<string | null>(null);

  const deleteAccountMutation = useDeleteAccount();

  if (!isOpen || !account) return null;

  // Transactions exist if debit or credit totals are greater than zero
  const hasTransactions =
    parseFloat(account.totalDebit || '0') > 0 ||
    parseFloat(account.totalCredit || '0') > 0;

  const handleDelete = async () => {
    setGeneralError(null);

    try {
      await deleteAccountMutation.mutateAsync(account.id);
      onClose();
    } catch (err: unknown) {
      const apiErr = err as Partial<ApiErrorPayload> | undefined;
      const isAxios = axios.isAxiosError(err);
      const axiosData = isAxios ? (err.response?.data as any) : null;

      const errorCode = apiErr?.code || axiosData?.error?.code || axiosData?.code;
      const errorMessage =
        apiErr?.message ||
        axiosData?.error?.message ||
        axiosData?.message ||
        (err instanceof Error ? err.message : undefined);

      if (errorCode === 'OPERATION_FORBIDDEN' || (isAxios && err.response?.status === 403)) {
        setGeneralError(
          errorMessage || 'System-locked accounts cannot be deleted or archived.'
        );
      } else if (errorCode === 'UNAUTHORIZED' || errorCode === 'TOKEN_EXPIRED') {
        setGeneralError('Your session has expired. Please log in again.');
      } else {
        setGeneralError(
          errorMessage || 'An error occurred while deleting the account.'
        );
      }
    }
  };

  const handleClose = () => {
    setGeneralError(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/70 backdrop-blur-xs"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${
                account.isSystemLocked
                  ? 'bg-slate-700'
                  : hasTransactions
                  ? 'bg-amber-600'
                  : 'bg-rose-600'
              }`}
            >
              {account.isSystemLocked ? (
                <ShieldAlert className="w-4 h-4 text-amber-300" />
              ) : hasTransactions ? (
                <Archive className="w-4 h-4 text-white" />
              ) : (
                <Trash2 className="w-4 h-4 text-white" />
              )}
            </div>
            <div>
              <h3 id="delete-dialog-title" className="text-base font-bold text-[#0F172A]">
                {account.isSystemLocked
                  ? 'Account Protected'
                  : hasTransactions
                  ? 'Archive Account'
                  : 'Delete Account'}
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {account.accountCode} — {account.accountName}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close dialog"
            className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {generalError && (
            <div
              role="alert"
              className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

          {account.isSystemLocked ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                This is a System Locked Account
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                System accounts (such as Accounts Receivable, Accounts Payable, and default Cash buckets) are essential for core double-entry accounting operations and cannot be removed or archived.
              </p>
            </div>
          ) : hasTransactions ? (
            <div className="space-y-3">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <Archive className="w-4 h-4 text-amber-700" />
                  Transaction History Detected (Soft Delete / Archive)
                </div>
                <p className="text-amber-800 leading-relaxed">
                  This account has active ledger transactions:
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                  <div className="bg-white/80 p-2 rounded border border-amber-200">
                    <div className="text-[10px] text-slate-500 font-sans uppercase font-bold">Total Debits</div>
                    <div className="font-semibold text-slate-800">PKR {account.totalDebit}</div>
                  </div>
                  <div className="bg-white/80 p-2 rounded border border-amber-200">
                    <div className="text-[10px] text-slate-500 font-sans uppercase font-bold">Total Credits</div>
                    <div className="font-semibold text-slate-800">PKR {account.totalCredit}</div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                To maintain regulatory compliance and double-entry reconciliation integrity, accounts with transaction history cannot be purged. Archiving will hide this account from active selection dropdowns and current balance views while fully preserving past audit trails.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-rose-900">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  Zero Activity — Permanent Deletion
                </div>
                <p className="text-rose-800 leading-relaxed">
                  This account has zero journal entries or transactions. Confirming will permanently delete this account record from the database.
                </p>
              </div>
              <p className="text-xs text-slate-500">
                Are you sure you want to permanently delete{' '}
                <span className="font-semibold text-slate-800 font-mono">
                  {account.accountCode} ({account.accountName})
                </span>
                ?
              </p>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={deleteAccountMutation.isPending}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {account.isSystemLocked ? 'Close' : 'Cancel'}
            </button>

            {!account.isSystemLocked && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteAccountMutation.isPending}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 ${
                  hasTransactions
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {deleteAccountMutation.isPending ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : hasTransactions ? (
                  <>
                    <Archive className="w-3.5 h-3.5" />
                    <span>Archive Account</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Permanently Delete</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
