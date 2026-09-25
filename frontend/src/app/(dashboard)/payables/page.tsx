'use client';

import React, { useState } from 'react';
import { RecordBillPanel } from '@/components/payables/RecordBillPanel';
import { PaymentRunPanel } from '@/components/payables/PaymentRunPanel';
import { Receipt, Banknote } from 'lucide-react';

type PayablesTab = 'bill' | 'payment';

export default function PayablesPage() {
  const [activeTab, setActiveTab] = useState<PayablesTab>('bill');

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            Accounts Payable
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {activeTab === 'bill'
              ? 'Log supplier invoices, assign WIP capitalization, and post directly to General Ledger.'
              : 'Execute strict FIFO vendor payment runs, enforce cheque lock, and generate payment vouchers.'}
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('bill')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'bill'
                ? 'bg-white text-[#0F172A] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Record Bill
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payment')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'payment'
                ? 'bg-white text-[#0F172A] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Banknote className="w-4 h-4" />
            Payment Run
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'bill' ? <RecordBillPanel /> : <PaymentRunPanel />}
    </div>
  );
}
