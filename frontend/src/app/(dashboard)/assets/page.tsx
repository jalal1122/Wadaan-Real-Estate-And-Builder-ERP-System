'use client';

import React, { useState, useMemo } from 'react';
import { useAssets, useDeleteAsset } from '@/features/assets/hooks/useAssets';
import { AssetStatus, AssetCategory, WadaanAsset } from '@/features/assets/types';
import { CreateAssetModal } from './_components/CreateAssetModal';
import { ReacquireAssetModal } from './_components/ReacquireAssetModal';
import { formatPKR, formatDate } from '@/lib/format';
import {
  Building,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Briefcase,
  AlertCircle,
  Warehouse,
  Layers,
  Search,
  RotateCcw
} from 'lucide-react';

export default function AssetInventoryPage() {
  const [selectedStatusTab, setSelectedStatusTab] = useState<'ALL' | AssetStatus>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [reacquireTarget, setReacquireTarget] = useState<WadaanAsset | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: assets = [], isLoading, isError, refetch } = useAssets();
  const deleteAssetMutation = useDeleteAsset();

  // Metrics
  const metrics = useMemo(() => {
    const totalCount = assets.length;
    const totalCost = assets.reduce((sum, a) => sum + Number(a.acquisitionCost || 0), 0);
    const availableCount = assets.filter((a) => a.status === 'AVAILABLE').length;
    const availableCost = assets
      .filter((a) => a.status === 'AVAILABLE')
      .reduce((sum, a) => sum + Number(a.acquisitionCost || 0), 0);
    const reservedCount = assets.filter((a) => a.status === 'RESERVED').length;
    const soldCount = assets.filter((a) => a.status === 'SOLD').length;

    return {
      totalCount,
      totalCost,
      availableCount,
      availableCost,
      reservedCount,
      soldCount,
    };
  }, [assets]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesStatus =
        selectedStatusTab === 'ALL' || asset.status === selectedStatusTab;
      const matchesCategory =
        selectedCategory === 'ALL' || asset.assetCategory === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        asset.assetTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.deal?.customer?.fullName.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesStatus && matchesCategory && matchesSearch;
    });
  }, [assets, selectedStatusTab, selectedCategory, searchQuery]);

  const handleDelete = async (asset: WadaanAsset) => {
    if (asset.status !== 'AVAILABLE') {
      alert(`Cannot delete asset "${asset.assetTitle}" because it is currently ${asset.status}.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${asset.assetTitle}" from inventory?`)) {
      return;
    }

    setDeleteError(null);
    try {
      await deleteAssetMutation.mutateAsync(asset.id);
      refetch();
    } catch (err: any) {
      setDeleteError(
        err?.response?.data?.message || err.message || 'Failed to delete asset'
      );
    }
  };

  const getCategoryBadge = (category: AssetCategory) => {
    switch (category) {
      case 'PLOT':
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-blue-50 text-blue-700 border border-blue-200">
            Plot
          </span>
        );
      case 'HOUSE':
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            House / Villa
          </span>
        );
      case 'COMMERCIAL':
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-purple-50 text-purple-700 border border-purple-200">
            Commercial
          </span>
        );
      case 'APARTMENT':
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-amber-50 text-amber-700 border border-amber-200">
            Apartment
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-slate-100 text-slate-700">
            {category}
          </span>
        );
    }
  };

  const getStatusBadge = (status: AssetStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200" data-testid="status-badge-available">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Available
          </span>
        );
      case 'RESERVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-800 border border-amber-200" data-testid="status-badge-reserved">
            <Clock className="w-3 h-3 text-amber-600" />
            Reserved
          </span>
        );
      case 'SOLD':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-300" data-testid="status-badge-sold">
            Sold
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-900 text-emerald-400 rounded-xl shadow-xs">
              <Warehouse className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Wadaan Asset Inventory
              </h1>
              <p className="text-xs text-slate-500">
                Company-owned plots, houses, and commercial property registry for true profit tracking
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#059669] hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl shadow-sm transition-all duration-150 self-start sm:self-auto shrink-0"
          data-testid="open-register-asset-modal"
        >
          <Plus className="w-4 h-4" />
          <span>Register Asset</span>
        </button>
      </div>

      {deleteError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{deleteError}</span>
          </div>
          <button onClick={() => setDeleteError(null)} className="text-red-500 hover:text-red-700 font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="asset-kpi-strip">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Assets
            </span>
            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900" data-testid="kpi-total-count">
            {metrics.totalCount}
          </div>
          <p className="mt-1 text-xs text-slate-400">Total properties registered</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Capital Invested
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900" data-testid="kpi-total-cost">
            {formatPKR(metrics.totalCost)}
          </div>
          <p className="mt-1 text-xs text-slate-400">Total acquisition capital</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Available Units
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-600" data-testid="kpi-available-count">
            {metrics.availableCount}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Valued at {formatPKR(metrics.availableCost)}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Reserved / Sold
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-700" data-testid="kpi-reserved-count">
            {metrics.reservedCount + metrics.soldCount}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {metrics.reservedCount} Active Deals • {metrics.soldCount} Fully Settled
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0" data-testid="status-filter-tabs">
          {(['ALL', 'AVAILABLE', 'RESERVED', 'SOLD'] as const).map((status) => {
            const isActive = selectedStatusTab === status;
            return (
              <button
                key={status}
                onClick={() => setSelectedStatusTab(status)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                data-testid={`tab-${status.toLowerCase()}`}
              >
                {status === 'ALL' ? 'All Units' : status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            );
          })}
        </div>

        {/* Category & Search */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
            data-testid="category-filter-select"
          >
            <option value="ALL">All Categories</option>
            <option value="PLOT">Plots</option>
            <option value="HOUSE">Houses</option>
            <option value="COMMERCIAL">Commercial</option>
            <option value="APARTMENT">Apartments</option>
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search title or client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 w-48 sm:w-56"
              data-testid="asset-search-input"
            />
          </div>
        </div>
      </div>

      {/* Asset Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
            Loading asset inventory...
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="p-12 text-center space-y-3" data-testid="empty-assets-state">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Warehouse className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-slate-800">No assets found</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No properties matched the selected filters. Register new company plots or clear filters to view inventory.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register New Asset</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" data-testid="assets-table">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Asset Title & Details</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Acquisition Cost</th>
                  <th className="py-3.5 px-4">Date Acquired</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Linked Deal / Client</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredAssets.map((asset) => {
                  return (
                    <tr
                      key={asset.id}
                      className="hover:bg-slate-50/60 transition-colors"
                      data-testid={`asset-row-${asset.id}`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{asset.assetTitle}</div>
                        {asset.description && (
                          <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {asset.description}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">{getCategoryBadge(asset.assetCategory)}</td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {formatPKR(asset.acquisitionCost)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {formatDate(asset.acquisitionDate)}
                      </td>

                      <td className="py-3.5 px-4">{getStatusBadge(asset.status)}</td>

                      <td className="py-3.5 px-4">
                        {asset.deal ? (
                          <div className="space-y-0.5">
                            <span className="font-semibold text-slate-800 block text-xs">
                              {asset.deal.customer?.fullName || 'Assigned Buyer'}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400 block">
                              Deal #{asset.deal.id.slice(0, 8)} • {formatPKR(asset.deal.totalValue)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Unlinked (In Stock)</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {asset.status === 'SOLD' && (
                            <button
                              onClick={() => setReacquireTarget(asset)}
                              title="Re-acquire / Re-list Property into Inventory"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                              data-testid={`reacquire-asset-btn-${asset.id}`}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Re-acquire</span>
                            </button>
                          )}
                          {asset.status === 'AVAILABLE' ? (
                            <button
                              onClick={() => handleDelete(asset)}
                              title="Delete Asset"
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              data-testid={`delete-asset-btn-${asset.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : asset.status !== 'SOLD' ? (
                            <span
                              title="Cannot delete an asset linked to an active deal"
                              className="p-1.5 text-slate-300 cursor-not-allowed inline-block"
                            >
                              <Trash2 className="w-4 h-4" />
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateAssetModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => refetch()}
      />
      <ReacquireAssetModal
        asset={reacquireTarget}
        isOpen={!!reacquireTarget}
        onClose={() => setReacquireTarget(null)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
