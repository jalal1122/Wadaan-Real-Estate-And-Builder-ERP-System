'use client';

import React, { useState } from 'react';
import { RecordBillPanel } from '@/components/payables/RecordBillPanel';
import { PostedBillsPanel } from '@/components/payables/PostedBillsPanel';
import { PaymentRunPanel } from '@/components/payables/PaymentRunPanel';
import { PaymentHistoryPanel } from '@/components/payables/PaymentHistoryPanel';
import { VendorsDirectoryPanel } from '@/components/payables/VendorsDirectoryPanel';
import { Receipt, FileText, Banknote, History, Users } from 'lucide-react';

type PayablesTab = 'bill' | 'posted-bills' | 'payment' | 'payment-history' | 'vendors';

export default function PayablesPage() {
  const [activeTab, setActiveTab] = useState<PayablesTab>('bill');

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            Accounts Payable
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {activeTab === 'bill'
              ? 'Log supplier invoices, assign WIP capitalization, and post directly to General Ledger.'
              : activeTab === 'posted-bills'
              ? 'Browse, search, and edit posted supplier invoices, WIP allocations, and line items.'
              : activeTab === 'payment'
              ? 'Execute strict FIFO vendor payment runs, enforce cheque lock, and generate payment vouchers.'
              : activeTab === 'payment-history'
              ? 'Inspect past vendor disbursements, edit payment dates, accounts, instrument numbers, or amounts.'
              : 'Directory of suppliers, contact information, phone numbers, and live outstanding debt.'}
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 flex-wrap gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('bill')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'bill'
                ? 'bg-white text-[#0F172A] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
            data-testid="tab-record-bill"
          >
            <Receipt className="w-4 h-4" />
            Record Bill
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('posted-bills')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'posted-bills'
                ? 'bg-white text-[#0F172A] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
            data-testid="tab-posted-bills"
          >
            <FileText className="w-4 h-4" />
            Posted Bills
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payment')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'payment'
                ? 'bg-white text-[#0F172A] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
            data-testid="tab-payment-run"
          >
            <Banknote className="w-4 h-4" />
            Payment Run
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payment-history')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'payment-history'
                ? 'bg-white text-[#0F172A] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
            data-testid="tab-payment-history"
          >
            <History className="w-4 h-4" />
            Payment History
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('vendors')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'vendors'
                ? 'bg-white text-[#0F172A] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
            data-testid="tab-vendors"
          >
            <Users className="w-4 h-4" />
            Manage Vendors
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'bill' ? (
        <RecordBillPanel />
      ) : activeTab === 'posted-bills' ? (
        <PostedBillsPanel />
      ) : activeTab === 'payment' ? (
        <PaymentRunPanel />
      ) : activeTab === 'payment-history' ? (
        <PaymentHistoryPanel />
      ) : (
        <VendorsDirectoryPanel />
      )}
    </div>
  );
}
