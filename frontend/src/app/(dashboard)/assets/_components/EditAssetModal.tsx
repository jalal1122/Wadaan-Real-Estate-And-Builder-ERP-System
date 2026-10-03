'use client';

import React, { useState, useEffect } from 'react';
import { useUpdateAsset } from '@/features/assets/hooks/useAssets';
import { WadaanAsset, AssetCategory } from '@/features/assets/types';
import { X, Building, AlertCircle, Loader2 } from 'lucide-react';

interface EditAssetModalProps {
  asset: WadaanAsset | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditAssetModal: React.FC<EditAssetModalProps> = ({
  asset,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const updateAssetMutation = useUpdateAsset();

  const [assetTitle, setAssetTitle] = useState('');
  const [assetCategory, setAssetCategory] = useState<AssetCategory>('PLOT');
  const [acquisitionCost, setAcquisitionCost] = useState('');
  const [acquisitionDate, setAcquisitionDate] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (asset) {
      setAssetTitle(asset.assetTitle || '');
      setAssetCategory(asset.assetCategory || 'PLOT');
      setAcquisitionCost(asset.acquisitionCost ? String(asset.acquisitionCost) : '');
      const rawDate = asset.acquisitionDate ? new Date(asset.acquisitionDate) : new Date();
      setAcquisitionDate(rawDate.toISOString().split('T')[0]);
      setDescription(asset.description || '');
      setError(null);
    }
  }, [asset, isOpen]);

  if (!isOpen || !asset) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const costNum = Number(acquisitionCost);
    if (!assetTitle.trim()) {
      setError('Please provide a valid asset title.');
      return;
    }
    if (isNaN(costNum) || costNum <= 0) {
      setError('Acquisition cost must be a positive amount.');
      return;
    }
    if (!acquisitionDate) {
      setError('Acquisition date is required.');
      return;
    }

    try {
      await updateAssetMutation.mutateAsync({
        id: asset.id,
        payload: {
          assetTitle: assetTitle.trim(),
          assetCategory,
          acquisitionCost: costNum,
          acquisitionDate,
          description: description.trim() || null,
        },
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to update asset');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
      data-testid="edit-asset-modal"
    >
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-[#0F172A] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-800 rounded-lg text-blue-400">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Edit Asset Details</h2>
              <p className="text-xs text-slate-400">
                Update property title, category, or purchase acquisition cost
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Asset Title / Plot Number *
            </label>
            <input
              type="text"
              required
              value={assetTitle}
              onChange={(e) => setAssetTitle(e.target.value)}
              placeholder="e.g. Plot #124, Sector B-17 Multi Gardens"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] outline-hidden transition-all"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Property Category *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['PLOT', 'HOUSE', 'COMMERCIAL', 'APARTMENT'] as AssetCategory[]).map(
                (cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setAssetCategory(cat)}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all text-center ${
                      assetCategory === cat
                        ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cat.charAt(0) + cat.slice(1).toLowerCase()}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Cost & Date Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Acquisition Cost (PKR) *
              </label>
              <input
                type="number"
                required
                min="1"
                step="any"
                value={acquisitionCost}
                onChange={(e) => setAcquisitionCost(e.target.value)}
                placeholder="e.g. 4500000"
                className="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-slate-300 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] outline-hidden transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Acquisition Date *
              </label>
              <input
                type="date"
                required
                value={acquisitionDate}
                onChange={(e) => setAcquisitionDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] outline-hidden transition-all"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Description / Notes
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Corner plot, 50ft road, registered registry copy available in vault..."
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] outline-hidden transition-all resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateAssetMutation.isPending}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-slate-800 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {updateAssetMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
