'use client';

import React, { useMemo } from 'react';
import { Deal } from '@/features/deals/types';
import { Customer } from '@/features/customers/types';
import { formatPKR } from '@/lib/formatters';
import { DollarSign, Wallet, Building2, ShieldCheck } from 'lucide-react';
import { SkeletonCard } from '@/components/ui/skeleton';

interface DealKPIStripProps {
  deals: Deal[];
  customers: Customer[];
  isLoading?: boolean;
}

export const DealKPIStrip: React.FC<DealKPIStripProps> = ({ deals = [], customers = [], isLoading }) => {
  const metrics = useMemo(() => {
    // 1. Active Receivables: Total unpaid/pending deal invoices across all active contracts
    const activeReceivables = (deals || []).reduce((sum, d) => {
      return sum + (Number(d.pendingBalance) || 0);
    }, 0);

    // 2. Advance Mobilization Held: Total customer wallet balances
    const advanceMobilization = (customers || []).reduce((sum, c) => {
      return sum + (Number(c.walletBalance) || 0);
    }, 0);

    // 3. Construction Volume: Total contract value for CONSTRUCTION deals
    const constructionVolume = (deals || [])
      .filter((d) => d.dealType === 'CONSTRUCTION')
      .reduce((sum, d) => sum + (Number(d.totalValue) || 0), 0);

    // 4. Brokerage Escrow: Third-party client escrow held (totalValue - commissionAmount)
    let brokerageEscrow = 0;
    let brokerageCommissions = 0;
    (deals || [])
      .filter((d) => d.dealType === 'BROKERAGE')
      .forEach((d) => {
        const total = Number(d.totalValue) || 0;
        const comm = Number(d.commissionAmount) || 0;
        brokerageCommissions += comm;
        brokerageEscrow += Math.max(0, total - comm);
      });

    return {
      activeReceivables,
      advanceMobilization,
      constructionVolume,
      brokerageEscrow,
      brokerageCommissions,
    };
  }, [deals, customers]);

  if (isLoading) {
    return <SkeletonCard count={4} />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="deal-kpi-strip">
      {/* Card 1: Active Receivables */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Active Receivables
          </span>
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl font-bold font-mono tracking-tight text-[#0F172A]" data-testid="kpi-active-receivables">
            {formatPKR(metrics.activeReceivables)}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-600 font-medium">
          <span>Unpaid contract installments</span>
        </div>
      </div>

      {/* Card 2: Advance Mobilization Held */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Mobilization Advances
          </span>
          <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl font-bold font-mono tracking-tight text-[#0F172A]" data-testid="kpi-advance-mobilization">
            {formatPKR(metrics.advanceMobilization)}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <span>Customer wallet balances in escrow</span>
        </div>
      </div>

      {/* Card 3: Construction Volume */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Construction Volume
          </span>
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Building2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl font-bold font-mono tracking-tight text-[#0F172A]" data-testid="kpi-construction-volume">
            {formatPKR(metrics.constructionVolume)}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-blue-600 font-medium">
          <span>Active project development contracts</span>
        </div>
      </div>

      {/* Card 4: Brokerage Escrow vs Earned */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Brokerage Escrow
          </span>
          <div className="p-2 bg-emerald-50 text-[#059669] rounded-lg">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl font-bold font-mono tracking-tight text-[#0F172A]" data-testid="kpi-brokerage-escrow">
            {formatPKR(metrics.brokerageEscrow)}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-[#059669] font-medium">
          <span>Commissions: {formatPKR(metrics.brokerageCommissions)}</span>
        </div>
      </div>
    </div>
  );
};
