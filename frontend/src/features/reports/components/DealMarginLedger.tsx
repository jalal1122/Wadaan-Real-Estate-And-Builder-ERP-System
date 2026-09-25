'use client';

import React, { useState, useMemo } from 'react';
import { DealMarginItem } from '../types';
import { formatPKR } from '@/lib/format';
import { Briefcase, Building2, TrendingUp, TrendingDown, Search, Filter } from 'lucide-react';

interface DealMarginLedgerProps {
  margins: DealMarginItem[];
  isLoading: boolean;
  onSelectDeal?: (deal: DealMarginItem) => void;
}

export const DealMarginLedger: React.FC<DealMarginLedgerProps> = ({
  margins,
  isLoading,
  onSelectDeal,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMargins = useMemo(() => {
    return margins.filter((item) => {
      if (filterType !== 'ALL' && item.dealType !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCustomer = item.customerName.toLowerCase().includes(q);
        const matchesProject = item.projectName?.toLowerCase().includes(q) || false;
        const matchesId = item.dealId.toLowerCase().includes(q);
        return matchesCustomer || matchesProject || matchesId;
      }
      return true;
    });
  }, [margins, filterType, searchQuery]);

  const getDealBadge = (dealType: string) => {
    switch (dealType) {
      case 'CONSTRUCTION':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 rounded-md border border-blue-200">
            Construction
          </span>
        );
      case 'BROKERAGE':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">
            Brokerage
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-800 rounded-md border border-slate-200">
            Sale
          </span>
        );
    }
  };

  const getMarginBadge = (marginStr: string, grossProfitStr: string) => {
    const margin = parseFloat(marginStr) || 0;
    const grossProfit = parseFloat(grossProfitStr) || 0;

    if (grossProfit < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
          <TrendingDown className="w-3 h-3" />
          {margin.toFixed(1)}%
        </span>
      );
    }
    if (margin >= 25) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <TrendingUp className="w-3 h-3" />
          {margin.toFixed(1)}%
        </span>
      );
    }
    if (margin >= 10) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <TrendingUp className="w-3 h-3" />
          {margin.toFixed(1)}%
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
        {margin.toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden" data-testid="deal-margin-ledger">
      {/* Table Header & Controls */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#059669]" />
            Deal-by-Deal Profit Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Unit economics & gross margins comparing client collections against direct WIP costs
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search client, project..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 w-44 sm:w-52"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
            {['ALL', 'CONSTRUCTION', 'WADAAN_SALE', 'BROKERAGE'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterType(t)}
                className={`px-2 py-1 rounded-md font-semibold transition-colors ${
                  filterType === t
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t === 'ALL'
                  ? 'All'
                  : t === 'CONSTRUCTION'
                  ? 'Construction'
                  : t === 'WADAAN_SALE'
                  ? 'Sale'
                  : 'Brokerage'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px] font-semibold">
            <tr>
              <th className="py-3 px-4">Deal / Contract</th>
              <th className="py-3 px-4">Client</th>
              <th className="py-3 px-4">Linked Site</th>
              <th className="py-3 px-4 text-right">Contract Value</th>
              <th className="py-3 px-4 text-right">Collected</th>
              <th className="py-3 px-4 text-right">WIP Cost</th>
              <th className="py-3 px-4 text-right">Gross Profit</th>
              <th className="py-3 px-4 text-center">Margin %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  <div className="animate-pulse space-y-2 max-w-md mx-auto">
                    <div className="h-4 bg-slate-100 rounded"></div>
                    <div className="h-4 bg-slate-100 rounded w-3/4 mx-auto"></div>
                  </div>
                </td>
              </tr>
            ) : filteredMargins.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  No deals match the specified filters.
                </td>
              </tr>
            ) : (
              filteredMargins.map((item) => {
                const profitNum = parseFloat(item.grossProfit) || 0;
                return (
                  <tr
                    key={item.dealId}
                    onClick={() => onSelectDeal?.(item)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    data-testid={`deal-margin-row-${item.dealId}`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getDealBadge(item.dealType)}
                        <span className="font-mono text-[11px] font-semibold text-slate-700">
                          #{item.dealId.slice(0, 8)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {item.customerName}
                    </td>
                    <td className="py-3 px-4">
                      {item.projectName ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 text-[11px]">
                          <Building2 className="w-3 h-3 text-blue-600" />
                          {item.projectName}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-slate-800">
                      {formatPKR(item.totalValue)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-emerald-700">
                      {formatPKR(item.revenueCollected)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-slate-700">
                      {formatPKR(item.totalProjectCost)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      <span className={profitNum >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                        {formatPKR(profitNum)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getMarginBadge(item.marginPercentage, item.grossProfit)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
