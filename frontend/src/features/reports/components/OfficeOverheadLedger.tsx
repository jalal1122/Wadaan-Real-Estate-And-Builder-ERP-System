'use client';

import React from 'react';
import { useOverheadLedger } from '../hooks/useReports';
import { formatPKR, formatDate } from '@/lib/format';
import { Landmark, Receipt, AlertCircle } from 'lucide-react';

interface OfficeOverheadLedgerProps {
  startDate?: string;
  endDate?: string;
}

export const OfficeOverheadLedger: React.FC<OfficeOverheadLedgerProps> = ({
  startDate,
  endDate,
}) => {
  const { data: ledger, isLoading, isError } = useOverheadLedger(startDate, endDate);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">
            Paid
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 rounded-md border border-amber-200">
            Partial
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-rose-50 text-rose-700 rounded-md border border-rose-200">
            Unpaid
          </span>
        );
    }
  };

  return (
    <div className="space-y-6" data-testid="office-overhead-ledger">
      {/* Header Info Banner */}
      <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center">
          <Landmark className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Office & Administrative Overhead Ledger
          </h3>
          <p className="text-xs text-slate-500">
            Operational expenses not attributed to any construction project (rent, utilities, legal, tea/kitchen, stationery).
          </p>
        </div>
      </div>

      {/* Overhead Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4 animate-pulse">
            <div className="h-6 bg-slate-100 rounded w-1/4" />
            <div className="h-10 bg-slate-100 rounded" />
            <div className="h-10 bg-slate-100 rounded" />
            <div className="h-10 bg-slate-100 rounded" />
          </div>
        ) : isError ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-900">Failed to load overhead ledger</p>
            <p className="text-xs text-slate-500 mt-1">Please try again or adjust your date filter.</p>
          </div>
        ) : ledger?.bills.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">No overhead expenses recorded in this period</p>
            <p className="text-xs text-slate-400 mt-1">
              General company bills without an assigned project will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Vendor / Payee</th>
                  <th className="py-3 px-4">Invoice / Bill #</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Amount (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {ledger?.bills.map((bill) => (
                  <tr key={bill.billId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-800">
                      {formatDate(bill.billDate)}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {bill.vendorName}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {bill.invoiceNumber || '—'}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(bill.paymentStatus)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                      {formatPKR(Number(bill.grandTotal))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900 text-sm">
                  <td colSpan={4} className="py-4 px-4 text-right uppercase tracking-wider text-xs text-slate-600 font-semibold">
                    Total Overhead Expenses:
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-slate-900 text-base" data-testid="overhead-total-amount">
                    {formatPKR(Number(ledger?.totalOverhead || 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
