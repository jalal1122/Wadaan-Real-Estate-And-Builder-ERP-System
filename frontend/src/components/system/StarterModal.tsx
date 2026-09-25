'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Landmark,
  Check,
  ShieldCheck,
  AlertCircle,
  Lock,
  PlusCircle,
  ArrowRight,
  Rocket,
  X,
} from 'lucide-react';
import { useSystemInit } from '../../hooks/useSystemInit';
import { RecoveryKeyModal } from './RecoveryKeyModal';
import {
  GoLivePayload,
  CashAndBankInput,
  ActiveProjectInput,
  UnpaidPayableInput,
  ActiveDealInput,
  AdminSetupInput,
  ApiErrorPayload,
} from '../../types/api';

interface StarterModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export function StarterModal({ isOpen, onClose }: StarterModalProps) {
  const router = useRouter();
  const { status, initializeSystem, completeInitialization, isInitializing } = useSystemInit();

  // Wizard Navigation: Steps 0 to 5
  // Step 0: Database Link
  // Step 1: Admin Setup
  // Step 2: Cash & Banks
  // Step 3: Active Sites
  // Step 4: Payables
  // Step 5: Deals & Receivables
  const [currentStep, setCurrentStep] = useState(0);

  // Form State
  const [dbUrl, setDbUrl] = useState('');
  const [directUrl, setDirectUrl] = useState('');

  const [admin, setAdmin] = useState<AdminSetupInput>({
    fullName: 'Administrator',
    email: 'admin@wadaan.com.pk',
    pin: '',
  });

  const [cashAndBanks, setCashAndBanks] = useState<CashAndBankInput[]>([
    { name: 'Office Safe (Vault A)', code: '1010-01', balance: 250000 },
    { name: 'Meezan Bank', code: '1020-01', balance: 4200000 },
    { name: 'Standard Chartered (Escrow Ops)', code: '1020-02', balance: 0 },
  ]);

  const [activeProjects, setActiveProjects] = useState<ActiveProjectInput[]>([
    {
      name: 'Wadaan Heights',
      prefix: 'WH',
      masterBOQ: 60000000,
      spentToDate: 14500000,
    },
  ]);

  const [unpaidPayables, setUnpaidPayables] = useState<UnpaidPayableInput[]>([
    {
      vendorName: 'Ali Hardware',
      phone: '0300-1234567',
      amountDue: 650000,
      projectId: '',
    },
  ]);

  const [activeDeals, setActiveDeals] = useState<ActiveDealInput[]>([
    {
      customerName: 'Tariq Mehmood',
      phone: '0312-9876543',
      projectName: 'Wadaan Heights',
      dealType: 'WADAAN_SALE',
      totalDealValue: 12000000,
      amountReceivedPast: 4000000,
    },
  ]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [masterRecoveryKey, setMasterRecoveryKey] = useState<string | null>(null);

  if (!isOpen) return null;

  // Formatting helpers
  const formatPKR = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Liquidity calculation
  const totalLiquidity = cashAndBanks.reduce(
    (sum, item) => sum + (Number(item.balance) || 0),
    0
  );

  // Stepper Step Validation before proceeding
  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return true; // DB link can be existing or provided
      case 1:
        if (status?.hasAdmin) return true;
        return (
          admin.fullName.trim().length > 0 &&
          admin.email.includes('@') &&
          admin.pin.length === 4
        );
      case 2:
        return (
          cashAndBanks.length > 0 &&
          cashAndBanks.every((b) => b.name.trim() && b.code.trim() && b.balance >= 0)
        );
      case 3:
        return activeProjects.every(
          (p) => p.name.trim() && p.prefix.trim() && (p.spentToDate ?? 0) >= 0
        );
      case 4:
        return unpaidPayables.every(
          (v) => v.vendorName.trim() && v.amountDue >= 0
        );
      case 5:
        return activeDeals.every(
          (d) =>
            d.customerName.trim() &&
            d.phone.trim() &&
            d.totalDealValue >= 0 &&
            d.amountReceivedPast <= d.totalDealValue
        );
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    setErrorMsg(null);
    if (!canProceed()) {
      setErrorMsg('Please complete all required fields on this step with valid entries.');
      return;
    }
    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setErrorMsg(null);
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleLaunchERP = async () => {
    setErrorMsg(null);
    if (!canProceed()) {
      setErrorMsg('Please ensure all required entries are valid before launching.');
      return;
    }

    const payload: GoLivePayload = {
      admin: status?.hasAdmin ? undefined : (admin.pin.length === 4 ? admin : undefined),
      cashAndBanks: cashAndBanks.map((b) => ({
        name: b.name.trim(),
        code: b.code.trim(),
        balance: Number(b.balance) || 0,
      })),
      activeProjects: activeProjects.map((p) => ({
        name: p.name.trim(),
        prefix: p.prefix.trim().toUpperCase(),
        masterBOQ: p.masterBOQ ? Number(p.masterBOQ) : undefined,
        boq: p.masterBOQ ? Number(p.masterBOQ) : undefined,
        spentToDate: Number(p.spentToDate) || 0,
      })),
      unpaidPayables: unpaidPayables.map((u) => ({
        vendorName: u.vendorName.trim(),
        phone: u.phone?.trim() || undefined,
        amountDue: Number(u.amountDue) || 0,
        projectId: u.projectId ? u.projectId : undefined,
      })),
      activeDeals: activeDeals.map((d) => ({
        customerName: d.customerName.trim(),
        phone: d.phone.trim(),
        projectName: d.projectName?.trim() || undefined,
        dealType: d.dealType || 'WADAAN_SALE',
        totalDealValue: Number(d.totalDealValue) || 0,
        amountReceivedPast: Number(d.amountReceivedPast) || 0,
      })),
    };

    try {
      const response = await initializeSystem(payload);
      if (response.masterRecoveryKey) {
        setMasterRecoveryKey(response.masterRecoveryKey);
      } else {
        await completeInitialization();
        onClose?.();
        router.push('/login');
      }
    } catch (err: unknown) {
      const apiErr = err as Partial<ApiErrorPayload> | undefined;
      if (apiErr?.code === 'ALREADY_INITIALIZED') {
        await completeInitialization();
        onClose?.();
        router.push('/login');
      } else if (apiErr?.code === 'UNBALANCED_JOURNAL') {
        setErrorMsg('Financial balancing failed. Total Debits do not equal Credits.');
      } else {
        setErrorMsg(apiErr?.message || 'System initialization failed. Please review values.');
      }
    }
  };

  // Stepper Items Config
  const stepsConfig = [
    { id: 0, title: 'Database Link', subtitle: 'PostgreSQL connection' },
    { id: 1, title: 'Admin Setup', subtitle: status?.hasAdmin ? 'Already configured ✓' : 'Master PIN & credentials' },
    { id: 2, title: 'Cash & Banks', subtitle: 'Opening vaults & accounts' },
    { id: 3, title: 'Active Sites', subtitle: 'WIP projects & BOQ limits' },
    { id: 4, title: 'Payables', subtitle: 'Contractors & vendor bills' },
    { id: 5, title: 'Receivables', subtitle: 'Active sales & client dues' },
  ];

  return (
    <>
      {masterRecoveryKey && (
        <RecoveryKeyModal
          recoveryKey={masterRecoveryKey}
          onProceed={async () => {
            await completeInitialization();
            setMasterRecoveryKey(null);
            onClose?.();
            router.push('/login');
          }}
        />
      )}

      {/* Main Overlay Container */}
      <div className="fixed inset-0 z-50 bg-[#0F172A]/70 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 select-none animate-fadeIn">
        <div className="relative w-full max-w-5xl h-[720px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-row border border-slate-200/80">
          {/* 1. LEFT SIDEBAR (The Stepper) */}
          <aside className="w-[310px] bg-[#0F172A] text-white flex flex-col justify-between p-7 shrink-0 relative">
            <div>
              {/* Header Brand */}
              <div className="flex items-center gap-3 pb-5 border-b border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center shadow-inner">
                  <Landmark className="w-6 h-6 text-[#059669]" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    WADAAN ERP
                  </div>
                  <h1 className="text-base font-bold text-white tracking-tight leading-tight">
                    System Initializer
                  </h1>
                </div>
              </div>

              {/* Stepper Subtitle */}
              <div className="mt-5 mb-3">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Configuration Sequence
                </p>
              </div>

              {/* Stepper Steps */}
              <div className="relative flex flex-col gap-4 pl-1">
                {/* Connecting vertical line */}
                <div className="absolute left-[18px] top-4 bottom-4 w-0.5 bg-slate-800 -z-0"></div>

                {stepsConfig.map((s) => {
                  const isDone = s.id < currentStep;
                  const isActive = s.id === currentStep;

                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        if (isDone) setCurrentStep(s.id);
                      }}
                      className={`relative z-10 flex items-start gap-3 transition-opacity ${
                        isDone ? 'cursor-pointer hover:opacity-90' : ''
                      } ${!isActive && !isDone ? 'opacity-50' : ''}`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition shadow-sm ${
                          isDone
                            ? 'bg-[#059669]/20 border-2 border-[#059669] text-[#059669]'
                            : isActive
                            ? 'bg-[#059669] text-white font-bold ring-4 ring-[#059669]/20 shadow-lg shadow-emerald-950/60'
                            : 'bg-slate-800 border border-slate-700 text-slate-400'
                        }`}
                      >
                        {isDone ? (
                          <Check className="w-4 h-4 font-bold" />
                        ) : (
                          <span className="text-xs font-bold font-mono">{s.id}</span>
                        )}
                      </div>

                      <div className="pt-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-semibold ${
                              isActive ? 'text-white' : isDone ? 'text-slate-200' : 'text-slate-400'
                            }`}
                          >
                            {s.title}
                          </span>
                          {isActive && (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider bg-[#059669] text-white rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{s.subtitle}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Left Sidebar Footer Card */}
            <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60 mt-4">
              <div className="flex items-center gap-2 text-[#059669] text-xs font-semibold mb-1">
                <ShieldCheck className="w-4 h-4 text-[#059669]" />
                <span>Double-Entry Verification</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                Initial assets &amp; obligations auto-balance against{' '}
                <strong className="text-slate-200">Owner&apos;s Equity (3010)</strong> upon confirmation.
              </p>
            </div>
          </aside>

          {/* 2. RIGHT CONTENT AREA */}
          <main className="flex-1 bg-white flex flex-col justify-between overflow-hidden relative">
            <div className="p-8 flex-1 overflow-y-auto pr-8">
              {/* Error Banner */}
              {errorMsg && (
                <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-shake">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* ── STEP 0: DATABASE LINK ── */}
              {currentStep === 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    <span>SECURITY CORE: CLOUD PERSISTENCE</span>
                    <span>•</span>
                    <span className="text-[#059669]">STEP 0 OF 5</span>
                  </div>
                  <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">
                    Cloud Database Connection
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 mb-6 max-w-xl leading-relaxed">
                    Wadaan ERP communicates with your PostgreSQL database in the cloud. Connection strings
                    are encrypted via Windows DPAPI before being cached on your local desktop.
                  </p>

                  <div className="space-y-4 max-w-2xl bg-slate-50 p-6 rounded-xl border border-slate-200 mb-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Transaction Pooler URL (DATABASE_URL - Port 6543)
                      </label>
                      <input
                        type="password"
                        placeholder="postgresql://postgres.[ref]:[pwd]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
                        value={dbUrl}
                        onChange={(e) => setDbUrl(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs font-mono rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Leave blank to utilize configured local server environment.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Direct Connection URL (DIRECT_URL - Port 5432)
                      </label>
                      <input
                        type="password"
                        placeholder="postgresql://postgres:[pwd]@db.[ref].supabase.co:5432/postgres"
                        value={directUrl}
                        onChange={(e) => setDirectUrl(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs font-mono rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs">
                    <Lock className="w-4 h-4 text-[#059669]" />
                    <span>
                      Hardware Encryption Guard: DPAPI keys are locked to your Windows user session.
                    </span>
                  </div>
                </div>
              )}

              {/* ── STEP 1: ADMIN SETUP ── */}
              {currentStep === 1 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    <span>GOVERNANCE: ACCESS CONTROL</span>
                    <span>•</span>
                    <span className="text-[#059669]">STEP 1 OF 5</span>
                  </div>
                  <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">
                    Master Administrator Setup
                  </h2>

                  {status?.hasAdmin ? (
                    <div className="mt-4 p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-3 animate-fadeIn">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#059669] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                          ✓
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-emerald-900">
                            Administrator Account Configured
                          </h3>
                          <p className="text-xs text-emerald-700">
                            Your Master Administrator account and 4-digit PIN are already created and active.
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-emerald-800 bg-white/70 p-3 rounded-xl border border-emerald-200/60 leading-relaxed">
                        This step was completed in pre-setup. Click <strong>Next Step</strong> to proceed with configuring opening vaults, bank accounts, and construction sites.
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-slate-500 mt-1 mb-6 max-w-xl leading-relaxed">
                        Set the primary institutional administrator name and the 4-digit numeric PIN used
                        to sign into the ledger.
                      </p>

                      <div className="max-w-xl space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Administrator Full Name
                          </label>
                          <input
                            type="text"
                            required
                            value={admin.fullName}
                            onChange={(e) => setAdmin({ ...admin, fullName: e.target.value })}
                            className="w-full px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Designated Recovery Email
                          </label>
                          <input
                            type="email"
                            required
                            value={admin.email}
                            onChange={(e) => setAdmin({ ...admin, email: e.target.value })}
                            className="w-full px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]"
                          />
                          <p className="text-[11px] text-slate-400 mt-1">
                            Used for emergency password and PIN recovery alerts.
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            4-Digit Master PIN
                          </label>
                          <input
                            type="password"
                            required
                            maxLength={4}
                            inputMode="numeric"
                            placeholder="••••"
                            value={admin.pin}
                            onChange={(e) =>
                              setAdmin({
                                ...admin,
                                pin: e.target.value.replace(/\D/g, '').slice(0, 4),
                              })
                            }
                            className="w-40 px-3.5 py-2 text-center text-base font-mono font-bold tracking-widest rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]"
                          />
                          <p className="text-[11px] text-slate-400 mt-1">
                            Hashed via bcrypt with 12 salt rounds.
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── STEP 2: CASH & BANKS ── */}
              {currentStep === 2 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    <span>LEDGER MODULE: 1000 - ASSETS</span>
                    <span>•</span>
                    <span className="text-[#059669]">STEP 2 OF 5</span>
                  </div>

                  <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">
                    Liquid Assets &amp; Bank Balances
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 mb-6 max-w-xl leading-relaxed">
                    Enter the exact physical cash and active bank ledger balances. The system will
                    create synchronized opening entries balanced against Owner&apos;s Capital.
                  </p>

                  {/* The Data Grid Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm mb-5 bg-white">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#F9FAFB] border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="py-3 px-4 w-5/12">Account / Institutional Name</th>
                          <th className="py-3 px-4 w-3/12">GL Code</th>
                          <th className="py-3 px-4 w-4/12 text-right">Opening Balance (PKR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {cashAndBanks.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-4">
                              <div className="relative flex items-center">
                                {item.code.startsWith('1010') ? (
                                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                                ) : (
                                  <Landmark className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                                )}
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => {
                                    const updated = [...cashAndBanks];
                                    updated[idx].name = e.target.value;
                                    setCashAndBanks(updated);
                                  }}
                                  className="w-full pl-9 pr-3 py-1.5 text-xs font-medium bg-[#F9FAFB] border border-slate-200 rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]"
                                />
                              </div>
                            </td>
                            <td className="py-2.5 px-4">
                              <input
                                type="text"
                                value={item.code}
                                onChange={(e) => {
                                  const updated = [...cashAndBanks];
                                  updated[idx].code = e.target.value;
                                  setCashAndBanks(updated);
                                }}
                                className="w-28 font-mono text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#059669]"
                              />
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <div className="relative flex items-center justify-end">
                                <span className="text-[10px] font-bold text-slate-400 absolute left-3">
                                  PKR
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.balance}
                                  onChange={(e) => {
                                    const updated = [...cashAndBanks];
                                    updated[idx].balance = parseFloat(e.target.value) || 0;
                                    setCashAndBanks(updated);
                                  }}
                                  className="w-full text-right font-mono font-bold text-xs bg-[#F9FAFB] border border-slate-200 rounded-lg py-1.5 pl-10 pr-3 text-[#059669] focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]"
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Actions & Badges */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      type="button"
                      onClick={() =>
                        setCashAndBanks([
                          ...cashAndBanks,
                          {
                            name: 'Secondary Bank Account',
                            code: `1020-0${cashAndBanks.length + 1}`,
                            balance: 0,
                          },
                        ])
                      }
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#059669] hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 px-3.5 py-2 rounded-lg transition border border-emerald-200 cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Add Another Cash or Bank Account</span>
                    </button>

                    {/* Calculated Liquidity Badge */}
                    <div className="flex items-center gap-3 bg-[#F9FAFB] px-4 py-2 rounded-lg border border-slate-200">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Calculated Initial Liquidity:
                      </span>
                      <span className="font-mono font-bold text-xs text-[#0F172A]">
                        PKR {formatPKR(totalLiquidity)}
                      </span>
                      <span className="text-[10px] font-bold bg-emerald-100 text-[#059669] px-2 py-0.5 rounded-md">
                        Balanced
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 3: ACTIVE SITES ── */}
              {currentStep === 3 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    <span>PROJECT LEDGER: WIP ASSETS</span>
                    <span>•</span>
                    <span className="text-[#059669]">STEP 3 OF 5</span>
                  </div>
                  <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">
                    Active Construction Projects
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 mb-6 max-w-xl leading-relaxed">
                    Set up current ongoing sites with cut-off cumulative expenditures. The system
                    initializes WIP accounts (1200) and cost-tracking progress bars.
                  </p>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm mb-4 bg-white">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#F9FAFB] border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="py-3 px-4 w-4/12">Project Name</th>
                          <th className="py-3 px-4 w-2/12">Prefix</th>
                          <th className="py-3 px-4 w-3/12 text-right">Planned BOQ (PKR)</th>
                          <th className="py-3 px-4 w-3/12 text-right">Spent to Date (PKR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {activeProjects.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-4">
                              <input
                                type="text"
                                value={p.name}
                                onChange={(e) => {
                                  const updated = [...activeProjects];
                                  updated[idx].name = e.target.value;
                                  setActiveProjects(updated);
                                }}
                                className="w-full px-3 py-1.5 text-xs font-medium bg-[#F9FAFB] border border-slate-200 rounded-lg text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#059669]"
                              />
                            </td>
                            <td className="py-2.5 px-4">
                              <input
                                type="text"
                                maxLength={6}
                                value={p.prefix}
                                onChange={(e) => {
                                  const updated = [...activeProjects];
                                  updated[idx].prefix = e.target.value.toUpperCase();
                                  setActiveProjects(updated);
                                }}
                                className="w-20 font-mono text-xs font-bold uppercase text-slate-700 bg-slate-100 border border-slate-200 px-2 py-1.5 rounded-lg focus:outline-none"
                              />
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <input
                                type="number"
                                min="0"
                                value={p.masterBOQ ?? 0}
                                onChange={(e) => {
                                  const updated = [...activeProjects];
                                  updated[idx].masterBOQ = parseFloat(e.target.value) || 0;
                                  setActiveProjects(updated);
                                }}
                                className="w-full text-right font-mono font-medium text-xs bg-[#F9FAFB] border border-slate-200 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-[#059669]"
                              />
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <input
                                type="number"
                                min="0"
                                value={p.spentToDate}
                                onChange={(e) => {
                                  const updated = [...activeProjects];
                                  updated[idx].spentToDate = parseFloat(e.target.value) || 0;
                                  setActiveProjects(updated);
                                }}
                                className="w-full text-right font-mono font-bold text-xs text-[#059669] bg-[#F9FAFB] border border-slate-200 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-[#059669]"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveProjects([
                        ...activeProjects,
                        {
                          name: `Site ${activeProjects.length + 1}`,
                          prefix: `S${activeProjects.length + 1}`,
                          masterBOQ: 10000000,
                          spentToDate: 0,
                        },
                      ])
                    }
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#059669] hover:text-emerald-700 bg-emerald-50 px-3.5 py-2 rounded-lg border border-emerald-200 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Add Another Construction Site</span>
                  </button>
                </div>
              )}

              {/* ── STEP 4: PAYABLES ── */}
              {currentStep === 4 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    <span>OBLIGATIONS: ACCOUNTS PAYABLE</span>
                    <span>•</span>
                    <span className="text-[#059669]">STEP 4 OF 5</span>
                  </div>
                  <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">
                    Pending Vendor &amp; Contractor Payables
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 mb-6 max-w-xl leading-relaxed">
                    Enter outstanding balances owed to suppliers and subcontractors. These are automatically
                    populated into the Thursday Payment Run queue.
                  </p>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm mb-4 bg-white">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#F9FAFB] border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="py-3 px-4 w-5/12">Vendor / Contractor</th>
                          <th className="py-3 px-4 w-3/12">Contact Phone</th>
                          <th className="py-3 px-4 w-4/12 text-right">Outstanding Amount (PKR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {unpaidPayables.map((v, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-4">
                              <input
                                type="text"
                                value={v.vendorName}
                                onChange={(e) => {
                                  const updated = [...unpaidPayables];
                                  updated[idx].vendorName = e.target.value;
                                  setUnpaidPayables(updated);
                                }}
                                className="w-full px-3 py-1.5 text-xs font-medium bg-[#F9FAFB] border border-slate-200 rounded-lg text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#059669]"
                              />
                            </td>
                            <td className="py-2.5 px-4">
                              <input
                                type="text"
                                value={v.phone || ''}
                                placeholder="03XX-XXXXXXX"
                                onChange={(e) => {
                                  const updated = [...unpaidPayables];
                                  updated[idx].phone = e.target.value;
                                  setUnpaidPayables(updated);
                                }}
                                className="w-full px-3 py-1.5 font-mono text-xs bg-[#F9FAFB] border border-slate-200 rounded-lg focus:outline-none"
                              />
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <input
                                type="number"
                                min="0"
                                value={v.amountDue}
                                onChange={(e) => {
                                  const updated = [...unpaidPayables];
                                  updated[idx].amountDue = parseFloat(e.target.value) || 0;
                                  setUnpaidPayables(updated);
                                }}
                                className="w-full text-right font-mono font-bold text-xs text-amber-700 bg-[#F9FAFB] border border-slate-200 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-[#059669]"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setUnpaidPayables([
                        ...unpaidPayables,
                        {
                          vendorName: `Vendor ${unpaidPayables.length + 1}`,
                          amountDue: 0,
                        },
                      ])
                    }
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#059669] hover:text-emerald-700 bg-emerald-50 px-3.5 py-2 rounded-lg border border-emerald-200 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Add Another Vendor Bill</span>
                  </button>
                </div>
              )}

              {/* ── STEP 5: DEALS & RECEIVABLES ── */}
              {currentStep === 5 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    <span>ASSETS: CUSTOMER RECEIVABLES</span>
                    <span>•</span>
                    <span className="text-[#059669]">STEP 5 OF 5</span>
                  </div>
                  <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">
                    Active Customer Deals &amp; Token Receivables
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 mb-6 max-w-xl leading-relaxed">
                    Import existing customer bookings. Previous cash payments are logged as cleared,
                    and remaining balances are slated for milestone recoveries.
                  </p>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm mb-4 bg-white">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#F9FAFB] border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="py-3 px-4 w-4/12">Client Name</th>
                          <th className="py-3 px-4 w-2/12">Phone</th>
                          <th className="py-3 px-4 w-3/12 text-right">Deal Value (PKR)</th>
                          <th className="py-3 px-4 w-3/12 text-right">Past Received (PKR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {activeDeals.map((d, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-4">
                              <input
                                type="text"
                                value={d.customerName}
                                onChange={(e) => {
                                  const updated = [...activeDeals];
                                  updated[idx].customerName = e.target.value;
                                  setActiveDeals(updated);
                                }}
                                className="w-full px-3 py-1.5 text-xs font-medium bg-[#F9FAFB] border border-slate-200 rounded-lg text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#059669]"
                              />
                            </td>
                            <td className="py-2.5 px-4">
                              <input
                                type="text"
                                value={d.phone}
                                onChange={(e) => {
                                  const updated = [...activeDeals];
                                  updated[idx].phone = e.target.value;
                                  setActiveDeals(updated);
                                }}
                                className="w-full px-3 py-1.5 font-mono text-xs bg-[#F9FAFB] border border-slate-200 rounded-lg focus:outline-none"
                              />
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <input
                                type="number"
                                min="0"
                                value={d.totalDealValue}
                                onChange={(e) => {
                                  const updated = [...activeDeals];
                                  updated[idx].totalDealValue = parseFloat(e.target.value) || 0;
                                  setActiveDeals(updated);
                                }}
                                className="w-full text-right font-mono font-medium text-xs bg-[#F9FAFB] border border-slate-200 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-[#059669]"
                              />
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <input
                                type="number"
                                min="0"
                                max={d.totalDealValue}
                                value={d.amountReceivedPast}
                                onChange={(e) => {
                                  const updated = [...activeDeals];
                                  updated[idx].amountReceivedPast = parseFloat(e.target.value) || 0;
                                  setActiveDeals(updated);
                                }}
                                className="w-full text-right font-mono font-bold text-xs text-[#059669] bg-[#F9FAFB] border border-slate-200 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-[#059669]"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveDeals([
                        ...activeDeals,
                        {
                          customerName: `Customer ${activeDeals.length + 1}`,
                          phone: '0300-0000000',
                          totalDealValue: 5000000,
                          amountReceivedPast: 0,
                        },
                      ])
                    }
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#059669] hover:text-emerald-700 bg-emerald-50 px-3.5 py-2 rounded-lg border border-emerald-200 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Add Another Customer Deal</span>
                  </button>
                </div>
              )}
            </div>

            {/* 3. BOTTOM ACTION BAR (Exact Stitch Match) */}
            <footer className="h-20 border-t border-slate-200 bg-white px-8 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-2 rounded-lg hover:bg-slate-100 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Exit Wizard</span>
                </button>
                <span className="text-xs text-slate-400">|</span>
                <span className="text-xs text-slate-400 font-medium">
                  Auto-validated double-entry balances
                </span>
              </div>

              <div className="flex items-center gap-3">
                {currentStep > 0 && (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-4 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Previous Step
                  </button>
                )}

                {currentStep < 5 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md transition-all duration-150 flex items-center gap-2 hover:shadow-lg active:scale-95 cursor-pointer"
                  >
                    <span>Next Step</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isInitializing}
                    onClick={handleLaunchERP}
                    className="bg-[#059669] hover:bg-emerald-700 text-white font-bold text-xs px-7 py-2.5 rounded-xl shadow-md transition-all duration-150 flex items-center gap-2 hover:shadow-lg active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {isInitializing ? (
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
                        <span>Executing Go-Live Transaction...</span>
                      </>
                    ) : (
                      <>
                        <span>Execute Atomic Go-Live &amp; Launch ERP</span>
                        <Rocket className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </footer>
          </main>
        </div>
      </div>
    </>
  );
}
