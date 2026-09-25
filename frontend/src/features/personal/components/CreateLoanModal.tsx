'use client';

import React, { useState, useEffect } from 'react';
import { useCreateLoan } from '../hooks/usePersonal';
import { PersonalTxDirection } from '../types';
import { X, ArrowUpRight, ArrowDownLeft, AlertCircle, Calendar, FileText } from 'lucide-react';

interface CreateLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactId: string;
  contactName: string;
}

export const CreateLoanModal: React.FC<CreateLoanModalProps> = ({
  isOpen,
  onClose,
  contactId,
  contactName,
}) => {
  const [direction, setDirection] = useState<PersonalTxDirection>('GIVEN');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [loanDate, setLoanDate] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createLoanMutation = useCreateLoan();

  useEffect(() => {
    if (isOpen) {
      setDirection('GIVEN');
      setPrincipalAmount('');
      setLoanDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amountNum = parseFloat(principalAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }
    if (!description.trim()) {
      setError('Please specify a description or purpose for this transaction.');
      return;
    }

    try {
      await createLoanMutation.mutateAsync({
        contactId,
        payload: {
          direction,
          principalAmount: amountNum,
          loanDate: new Date(loanDate).toISOString(),
          description: description.trim(),
        },
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to record loan');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#0F172A] text-white p-5 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold leading-tight">Record Loan Entry</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Ledger account for <span className="text-emerald-400 font-semibold">{contactName}</span>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Direction Toggle */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Transaction Direction</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDirection('GIVEN')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                  direction === 'GIVEN'
                    ? 'border-amber-500 bg-amber-50/80 text-amber-900 font-bold shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-1">
                  <ArrowUpRight className="w-4 h-4 text-amber-600" />
                  <span className="text-xs">GIVEN (We Lent)</span>
                </div>
                <span className="text-[10px] text-slate-500 font-normal">They owe us money</span>
              </button>

              <button
                type="button"
                onClick={() => setDirection('RECEIVED')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                  direction === 'RECEIVED'
                    ? 'border-blue-500 bg-blue-50/80 text-blue-900 font-bold shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-1">
                  <ArrowDownLeft className="w-4 h-4 text-blue-600" />
                  <span className="text-xs">RECEIVED (We Borrowed)</span>
                </div>
                <span className="text-[10px] text-slate-500 font-normal">We owe them money</span>
              </button>
            </div>
          </div>

          {/* Principal Amount */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Principal Amount (PKR) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              placeholder="e.g., 500000"
              value={principalAmount}
              onChange={(e) => setPrincipalAmount(e.target.value)}
              min={1}
              step="any"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-hidden font-mono text-sm font-semibold focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]"
              required
              autoFocus
            />
          </div>

          {/* Loan Date */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Transaction Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={loanDate}
              onChange={(e) => setLoanDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-hidden focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] bg-white"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Purpose / Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Personal advance, Medical assistance, Temporary business support"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-hidden focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]"
              required
            />
          </div>

          {/* Action Buttons */}
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
              disabled={createLoanMutation.isPending}
              className="px-5 py-2 bg-[#0F172A] hover:bg-slate-800 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {createLoanMutation.isPending ? 'Recording...' : 'Record Loan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
