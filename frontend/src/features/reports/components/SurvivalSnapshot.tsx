'use client';

import React from 'react';
import { ExecutiveSnapshot } from '../types';
import { formatPKR } from '@/lib/format';
import { Wallet, ShieldAlert, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface SurvivalSnapshotProps {
  data?: ExecutiveSnapshot;
  isLoading: boolean;
}

export const SurvivalSnapshot: React.FC<SurvivalSnapshotProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-white border border-slate-200 rounded-xl p-4" />
        ))}
      </div>
    );
  }

  const liquidCash = Number(data?.liquidCash) || 0;
  const clientFunds = Number(data?.clientFundsHeld) || 0;
  const totalAR = Number(data?.totalAR) || 0;
  const totalAP = Number(data?.totalAP) || 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="survival-snapshot">
      {/* 1. Total Liquid Cash */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
          <span>Total Liquid Cash</span>
          <Wallet className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="mt-2 text-2xl font-bold font-mono text-slate-900" data-testid="snapshot-liquid-cash">
          {formatPKR(liquidCash)}
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          Meezan Bank & Office Safe balance
        </p>
      </div>

      {/* 2. Client Funds Held (Escrow / Wallet) */}
      <div className="bg-white p-4 rounded-xl border border-amber-200/80 bg-amber-50/20 shadow-2xs hover:shadow-xs transition-shadow">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-amber-700">
          <span>Client Funds Held</span>
          <ShieldAlert className="w-4 h-4 text-amber-600" />
        </div>
        <div className="mt-2 text-2xl font-bold font-mono text-amber-700" data-testid="snapshot-client-funds">
          {formatPKR(clientFunds)}
        </div>
        <p className="text-[11px] text-amber-800/80 mt-1">
          Mobilization advances & escrow liabilities
        </p>
      </div>

      {/* 3. Total Receivables (AR) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
          <span>Total Receivables</span>
          <ArrowUpRight className="w-4 h-4 text-blue-600" />
        </div>
        <div className="mt-2 text-2xl font-bold font-mono text-blue-700" data-testid="snapshot-total-ar">
          {formatPKR(totalAR)}
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          Unpaid milestone installments owed to Wadaan
        </p>
      </div>

      {/* 4. Total Payables (AP) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
          <span>Total Payables</span>
          <ArrowDownLeft className="w-4 h-4 text-red-600" />
        </div>
        <div className="mt-2 text-2xl font-bold font-mono text-red-600" data-testid="snapshot-total-ap">
          {formatPKR(totalAP)}
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          Pending bills queued for Thursday payment run
        </p>
      </div>
    </div>
  );
};
