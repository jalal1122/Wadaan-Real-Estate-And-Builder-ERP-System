'use client';

import React, { useState, useEffect } from 'react';
import { X, Lock, AlertCircle, Edit3 } from 'lucide-react';
import { useUpdateAccount } from '@/features/accounting/hooks/useAccounting';
import { AccountCategory, AccountWithBalance } from '@/features/accounting/types';
import { ApiErrorPayload } from '@/types/api';
import axios from 'axios';

interface EditAccountModalProps {
  account: AccountWithBalance | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function EditAccountModal({
  account,
  isOpen,
  onClose,
}: EditAccountModalProps) {
  const [accountName, setAccountName] = useState('');
  const [category, setCategory] = useState<AccountCategory>('ASSET');
  const [nameError, setNameError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const updateAccountMutation = useUpdateAccount();

  // Populate form fields whenever the selected account changes
  useEffect(() => {
    if (account) {
      setAccountName(account.accountName);
      setCategory(account.category);
      setNameError(null);
      setGeneralError(null);
    }
  }, [account]);

  if (!isOpen || !account) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    setGeneralError(null);

    const trimmedName = accountName.trim();

    if (!trimmedName) {
      setNameError('Account name cannot be empty');
      return;
    }

    try {
      await updateAccountMutation.mutateAsync({
        id: account.id,
        payload: {
          accountName: trimmedName,
          category: account.isSystemLocked ? undefined : category,
        },
      });

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
        setGeneralError(errorMessage || 'You do not have permission to modify this account.');
      } else if (errorCode === 'VALIDATION_ERROR') {
        setGeneralError(errorMessage || 'Validation failed. Please check your entries.');
      } else if (errorCode === 'UNAUTHORIZED' || errorCode === 'TOKEN_EXPIRED') {
        setGeneralError('Your session has expired. Please log in again.');
      } else {
        setGeneralError(errorMessage || 'An error occurred while updating the account.');
      }
    }
  };

  const handleClose = () => {
    setNameError(null);
    setGeneralError(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/70 backdrop-blur-xs"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0F172A] flex items-center justify-center text-white">
              <Edit3 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 id="edit-modal-title" className="text-base font-bold text-[#0F172A]">
                Edit Account
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Code: {account.accountCode}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close modal"
            className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {generalError && (
            <div
              role="alert"
              className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

          {/* Account Code (Immutable) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="edit-account-code-input"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
              >
                Account Code
              </label>
              <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" />
                Immutable
              </span>
            </div>
            <input
              id="edit-account-code-input"
              type="text"
              disabled
              value={account.accountCode}
              className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed outline-none"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Account codes cannot be altered once assigned to maintain double-entry audit integrity.
            </p>
          </div>

          {/* Account Name */}
          <div>
            <label
              htmlFor="edit-account-name-input"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              Account Name
            </label>
            <input
              id="edit-account-name-input"
              type="text"
              required
              disabled={updateAccountMutation.isPending}
              value={accountName}
              onChange={(e) => {
                setAccountName(e.target.value);
                if (nameError) setNameError(null);
              }}
              placeholder="e.g. Meezan Operating Account"
              className={`w-full px-3 py-2 text-sm rounded-lg border bg-slate-50/50 focus:bg-white transition-all outline-none ${
                nameError
                  ? 'border-red-500 ring-2 ring-red-500/20 text-red-900 focus:border-red-500'
                  : 'border-slate-300 focus:border-[#0F172A] focus:ring-2 focus:ring-slate-900/10'
              }`}
            />
            {nameError && (
              <p
                role="alert"
                id="edit-account-name-error"
                className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1"
              >
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{nameError}</span>
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="edit-account-category-select"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
              >
                Category
              </label>
              {account.isSystemLocked && (
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  System Locked
                </span>
              )}
            </div>
            <select
              id="edit-account-category-select"
              disabled={account.isSystemLocked || updateAccountMutation.isPending}
              value={category}
              onChange={(e) => setCategory(e.target.value as AccountCategory)}
              className={`w-full px-3 py-2 text-sm rounded-lg border transition-all outline-none ${
                account.isSystemLocked
                  ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
                  : 'border-slate-300 bg-slate-50/50 focus:bg-white focus:border-[#0F172A] focus:ring-2 focus:ring-slate-900/10 cursor-pointer'
              }`}
            >
              <option value="ASSET">ASSET (Normal Balance: Debit)</option>
              <option value="LIABILITY">LIABILITY (Normal Balance: Credit)</option>
              <option value="EQUITY">EQUITY (Normal Balance: Credit)</option>
              <option value="REVENUE">REVENUE (Normal Balance: Credit)</option>
              <option value="EXPENSE">EXPENSE (Normal Balance: Debit)</option>
            </select>
            {account.isSystemLocked ? (
              <p className="mt-1 text-[11px] text-amber-600 flex items-center gap-1">
                <Lock className="w-3 h-3 flex-shrink-0" />
                <span>System accounts cannot change category to preserve ledger reconciliation.</span>
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-slate-400">
                Changing category affects normal balance sign in reports and ledger balance calculations.
              </p>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={updateAccountMutation.isPending}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateAccountMutation.isPending}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0F172A] rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {updateAccountMutation.isPending ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
