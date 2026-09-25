'use client';

import React from 'react';
import { NetIncomeReport } from '../types';
import { formatPKR, formatDate } from '@/lib/format';
import { Landmark, TrendingUp, TrendingDown, Minus, Plus, Equal, Calendar } from 'lucide-react';

interface TrueNetIncomeCardProps {
  data?: NetIncomeReport;
  isLoading: boolean;
  startDate?: string;
  endDate?: string;
  onDateChange?: (start: string, end: string) => void;
}

export const TrueNetIncomeCard: React.FC<TrueNetIncomeCardProps> = ({
  data,
  isLoading,
  startDate,
  endDate,
  onDateChange,
}) => {
  const grossProfit = Number(data?.grossDealProfit) || 0;
  const commissions = Number(data?.brokerageCommissions) || 0;
  const overhead = Number(data?.generalOverhead) || 0;
  const netIncome = Number(data?.netIncome) || 0;
  const isPositive = netIncome >= 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden" data-testid="true-net-income-card">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Landmark className="w-4 h-4 text-[#059669]" />
            Corporate Profitability & True Net Income
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Total deal profit minus office overhead (rent, utilities, salaries)
          </p>
        </div>

        {data?.period && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {formatDate(data.period.startDate)} &ndash; {formatDate(data.period.endDate)}
            </span>
          </div>
        )}
      </div>

      {/* Body: Mathematical Waterfall */}
      <div className="p-6">
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-10 bg-slate-100 rounded-lg"></div>
            <div className="h-10 bg-slate-100 rounded-lg"></div>
            <div className="h-16 bg-slate-100 rounded-lg"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            {/* 1. Gross Deal Profit */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Gross Deal Profit
              </span>
              <div className="mt-1 text-lg font-bold font-mono text-emerald-700">
                {formatPKR(grossProfit)}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">From active/closed deals</p>
            </div>

            {/* 2. Brokerage Cut */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Brokerage Cut
              </span>
              <div className="mt-1 text-lg font-bold font-mono text-emerald-700">
                +{formatPKR(commissions)}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Earned commission cut</p>
            </div>

            {/* 3. General Overhead */}
            <div className="p-4 bg-red-50/50 rounded-xl border border-red-200">
              <span className="text-[11px] font-semibold text-red-700 uppercase tracking-wider block">
                Less: Office Overhead
              </span>
              <div className="mt-1 text-lg font-bold font-mono text-red-600">
                -{formatPKR(overhead)}
              </div>
              <p className="text-[10px] text-red-700/80 mt-0.5">Rent, utility, salaries, tea</p>
            </div>

            {/* 4. True Net Income */}
            <div
              className={`p-4 rounded-xl border shadow-sm ${
                isPositive
                  ? 'bg-gradient-to-br from-emerald-900 to-slate-900 text-white border-emerald-700'
                  : 'bg-gradient-to-br from-red-900 to-slate-900 text-white border-red-700'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                <span>True Net Income</span>
                {isPositive ? (
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
              </div>
              <div className="mt-1 text-xl font-bold font-mono" data-testid="true-net-income-value">
                {isPositive ? `+${formatPKR(netIncome)}` : formatPKR(netIncome)}
              </div>
              <p className="text-[10px] text-slate-300 mt-0.5">
                Real wealth generated by Wadaan
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
