"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { ShieldCheck, AlertCircle, KeyRound, Loader2, ArrowRight } from 'lucide-react';

export function ResetPasswordVault() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const { resetPassword, isResettingPassword } = useAuth();
  const router = useRouter();

  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setter(val);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 4) {
      setErrorMsg('PIN must be exactly 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setErrorMsg('PINs do not match.');
      return;
    }
    if (!token || !email) {
      setErrorMsg('Invalid reset link. Missing token or email.');
      return;
    }

    try {
      await resetPassword({
        email,
        resetToken: token,
        newPin,
      });
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reset PIN. The link may have expired.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F9FAFB] flex flex-col justify-center items-center relative overflow-hidden select-none px-4">
      <div className="absolute inset-0 pointer-events-none opacity-[0.4] architectural-grid" />
      
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/90 shadow-lg shadow-slate-200/50 p-8 sm:p-9 relative z-10">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#0F172A] text-white flex items-center justify-center shadow-md mb-4 ring-4 ring-slate-100">
            <KeyRound className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            Reset Master PIN
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 font-normal">
            Securely configure a new 4-digit PIN for {email || 'your account'}
          </p>
        </div>

        {success ? (
          <div className="flex flex-col items-center animate-fadeIn text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-emerald-800 font-bold text-lg">PIN Reset Successful</h3>
            <p className="text-emerald-700 text-sm">Redirecting you to the authentication vault...</p>
            <Loader2 className="w-5 h-5 text-emerald-600 animate-spin mt-2" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 animate-fadeIn">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 flex flex-col gap-2 text-xs animate-shake">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              </div>
            )}

            {!token || !email ? (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm text-center">
                Invalid or broken reset link. Please request a new link from the login page.
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-1 uppercase tracking-wider">
                    New 4-Digit PIN
                  </label>
                  <input
                    ref={inputRef}
                    type="password"
                    maxLength={4}
                    inputMode="numeric"
                    placeholder="••••"
                    value={newPin}
                    onChange={(e) => handlePinChange(e, setNewPin)}
                    disabled={isResettingPassword}
                    className="w-full px-4 py-3 text-center text-xl font-mono tracking-[0.5em] rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-1 uppercase tracking-wider">
                    Confirm New PIN
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    inputMode="numeric"
                    placeholder="••••"
                    value={confirmPin}
                    onChange={(e) => handlePinChange(e, setConfirmPin)}
                    disabled={isResettingPassword}
                    className="w-full px-4 py-3 text-center text-xl font-mono tracking-[0.5em] rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] transition-all"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isResettingPassword || newPin.length !== 4 || confirmPin.length !== 4}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50 cursor-pointer shadow-md"
                  >
                    {isResettingPassword ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Securing New PIN...</span>
                      </>
                    ) : (
                      <>
                        <span>Confirm & Update PIN</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </div>
      
      <p className="mt-8 text-xs text-slate-400 font-medium relative z-10">
        Wadaan ERP Security Protocol • End-to-End Encryption
      </p>
    </div>
  );
}
