'use client';

import React, { useState, useMemo } from 'react';
import { useWaitingRoom, useBounceCheque } from '@/features/receipts/hooks/useReceipts';
import { Receipt } from '@/features/receipts/types';
import { formatPKR, formatDate } from '@/lib/format';
import {
  Clock,
  Search,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ShieldAlert,
  ArrowDownLeft,
  Building2
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface WaitingRoomTableProps {
  onClearCheque: (receipt: Receipt) => void;
}

export const WaitingRoomTable: React.FC<WaitingRoomTableProps> = ({ onClearCheque }) => {
  const { data: waitingRoom = [], isLoading, isError, refetch } = useWaitingRoom();
  const bounceMutation = useBounceCheque();

  const [searchQuery, setSearchQuery] = useState('');
  const [bouncingId, setBouncingId] = useState<string | null>(null);
  const [bounceConfirmReceipt, setBounceConfirmReceipt] = useState<Receipt | null>(null);

  const filteredReceipts = useMemo(() => {
    return waitingRoom.filter((rcpt) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchesCustomer = rcpt.customer?.fullName?.toLowerCase().includes(q);
      const matchesPhone = rcpt.customer?.phone?.toLowerCase().includes(q);
      const matchesRef =
        (rcpt.bankRefNumber && rcpt.bankRefNumber.toLowerCase().includes(q)) ||
        (rcpt.referenceNo && rcpt.referenceNo.toLowerCase().includes(q));
      return matchesCustomer || matchesPhone || matchesRef;
    });
  }, [waitingRoom, searchQuery]);

  const handleConfirmBounce = async () => {
    if (!bounceConfirmReceipt) return;
    setBouncingId(bounceConfirmReceipt.id);
    try {
      await bounceMutation.mutateAsync(bounceConfirmReceipt.id);
      setBounceConfirmReceipt(null);
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || 'Failed to bounce cheque');
    } finally {
      setBouncingId(null);
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden" data-testid="waiting-room-table">
      {/* Table Header & Toolbar */}
      <div className="p-4 border-b border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#F9FAFB]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0F172A]">
              Cheque Waiting Room
            </h3>
            <p className="text-[11px] text-slate-500">
              Uncleared financial instruments held in escrow liability (1020)
            </p>
          </div>
          <span className="ml-2 px-2 py-0.5 text-xs font-bold font-mono bg-amber-100 text-amber-800 rounded-full">
            {waitingRoom.length}
          </span>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search cheque ref, drawer, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            data-testid="waiting-room-search-input"
          />
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">Cheque Ref & Date</th>
              <th className="py-3 px-4">Customer / Drawer</th>
              <th className="py-3 px-4 text-right">Instrument Value</th>
              <th className="py-3 px-4">Targeted Invoices</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Clearance Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-4">
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </td>
                  <td className="py-4 px-4">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </td>
                  <td className="py-4 px-4 text-right">
                    <Skeleton className="h-4 w-20 ml-auto" />
                  </td>
                  <td className="py-4 px-4">
                    <Skeleton className="h-4 w-28" />
                  </td>
                  <td className="py-4 px-4 text-center">
                    <Skeleton className="h-5 w-16 mx-auto rounded-full" />
                  </td>
                  <td className="py-4 px-4 text-right">
                    <Skeleton className="h-7 w-20 ml-auto rounded-md" />
                  </td>
                </tr>
              ))
            ) : filteredReceipts.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <CheckCircle2 className="w-8 h-8 text-[#059669]" />
                    <span className="text-xs font-semibold text-slate-700">All cheques cleared</span>
                    <span className="text-[11px] text-slate-400">
                      No pending escrow instruments waiting for clearance.
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredReceipts.map((rcpt) => {
                const amount = Number(rcpt.amount ?? rcpt.totalAmount) || 0;
                const ref = rcpt.bankRefNumber || rcpt.referenceNo || 'N/A';

                return (
                  <tr
                    key={rcpt.id}
                    className="hover:bg-slate-50/80 transition-colors"
                    data-testid={`waiting-room-row-${rcpt.id}`}
                  >
                    {/* Cheque Ref & Date */}
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      <div>{ref}</div>
                      <div className="text-[10px] text-slate-400 font-sans font-normal">
                        {formatDate(rcpt.receiptDate)}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{rcpt.customer.fullName}</div>
                      <div className="text-[10px] text-slate-400">{rcpt.customer.phone}</div>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatPKR(amount)}
                    </td>

                    {/* Targeted Invoices */}
                    <td className="py-3 px-4">
                      {rcpt.invoices && rcpt.invoices.length > 0 ? (
                        <div className="space-y-0.5">
                          {rcpt.invoices.map((inv) => (
                            <div key={inv.id} className="text-[11px] text-slate-700 truncate max-w-xs">
                              • {inv.description} ({formatPKR(inv.amount)})
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] italic text-slate-400">
                          Advance Mobilization Held
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                        <Clock className="w-3 h-3" /> PENDING
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onClearCheque(rcpt)}
                          className="px-3 py-1 text-xs font-semibold bg-[#059669] hover:bg-emerald-600 text-white rounded-lg transition-colors inline-flex items-center gap-1 shadow-2xs"
                          data-testid={`btn-clear-${rcpt.id}`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => setBounceConfirmReceipt(rcpt)}
                          className="px-2.5 py-1 text-xs font-semibold bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center gap-1"
                          data-testid={`btn-bounce-${rcpt.id}`}
                        >
                          <XCircle className="w-3.5 h-3.5" /> Bounce
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

      {/* Bounce Confirmation Modal */}
      {bounceConfirmReceipt && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2 bg-red-50 rounded-xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Mark Cheque as Bounced?</h3>
                <p className="text-xs text-slate-500">Revert invoices to unpaid status</p>
              </div>
            </div>

            <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
              <p>
                <strong>Instrument Ref:</strong>{' '}
                {bounceConfirmReceipt.bankRefNumber || bounceConfirmReceipt.referenceNo}
              </p>
              <p>
                <strong>Drawer:</strong> {bounceConfirmReceipt.customer.fullName}
              </p>
              <p>
                <strong>Amount:</strong>{' '}
                {formatPKR(bounceConfirmReceipt.amount ?? bounceConfirmReceipt.totalAmount)}
              </p>
              <p className="pt-1 text-[11px] text-red-700">
                Warning: Bouncing this cheque will remove it from the Cheque Waiting Room and immediately restore all attached installment invoices to UNPAID in the Accounts Receivable ledger.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBounceConfirmReceipt(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBounce}
                disabled={bouncingId === bounceConfirmReceipt.id}
                className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-xs transition-colors disabled:opacity-50"
                data-testid="confirm-bounce-btn"
              >
                {bouncingId === bounceConfirmReceipt.id ? 'Bouncing Instrument...' : 'Confirm Bounce'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
