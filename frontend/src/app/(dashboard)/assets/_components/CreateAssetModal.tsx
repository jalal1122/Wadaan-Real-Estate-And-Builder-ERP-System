'use client';

import React, { useState } from 'react';
import { useCreateAsset } from '@/features/assets/hooks/useAssets';
import { AssetCategory } from '@/features/assets/types';
import { X, Building, AlertCircle } from 'lucide-react';

interface CreateAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateAssetModal: React.FC<CreateAssetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const createAssetMutation = useCreateAsset();

  const [assetTitle, setAssetTitle] = useState('');
  const [assetCategory, setAssetCategory] = useState<AssetCategory>('PLOT');
  const [acquisitionCost, setAcquisitionCost] = useState('');
  const [acquisitionDate, setAcquisitionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setAssetTitle('');
    setAssetCategory('PLOT');
    setAcquisitionCost('');
    setAcquisitionDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

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

    try {
      await createAssetMutation.mutateAsync({
        assetTitle: assetTitle.trim(),
        assetCategory,
        acquisitionCost: costNum,
        acquisitionDate,
        description: description.trim() || null,
      });

      resetForm();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to register asset');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
      data-testid="create-asset-modal"
    >
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-[#0F172A] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-800 rounded-lg text-emerald-400">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Register Owned Asset</h2>
              <p className="text-xs text-slate-400">
                Add a plot, house, or commercial unit to Wadaan inventory
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
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Asset Title / Identifier *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Plot 45, Block C, Faisal Town Phase 1"
              value={assetTitle}
              onChange={(e) => setAssetTitle(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              data-testid="asset-title-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Asset Category *
              </label>
              <select
                value={assetCategory}
                onChange={(e) => setAssetCategory(e.target.value as AssetCategory)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                data-testid="asset-category-select"
              >
                <option value="PLOT">Plot</option>
                <option value="HOUSE">House / Villa</option>
                <option value="COMMERCIAL">Commercial Plaza</option>
                <option value="APARTMENT">Apartment</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Acquisition Date *
              </label>
              <input
                type="date"
                required
                value={acquisitionDate}
                onChange={(e) => setAcquisitionDate(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                data-testid="asset-date-input"
              >
              </input>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Acquisition Cost (PKR) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-semibold text-slate-400">
                Rs.
              </span>
              <input
                type="number"
                required
                min="1"
                step="any"
                placeholder="4,500,000"
                value={acquisitionCost}
                onChange={(e) => setAcquisitionCost(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                data-testid="asset-cost-input"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              The exact purchase or development cost paid by Wadaan for this property.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes / Location Details (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Near main boulevard, corner plot with registry deed"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createAssetMutation.isPending}
              className="px-4 py-2 bg-[#059669] hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
              data-testid="submit-asset-btn"
            >
              {createAssetMutation.isPending ? 'Registering...' : 'Register Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
