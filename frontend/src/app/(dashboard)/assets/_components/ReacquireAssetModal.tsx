'use client';

import React, { useState, useEffect } from 'react';
import { useReacquireAsset } from '@/features/assets/hooks/useAssets';
import { WadaanAsset } from '@/features/assets/types';
import { formatPKR } from '@/lib/format';
import { X, RotateCcw, Building, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ReacquireAssetModalProps {
  asset: WadaanAsset | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ReacquireAssetModal: React.FC<ReacquireAssetModalProps> = ({
  asset,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const reacquireMutation = useReacquireAsset();

  const [acquisitionCost, setAcquisitionCost] = useState('');
  const [acquisitionDate, setAcquisitionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (asset) {
      setAcquisitionCost('');
      setAcquisitionDate(new Date().toISOString().split('T')[0]);
      setDescription(`Re-acquired ${asset.assetTitle} from previous buyer`);
      setError(null);
    }
  }, [asset]);

  if (!isOpen || !asset) return null;

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const costNum = Number(acquisitionCost);
    if (isNaN(costNum) || costNum <= 0) {
      setError('Please provide a valid re-acquisition cost greater than 0.');
      return;
    }

    try {
      await reacquireMutation.mutateAsync({
        id: asset.id,
        payload: {
          acquisitionCost: costNum,
          acquisitionDate,
          description: description.trim() || null,
        },
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err.message || 'Failed to re-acquire property'
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
      data-testid="reacquire-asset-modal"
    >
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-[#0F172A] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-800 rounded-lg text-emerald-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Re-acquire Property</h2>
              <p className="text-xs text-slate-400">
                Re-list property into inventory with new purchase cost
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div
              className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700"
              data-testid="reacquire-asset-error"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Property Context Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm">{asset.assetTitle}</span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-200 text-slate-700 uppercase">
                {asset.assetCategory}
              </span>
            </div>
            <div className="flex items-center gap-3 text-slate-500 text-[11px]">
              <span>Previous Cost: <strong className="font-mono text-slate-700">{formatPKR(asset.acquisitionCost)}</strong></span>
              {asset.deal && (
                <span>Sold In Deal: <strong className="font-mono text-slate-700">#{asset.deal.id.slice(0, 8)}</strong></span>
              )}
            </div>
          </div>

          {/* Info callout */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-2 text-xs text-blue-800">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Accounting Integrity: The original record remains locked as <strong>SOLD</strong> to preserve historical deal margins. A fresh record with status <strong>AVAILABLE</strong> will be created at your new buyback price.
            </p>
          </div>

          {/* New Acquisition Cost */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New Buyback / Acquisition Cost (PKR) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-mono font-bold text-slate-400">
                Rs.
              </span>
              <input
                type="number"
                min="1"
                step="any"
                required
                value={acquisitionCost}
                onChange={(e) => setAcquisitionCost(e.target.value)}
                placeholder="e.g. 14000000"
                className="w-full pl-10 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 font-mono"
                data-testid="reacquire-cost-input"
              />
            </div>
          </div>

          {/* Re-acquisition Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Purchase Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={acquisitionDate}
              onChange={(e) => setAcquisitionDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 text-slate-700"
              data-testid="reacquire-date-input"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes / Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Repurchased plot A-12 from client Jalal for inventory resale"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 text-slate-700"
              data-testid="reacquire-description-input"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={reacquireMutation.isPending}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition-colors shadow-2xs flex items-center gap-1.5"
              data-testid="submit-reacquire-btn"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{reacquireMutation.isPending ? 'Re-acquiring...' : 'Re-list in Inventory'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
