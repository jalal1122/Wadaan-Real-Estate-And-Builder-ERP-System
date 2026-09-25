import React, { useState } from 'react';
import { useCreateVendor } from '@/features/vendors/hooks/useVendors';
import { VendorItem } from '@/features/vendors/types';
import { X, Users, AlertCircle, Loader2 } from 'lucide-react';

interface CreateVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVendorCreated?: (vendor: VendorItem) => void;
}

export const CreateVendorModal: React.FC<CreateVendorModalProps> = ({
  isOpen,
  onClose,
  onVendorCreated,
}) => {
  const [vendorName, setVendorName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createVendorMutation = useCreateVendor();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim()) {
      setError('Vendor name is required');
      return;
    }

    setError(null);
    createVendorMutation.mutate(
      {
        vendorName: vendorName.trim(),
        phone: phone.trim() || undefined,
      },
      {
        onSuccess: (newVendor) => {
          setVendorName('');
          setPhone('');
          setError(null);
          if (onVendorCreated) {
            onVendorCreated(newVendor);
          }
          onClose();
        },
        onError: (err: any) => {
          setError(err?.response?.data?.error?.message || err.message || 'Failed to create vendor');
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base">Add New Vendor</h3>
              <p className="text-xs text-slate-500">Register supplier or contractor for accounts payable</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Vendor / Supplier Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Bestway Cement Ltd."
              value={vendorName}
              onChange={(e) => {
                setVendorName(e.target.value);
                if (error) setError(null);
              }}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] outline-hidden transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Phone Number (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. +92 300 1234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] outline-hidden transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createVendorMutation.isPending}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors flex items-center gap-2"
            >
              {createVendorMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Create Vendor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
