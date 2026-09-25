'use client';

import React from 'react';
import { useEquityLedger } from '../hooks/useReports';
import { formatPKR, formatDate } from '@/lib/format';
import { Users, UserCheck, AlertCircle, FileText } from 'lucide-react';

interface EquityDrawingsLedgerProps {
  startDate?: string;
  endDate?: string;
}

export const EquityDrawingsLedger: React.FC<EquityDrawingsLedgerProps> = ({
  startDate,
  endDate,
}) => {
  const { data: ledger, isLoading, isError } = useEquityLedger(startDate, endDate);

  const renderPartnerTable = (
    partner: {
      partnerName: string;
      accountCode: string;
      accountName: string;
      lines: Array<{
        id: string;
        date: string;
        reference: string;
        memo: string;
        accountCode: string;
        amount: string;
      }>;
      totalDrawings: string;
    },
    testId: string
  ) => {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden" data-testid={testId}>
        {/* Partner Card Header */}
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
              {partner.partnerName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900">{partner.partnerName}</h4>
              <p className="text-xs text-slate-500 font-mono">
                Equity Account: {partner.accountCode} ({partner.accountName})
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
              Subtotal Drawings
            </span>
            <span className="text-sm font-bold font-mono text-slate-900">
              {formatPKR(Number(partner.totalDrawings))}
            </span>
          </div>
        </div>

        {/* Table of Draws */}
        {partner.lines.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-600">No equity draws recorded for {partner.partnerName}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Withdrawals debited to account {partner.accountCode} will be displayed here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/40 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">JV Reference</th>
                  <th className="py-2.5 px-4">Description / Memo</th>
                  <th className="py-2.5 px-4">Account Code</th>
                  <th className="py-2.5 px-4 text-right">Amount (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {partner.lines.map((line) => (
                  <tr key={line.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 px-4 whitespace-nowrap font-medium text-slate-800">
                      {formatDate(line.date)}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-900">
                      {line.reference}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 max-w-sm truncate" title={line.memo}>
                      {line.memo}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-500">
                      {line.accountCode}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-rose-600">
                      {formatPKR(Number(line.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6" data-testid="equity-drawings-ledger">
      {/* Informational Header */}
      <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Principal Partner Drawings & Distributions
          </h3>
          <p className="text-xs text-slate-500">
            Forensic tracking of personal withdrawals and equity draws debited against partner capital accounts.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6 animate-pulse">
          <div className="h-44 bg-white border border-slate-200 rounded-xl p-4" />
          <div className="h-44 bg-white border border-slate-200 rounded-xl p-4" />
        </div>
      ) : isError ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-2xs">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-900">Failed to load partner equity drawings</p>
          <p className="text-xs text-slate-500 mt-1">Please try again or adjust your date filter.</p>
        </div>
      ) : (
        <>
          {/* Section 1: Arshad Khalil */}
          {ledger && renderPartnerTable(ledger.arshad, 'partner-arshad-section')}

          {/* Section 2: Zeeshan Yousafzai */}
          {ledger && renderPartnerTable(ledger.zeeshan, 'partner-zeeshan-section')}

          {/* Grand Total Combined Drawings Card */}
          <div className="bg-slate-900 text-white p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700">
                <UserCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Combined Partner Drawings</h4>
                <p className="text-xs text-slate-400">Total capital withdrawals across all principals for selected period</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 uppercase tracking-wider block font-semibold">
                Grand Total
              </span>
              <span className="text-2xl font-bold font-mono text-emerald-400" data-testid="equity-grand-total">
                {formatPKR(Number(ledger?.grandTotal || 0))}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
