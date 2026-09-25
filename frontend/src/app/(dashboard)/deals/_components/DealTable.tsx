'use client';

import React, { useState, useMemo } from 'react';
import { Deal, DealType } from '@/features/deals/types';
import { formatPKR, formatDate } from '@/lib/format';
import {
  Search,
  ArrowRightLeft,
  BookOpen,
  Filter,
  CheckCircle2,
  Clock,
  Building2,
  Briefcase,
  Layers
} from 'lucide-react';
import { SkeletonTable } from '@/components/ui/skeleton';

interface DealTableProps {
  deals: Deal[];
  onSelectCustomer: (customerId: string) => void;
  onTransferDeal: (deal: Deal) => void;
  isLoading?: boolean;
}

export const DealTable: React.FC<DealTableProps> = ({
  deals,
  onSelectCustomer,
  onTransferDeal,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | DealType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPAID' | 'SETTLED'>('ALL');

  const filteredDeals = useMemo(() => {
    if (!deals) return [];
    return deals.filter((deal) => {
      // Type Filter
      if (typeFilter !== 'ALL' && deal.dealType !== typeFilter) {
        return false;
      }

      // Status Filter
      const pending = Number(deal.pendingBalance) || 0;
      if (statusFilter === 'UNPAID' && pending <= 0) return false;
      if (statusFilter === 'SETTLED' && pending > 0) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCustomer = deal.customer?.fullName?.toLowerCase().includes(q);
        const matchesPhone = deal.customer?.phone?.toLowerCase().includes(q);
        const matchesProject = deal.project?.name?.toLowerCase().includes(q) || deal.project?.code?.toLowerCase().includes(q);
        const matchesRef = deal.id.toLowerCase().includes(q);
        return matchesCustomer || matchesPhone || matchesProject || matchesRef;
      }

      return true;
    });
  }, [deals, typeFilter, statusFilter, searchQuery]);

  if (isLoading) {
    return <SkeletonTable rows={6} columns={6} />;
  }

  const getDealBadge = (type: DealType) => {
    switch (type) {
      case 'CONSTRUCTION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
            <Building2 className="w-3 h-3" /> Construction
          </span>
        );
      case 'BROKERAGE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-[#059669] border border-emerald-200 rounded-md">
            <Briefcase className="w-3 h-3" /> Brokerage
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200 rounded-md">
            <Layers className="w-3 h-3" /> Wadaan Sale
          </span>
        );
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden" data-testid="deal-table-container">
      {/* Search & Filter Toolbar */}
      <div className="p-4 border-b border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#F9FAFB]">
        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by client, phone, or contract ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            data-testid="deal-search-input"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {/* Type Filter */}
          <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs shrink-0">
            <button
              type="button"
              onClick={() => setTypeFilter('ALL')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                typeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Routes
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('WADAAN_SALE')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                typeFilter === 'WADAAN_SALE' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sales
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('CONSTRUCTION')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                typeFilter === 'CONSTRUCTION' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Construction
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('BROKERAGE')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                typeFilter === 'BROKERAGE' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Brokerage
            </button>
          </div>

          {/* Status Filter */}
          <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Status
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('UNPAID')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                statusFilter === 'UNPAID' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active Receivables
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('SETTLED')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                statusFilter === 'SETTLED' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Settled
            </button>
          </div>
        </div>
      </div>

      {/* Deals Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">Contract Ref</th>
              <th className="py-3 px-4">Client Portfolio</th>
              <th className="py-3 px-4">Route / Category</th>
              <th className="py-3 px-4">Project / Asset</th>
              <th className="py-3 px-4 text-right">Total Contract</th>
              <th className="py-3 px-4 text-right">Outstanding Balance</th>
              <th className="py-3 px-4 text-center">Milestones</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredDeals.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Filter className="w-6 h-6 text-slate-300" />
                    <span>No financial deals found matching the current criteria.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredDeals.map((deal) => {
                const totalVal = Number(deal.totalValue) || 0;
                const pending = Number(deal.pendingBalance) || 0;
                const paidInvoices = deal.invoices?.filter((i) => i.paymentStatus === 'PAID').length || 0;
                const totalInvoices = deal.invoices?.length || 0;
                const progressPct = totalInvoices > 0 ? Math.round((paidInvoices / totalInvoices) * 100) : 0;

                return (
                  <tr
                    key={deal.id}
                    className="hover:bg-slate-50/80 transition-colors"
                    data-testid={`deal-row-${deal.id}`}
                  >
                    {/* Contract Ref & Date */}
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                      <div>#{deal.id.slice(0, 8)}</div>
                      <div className="text-[10px] text-slate-400 font-sans font-normal">
                        {formatDate(deal.createdAt)}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => onSelectCustomer(deal.customerId)}
                        className="text-left font-semibold text-[#0F172A] hover:text-[#059669] hover:underline"
                        data-testid={`client-link-${deal.customerId}`}
                      >
                        {deal.customer.fullName}
                      </button>
                      <div className="text-[10px] text-slate-400">
                        {deal.customer.phone}
                        {Number(deal.customer.walletBalance) > 0 && (
                          <span className="ml-1 text-emerald-600 font-medium">
                            • Advance: {formatPKR(deal.customer.walletBalance)}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Deal Type Badge */}
                    <td className="py-3 px-4">
                      {getDealBadge(deal.dealType)}
                    </td>

                    {/* Linked Project */}
                    <td className="py-3 px-4">
                      {deal.project ? (
                        <div>
                          <div className="font-semibold text-slate-800">{deal.project.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">{deal.project.code}</div>
                        </div>
                      ) : deal.dealType === 'BROKERAGE' ? (
                        <div className="text-slate-500 italic">Commission Brokerage</div>
                      ) : (
                        <div className="text-slate-500">Direct Inventory Sale</div>
                      )}
                    </td>

                    {/* Total Contract */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatPKR(totalVal)}
                    </td>

                    {/* Outstanding Balance */}
                    <td className="py-3 px-4 text-right font-mono">
                      {pending > 0 ? (
                        <span className="font-bold text-amber-600">
                          {formatPKR(pending)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-[#059669] text-[11px]">
                          <CheckCircle2 className="w-3 h-3" /> SETTLED
                        </span>
                      )}
                    </td>

                    {/* Milestones Progress */}
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="text-[11px] font-semibold text-slate-700">
                          {paidInvoices} / {totalInvoices} Paid
                        </span>
                        <div className="w-16 h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full bg-[#059669] rounded-full transition-all"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectCustomer(deal.customerId)}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors inline-flex items-center gap-1"
                          title="Open Customer Khaata"
                          data-testid={`btn-khaata-${deal.id}`}
                        >
                          <BookOpen className="w-3 h-3" /> Khaata
                        </button>
                        <button
                          type="button"
                          onClick={() => onTransferDeal(deal)}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors inline-flex items-center gap-1"
                          title="Transfer File Ownership"
                          data-testid={`btn-transfer-${deal.id}`}
                        >
                          <ArrowRightLeft className="w-3 h-3" /> Transfer
                        </button>
                      </div>
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
