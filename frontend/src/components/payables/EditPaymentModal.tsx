'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useUpdatePayment } from '@/features/payments/hooks/usePayments';
import { useChartOfAccounts } from '@/features/accounting/hooks/useAccounting';
import { VendorPaymentItem } from '@/features/payments/types';
import { isBankAssetAccount } from '@/lib/accountUtils';
import { formatPKR } from '@/lib/formatters';
import {
  X,
  Banknote,
  AlertCircle,
  Loader2,
  Info,
  CreditCard,
  Building,
} from 'lucide-react';

interface EditPaymentModalProps {
  payment: VendorPaymentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditPaymentModal: React.FC<EditPaymentModalProps> = ({
  payment,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const updatePaymentMutation = useUpdatePayment();
  const { data: accountsData } = useChartOfAccounts();

  const [paymentDate, setPaymentDate] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [chequeRef, setChequeRef] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Filter asset accounts for payment disbursement
  const assetAccounts = useMemo(() => {
    return accountsData?.accounts?.filter((acc) => acc.category === 'ASSET') ?? [];
  }, [accountsData]);

  // Selected account object
  const selectedAccount = useMemo(() => {
    return assetAccounts.find((a) => a.id === sourceAccountId);
  }, [assetAccounts, sourceAccountId]);

  const isBankAccount = useMemo(() => {
    return isBankAssetAccount(selectedAccount);
  }, [selectedAccount]);

  useEffect(() => {
    if (payment) {
      const rawDate = payment.paymentDate ? new Date(payment.paymentDate) : new Date();
      setPaymentDate(rawDate.toISOString().split('T')[0]);
      setSourceAccountId(payment.sourceAccountId || '');
      setChequeRef(payment.chequeRef || '');
      setTransactionId(payment.transactionId || '');
      setAmountPaid(payment.amountPaid ? String(payment.amountPaid) : '');
      setError(null);
    }
  }, [payment, isOpen]);

  if (!isOpen || !payment) return null;

  const originalAmount = Number(payment.amountPaid) || 0;
  const currentAmountNum = Number(amountPaid) || 0;
  const amountDiff = currentAmountNum - originalAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!paymentDate) {
      setError('Payment date is required.');
      return;
    }
    if (!sourceAccountId) {
      setError('Source disbursement account is required.');
      return;
    }
    if (isNaN(currentAmountNum) || currentAmountNum <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }

    try {
      await updatePaymentMutation.mutateAsync({
        id: payment.id,
        payload: {
          paymentDate,
          sourceAccountId,
          chequeRef: chequeRef.trim() || null,
          transactionId: transactionId.trim() || null,
          amountPaid: currentAmountNum,
        },
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to update payment');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      data-testid="edit-payment-modal"
    >
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-[#0F172A] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-800 rounded-lg text-emerald-400">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Edit Vendor Payment</h2>
              <p className="text-xs text-slate-400">
                Update payment date, disbursement account, instrument references, or amount
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Vendor Header Strip */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
              Supplier:
            </span>
            <span className="font-bold text-slate-900">
              {payment.vendor?.vendorName || 'Selected Vendor'}
            </span>
          </div>
          <div className="font-mono text-slate-600 font-medium">
            Original: {formatPKR(originalAmount)}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {amountDiff !== 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2 text-xs text-blue-800">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  Amount Adjustment: {amountDiff > 0 ? `+${formatPKR(amountDiff)}` : `-${formatPKR(Math.abs(amountDiff))}`}
                </p>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  {amountDiff > 0
                    ? 'Increasing payment amount will cascade to clear remaining unpaid bills for this vendor.'
                    : 'Decreasing payment amount will reopen and restore pending balances to settled bills.'}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Payment Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                data-testid="edit-payment-date-input"
              />
            </div>

            {/* Amount Paid */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount Paid (PKR) *
              </label>
              <input
                type="number"
                min="1"
                step="any"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                data-testid="edit-payment-amount-input"
              />
            </div>
          </div>

          {/* Disbursement Account */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Disbursement Source Account *
            </label>
            <select
              value={sourceAccountId}
              onChange={(e) => setSourceAccountId(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
              data-testid="edit-payment-account-select"
            >
              <option value="">Select Safe / Bank Account</option>
              {assetAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.accountName} ({acc.accountCode})
                </option>
              ))}
            </select>
          </div>

          {/* Cheque or Online Ref */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cheque Number
              </label>
              <input
                type="text"
                value={chequeRef}
                onChange={(e) => setChequeRef(e.target.value)}
                placeholder="e.g. CHQ-990011"
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                data-testid="edit-payment-cheque-input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Online Transaction / Wire Ref
              </label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="e.g. FT-2026-X89"
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                data-testid="edit-payment-trx-input"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updatePaymentMutation.isPending}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              data-testid="save-edit-payment-btn"
            >
              {updatePaymentMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>Save Payment Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
