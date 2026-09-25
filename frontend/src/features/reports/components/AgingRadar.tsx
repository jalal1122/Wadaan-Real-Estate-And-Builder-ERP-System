'use client';

import React from 'react';
import { AgingRadarResponse } from '../types';
import { formatPKR, formatDate } from '@/lib/format';
import { Clock, AlertTriangle, ArrowUpRight, ArrowDownLeft, CheckCircle2 } from 'lucide-react';

interface AgingRadarProps {
  data?: AgingRadarResponse;
  isLoading: boolean;
}

export const AgingRadar: React.FC<AgingRadarProps> = ({ data, isLoading }) => {
  const receivables = data?.receivables || [];
  const payables = data?.payables || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="aging-radar">
      {/* 1. Money In (Receivables Aging Radar) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Receivables Aging (Money In)
              </h3>
              <p className="text-[11px] text-slate-500">
                Clients prioritized by overdue milestone days
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-mono">
            {receivables.length} Overdue
          </span>
        </div>

        <div className="p-4 flex-1">
          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-slate-50 rounded-lg border border-slate-100" />
              ))}
            </div>
          ) : receivables.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-xs font-medium text-slate-700">All Milestone Invoices Settled</p>
              <p className="text-[11px] text-slate-400">No overdue receivables at this time.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {receivables.map((r) => {
                const isOverdue = r.daysOverdue > 0;
                return (
                  <div
                    key={r.invoiceId}
                    className="p-3 bg-slate-50 hover:bg-slate-100/70 transition-colors rounded-lg border border-slate-200/80 flex items-center justify-between gap-3 text-xs"
                    data-testid={`aging-receivable-${r.invoiceId}`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 truncate">
                          {r.customerName}
                        </span>
                        {isOverdue ? (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-sm bg-red-100 text-red-800 border border-red-200 shrink-0 flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {r.daysOverdue} Days Late
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded-sm bg-slate-200 text-slate-700 shrink-0">
                            Due Today
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {r.description} &bull; Due: {formatDate(r.dueDate)}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-slate-900">
                        {formatPKR(r.amount)}
                      </div>
                      <span className="text-[10px] text-slate-400">Unpaid</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. Money Out (Payables Aging Radar) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-700">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Payables Aging (Money Out)
              </h3>
              <p className="text-[11px] text-slate-500">
                Suppliers waiting longest for Thursday payment run
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-mono">
            {payables.length} Bills
          </span>
        </div>

        <div className="p-4 flex-1">
          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-slate-50 rounded-lg border border-slate-100" />
              ))}
            </div>
          ) : payables.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-xs font-medium text-slate-700">All Supplier Bills Cleared</p>
              <p className="text-[11px] text-slate-400">No overdue payables queued.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {payables.map((p) => {
                const isWaiting = p.daysOverdue > 0;
                return (
                  <div
                    key={p.billId}
                    className="p-3 bg-slate-50 hover:bg-slate-100/70 transition-colors rounded-lg border border-slate-200/80 flex items-center justify-between gap-3 text-xs"
                    data-testid={`aging-payable-${p.billId}`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 truncate">
                          {p.vendorName}
                        </span>
                        {isWaiting ? (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-sm bg-amber-100 text-amber-800 border border-amber-200 shrink-0 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {p.daysOverdue} Days Waiting
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded-sm bg-slate-200 text-slate-700 shrink-0">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        Invoice: #{p.invoiceNumber} &bull; Billed: {formatDate(p.billDate)}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-red-600">
                        {formatPKR(p.pendingAmount)}
                      </div>
                      <span className="text-[10px] text-slate-400">Pending AP</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
