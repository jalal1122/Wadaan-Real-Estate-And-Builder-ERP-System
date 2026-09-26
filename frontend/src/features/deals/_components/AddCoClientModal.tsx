'use client';

import React, { useState, useMemo } from 'react';
import { useCustomers } from '@/features/customers/hooks/useCustomers';
import { useAddCoClient } from '@/features/deals/hooks/useDeals';
import { X, UserPlus, Users, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AddCoClientModalProps {
  dealId: string;
  primaryCustomerId: string;
  existingCoClientIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddCoClientModal: React.FC<AddCoClientModalProps> = ({
  dealId,
  primaryCustomerId,
  existingCoClientIds,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { data: allCustomers = [], isLoading: isLoadingCustomers } = useCustomers();
  const addCoClientMutation = useAddCoClient();

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [shareLabel, setShareLabel] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter out primary customer and already-registered co-clients
  const eligibleCustomers = useMemo(() => {
    return allCustomers.filter(
      (c) => c.id !== primaryCustomerId && !existingCoClientIds.includes(c.id)
    );
  }, [allCustomers, primaryCustomerId, existingCoClientIds]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedCustomerId) {
      setErrorMessage('Please select a customer to register as co-client.');
      return;
    }

    try {
      await addCoClientMutation.mutateAsync({
        dealId,
        payload: {
          customerId: selectedCustomerId,
          shareLabel: shareLabel.trim() || null,
        },
      });

      setSelectedCustomerId('');
      setShareLabel('');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to register co-client. Please try again.';
      setErrorMessage(msg);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      data-testid="add-co-client-modal"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-[#0F172A] text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Add Co-Client / Co-Buyer
              </h2>
              <p className="text-xs text-slate-400">
                Register a co-investor or partner on this contract
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            data-testid="close-add-co-client-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div
              className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700"
              data-testid="add-co-client-error"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Select Customer */}
          <div className="space-y-1.5">
            <label
              htmlFor="co-client-customer"
              className="block text-xs font-semibold text-slate-700"
            >
              Select Customer <span className="text-red-500">*</span>
            </label>
            <select
              id="co-client-customer"
              data-testid="co-client-select"
              value={selectedCustomerId}
              onChange={(e) => {
                setSelectedCustomerId(e.target.value);
                setErrorMessage(null);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
              disabled={isLoadingCustomers || addCoClientMutation.isPending}
            >
              <option value="">-- Choose a registered customer --</option>
              {eligibleCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} ({c.phone || 'No phone'})
                </option>
              ))}
            </select>
            {eligibleCustomers.length === 0 && !isLoadingCustomers && (
              <p className="text-[11px] text-slate-400 italic">
                No other customers available to add as co-client. Create a new customer first in the directory.
              </p>
            )}
          </div>

          {/* Share Label / Description */}
          <div className="space-y-1.5">
            <label
              htmlFor="co-client-share-label"
              className="block text-xs font-semibold text-slate-700"
            >
              Share Description / Role (Optional)
            </label>
            <input
              id="co-client-share-label"
              data-testid="co-client-share-label"
              type="text"
              placeholder='e.g., "50% share", "Partner", "Co-buyer"'
              value={shareLabel}
              onChange={(e) => setShareLabel(e.target.value)}
              maxLength={100}
              disabled={addCoClientMutation.isPending}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-[11px] text-slate-400">
              Informational label displayed on contract and ledger receipts.
            </p>
          </div>

          {/* Notice */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>Multi-Client Settlement Rules</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Registered co-clients can directly pay installments or milestone invoices on this deal. Any overpayment routes safely into the paying client&apos;s own advance wallet.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="submit-add-co-client"
              disabled={!selectedCustomerId || addCoClientMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              {addCoClientMutation.isPending ? 'Registering...' : 'Register Co-Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
