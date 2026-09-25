'use client';

import React, { useState, useEffect } from 'react';
import { useAddRepayment } from '../hooks/usePersonal';
import { PersonalLoanItem } from '../types';
import { formatPKR } from '@/lib/format';
import { X, CheckCircle2, AlertCircle, Calendar, FileText } from 'lucide-react';

interface AddRepaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactId: string;
  contactName: string;
  loan: PersonalLoanItem | null;
}

export const AddRepaymentModal: React.FC<AddRepaymentModalProps> = ({
  isOpen,
  onClose,
  contactId,
  contactName,
  loan,
}) => {
  const [amount, setAmount] = useState('');
  const [repaidDate, setRepaidDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const addRepaymentMutation = useAddRepayment();

  const outstanding = Number(loan?.outstandingAmount) || 0;

  useEffect(() => {
    if (isOpen && loan) {
      setAmount(String(outstanding));
      setRepaidDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setError(null);
    }
  }, [isOpen, loan]);

  if (!isOpen || !loan) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid repayment amount greater than 0.');
      return;
    }

    if (amountNum > outstanding) {
      setError(`Repayment cannot exceed remaining outstanding balance of ${formatPKR(outstanding)}.`);
      return;
    }

    try {
      await addRepaymentMutation.mutateAsync({
        contactId,
        loanId: loan.id,
        payload: {
          amount: amountNum,
          repaidDate: new Date(repaidDate).toISOString(),
          notes: notes.trim() || undefined,
        },
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to record repayment');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#0F172A] text-white p-5 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold leading-tight">Record Loan Repayment</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Account: <span className="text-emerald-400 font-semibold">{contactName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loan Context Card */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Loan Purpose:</span>
            <span className="font-semibold text-slate-800">{loan.description}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 font-mono">
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">Principal</span>
              <span className="text-slate-800 font-bold">{formatPKR(loan.principalAmount)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">Settled</span>
              <span className="text-emerald-600 font-bold">{formatPKR(loan.amountSettled)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">Remaining</span>
              <span className="text-amber-600 font-bold">{formatPKR(outstanding)}</span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Amount */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700">
                Repayment Amount (PKR) <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setAmount(String(outstanding))}
                className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold underline"
              >
                Pay Full Remaining
              </button>
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              max={outstanding}
              min={1}
              step="any"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-hidden font-mono text-sm font-semibold focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]"
              required
              autoFocus
            />
          </div>

          {/* Date */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Repayment Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={repaidDate}
              onChange={(e) => setRepaidDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-hidden focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] bg-white"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Notes / Payment Method
            </label>
            <input
              type="text"
              placeholder="e.g., Cash return in office, Meezan Bank online transfer"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-hidden focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addRepaymentMutation.isPending}
              className="px-5 py-2 bg-[#059669] hover:bg-emerald-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              {addRepaymentMutation.isPending ? 'Applying...' : 'Apply Repayment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
