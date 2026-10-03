'use client';

import React, { useState, useMemo } from 'react';
import { useBills } from '@/features/bills/hooks/useBills';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { ExpenseBillItem, PaymentStatus } from '@/features/bills/types';
import { EditBillModal } from './EditBillModal';
import { formatPKR, formatDate } from '@/lib/format';
import {
  Receipt,
  Search,
  Pencil,
  Building,
  CheckCircle2,
  AlertCircle,
  Clock,
  Briefcase,
  DollarSign,
} from 'lucide-react';

export const PostedBillsPanel: React.FC = () => {
  const { data: bills = [], isLoading, refetch } = useBills();
  const { data: projects = [] } = useProjects();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PaymentStatus>('ALL');
  const [projectFilter, setProjectFilter] = useState<string>('ALL');
  const [editingBill, setEditingBill] = useState<ExpenseBillItem | null>(null);

  // Compute metrics
  const metrics = useMemo(() => {
    let totalBilled = 0;
    let totalPending = 0;
    let paidCount = 0;
    let unpaidCount = 0;

    bills.forEach((b) => {
      const gt = Number(b.grandTotal) || 0;
      const pa = Number(b.pendingAmount) || 0;
      totalBilled += gt;
      totalPending += pa;
      if (b.paymentStatus === 'PAID') paidCount++;
      else unpaidCount++;
    });

    return {
      totalCount: bills.length,
      totalBilled,
      totalPending,
      paidCount,
      unpaidCount,
    };
  }, [bills]);

  // Filter bills
  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      // Status filter
      if (statusFilter !== 'ALL' && b.paymentStatus !== statusFilter) {
        return false;
      }

      // Project filter
      if (projectFilter !== 'ALL') {
        if (projectFilter === 'OVERHEAD' && b.projectId !== null) return false;
        if (projectFilter !== 'OVERHEAD' && b.projectId !== projectFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const invMatch = b.invoiceNumber.toLowerCase().includes(q);
        const vendMatch = b.vendor?.vendorName.toLowerCase().includes(q);
        const projMatch = b.project?.projectName.toLowerCase().includes(q);
        return invMatch || vendMatch || projMatch;
      }

      return true;
    });
  }, [bills, statusFilter, projectFilter, searchQuery]);

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            PAID
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            PARTIAL
          </span>
        );
      case 'UNPAID':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
            <AlertCircle className="w-3 h-3 text-red-600" />
            UNPAID
          </span>
        );
    }
  };

  return (
    <div className="space-y-6" data-testid="posted-bills-panel">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Invoices
            </span>
            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900" data-testid="kpi-total-bills">
            {metrics.totalCount}
          </div>
          <p className="mt-1 text-xs text-slate-400">Total recorded supplier bills</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Billed
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900" data-testid="kpi-total-billed">
            {formatPKR(metrics.totalBilled)}
          </div>
          <p className="mt-1 text-xs text-slate-400">Gross accounts payable volume</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Outstanding Debt
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-700" data-testid="kpi-outstanding-debt">
            {formatPKR(metrics.totalPending)}
          </div>
          <p className="mt-1 text-xs text-slate-400">Pending un-cleared balance</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Fully Settled
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-600" data-testid="kpi-settled-bills">
            {metrics.paidCount}
          </div>
          <p className="mt-1 text-xs text-slate-400">{metrics.unpaidCount} bills pending or partial</p>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0" data-testid="bill-status-filter-tabs">
          {(['ALL', 'UNPAID', 'PARTIAL', 'PAID'] as const).map((status) => {
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                data-testid={`tab-bill-${status.toLowerCase()}`}
              >
                {status === 'ALL' ? 'All Bills' : status}
              </button>
            );
          })}
        </div>

        {/* Project Selector & Search Box */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
            data-testid="project-filter-select"
          >
            <option value="ALL">All Cost Centers</option>
            <option value="OVERHEAD">General Office Overhead</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.projectName}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search invoice or supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 w-48 sm:w-56"
              data-testid="bill-search-input"
            />
          </div>
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
            Loading posted bills...
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="p-12 text-center space-y-3" data-testid="empty-bills-state">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Receipt className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-slate-800">No bills found</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No posted bills match the selected filters or search query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" data-testid="posted-bills-table">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Invoice # & Date</th>
                  <th className="py-3.5 px-4">Supplier / Vendor</th>
                  <th className="py-3.5 px-4">Cost Center Allocation</th>
                  <th className="py-3.5 px-4 text-right">Grand Total</th>
                  <th className="py-3.5 px-4 text-right">Pending Balance</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredBills.map((bill) => (
                  <tr
                    key={bill.id}
                    className="hover:bg-slate-50/60 transition-colors"
                    data-testid={`bill-row-${bill.id}`}
                  >
                    {/* Invoice # & Date */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 font-mono">
                        {bill.invoiceNumber}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {formatDate(bill.billDate)}
                      </div>
                    </td>

                    {/* Supplier */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">
                        {bill.vendor?.vendorName || 'Unknown Vendor'}
                      </div>
                      {bill.vendor?.phone && (
                        <div className="text-[11px] text-slate-400 font-mono">
                          {bill.vendor.phone}
                        </div>
                      )}
                    </td>

                    {/* Cost Center Allocation */}
                    <td className="py-3.5 px-4">
                      {bill.project ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg">
                          <Building className="w-3 h-3 text-emerald-600" />
                          <span>{bill.project.projectName}</span>
                          <span className="font-mono text-[9px] text-emerald-600">
                            ({bill.project.projectPrefix})
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 rounded-lg">
                          <Briefcase className="w-3 h-3 text-slate-500" />
                          <span>General Office Overhead</span>
                        </span>
                      )}
                    </td>

                    {/* Grand Total */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      {formatPKR(bill.grandTotal)}
                    </td>

                    {/* Pending Balance */}
                    <td className="py-3.5 px-4 text-right font-mono">
                      {Number(bill.pendingAmount) > 0 ? (
                        <span className="font-bold text-amber-700">
                          {formatPKR(bill.pendingAmount)}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold text-[11px]">
                          0.00 (Settled)
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(bill.paymentStatus)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setEditingBill(bill)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors shadow-2xs cursor-pointer"
                        title={`Edit Bill ${bill.invoiceNumber}`}
                        data-testid={`edit-bill-btn-${bill.id}`}
                      >
                        <Pencil className="w-3.5 h-3.5 text-blue-600" />
                        <span>Edit Bill</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Bill Modal */}
      <EditBillModal
        bill={editingBill}
        isOpen={!!editingBill}
        onClose={() => setEditingBill(null)}
        onSuccess={() => refetch()}
      />
    </div>
  );
};
