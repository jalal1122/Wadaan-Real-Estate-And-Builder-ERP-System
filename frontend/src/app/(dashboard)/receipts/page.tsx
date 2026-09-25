'use client';

import React, { useState } from 'react';
import { FastInflowForm } from './_components/FastInflowForm';
import { WaitingRoomTable } from './_components/WaitingRoomTable';
import { ClearanceModal } from './_components/ClearanceModal';
import { Receipt } from '@/features/receipts/types';
import { useWaitingRoom } from '@/features/receipts/hooks/useReceipts';
import { RefreshCw } from 'lucide-react';

export default function ReceiptsPage() {
  const { refetch: refetchWaitingRoom, isFetching } = useWaitingRoom();
  const [activeClearanceReceipt, setActiveClearanceReceipt] = useState<Receipt | null>(null);

  return (
    <div className="space-y-6" data-testid="receipts-gateway-page">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]" data-testid="screen9-title">
            Cash & Cheque Gateway
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Client inflow processing, instrument escrow waiting room, and real-time bank clearance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => refetchWaitingRoom()}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shadow-2xs"
            title="Refresh Waiting Room"
            data-testid="refresh-receipts-btn"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Two-Column Gateway Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Fast Inflow Form (5 Cols) */}
        <div className="lg:col-span-5">
          <FastInflowForm />
        </div>

        {/* Right Column: Cheque Waiting Room Table (7 Cols) */}
        <div className="lg:col-span-7">
          <WaitingRoomTable
            onClearCheque={(receipt) => setActiveClearanceReceipt(receipt)}
          />
        </div>
      </div>

      {/* Cheque Clearance Depository Modal */}
      <ClearanceModal
        receipt={activeClearanceReceipt}
        onClose={() => setActiveClearanceReceipt(null)}
        onSuccess={() => refetchWaitingRoom()}
      />
    </div>
  );
}
