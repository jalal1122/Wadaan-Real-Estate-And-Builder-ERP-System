'use client';

import React from 'react';
import { DealMarginItem } from '../types';
import { formatPKR } from '@/lib/format';
import { X, Briefcase, Building2, TrendingUp, TrendingDown, CheckCircle2, AlertCircle } from 'lucide-react';

interface DealMarginDetailDrawerProps {
  deal: DealMarginItem | null;
  onClose: () => void;
}

export const DealMarginDetailDrawer: React.FC<DealMarginDetailDrawerProps> = ({ deal, onClose }) => {
  if (!deal) return null;

  const totalVal = parseFloat(deal.totalValue) || 0;
  const collected = parseFloat(deal.revenueCollected) || 0;
  const cost = parseFloat(deal.totalProjectCost) || 0;
  const profit = parseFloat(deal.grossProfit) || 0;
  const margin = parseFloat(deal.marginPercentage) || 0;
  const uncollected = Math.max(0, totalVal - collected);
  const isPositive = profit >= 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 overflow-hidden border-l border-slate-200 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="bg-[#0F172A] text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white leading-tight">
                  Deal #{deal.dealId.slice(0, 8)}
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                  {deal.dealType}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Client: {deal.customerName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Linked Project Site */}
          {deal.projectName && (
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-blue-900">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>Linked Site: {deal.projectName}</span>
              </div>
              <span className="text-[10px] uppercase font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                Active WIP Site
              </span>
            </div>
          )}

          {/* Unit Economics Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Financial Breakdown
            </h4>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200/70">
                <span className="text-slate-500">Contract Total Value:</span>
                <span className="font-mono font-bold text-slate-900">{formatPKR(totalVal)}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-200/70">
                <span className="text-slate-500">Revenue Collected to Date:</span>
                <span className="font-mono font-bold text-emerald-700">{formatPKR(collected)}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-200/70">
                <span className="text-slate-500">Pending Client Receivable:</span>
                <span className="font-mono font-bold text-amber-600">{formatPKR(uncollected)}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-200/70">
                <span className="text-slate-500">Direct Project Cost (WIP Expenses):</span>
                <span className="font-mono font-bold text-slate-800">{formatPKR(cost)}</span>
              </div>

              <div className="flex justify-between py-1 pt-2 font-bold text-sm">
                <span className="text-slate-900">Gross Realized Profit:</span>
                <span className={`font-mono ${isPositive ? 'text-emerald-700' : 'text-red-600'}`}>
                  {formatPKR(profit)}
                </span>
              </div>

              <div className="flex justify-between py-1 font-bold text-sm">
                <span className="text-slate-900">Profit Margin:</span>
                <span className={`font-mono ${margin >= 20 ? 'text-emerald-700' : 'text-amber-600'}`}>
                  {margin.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Business Insights Note */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5 text-slate-600">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Executive Accounting Rule</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Realized margin is based on actual client inflows minus direct vendor and contractor
              bills allocated to this contract. General office overhead is accounted for separately in corporate True Net Income.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
          >
            Close Drill-Down
          </button>
        </div>
      </div>
    </div>
  );
};
