'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Unlock,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  KeyRound,
  Lock,
  Mail,
  MailCheck,
  X,
  Rocket,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useSystemInit } from '../../hooks/useSystemInit';
import { StarterModal } from '../system/StarterModal';
import { RecoveryKeyModal } from '../system/RecoveryKeyModal';
import { apiClient } from '../../lib/api';
import { ApiErrorPayload } from '../../types/api';

export function AuthVault() {
  const router = useRouter();
  const { login, forgotPassword, resetPassword, getLockoutStatus } = useAuth();
  const { status, isLoadingStatus, refetchStatus } = useSystemInit();

  const [pin, setPin] = useState('');
  const [attemptCount, setAttemptCount] = useState(0);
  const [maxAttempts, setMaxAttempts] = useState(5);
  const [lockoutTier, setLockoutTier] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lockoutTimer, setLockoutTimer] = useState<number | null>(null);

  // Modals
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [showStarterModal, setShowStarterModal] = useState(false);
  const [showAdminSetupModal, setShowAdminSetupModal] = useState(false);

  // Standalone Admin Setup State
  const [adminFullName, setAdminFullName] = useState('Administrator');
  const [adminEmail, setAdminEmail] = useState('admin@wadaan.com.pk');
  const [adminPin, setAdminPin] = useState('');
  const [adminPinConfirm, setAdminPinConfirm] = useState('');
  const [adminSetupLoading, setAdminSetupLoading] = useState(false);
  const [adminSetupError, setAdminSetupError] = useState<string | null>(null);
  const [setupMasterRecoveryKey, setSetupMasterRecoveryKey] = useState<string | null>(null);

  // Forgot Password Modal State
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Recovery Key Modal State
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [newPin, setNewPin] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Mount-time lockout status sync
  useEffect(() => {
    getLockoutStatus()
      .then((status) => {
        if (!status) return;
        setAttemptCount(status.failedAttempts);
        setMaxAttempts(status.maxAttempts);
        setLockoutTier(status.lockoutTier);
        if (status.isLocked && status.remainingSeconds > 0) {
          setLockoutTimer(status.remainingSeconds);
        }
      })
      .catch(() => {
        // Silently fail: default state remains intact if backend unreachable
      });
  }, [getLockoutStatus]);

  // Lockout countdown timer (deterministic setTimeout, effect-level cleanup and attempt reset)
  useEffect(() => {
    if (lockoutTimer === null) return;

    const timer = setTimeout(() => {
      if (lockoutTimer <= 1) {
        setLockoutTimer(null);
        setErrorMessage(null);
        setAttemptCount(0);
        setTimeout(() => inputRef.current?.focus(), 50);
      } else {
        setLockoutTimer((prev) => (prev !== null && prev > 0 ? prev - 1 : null));
      }
    }, lockoutTimer <= 0 ? 0 : 1000);

    return () => clearTimeout(timer);
  }, [lockoutTimer]);

  const handleUnlock = useCallback(async (pinToSubmit?: string) => {
    const finalPin = pinToSubmit ?? pin;
    if (finalPin.length !== 4 || isSubmitting || lockoutTimer !== null) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await login({ pin: finalPin });
      setIsSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 700);
    } catch (err: unknown) {
      const apiErr = err as Partial<ApiErrorPayload> | undefined;
      setIsSubmitting(false);
      setPin('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);

      if (apiErr?.code === 'ACCOUNT_LOCKED') {
        // Extract seconds from message or structured metadata
        const seconds =
          apiErr.remainingSeconds ??
          (apiErr.message?.match(/(\d+)\s*seconds?/i)?.[1]
            ? parseInt(apiErr.message.match(/(\d+)\s*seconds?/i)![1], 10)
            : 30);
        setLockoutTimer(seconds);
        setErrorMessage(apiErr.message || `Account locked. Try again in ${seconds} seconds.`);
        if (apiErr.lockoutTier !== undefined) {
          setLockoutTier(apiErr.lockoutTier);
          setMaxAttempts(apiErr.maxAttempts ?? (apiErr.lockoutTier === 0 ? 5 : 4));
        } else {
          setLockoutTier((prev) => prev + 1);
          setMaxAttempts(4);
        }
        setAttemptCount(0);
      } else if (apiErr?.code === 'INVALID_PIN') {
        if (apiErr.failedAttempts !== undefined) {
          setAttemptCount(apiErr.failedAttempts);
        } else {
          setAttemptCount((prev) => prev + 1);
        }
        if (apiErr.maxAttempts !== undefined) {
          setMaxAttempts(apiErr.maxAttempts);
        }
        if (apiErr.lockoutTier !== undefined) {
          setLockoutTier(apiErr.lockoutTier);
        }
        setErrorMessage(apiErr.message || 'Invalid 4-digit PIN. Please try again.');
      } else {
        // Network errors (NETWORK_OFFLINE), 500s, or unexpected errors
        // Display banner WITHOUT incrementing attempt count
        setErrorMessage(apiErr?.message || 'Connection error. Please try again.');
      }
    }
  }, [pin, isSubmitting, lockoutTimer, login, router]);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isSubmitting || lockoutTimer !== null) return;
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(val);
    setErrorMessage(null);

    if (val.length === 4) {
      setTimeout(() => {
        handleUnlock(val);
      }, 200);
    }
  };

  // Global keydown capture for direct keyboard/numpad typing without clicking input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showForgotModal || showRecoveryModal) return;
      if (lockoutTimer !== null || isSubmitting) return;

      const activeEl = document.activeElement;
      if (
        activeEl &&
        activeEl !== inputRef.current &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')
      ) {
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        inputRef.current?.focus();
        setPin((prev) => {
          if (prev.length >= 4) return prev;
          const next = prev + e.key;
          setErrorMessage(null);
          if (next.length === 4) {
            setTimeout(() => {
              handleUnlock(next);
            }, 150);
          }
          return next;
        });
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        inputRef.current?.focus();
        setPin((prev) => prev.slice(0, -1));
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        handleUnlock();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForgotModal, showRecoveryModal, lockoutTimer, isSubmitting, handleUnlock]);

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    setForgotError(null);
    try {
      await forgotPassword({ email: forgotEmail });
      setForgotSubmitted(true);
    } catch (err: unknown) {
      const apiErr = err as Partial<ApiErrorPayload> | undefined;
      setForgotError(apiErr?.message || 'Failed to send recovery email.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail || !recoveryKey || newPin.length !== 4) {
      setRecoveryError('Please fill in all fields with a valid 4-digit PIN.');
      return;
    }
    setRecoveryLoading(true);
    setRecoveryError(null);
    try {
      await resetPassword({
        email: recoveryEmail,
        resetToken: recoveryKey.trim(),
        newPin: newPin.trim(),
      });
      setRecoverySuccess(true);
      setTimeout(() => {
        setShowRecoveryModal(false);
        setRecoverySuccess(false);
        setRecoveryKey('');
        setNewPin('');
        setRecoveryEmail('');
        inputRef.current?.focus();
      }, 1500);
    } catch (err: unknown) {
      const apiErr = err as Partial<ApiErrorPayload> | undefined;
      setRecoveryError(apiErr?.message || 'Failed to reset PIN with provided key.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleAdminSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminFullName.trim() || !adminEmail.trim() || !adminPin) {
      setAdminSetupError('Full Name, Email, and 4-digit PIN are required.');
      return;
    }
    if (adminPin.length !== 4 || !/^\d{4}$/.test(adminPin)) {
      setAdminSetupError('PIN must be exactly 4 numeric digits.');
      return;
    }
    if (adminPin !== adminPinConfirm) {
      setAdminSetupError('PIN confirmation does not match.');
      return;
    }

    setAdminSetupLoading(true);
    setAdminSetupError(null);
    try {
      const res = await apiClient.post<{
        success: boolean;
        message: string;
        data?: { masterRecoveryKey?: string };
      }>('/auth/setup', {
        fullName: adminFullName.trim(),
        email: adminEmail.trim(),
        pin: adminPin.trim(),
      });
      const recoveryKey = res.data?.data?.masterRecoveryKey;
      if (recoveryKey) {
        setSetupMasterRecoveryKey(recoveryKey);
      }
      setShowAdminSetupModal(false);
      setErrorMessage(null);
      await refetchStatus();
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (err: unknown) {
      const apiErr = err as Partial<ApiErrorPayload> | undefined;
      setAdminSetupError(apiErr?.message || 'Failed to initialize administrator account.');
    } finally {
      setAdminSetupLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F9FAFB] flex flex-col justify-between items-center relative overflow-hidden select-none">
      {/* Architectural Subtle Grid Background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.4] architectural-grid" />

      {/* Top Institutional Bar */}
      <header className="w-full max-w-7xl mx-auto px-8 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          {/* Minimalist Emblem Logo */}
          <div className="w-9 h-9 rounded-lg bg-[#0F172A] text-white flex items-center justify-center shadow-sm">
            <svg
              className="w-5 h-5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 21h18" />
              <path d="M5 21V7l7-4 7 4v14" />
              <path d="M9 21v-8a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v8" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-sm text-[#0F172A]">WADAAN ERP</span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80">
                v1.2 Core
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Real Estate &amp; Construction Finance Suite</p>
          </div>
        </div>

        {/* Security Session Status Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200/70 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#059669]"></span>
          </span>
          <span className="text-xs font-medium text-slate-600">Enterprise Enclave Online</span>
          <span className="text-slate-300 text-xs">|</span>
          <span className="text-[11px] font-mono text-slate-400">TLS 1.3 Strict</span>
        </div>
      </header>

      {/* Main Centralized Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 w-full max-w-md relative z-10 -mt-4">
        {/* The Vault Card */}
        <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-lg shadow-slate-200/50 p-8 sm:p-9 transition-all">
          {/* Card Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-[#0F172A] text-white flex items-center justify-center shadow-md mb-4 ring-4 ring-slate-100">
              <svg
                className="w-7 h-7 text-emerald-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <circle cx="12" cy="12" r="3" />
                <path d="M12 7v2" />
                <path d="M12 15v2" />
                <path d="M7 12h2" />
                <path d="M15 12h2" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Institutional Access
            </h1>
            <p className="text-sm text-slate-500 mt-1.5 font-normal">
              Enter your 4-digit Master PIN to unlock ledger operations.
            </p>
          </div>

          {/* Uninitialized System Alert Banner */}
          {status && !status.isInitialized && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col gap-2.5 animate-fadeIn">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#059669] shrink-0" />
                <span className="font-bold text-xs uppercase tracking-wider text-emerald-800">
                  {status.hasAdmin ? 'Go-Live Setup Required' : 'Initial Setup Required'}
                </span>
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed">
                {status.hasAdmin
                  ? 'Master Administrator account is configured. Launch the Go-Live Wizard to initialize opening balances, active projects, and the Chart of Accounts.'
                  : 'The database is uninitialized. Configure your Master Administrator account and 4-digit PIN to begin ledger operations.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowStarterModal(true)}
                  className="flex-1 py-2 px-3 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  <span>Launch Go-Live Wizard</span>
                </button>
                {!status.hasAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowAdminSetupModal(true)}
                    className="flex-1 py-2 px-3 bg-white hover:bg-emerald-100/60 border border-emerald-300 text-emerald-900 text-xs font-semibold rounded-lg shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Setup Admin Only</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Lockout Warning Banner */}
          {lockoutTimer !== null && (
            <div className="mb-6 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5 text-xs animate-fadeIn">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block">
                  Security Lock Active • Tier {lockoutTier + 1}
                </strong>
                <span>System locked against brute-force. Re-opens in </span>
                <span className="font-mono font-bold text-amber-800">{lockoutTimer}s</span>.
              </div>
            </div>
          )}

          {/* General Error Banner */}
          {errorMessage && lockoutTimer === null && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 flex flex-col gap-2 text-xs animate-shake">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              {(errorMessage.includes('not initialized') || (status && !status.isInitialized)) && (
                <div className="pt-1 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => setShowStarterModal(true)}
                    className="flex-1 py-1.5 px-3 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Rocket className="w-3.5 h-3.5" />
                    <span>Launch Go-Live Wizard</span>
                  </button>
                  {!status?.hasAdmin && (
                    <button
                      type="button"
                      onClick={() => setShowAdminSetupModal(true)}
                      className="flex-1 py-1.5 px-3 bg-white hover:bg-red-100/50 border border-red-200 text-red-800 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-red-700" />
                      <span>Setup Admin Account</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PIN Input Area */}
          <form
            id="authForm"
            onSubmit={(e) => {
              e.preventDefault();
              handleUnlock();
            }}
            className="space-y-6"
          >
            {/* Hidden real input for accessibility & keyboard typing */}
            <input
              ref={inputRef}
              type="password"
              id="realPinInput"
              maxLength={4}
              inputMode="numeric"
              pattern="[0-9]*"
              className="sr-only text-base"
              autoComplete="off"
              value={pin}
              onChange={handlePinChange}
              readOnly={isSubmitting || lockoutTimer !== null}
              tabIndex={-1}
            />

            {/* 4 Discrete PIN Input Boxes */}
            <div
              className="flex items-center justify-center gap-3.5 sm:gap-4 my-2 cursor-pointer"
              onClick={() => inputRef.current?.focus()}
              data-testid="pin-container"
            >
              {[0, 1, 2, 3].map((index) => {
                const isFilled = index < pin.length;
                const isActive = index === pin.length && lockoutTimer === null;
                const hasError = errorMessage !== null && pin.length === 0;

                return (
                  <div
                    key={index}
                    id={`pinBox${index}`}
                    data-testid={`pin-box-${index}`}
                    className={`pin-box w-14 h-16 sm:w-16 sm:h-18 bg-[#F3F4F6] rounded-xl border-2 flex items-center justify-center transition-all duration-150 ${
                      isActive ? 'active-focus border-[#059669]' : 'border-slate-200'
                    } ${hasError ? 'error-state' : ''}`}
                  >
                    {isFilled ? (
                      <span className="w-4 h-4 rounded-full bg-[#0F172A] transform scale-100 transition-transform duration-100" />
                    ) : isActive ? (
                      <span className="w-1.5 h-6 bg-[#059669] rounded-full animate-pulse" />
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-[#0F172A] transform scale-0 opacity-0" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Security Context Helper Hint */}
            <div className="flex items-center justify-between text-xs px-1 text-slate-500">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />
                <span>
                  Vault Security: <strong className="text-slate-700 font-medium">Active</strong>
                </span>
              </div>
              <span className="font-mono text-[11px] text-slate-400" data-testid="attempt-indicator">
                Attempt {attemptCount}/{maxAttempts}
                {lockoutTier > 0 && ` (Tier ${lockoutTier + 1})`}
              </span>
            </div>

            {/* Primary Action Button */}
            <button
              type="submit"
              id="unlockButton"
              disabled={pin.length !== 4 || isSubmitting || lockoutTimer !== null}
              className={`w-full py-3.5 px-4 font-semibold rounded-xl text-sm transition-all duration-150 shadow-md shadow-slate-900/10 flex items-center justify-center gap-2 group cursor-pointer ${
                isSuccess
                  ? 'bg-[#059669] text-white'
                  : 'bg-[#0F172A] hover:bg-slate-800 active:scale-[0.99] text-white disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Verifying Master Key...</span>
                </>
              ) : isSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Ledger Unlocked</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  <span>Unlock Ledger</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider text-slate-400">
              <span className="bg-white px-3 font-medium">Recovery Options</span>
            </div>
          </div>

          {/* Footer Action Links (Modals) */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setShowForgotModal(true);
                setForgotSubmitted(false);
                setForgotError(null);
              }}
              className="text-slate-500 hover:text-[#0F172A] font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>Forgot PIN?</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowRecoveryModal(true);
                setRecoveryError(null);
              }}
              className="text-slate-500 hover:text-[#0F172A] font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
              <span>Use Offline Recovery Key</span>
            </button>
          </div>
        </div>

        {/* Security Notice Card at bottom of screen */}
        <div className="mt-6 flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/70 border border-slate-200/60 shadow-sm text-xs text-slate-500">
          <Lock className="w-3.5 h-3.5 text-[#059669]" />
          <span>Authorized personnel only. Sessions are cryptographically signed and audited.</span>
        </div>
      </main>

      {/* Global Footer */}
      <footer className="w-full max-w-7xl mx-auto px-8 py-5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 border-t border-slate-200/60 relative z-10 gap-2">
        <div className="flex items-center gap-4">
          <span>Wadaan Real Estate &amp; Builders (Pvt) Ltd.</span>
          <span className="text-slate-300">•</span>
          <span>Financial Governance Core</span>
        </div>
        <div className="flex items-center gap-4 font-mono text-[11px]">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Host: 127.0.0.1:4000
          </span>
          <span className="text-slate-300">•</span>
          <span>Build 2026.4.1</span>
        </div>
      </footer>

      {/* ── FORGOT PIN INLINE MODAL ── */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-7 relative">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[#0F172A]">
                <Mail className="w-5 h-5 text-[#059669]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Email PIN Reset</h3>
                <p className="text-xs text-slate-400">Registered recovery channel</p>
              </div>
            </div>

            {forgotSubmitted ? (
              <div className="space-y-4 text-center py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#059669] flex items-center justify-center mx-auto">
                  <MailCheck className="w-6 h-6 text-[#059669]" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Dispatch Initiated</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  If this email is registered in Wadaan ERP, a PIN reset token has been dispatched.
                  Please check your inbox.
                </p>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full py-2.5 bg-[#0F172A] text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
                >
                  Return to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Enter your registered administrator email. The system will send a secure
                  1-hour reset token to recover your 4-digit PIN.
                </p>

                {forgotError && (
                  <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{forgotError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Recovery Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="admin@wadaan.com.pk"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading || !forgotEmail}
                    className="px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    {forgotLoading ? 'Dispatching...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── OFFLINE RECOVERY KEY INLINE MODAL ── */}
      {showRecoveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-7 relative">
            <button
              onClick={() => setShowRecoveryModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800">
                <KeyRound className="w-5 h-5 text-amber-800" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Master Recovery Vault</h3>
                <p className="text-xs text-slate-400">Offline disaster bypass channel</p>
              </div>
            </div>

            {recoverySuccess ? (
              <div className="space-y-4 text-center py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#059669] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6 text-[#059669]" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">PIN Reset Successfully</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Your new 4-digit Master PIN is now active. Returning to the login vault...
                </p>
              </div>
            ) : (
              <form onSubmit={handleRecoverySubmit} className="space-y-4">
                <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/90 text-amber-900 text-xs flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    Use your 16-character offline emergency recovery key to instantly set a new PIN
                    without internet or email access.
                  </span>
                </div>

                {recoveryError && (
                  <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{recoveryError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Administrator Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="admin@wadaan.com.pk"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    16-Character Master Recovery Key
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    value={recoveryKey}
                    onChange={(e) => setRecoveryKey(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2 text-xs font-mono font-bold tracking-wider rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New 4-Digit Master PIN
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    inputMode="numeric"
                    placeholder="••••"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full px-3.5 py-2 text-center text-sm font-mono tracking-widest rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRecoveryModal(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={recoveryLoading || !recoveryEmail || !recoveryKey || newPin.length !== 4}
                    className="px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    {recoveryLoading ? 'Authorizing...' : 'Authorize Emergency Reset'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 3. StarterModal (Full Go-Live Setup Wizard) */}
      {showStarterModal && (
        <StarterModal
          isOpen={showStarterModal}
          onClose={() => {
            setShowStarterModal(false);
            refetchStatus();
          }}
        />
      )}

      {/* 4. Standalone Admin Setup Modal (POST /api/v1/auth/setup) */}
      {showAdminSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/70 backdrop-blur-md animate-fadeIn select-none">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-[#0F172A] text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Setup Master Administrator</h3>
                  <p className="text-xs text-slate-400">One-time initial account creation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminSetupModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdminSetupSubmit} className="p-6 space-y-4">
              {adminSetupError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{adminSetupError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Administrator Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Muhammad Jalal"
                  value={adminFullName}
                  onChange={(e) => setAdminFullName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Designated Recovery Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. admin@wadaan.com.pk"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    4-Digit Master PIN
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    inputMode="numeric"
                    placeholder="••••"
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full px-3.5 py-2 text-center text-sm font-mono tracking-widest rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm PIN
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    inputMode="numeric"
                    placeholder="••••"
                    value={adminPinConfirm}
                    onChange={(e) => setAdminPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full px-3.5 py-2 text-center text-sm font-mono tracking-widest rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAdminSetupModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminSetupLoading || adminPin.length !== 4 || adminPin !== adminPinConfirm}
                  className="px-5 py-2.5 bg-[#059669] hover:bg-[#047857] text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {adminSetupLoading ? 'Initializing...' : 'Create Admin Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Master Recovery Key Modal (Shown after standalone Admin Setup) */}
      {setupMasterRecoveryKey && (
        <RecoveryKeyModal
          recoveryKey={setupMasterRecoveryKey}
          onProceed={() => {
            setSetupMasterRecoveryKey(null);
            setErrorMessage(null);
            setTimeout(() => inputRef.current?.focus(), 100);
          }}
        />
      )}
    </div>
  );
}
