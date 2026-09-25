'use client';

import React, { useState } from 'react';
import {
  useExecutiveSnapshot,
  useDealMargins,
  useAgingRadar,
  useNetIncome,
} from '@/features/reports/hooks/useReports';
import { SurvivalSnapshot } from '@/features/reports/components/SurvivalSnapshot';
import { DealMarginLedger } from '@/features/reports/components/DealMarginLedger';
import { AgingRadar } from '@/features/reports/components/AgingRadar';
import { TrueNetIncomeCard } from '@/features/reports/components/TrueNetIncomeCard';
import { DealMarginDetailDrawer } from '@/features/reports/components/DealMarginDetailDrawer';
import { ProjectCostLedger } from '@/features/reports/components/ProjectCostLedger';
import { OfficeOverheadLedger } from '@/features/reports/components/OfficeOverheadLedger';
import { EquityDrawingsLedger } from '@/features/reports/components/EquityDrawingsLedger';
import { DealMarginItem } from '@/features/reports/types';
import { formatDate } from '@/lib/format';
import {
  BarChart3,
  TrendingUp,
  Building2,
  Landmark,
  Users,
  Printer,
  RefreshCw,
  Calendar,
} from 'lucide-react';

type TabId = 'snapshot' | 'deal-margins' | 'project-costs' | 'overhead' | 'drawings';

export default function MasterReportsHubPage() {
  const [activeTab, setActiveTab] = useState<TabId>('snapshot');

  // Global Date Filter State
  const [datePreset, setDatePreset] = useState<string>('THIS_MONTH');
  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === 'THIS_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const end = now.toISOString().slice(0, 10);
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'LAST_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
      const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'THIS_FY') {
      // Pakistani fiscal year: July 1st of current year (or previous year if before July)
      const currentYear = now.getFullYear();
      const fyStartYear = now.getMonth() >= 6 ? currentYear : currentYear - 1;
      const start = new Date(fyStartYear, 6, 1).toISOString().slice(0, 10);
      const end = now.toISOString().slice(0, 10);
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'ALL_TIME') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Queries
  const {
    data: snapshot,
    isLoading: snapshotLoading,
    refetch: refetchSnapshot,
  } = useExecutiveSnapshot();

  const {
    data: dealMargins = [],
    isLoading: marginsLoading,
    refetch: refetchMargins,
  } = useDealMargins();

  const {
    data: agingRadar,
    isLoading: agingLoading,
    refetch: refetchAging,
  } = useAgingRadar();

  const {
    data: netIncome,
    isLoading: netIncomeLoading,
    refetch: refetchNetIncome,
  } = useNetIncome(startDate || undefined, endDate || undefined);

  const [selectedDeal, setSelectedDeal] = useState<DealMarginItem | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchSnapshot(),
      refetchMargins(),
      refetchAging(),
      refetchNetIncome(),
    ]);
    setIsRefreshing(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const tabs: Array<{ id: TabId; label: string; icon: React.ElementType }> = [
    { id: 'snapshot', label: 'Executive Snapshot', icon: BarChart3 },
    { id: 'deal-margins', label: 'Deal Margins', icon: TrendingUp },
    { id: 'project-costs', label: 'Project Cost Ledger', icon: Building2 },
    { id: 'overhead', label: 'Office Overhead', icon: Landmark },
    { id: 'drawings', label: 'Partner Drawings', icon: Users },
  ];

  const getActiveTabTitle = () => {
    return tabs.find((t) => t.id === activeTab)?.label || 'Executive Report';
  };

  return (
    <div className="space-y-6 pb-12" data-testid="master-reports-hub">
      {/* Printable Report Header (Visible only when printing) */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              WADAAN REAL ESTATE &amp; BUILDERS
            </h1>
            <p className="text-sm font-semibold text-slate-600">
              Master Reports Hub &bull; {getActiveTabTitle()}
            </p>
          </div>
          <div className="text-right text-xs text-slate-500 font-mono">
            <p>
              Period: {startDate ? formatDate(startDate) : 'Beginning'} &mdash;{' '}
              {endDate ? formatDate(endDate) : 'Present'}
            </p>
            <p>Strictly Confidential &bull; Executive Copy</p>
            <p>Printed: {new Date().toLocaleDateString('en-PK')}</p>
          </div>
        </div>
      </div>

      {/* Screen Header (Interactive) */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-[#059669]" />
            Master Reports Hub
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Institutional financial intelligence, project cost ledgers, overheads, and partner equity distributions.
          </p>
        </div>

        {/* Global Action & Date Controls */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Quick Presets Dropdown */}
          <div className="relative">
            <select
              aria-label="Report Date Range Preset"
              value={datePreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-3 py-2 pr-7 shadow-2xs focus:ring-emerald-500 focus:border-emerald-500 outline-none cursor-pointer"
            >
              <option value="THIS_MONTH">This Month</option>
              <option value="LAST_MONTH">Last Month</option>
              <option value="THIS_FY">This Fiscal Year</option>
              <option value="ALL_TIME">All Time</option>
              <option value="CUSTOM">Custom Range</option>
            </select>
          </div>

          {/* Date Range Inputs */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-2xs text-xs text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              aria-label="Start Date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset('CUSTOM');
              }}
              className="border-none p-0 text-xs text-slate-800 focus:ring-0 outline-none bg-transparent"
            />
            <span className="text-slate-300 font-bold">&ndash;</span>
            <input
              type="date"
              aria-label="End Date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset('CUSTOM');
              }}
              className="border-none p-0 text-xs text-slate-800 focus:ring-0 outline-none bg-transparent"
            />
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
            title="Refresh all metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {/* Export to PDF / Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
            title="Print or export as PDF"
          >
            <Printer className="w-4 h-4" />
            Export to PDF / Print
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <nav aria-label="Reports Sub-Tabs" className="flex flex-wrap gap-2 no-print border-b border-slate-200 pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              data-testid={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-lg font-medium text-xs sm:text-sm flex items-center gap-2 transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs font-semibold'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Sub-Tab 1: Executive Snapshot */}
      <div
        className={`${activeTab === 'snapshot' ? 'block' : 'hidden'} print:block space-y-6`}
        data-testid="tab-content-snapshot"
      >
        {/* Survival Snapshot */}
        <section aria-labelledby="survival-snapshot-heading">
          <h2 id="survival-snapshot-heading" className="sr-only">
            Survival Snapshot
          </h2>
          <SurvivalSnapshot data={snapshot} isLoading={snapshotLoading} />
        </section>

        {/* Corporate Profitability & True Net Income */}
        <section aria-labelledby="true-net-income-heading">
          <h2 id="true-net-income-heading" className="sr-only">
            Corporate Net Income
          </h2>
          <TrueNetIncomeCard
            data={netIncome}
            isLoading={netIncomeLoading}
            startDate={startDate}
            endDate={endDate}
            onDateChange={(s, e) => {
              setStartDate(s);
              setEndDate(e);
              setDatePreset('CUSTOM');
            }}
          />
        </section>

        {/* Aging Radar (Who is Late? Tracker) */}
        <section aria-labelledby="aging-radar-heading">
          <h2 id="aging-radar-heading" className="sr-only">
            Aging Radar
          </h2>
          <AgingRadar data={agingRadar} isLoading={agingLoading} />
        </section>
      </div>

      {/* Sub-Tab 2: Deal Margins */}
      <div
        className={`${activeTab === 'deal-margins' ? 'block' : 'hidden'} print:block space-y-6`}
        data-testid="tab-content-deal-margins"
      >
        <section aria-labelledby="deal-profit-ledger-heading">
          <h2 id="deal-profit-ledger-heading" className="sr-only">
            Deal-by-Deal Profit Ledger
          </h2>
          <DealMarginLedger
            margins={dealMargins}
            isLoading={marginsLoading}
            onSelectDeal={(deal) => setSelectedDeal(deal)}
          />
        </section>
      </div>

      {/* Sub-Tab 3: Project Cost Ledger */}
      <div
        className={`${activeTab === 'project-costs' ? 'block' : 'hidden'} print:block space-y-6`}
        data-testid="tab-content-project-costs"
      >
        <ProjectCostLedger
          startDate={startDate || undefined}
          endDate={endDate || undefined}
        />
      </div>

      {/* Sub-Tab 4: Office Overhead */}
      <div
        className={`${activeTab === 'overhead' ? 'block' : 'hidden'} print:block space-y-6`}
        data-testid="tab-content-overhead"
      >
        <OfficeOverheadLedger
          startDate={startDate || undefined}
          endDate={endDate || undefined}
        />
      </div>

      {/* Sub-Tab 5: Partner Drawings */}
      <div
        className={`${activeTab === 'drawings' ? 'block' : 'hidden'} print:block space-y-6`}
        data-testid="tab-content-drawings"
      >
        <EquityDrawingsLedger
          startDate={startDate || undefined}
          endDate={endDate || undefined}
        />
      </div>

      {/* Deal Drill-Down Slide-Over Drawer */}
      <DealMarginDetailDrawer
        deal={selectedDeal}
        onClose={() => setSelectedDeal(null)}
      />
    </div>
  );
}
