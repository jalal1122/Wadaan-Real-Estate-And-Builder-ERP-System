'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { StarterModal } from '../../components/system/StarterModal';
import { useSystemInit } from '../../hooks/useSystemInit';

export default function SetupPage() {
  const router = useRouter();
  const { status, isLoadingStatus } = useSystemInit();

  if (!isLoadingStatus && status?.isInitialized) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-4">
          <span className="text-2xl font-bold text-emerald-400">✓</span>
        </div>
        <h1 className="text-xl font-bold mb-2">System Already Initialized</h1>
        <p className="text-xs text-slate-400 mb-6 max-w-sm">
          Wadaan ERP has already completed initial Go-Live setup. Please sign in with your 4-digit Master PIN.
        </p>
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="px-5 py-2.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
        >
          Go to Institutional Access (Login) &rarr;
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
      <StarterModal
        isOpen={true}
        onClose={() => router.push('/login')}
      />
    </div>
  );
}
