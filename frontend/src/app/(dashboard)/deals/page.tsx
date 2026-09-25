'use client';

import React, { useState } from 'react';
import { useDeals } from '@/features/deals/hooks/useDeals';
import { useCustomers } from '@/features/customers/hooks/useCustomers';
import { DealKPIStrip } from './_components/DealKPIStrip';
import { DealTable } from './_components/DealTable';
import { CreateDealModal } from './_components/CreateDealModal';
import { CustomerKhaataDrawer } from './_components/CustomerKhaataDrawer';
import { TransferFileModal } from './_components/TransferFileModal';
import { Deal } from '@/features/deals/types';
import { Plus, RefreshCw, AlertCircle } from 'lucide-react';

export default function DealHubPage() {
  const {
    data: deals = [],
    isLoading: dealsLoading,
    isError: dealsError,
    refetch: refetchDeals,
  } = useDeals();

  const {
    data: customers = [],
    isLoading: customersLoading,
    refetch: refetchCustomers,
  } = useCustomers();

  // Modals & Drawer State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeKhaataCustomerId, setActiveKhaataCustomerId] = useState<string | null>(null);
  const [activeTransferDeal, setActiveTransferDeal] = useState<Deal | null>(null);

  const handleRefreshAll = () => {
    refetchDeals();
    refetchCustomers();
  };

  const isLoading = dealsLoading || customersLoading;

  return (
    <div className="space-y-6" data-testid="deal-hub-page">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]" data-testid="screen8-title">
            Deal Hub & Customers
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Client financial portfolio, multi-route deal contracts, and advance mobilization escrow.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRefreshAll}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shadow-2xs"
            title="Refresh Data"
            data-testid="refresh-deals-btn"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl shadow-xs transition-all"
            data-testid="btn-new-deal"
          >
            <Plus className="w-4 h-4" />
            + New Deal
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {dealsError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>Failed to load deal contracts. Please ensure backend services are reachable.</span>
          </div>
          <button
            type="button"
            onClick={() => refetchDeals()}
            className="font-semibold underline hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Top KPI Summary Strip */}
      <DealKPIStrip deals={deals} customers={customers} isLoading={isLoading} />

      {/* Master Deal Table */}
      <DealTable
        deals={deals}
        isLoading={isLoading}
        onSelectCustomer={(customerId) => setActiveKhaataCustomerId(customerId)}
        onTransferDeal={(deal) => setActiveTransferDeal(deal)}
      />

      {/* Create Deal Modal */}
      <CreateDealModal
        customers={customers}
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleRefreshAll}
      />

      {/* Customer Khaata Drawer */}
      <CustomerKhaataDrawer
        customerId={activeKhaataCustomerId}
        onClose={() => setActiveKhaataCustomerId(null)}
      />

      {/* Transfer Deal Modal */}
      <TransferFileModal
        deal={activeTransferDeal}
        customers={customers}
        onClose={() => setActiveTransferDeal(null)}
        onSuccess={handleRefreshAll}
      />
    </div>
  );
}
