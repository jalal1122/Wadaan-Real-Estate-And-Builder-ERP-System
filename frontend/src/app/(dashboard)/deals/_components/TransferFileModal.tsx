'use client';

import React, { useState, useEffect } from 'react';
import { Deal } from '@/features/deals/types';
import { Customer } from '@/features/customers/types';
import { useTransferFile } from '@/features/deals/hooks/useDeals';
import { useCreateCustomer } from '@/features/customers/hooks/useCustomers';
import { formatPKR } from '@/lib/formatters';
import { ArrowRightLeft, X, AlertTriangle, UserPlus, CheckCircle2 } from 'lucide-react';

interface TransferFileModalProps {
  deal: Deal | null;
  customers: Customer[];
  onClose: () => void;
  onSuccess?: () => void;
}

export const TransferFileModal: React.FC<TransferFileModalProps> = ({
  deal,
  customers,
  onClose,
  onSuccess,
}) => {
  const transferMutation = useTransferFile();
  const createCustomerMutation = useCreateCustomer();

  const [newCustomerId, setNewCustomerId] = useState<string>('');
  const [transferFee, setTransferFee] = useState<string>('0');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAddingNewCustomer, setIsAddingNewCustomer] = useState<boolean>(false);
  const [newCustomerName, setNewCustomerName] = useState<string>('');
  const [newCustomerPhone, setNewCustomerPhone] = useState<string>('');

  const resetForm = () => {
    setNewCustomerId('');
    setTransferFee('0');
    setErrorMessage(null);
    setIsAddingNewCustomer(false);
    setNewCustomerName('');
    setNewCustomerPhone('');
  };

  useEffect(() => {
    if (deal) {
      resetForm();
    }
  }, [deal]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!deal) return null;

  // Filter out the current customer from target list
  const eligibleCustomers = customers.filter((c) => c.id !== deal.customerId);

  const handleQuickCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim() || !newCustomerPhone.trim()) {
      setErrorMessage('Please enter both name and phone number for the new client.');
      return;
    }
    try {
      const created = await createCustomerMutation.mutateAsync({
        fullName: newCustomerName.trim(),
        phone: newCustomerPhone.trim(),
      });
      setNewCustomerId(created.id);
      setIsAddingNewCustomer(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err.message || 'Failed to create customer');
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!newCustomerId) {
      setErrorMessage('Please select the receiving client.');
      return;
    }

    const feeNum = parseFloat(transferFee);
    if (isNaN(feeNum) || feeNum < 0) {
      setErrorMessage('Transfer fee must be a valid non-negative number.');
      return;
    }

    try {
      await transferMutation.mutateAsync({
        dealId: deal.id,
        payload: {
          newCustomerId,
          transferFeeAmount: feeNum,
        },
      });
      resetForm();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err.message || 'Failed to execute file transfer');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 bg-[#0F172A] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Transfer File Ownership</h2>
              <p className="text-xs text-slate-400">
                Reassign contract #{deal.id.slice(0, 8)} to another client
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-white rounded-lg p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Current Deal Summary */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Current Owner:</span>
              <span className="font-semibold text-slate-900">{deal.customer.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Contract Total:</span>
              <span className="font-mono font-semibold text-slate-900">{formatPKR(deal.totalValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Unpaid Balance:</span>
              <span className="font-mono font-bold text-amber-600">{formatPKR(deal.pendingBalance ?? 0)}</span>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isAddingNewCustomer ? (
            /* Quick Add Customer Panel */
            <form onSubmit={handleQuickCreateCustomer} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-[#059669]" />
                  Register New Client
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingNewCustomer(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 underline"
                >
                  Cancel
                </button>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Phone Number (e.g. 03001234567) *"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={createCustomerMutation.isPending}
                className="w-full py-2 bg-[#0F172A] text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {createCustomerMutation.isPending ? 'Registering...' : 'Save & Select Client'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleTransfer} className="space-y-4">
              {/* New Customer Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    New Assignee / Purchaser *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewCustomer(true)}
                    className="text-xs font-semibold text-[#059669] hover:underline flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> + New Client
                  </button>
                </div>
                <select
                  value={newCustomerId}
                  onChange={(e) => setNewCustomerId(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  required
                >
                  <option value="">Select Receiving Customer</option>
                  {eligibleCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Transfer Fee Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Transfer Fee Assessed (PKR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">
                    PKR
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={transferFee}
                    onChange={(e) => setTransferFee(e.target.value)}
                    placeholder="0"
                    className="w-full pl-12 pr-3 py-2 text-xs border border-slate-200 rounded-lg font-mono text-slate-900 bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Official transfer fee credited to Revenue (4000). Set to 0 if waived.
                </p>
              </div>

              {/* Accounting Guardrail Notice */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Double-Entry Guard:</strong> All outstanding receivables will be transferred to the new client's Khaata. Unallocated wallet funds of the original owner will remain intact.
                </span>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold bg-[#0F172A] hover:bg-slate-800 text-white rounded-lg shadow-xs transition-colors disabled:opacity-50"
                >
                  {transferMutation.isPending ? 'Processing Transfer...' : 'Execute File Transfer'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
