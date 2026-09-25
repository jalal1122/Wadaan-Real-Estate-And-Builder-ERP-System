'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Customer } from '@/features/customers/types';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { useCreateDeal } from '@/features/deals/hooks/useDeals';
import { useCreateCustomer } from '@/features/customers/hooks/useCustomers';
import { DealType, CreateDealInvoiceInput } from '@/features/deals/types';
import { formatPKR } from '@/lib/formatters';
import {
  X,
  UserPlus,
  Building2,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  Layers,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  DollarSign
} from 'lucide-react';

interface CreateDealModalProps {
  customers: Customer[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateDealModal: React.FC<CreateDealModalProps> = ({
  customers,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { data: projects = [] } = useProjects();
  const createDealMutation = useCreateDeal();
  const createCustomerMutation = useCreateCustomer();

  // Wizard Step State
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Form Fields
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [dealType, setDealType] = useState<DealType>('WADAAN_SALE');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [totalValue, setTotalValue] = useState<string>('');
  const [commissionAmount, setCommissionAmount] = useState<string>('');

  // Quick Customer Registration Modal State inside Step 1
  const [isAddingNewCustomer, setIsAddingNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  // Invoices Schedule
  const [invoices, setInvoices] = useState<CreateDealInvoiceInput[]>([
    {
      description: 'Advance / Booking Token',
      amount: '',
      dueDate: new Date().toISOString().split('T')[0],
    },
  ]);

  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setCurrentStep(1);
    setSelectedCustomerId('');
    setDealType('WADAAN_SALE');
    setSelectedProjectId('');
    setTotalValue('');
    setCommissionAmount('');
    setIsAddingNewCustomer(false);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setInvoices([
      {
        description: 'Advance / Booking Token',
        amount: '',
        dueDate: new Date().toISOString().split('T')[0],
      },
    ]);
    setFormError(null);
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Filter active projects for Construction route
  const activeProjects = useMemo(() => {
    return projects.filter((p) => p.status === 'ACTIVE');
  }, [projects]);

  // Calculations for Step 3 Math Check
  const totalValueNum = parseFloat(totalValue) || 0;
  const commissionNum = parseFloat(commissionAmount) || 0;

  const invoicesSum = useMemo(() => {
    return invoices.reduce((sum, inv) => {
      const val = parseFloat(String(inv.amount)) || 0;
      return sum + val;
    }, 0);
  }, [invoices]);

  const invoiceDifference = Math.round((totalValueNum - invoicesSum) * 100) / 100;
  const isScheduleBalanced = totalValueNum > 0 && Math.abs(invoiceDifference) < 0.01;

  if (!isOpen) return null;

  // Handle Quick Customer Registration
  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim() || !newCustomerPhone.trim()) {
      setFormError('Please provide both name and phone number for the client.');
      return;
    }
    try {
      const created = await createCustomerMutation.mutateAsync({
        fullName: newCustomerName.trim(),
        phone: newCustomerPhone.trim(),
      });
      setSelectedCustomerId(created.id);
      setIsAddingNewCustomer(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setFormError(null);
    } catch (err: any) {
      setFormError(err?.response?.data?.message || err.message || 'Failed to create customer');
    }
  };

  // Helper to split total into single lump sum
  const handleSingleLumpSum = () => {
    if (totalValueNum <= 0) return;
    setInvoices([
      {
        description: 'Full Contract Lump Sum',
        amount: totalValueNum,
        dueDate: new Date().toISOString().split('T')[0],
      },
    ]);
  };

  // Helper to distribute total evenly into installments
  const handleDistributeEvenly = (count: number) => {
    if (totalValueNum <= 0 || count <= 0) return;
    const baseAmount = Math.floor(totalValueNum / count);
    const remainder = totalValueNum - baseAmount * count;

    const today = new Date();
    const newInvoices: CreateDealInvoiceInput[] = [];

    for (let i = 0; i < count; i++) {
      const due = new Date(today);
      due.setMonth(due.getMonth() + i);
      const isLast = i === count - 1;
      newInvoices.push({
        description: i === 0 ? 'Down Payment / Milestone 1' : `Installment Milestone ${i + 1}`,
        amount: isLast ? baseAmount + remainder : baseAmount,
        dueDate: due.toISOString().split('T')[0],
      });
    }
    setInvoices(newInvoices);
  };

  const handleAddInvoiceRow = () => {
    const remaining = Math.max(0, invoiceDifference);
    const today = new Date();
    today.setMonth(today.getMonth() + invoices.length);
    setInvoices([
      ...invoices,
      {
        description: `Installment Milestone ${invoices.length + 1}`,
        amount: remaining > 0 ? remaining : '',
        dueDate: today.toISOString().split('T')[0],
      },
    ]);
  };

  const handleRemoveInvoiceRow = (index: number) => {
    if (invoices.length <= 1) return;
    setInvoices(invoices.filter((_, i) => i !== index));
  };

  const handleInvoiceChange = (
    index: number,
    field: keyof CreateDealInvoiceInput,
    value: any
  ) => {
    const updated = [...invoices];
    updated[index] = { ...updated[index], [field]: value };
    setInvoices(updated);
  };

  // Step Nav Validations
  const canProceedFromStep1 = !!selectedCustomerId;
  const canProceedFromStep2 =
    totalValueNum > 0 &&
    (dealType !== 'CONSTRUCTION' || !!selectedProjectId) &&
    (dealType !== 'BROKERAGE' || (commissionNum > 0 && commissionNum <= totalValueNum));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!canProceedFromStep1) {
      setFormError('Please select a customer.');
      setCurrentStep(1);
      return;
    }
    if (!canProceedFromStep2) {
      setFormError('Please complete all financial route requirements.');
      setCurrentStep(2);
      return;
    }
    if (!isScheduleBalanced) {
      setFormError(`Installment schedule sum (${formatPKR(invoicesSum)}) must match contract total (${formatPKR(totalValueNum)}).`);
      return;
    }

    try {
      await createDealMutation.mutateAsync({
        customerId: selectedCustomerId,
        dealType,
        projectId: dealType === 'CONSTRUCTION' ? selectedProjectId : null,
        totalValue: totalValueNum,
        commissionAmount: dealType === 'BROKERAGE' ? commissionNum : null,
        invoices: invoices.map((inv) => ({
          description: inv.description,
          amount: Number(inv.amount),
          dueDate: inv.dueDate,
        })),
      });

      resetForm();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || err.message || 'Failed to initialize deal contract');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4" data-testid="create-deal-modal">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-[#0F172A] text-white flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold text-white">Initialize Deal Contract</h2>
            <p className="text-xs text-slate-400">
              Multi-route revenue origination with zero-sum milestone scheduling
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-white rounded-lg p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 shrink-0 flex items-center justify-between text-xs">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`flex items-center gap-2 font-semibold ${
                currentStep === 1 ? 'text-[#0F172A]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                currentStep === 1 ? 'bg-[#0F172A] text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                1
              </span>
              Client Selection
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => canProceedFromStep1 && setCurrentStep(2)}
              disabled={!canProceedFromStep1}
              className={`flex items-center gap-2 font-semibold ${
                currentStep === 2 ? 'text-[#0F172A]' : 'text-slate-400 hover:text-slate-600 disabled:opacity-50'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                currentStep === 2 ? 'bg-[#0F172A] text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                2
              </span>
              Route & Pricing
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => canProceedFromStep1 && canProceedFromStep2 && setCurrentStep(3)}
              disabled={!canProceedFromStep1 || !canProceedFromStep2}
              className={`flex items-center gap-2 font-semibold ${
                currentStep === 3 ? 'text-[#0F172A]' : 'text-slate-400 hover:text-slate-600 disabled:opacity-50'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                currentStep === 3 ? 'bg-[#0F172A] text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                3
              </span>
              Installment Schedule
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{formError}</span>
            </div>
          )}

          {/* STEP 1: Client Selection */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Select Customer / Client</h3>
                  <p className="text-xs text-slate-500">
                    Assign this contract to an existing client or quickly register a new portfolio.
                  </p>
                </div>
                {!isAddingNewCustomer && (
                  <button
                    type="button"
                    onClick={() => setIsAddingNewCustomer(true)}
                    className="text-xs font-semibold text-[#059669] hover:underline flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> + Register New Client
                  </button>
                )}
              </div>

              {isAddingNewCustomer ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-[#059669]" />
                      Fast Client Registration
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingNewCustomer(false)}
                      className="text-xs text-slate-500 hover:text-slate-800 underline"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Full Name (e.g. Tariq Mahmood) *"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      className="text-xs p-2.5 border border-slate-200 rounded-lg bg-white"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Phone (e.g. 03009876543) *"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      className="text-xs p-2.5 border border-slate-200 rounded-lg bg-white"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleQuickAddCustomer}
                    disabled={createCustomerMutation.isPending}
                    className="w-full py-2 bg-[#0F172A] text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    {createCustomerMutation.isPending ? 'Saving...' : 'Register & Select Client'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-medium"
                  >
                    <option value="">-- Choose Existing Client --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} • Phone: {c.phone} (Advance Held: {formatPKR(c.walletBalance)})
                      </option>
                    ))}
                  </select>

                  {selectedCustomerId && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                        <span>
                          Client selected:{' '}
                          <strong>
                            {customers.find((c) => c.id === selectedCustomerId)?.fullName}
                          </strong>
                        </span>
                      </div>
                      <span className="font-mono font-semibold">
                        Advance: {formatPKR(customers.find((c) => c.id === selectedCustomerId)?.walletBalance ?? 0)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Route & Pricing */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Contract Route & Pricing Structure</h3>
                <p className="text-xs text-slate-500">
                  Select the operational route to determine ledger recognition and escrow treatment.
                </p>
              </div>

              {/* Route Selector Pills */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setDealType('WADAAN_SALE')}
                  className={`p-3 text-left rounded-xl border transition-all ${
                    dealType === 'WADAAN_SALE'
                      ? 'border-[#0F172A] bg-slate-900 text-white shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold">Wadaan Sale</div>
                  <div className={`text-[11px] mt-0.5 ${dealType === 'WADAAN_SALE' ? 'text-slate-300' : 'text-slate-400'}`}>
                    Plot or file inventory sale
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDealType('CONSTRUCTION')}
                  className={`p-3 text-left rounded-xl border transition-all ${
                    dealType === 'CONSTRUCTION'
                      ? 'border-blue-600 bg-blue-900 text-white shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold">Construction</div>
                  <div className={`text-[11px] mt-0.5 ${dealType === 'CONSTRUCTION' ? 'text-blue-200' : 'text-slate-400'}`}>
                    Active project development
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDealType('BROKERAGE')}
                  className={`p-3 text-left rounded-xl border transition-all ${
                    dealType === 'BROKERAGE'
                      ? 'border-emerald-600 bg-emerald-900 text-white shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold">Brokerage</div>
                  <div className={`text-[11px] mt-0.5 ${dealType === 'BROKERAGE' ? 'text-emerald-200' : 'text-slate-400'}`}>
                    Third-party escrow + commission
                  </div>
                </button>
              </div>

              {/* Construction Route: Project Picker */}
              {dealType === 'CONSTRUCTION' && (
                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                  <label className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    Link to Active Project *
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full text-xs p-2.5 border border-blue-300 rounded-lg bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    required
                  >
                    <option value="">-- Choose Active Project --</option>
                    {activeProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.projectName} ({p.projectPrefix}) • BOQ: {formatPKR(p.masterBOQ)}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-blue-700">
                    Links this contract's revenue to the project WIP ledger for live Gross Margin tracking.
                  </p>
                </div>
              )}

              {/* Total Contract Value Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Contract Value (PKR) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">
                      PKR
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      placeholder="e.g. 5000000"
                      value={totalValue}
                      onChange={(e) => setTotalValue(e.target.value)}
                      className="w-full pl-12 pr-3 py-2 text-xs border border-slate-200 rounded-lg font-mono text-slate-900 bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>

                {/* Brokerage Route: Commission Input & Live Split */}
                {dealType === 'BROKERAGE' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Wadaan Commission (PKR) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">
                        PKR
                      </span>
                      <input
                        type="number"
                        min="1"
                        max={totalValueNum || undefined}
                        step="any"
                        placeholder="e.g. 150000"
                        value={commissionAmount}
                        onChange={(e) => setCommissionAmount(e.target.value)}
                        className="w-full pl-12 pr-3 py-2 text-xs border border-slate-200 rounded-lg font-mono text-slate-900 bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Brokerage Live Split Indicator */}
              {dealType === 'BROKERAGE' && totalValueNum > 0 && commissionNum > 0 && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1.5 text-emerald-900">
                  <div className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    Double-Entry Escrow Split (Screen 9 Integration)
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                    <div>
                      <span className="text-slate-500">Earned Revenue (4000):</span>
                      <div className="font-bold text-emerald-700">{formatPKR(commissionNum)}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Seller Escrow Liability (2200):</span>
                      <div className="font-bold text-slate-800">
                        {formatPKR(Math.max(0, totalValueNum - commissionNum))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Installment Invoicing Schedule */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Installment Milestones Schedule</h3>
                  <p className="text-xs text-slate-500">
                    Define the billing dates and amounts. Total milestones must match {formatPKR(totalValueNum)}.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSingleLumpSum}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                  >
                    Single Lump Sum
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDistributeEvenly(4)}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                  >
                    4 Quarters
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDistributeEvenly(12)}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                  >
                    12 Months
                  </button>
                </div>
              </div>

              {/* Math Check Alert Banner */}
              <div
                className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                  isScheduleBalanced
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isScheduleBalanced ? (
                    <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <span>
                    Schedule Sum: <strong className="font-mono">{formatPKR(invoicesSum)}</strong> / Contract Total:{' '}
                    <strong className="font-mono">{formatPKR(totalValueNum)}</strong>
                  </span>
                </div>
                <div>
                  {isScheduleBalanced ? (
                    <span className="font-bold text-emerald-700">✓ PERFECT MATCH</span>
                  ) : (
                    <span className="font-bold text-amber-700 font-mono">
                      Diff: {formatPKR(invoiceDifference)}
                    </span>
                  )}
                </div>
              </div>

              {/* Dynamic Invoice Rows */}
              <div className="space-y-2.5">
                {invoices.map((inv, index) => (
                  <div
                    key={index}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center gap-3 text-xs"
                  >
                    <div className="w-full sm:flex-1">
                      <input
                        type="text"
                        placeholder="Description (e.g. Down Payment)"
                        value={inv.description}
                        onChange={(e) => handleInvoiceChange(index, 'description', e.target.value)}
                        className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                        required
                      />
                    </div>
                    <div className="w-full sm:w-44">
                      <input
                        type="number"
                        min="1"
                        step="any"
                        placeholder="Amount (PKR)"
                        value={inv.amount}
                        onChange={(e) => handleInvoiceChange(index, 'amount', e.target.value)}
                        className="w-full p-2 border border-slate-200 rounded-lg bg-white font-mono"
                        required
                      />
                    </div>
                    <div className="w-full sm:w-40">
                      <input
                        type="date"
                        value={inv.dueDate}
                        onChange={(e) => handleInvoiceChange(index, 'dueDate', e.target.value)}
                        className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveInvoiceRow(index)}
                      disabled={invoices.length <= 1}
                      className="p-2 text-slate-400 hover:text-red-500 disabled:opacity-30 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddInvoiceRow}
                className="w-full py-2 border border-dashed border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Installment Milestone
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 1 && canProceedFromStep1) setCurrentStep(2);
                  else if (currentStep === 2 && canProceedFromStep2) setCurrentStep(3);
                }}
                disabled={
                  (currentStep === 1 && !canProceedFromStep1) ||
                  (currentStep === 2 && !canProceedFromStep2)
                }
                className="px-4 py-2 text-xs font-semibold bg-[#0F172A] hover:bg-slate-800 text-white rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isScheduleBalanced || createDealMutation.isPending}
                className="px-5 py-2 text-xs font-semibold bg-[#059669] hover:bg-emerald-600 text-white rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {createDealMutation.isPending ? 'Initializing Contract...' : '+ Initialize Deal Contract'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
