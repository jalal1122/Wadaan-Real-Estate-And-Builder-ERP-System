'use client';

import React, { useState } from 'react';
import { AlertTriangle, Copy, Check, Download, ArrowRight } from 'lucide-react';

interface RecoveryKeyModalProps {
  recoveryKey: string;
  onProceed: () => void;
}

export function RecoveryKeyModal({ recoveryKey, onProceed }: RecoveryKeyModalProps) {
  const [copied, setCopied] = useState(false);
  const [hasConfirmedSaved, setHasConfirmedSaved] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(recoveryKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
    }
  };

  const handleDownloadBackup = () => {
    const content = `WADAAN REAL ESTATE & BUILDERS ERP\nMASTER OFFLINE RECOVERY KEY\n\nGenerated: ${new Date().toISOString()}\nKey: ${recoveryKey}\n\nKEEP THIS DOCUMENT SECURE AND OFFLINE.\nThis 16-character key allows resetting the master 4-digit PIN in the event of an outage or forgotten credentials.\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WADAAN-ERP-RECOVERY-KEY-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#0F172A]/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border-2 border-amber-300 overflow-hidden">
        {/* Amber Alert Header */}
        <div className="bg-[#FEF3C7] border-b border-amber-300/80 p-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-400/30 text-amber-900 border border-amber-400/50 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-7 h-7 text-amber-900 font-bold" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded">
              One-Time Cryptographic Generation
            </span>
            <h3 className="text-lg font-bold text-amber-950 mt-1">
              Save Your Master Recovery Key
            </h3>
            <p className="text-xs text-amber-900/80 mt-0.5 leading-relaxed">
              This 16-character key is required for disaster recovery and offline PIN resets. It will never be displayed again.
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
              Emergency Offline Recovery Key
            </label>
            <div className="bg-slate-50 border-2 border-dashed border-amber-300 rounded-xl p-4 flex items-center justify-between shadow-inner">
              <code className="font-mono font-bold text-base sm:text-lg tracking-widest text-slate-900 select-all">
                {recoveryKey}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-50 text-amber-900 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-b border-slate-100 pb-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>SHA-256 Hashed in Supabase</span>
            </span>
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="text-amber-800 font-bold hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Backup File</span>
            </button>
          </div>

          {/* User Confirmation Checkbox */}
          <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition">
            <input
              type="checkbox"
              checked={hasConfirmedSaved}
              onChange={(e) => setHasConfirmedSaved(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#059669] focus:ring-[#059669]"
            />
            <span className="text-xs text-slate-700 leading-relaxed font-medium">
              I confirm that I have securely copied or downloaded my Master Recovery Key. I understand that Wadaan ERP cannot recover this key if lost.
            </span>
          </label>

          {/* Action Button */}
          <button
            type="button"
            disabled={!hasConfirmedSaved}
            onClick={onProceed}
            className="w-full py-3.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Proceed to Authentication Vault</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
