'use client';

import React, { useState } from 'react';
import { Receipt } from '@/features/receipts/types';
import { useClearCheque } from '@/features/receipts/hooks/useReceipts';
import { useChartOfAccounts } from '@/features/accounting/hooks/useAccounting';
import { formatPKR, formatDate } from '@/lib/format';
import { X, CheckCircle2, AlertCircle, Building2, ShieldCheck } from 'lucide-react';

interface ClearanceModalProps {
  receipt: Receipt | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ClearanceModal: React.FC<ClearanceModalProps> = ({
  receipt,
  onClose,
  onSuccess,
}) => {
  const { data: accountsData } = useChartOfAccounts();
  const clearMutation = useClearCheque();

  const [targetBankAccountId, setTargetBankAccountId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!receipt) return null;

  // Filter bank asset accounts (typically 1010 Meezan, 1011 HBL, or general bank asset)
  const bankAccounts = accountsData?.accounts?.filter(
    (acc) =>
      acc.category === 'ASSET' &&
      !acc.isArchived &&
      (acc.accountCode.startsWith('101') || acc.accountName.toLowerCase().includes('bank'))
  ) || [];

  const handleClear = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!targetBankAccountId) {
      setErrorMessage('Please select the depository bank account where the cheque cleared.');
      return;
    }

    try {
      await clearMutation.mutateAsync({
        id: receipt.id,
        payload: {
          targetBankAccountId,
        },
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err.message || 'Failed to clear cheque');
    }
  };

  const receiptAmount = Number(receipt.amount ?? receipt.totalAmount) || 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4" data-testid="clearance-modal">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 bg-[#0F172A] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Clear Escrow Cheque</h2>
              <p className="text-xs text-slate-400">Post realized funds to General Ledger</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white rounded-lg p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleClear} className="p-6 space-y-5">
          {/* Instrument Summary */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Cheque / Ref No:</span>
              <span className="font-mono font-bold text-slate-900">
                {receipt.bankRefNumber || receipt.referenceNo || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Drawer / Customer:</span>
              <span className="font-semibold text-slate-900">{receipt.customer.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Issue Date:</span>
              <span className="text-slate-700">{formatDate(receipt.receiptDate)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200">
              <span className="text-slate-700 font-semibold">Instrument Amount:</span>
              <span className="font-mono font-bold text-base text-[#059669]">
                {formatPKR(receiptAmount)}
              </span>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Depository Account Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Target Depository Bank Account *
            </label>
            <select
              value={targetBankAccountId}
              onChange={(e) => setTargetBankAccountId(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-medium"
              required
              data-testid="target-bank-account-select"
            >
              <option value="">-- Select Bank Account --</option>
              {bankAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.accountCode} - {acc.accountName} (Balance: {formatPKR(acc.balance)})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400">
              Realized funds will be debited into this bank account and credited out of Cheque Waiting Room.
            </p>
          </div>

          {/* Accounting Guardrail Banner */}
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
            <span>
              <strong>Zero-Sum Settlement:</strong> Clears the pending status and writes a journal entry: DR Bank Asset / CR Undeposited Funds (1020).
            </span>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={clearMutation.isPending}
              className="px-4 py-2 text-xs font-semibold bg-[#059669] hover:bg-emerald-600 text-white rounded-lg shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
              data-testid="confirm-clear-cheque-btn"
            >
              {clearMutation.isPending ? 'Clearing Instrument...' : 'Confirm & Clear Cheque'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
