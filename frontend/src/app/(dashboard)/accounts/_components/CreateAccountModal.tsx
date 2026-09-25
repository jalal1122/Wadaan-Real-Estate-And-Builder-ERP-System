'use client';

import React, { useState } from 'react';
import { X, Lock, AlertCircle, PlusCircle } from 'lucide-react';
import { useCreateAccount } from '@/features/accounting/hooks/useAccounting';
import { AccountCategory } from '@/features/accounting/types';
import { ApiErrorPayload } from '@/types/api';
import axios from 'axios';

interface CreateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingCodes?: string[];
}

const CATEGORY_HINTS: Record<AccountCategory, { prefix: string; label: string }> = {
  ASSET: { prefix: '1xxx', label: '1000–1999 (Current & Fixed Assets)' },
  LIABILITY: { prefix: '2xxx', label: '2000–2999 (Payables & Obligations)' },
  EQUITY: { prefix: '3xxx', label: '3000–3999 (Owner Capital & Reserves)' },
  REVENUE: { prefix: '4xxx', label: '4000–4999 (Sales & Brokerage Income)' },
  EXPENSE: { prefix: '5xxx', label: '5000–5999 (Operating & Site Expenses)' },
};

export default function CreateAccountModal({
  isOpen,
  onClose,
  existingCodes = [],
}: CreateAccountModalProps) {
  const [accountCode, setAccountCode] = useState('');
  const [accountName, setAccountName] = useState('');
  const [category, setCategory] = useState<AccountCategory>('ASSET');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const createAccountMutation = useCreateAccount();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError(null);
    setGeneralError(null);

    const trimmedCode = accountCode.trim();
    const trimmedName = accountName.trim();

    if (!trimmedCode) {
      setCodeError('Account code is required');
      return;
    }

    // Client-side instant pre-validation against existing accounts
    if (existingCodes.includes(trimmedCode)) {
      setCodeError(`Account code '${trimmedCode}' is already in use`);
      return;
    }

    if (!trimmedName) {
      setGeneralError('Account name is required');
      return;
    }

    try {
      await createAccountMutation.mutateAsync({
        accountCode: trimmedCode,
        accountName: trimmedName,
        category,
      });

      // Reset and close on success
      setAccountCode('');
      setAccountName('');
      setCategory('ASSET');
      onClose();
    } catch (err: unknown) {
      // apiClient interceptor unwraps errors into ApiErrorPayload { code, message }
      const apiErr = err as Partial<ApiErrorPayload> | undefined;
      const isAxios = axios.isAxiosError(err);
      const axiosData = isAxios ? (err.response?.data as any) : null;

      const errorCode = apiErr?.code || axiosData?.error?.code || axiosData?.code;
      const errorMessage =
        apiErr?.message ||
        axiosData?.error?.message ||
        axiosData?.message ||
        (err instanceof Error ? err.message : undefined);

      const isConflict =
        errorCode === 'DUPLICATE_RECORD' ||
        (isAxios && err.response?.status === 409) ||
        (typeof errorMessage === 'string' &&
          (errorMessage.toLowerCase().includes('already exists') ||
            errorMessage.toLowerCase().includes('already in use')));

      if (isConflict) {
        setCodeError(errorMessage || 'Account code already in use');
      } else if (errorCode === 'VALIDATION_ERROR') {
        setGeneralError(errorMessage || 'Validation failed. Please verify fields.');
      } else if (errorCode === 'UNAUTHORIZED' || errorCode === 'TOKEN_EXPIRED') {
        setGeneralError('Your session has expired. Please log in again.');
      } else {
        setGeneralError(
          errorMessage || 'An error occurred while creating the account.'
        );
      }
    }
  };

  const handleClose = () => {
    setCodeError(null);
    setGeneralError(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/70 backdrop-blur-xs"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#0F172A] flex items-center justify-center text-white">
              <PlusCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 id="modal-title" className="text-base font-bold text-[#0F172A]">
              Add New Account
            </h3>
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

          {/* Account Code */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="account-code-input"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
              >
                Account Code
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                {CATEGORY_HINTS[category].prefix}
              </span>
            </div>
            <input
              id="account-code-input"
              type="text"
              required
              disabled={createAccountMutation.isPending}
              value={accountCode}
              onChange={(e) => {
                setAccountCode(e.target.value);
                if (codeError) setCodeError(null);
              }}
              placeholder="e.g. 1050"
              className={`w-full px-3 py-2 text-sm font-mono rounded-lg border bg-slate-50/50 focus:bg-white transition-all outline-none ${
                codeError
                  ? 'border-red-500 ring-2 ring-red-500/20 text-red-900 focus:border-red-500'
                  : 'border-slate-300 focus:border-[#0F172A] focus:ring-2 focus:ring-slate-900/10'
              }`}
            />
            {codeError ? (
              <p
                role="alert"
                id="account-code-error"
                className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1"
              >
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{codeError}</span>
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-slate-400">
                Recommended range:{' '}
                <span className="font-mono text-slate-600 font-medium">
                  {CATEGORY_HINTS[category].label}
                </span>
              </p>
            )}
          </div>

          {/* Account Name */}
          <div>
            <label
              htmlFor="account-name-input"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              Account Name
            </label>
            <input
              id="account-name-input"
              type="text"
              required
              disabled={createAccountMutation.isPending}
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g. Petty Cash - Site Alpha"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-slate-50/50 focus:bg-white focus:border-[#0F172A] focus:ring-2 focus:ring-slate-900/10 transition-all outline-none"
            />
          </div>

          {/* Category */}
          <div>
            <label
              htmlFor="account-category-select"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              Category
            </label>
            <select
              id="account-category-select"
              disabled={createAccountMutation.isPending}
              value={category}
              onChange={(e) => setCategory(e.target.value as AccountCategory)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-slate-50/50 focus:bg-white focus:border-[#0F172A] focus:ring-2 focus:ring-slate-900/10 transition-all outline-none cursor-pointer"
            >
              <option value="ASSET">ASSET (Normal Balance: Debit)</option>
              <option value="LIABILITY">LIABILITY (Normal Balance: Credit)</option>
              <option value="EQUITY">EQUITY (Normal Balance: Credit)</option>
              <option value="REVENUE">REVENUE (Normal Balance: Credit)</option>
              <option value="EXPENSE">EXPENSE (Normal Balance: Debit)</option>
            </select>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={createAccountMutation.isPending}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createAccountMutation.isPending}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0F172A] rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {createAccountMutation.isPending ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Account</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
