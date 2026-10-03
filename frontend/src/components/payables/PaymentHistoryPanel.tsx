'use client';

import React, { useState, useMemo } from 'react';
import { usePayments } from '@/features/payments/hooks/usePayments';
import { useVendors } from '@/features/vendors/hooks/useVendors';
import { useChartOfAccounts } from '@/features/accounting/hooks/useAccounting';
import { VendorPaymentItem } from '@/features/payments/types';
import { EditPaymentModal } from './EditPaymentModal';
import { formatPKR, formatDate } from '@/lib/format';
import {
  Banknote,
  Search,
  Pencil,
  Building,
  CreditCard,
  CheckCircle2,
  DollarSign,
  Landmark,
} from 'lucide-react';

export const PaymentHistoryPanel: React.FC = () => {
  const { data: payments = [], isLoading, refetch } = usePayments();
  const { data: vendors = [] } = useVendors();
  const { data: accountsData } = useChartOfAccounts();

  const [searchQuery, setSearchQuery] = useState('');
  const [vendorFilter, setVendorFilter] = useState<string>('ALL');
  const [editingPayment, setEditingPayment] = useState<VendorPaymentItem | null>(null);

  // Map account IDs to account names
  const accountMap = useMemo(() => {
    const map = new Map<string, string>();
    accountsData?.accounts?.forEach((acc) => {
      map.set(acc.id, `${acc.accountName} (${acc.accountCode})`);
    });
    return map;
  }, [accountsData]);

  // Compute metrics
  const metrics = useMemo(() => {
    let totalDisbursed = 0;
    let chequeCount = 0;
    let onlineCount = 0;

    payments.forEach((p) => {
      const amt = Number(p.amountPaid) || 0;
      totalDisbursed += amt;
      if (p.chequeRef) chequeCount++;
      if (p.transactionId) onlineCount++;
    });

    return {
      totalCount: payments.length,
      totalDisbursed,
      chequeCount,
      onlineCount,
    };
  }, [payments]);

  // Filter payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (vendorFilter !== 'ALL' && p.vendorId !== vendorFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const vName = p.vendor?.vendorName.toLowerCase() || '';
        const chq = p.chequeRef?.toLowerCase() || '';
        const trx = p.transactionId?.toLowerCase() || '';
        return vName.includes(q) || chq.includes(q) || trx.includes(q);
      }

      return true;
    });
  }, [payments, vendorFilter, searchQuery]);

  return (
    <div className="space-y-6" data-testid="payment-history-panel">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Disbursements
            </span>
            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900" data-testid="kpi-total-payments">
            {metrics.totalCount}
          </div>
          <p className="mt-1 text-xs text-slate-400">Total executed payment runs</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Capital Disbursed
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900" data-testid="kpi-disbursed-volume">
            {formatPKR(metrics.totalDisbursed)}
          </div>
          <p className="mt-1 text-xs text-slate-400">Cumulative supplier settlements</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cheque Payments
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-blue-700" data-testid="kpi-cheque-payments">
            {metrics.chequeCount}
          </div>
          <p className="mt-1 text-xs text-slate-400">Physical bank cheques issued</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Online / Direct Cash
            </span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-purple-700" data-testid="kpi-online-payments">
            {metrics.onlineCount}
          </div>
          <p className="mt-1 text-xs text-slate-400">Bank wire or cash disbursements</p>
        </div>
      </div>

      {/* Toolbar & Filter */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Supplier Selector */}
        <div className="flex items-center gap-2">
          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
            data-testid="payment-vendor-filter-select"
          >
            <option value="ALL">All Suppliers ({vendors.length})</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.vendorName}
              </option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search vendor or cheque #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 w-48 sm:w-64"
            data-testid="payment-search-input"
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
            Loading payment run history...
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center space-y-3" data-testid="empty-payments-state">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Banknote className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-slate-800">No payments found</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No vendor payment disbursements match the selected filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" data-testid="payment-history-table">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Payment Date</th>
                  <th className="py-3.5 px-4">Supplier / Vendor</th>
                  <th className="py-3.5 px-4">Disbursement Account</th>
                  <th className="py-3.5 px-4">Instrument Reference</th>
                  <th className="py-3.5 px-4 text-right">Amount Paid</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="hover:bg-slate-50/60 transition-colors"
                    data-testid={`payment-row-${payment.id}`}
                  >
                    {/* Date */}
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      {formatDate(payment.paymentDate)}
                    </td>

                    {/* Vendor */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">
                        {payment.vendor?.vendorName || 'Unknown Vendor'}
                      </div>
                    </td>

                    {/* Source Account */}
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-700">
                        {accountMap.get(payment.sourceAccountId) || 'Source Account'}
                      </span>
                    </td>

                    {/* Ref */}
                    <td className="py-3.5 px-4">
                      {payment.chequeRef ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <CreditCard className="w-3 h-3 text-blue-600" />
                          <span>Cheque: {payment.chequeRef}</span>
                        </span>
                      ) : payment.transactionId ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          <Landmark className="w-3 h-3 text-purple-600" />
                          <span>Wire: {payment.transactionId}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Direct Cash</span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      {formatPKR(payment.amountPaid)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setEditingPayment(payment)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors shadow-2xs cursor-pointer"
                        title={`Edit Payment #${payment.id.slice(0, 8)}`}
                        data-testid={`edit-payment-btn-${payment.id}`}
                      >
                        <Pencil className="w-3.5 h-3.5 text-blue-600" />
                        <span>Edit Payment</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Payment Modal */}
      <EditPaymentModal
        payment={editingPayment}
        isOpen={!!editingPayment}
        onClose={() => setEditingPayment(null)}
        onSuccess={() => refetch()}
      />
    </div>
  );
};
