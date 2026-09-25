'use client';

import React, { useState, useMemo } from 'react';
import { useCustomers, useCustomer, useCreateCustomer } from '@/features/customers/hooks/useCustomers';
import { useChartOfAccounts } from '@/features/accounting/hooks/useAccounting';
import { useLogReceipt } from '@/features/receipts/hooks/useReceipts';
import { PaymentMethod } from '@/features/receipts/types';
import { formatPKR, formatDate } from '@/lib/format';
import {
  Banknote,
  Wallet,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Building2,
  Sparkles,
  Printer,
  UserPlus,
  Plus
} from 'lucide-react';
import { printInflowReceiptDocument } from '@/lib/receiptPrinter';

interface FastInflowFormProps {
  onReceiptLogged?: (result: any) => void;
}

export const FastInflowForm: React.FC<FastInflowFormProps> = ({ onReceiptLogged }) => {
  const { data: customers = [] } = useCustomers();
  const { data: accountsData } = useChartOfAccounts();
  const logReceiptMutation = useLogReceipt();
  const createCustomerMutation = useCreateCustomer();

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [bankRefNumber, setBankRefNumber] = useState<string>('');
  const [targetAccountId, setTargetAccountId] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  // Quick Customer Registration Inline
  const [isAddingNewCustomer, setIsAddingNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  // Fetch customer details to get unpaid invoices
  const { data: customerDetail } = useCustomer(selectedCustomerId || null);

  // Filter asset accounts for target depository
  const assetAccounts = useMemo(() => {
    return (
      accountsData?.accounts?.filter(
        (acc) => acc.category === 'ASSET' && !acc.isArchived
      ) || []
    );
  }, [accountsData]);

  // Extract unpaid/partial invoices for this customer
  const customerUnpaidInvoices = useMemo(() => {
    const invList: Array<{
      id: string;
      description: string;
      amount: number;
      dueDate: string;
      dealType: string;
    }> = [];

    customerDetail?.deals?.forEach((deal) => {
      deal.invoices?.forEach((inv) => {
        if (inv.paymentStatus === 'UNPAID' || inv.paymentStatus === 'PARTIAL') {
          invList.push({
            id: inv.id,
            description: inv.description,
            amount: Number(inv.amount),
            dueDate: inv.dueDate,
            dealType: deal.dealType,
          });
        }
      });
    });

    return invList;
  }, [customerDetail]);

  // Sum of selected invoices
  const selectedInvoicesTotal = useMemo(() => {
    return customerUnpaidInvoices
      .filter((inv) => selectedInvoiceIds.includes(inv.id))
      .reduce((sum, inv) => sum + inv.amount, 0);
  }, [customerUnpaidInvoices, selectedInvoiceIds]);

  const amountNum = parseFloat(amount) || 0;
  const excessAmount = Math.max(0, amountNum - selectedInvoicesTotal);

  // Handle invoice toggle
  const toggleInvoiceSelection = (invId: string) => {
    if (selectedInvoiceIds.includes(invId)) {
      setSelectedInvoiceIds(selectedInvoiceIds.filter((id) => id !== invId));
    } else {
      const next = [...selectedInvoiceIds, invId];
      setSelectedInvoiceIds(next);
      // Auto-set amount if currently empty or matches previous total
      const newTotal = customerUnpaidInvoices
        .filter((inv) => next.includes(inv.id))
        .reduce((sum, inv) => sum + inv.amount, 0);
      setAmount(String(newTotal));
    }
  };

  const handleMatchInvoicesSum = () => {
    if (selectedInvoicesTotal > 0) {
      setAmount(String(selectedInvoicesTotal));
    }
  };

  // Quick Customer Creation
  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim() || !newCustomerPhone.trim()) {
      setFormError('Please enter both name and phone number for the client.');
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

  const handlePrintReceipt = (receiptData: any) => {
    try {
      printInflowReceiptDocument({
        ...receiptData,
        customer: customerDetail || customers.find((c) => c.id === selectedCustomerId),
      });
    } catch (err) {
      console.warn('Print receipt trigger failed:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessResult(null);

    if (!selectedCustomerId) {
      setFormError('Please select a customer / client.');
      return;
    }
    if (amountNum <= 0) {
      setFormError('Please enter a valid positive payment amount.');
      return;
    }
    if ((paymentMethod === 'CHEQUE' || paymentMethod === 'ONLINE') && !bankRefNumber.trim()) {
      setFormError(`Instrument reference number is mandatory for ${paymentMethod} payments.`);
      return;
    }

    try {
      const result = await logReceiptMutation.mutateAsync({
        customerId: selectedCustomerId,
        invoiceIds: selectedInvoiceIds,
        amount: amountNum,
        paymentMethod,
        bankRefNumber: paymentMethod !== 'CASH' ? bankRefNumber.trim() : null,
        targetAccountId: paymentMethod !== 'CHEQUE' ? targetAccountId || null : null,
      });

      setSuccessResult(result);
      onReceiptLogged?.(result);

      // Reset form fields
      setAmount('');
      setBankRefNumber('');
      setSelectedInvoiceIds([]);
    } catch (err: any) {
      setFormError(err?.response?.data?.message || err.message || 'Failed to record receipt');
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-6 space-y-5" data-testid="fast-inflow-form">
      {/* Form Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#0F172A] text-white rounded-xl">
            <Banknote className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">Fast Inflow Gateway</h2>
            <p className="text-xs text-slate-500">
              Direct receipt recording with automatic escrow or invoice reconciliation
            </p>
          </div>
        </div>
      </div>

      {/* Success Banner */}
      {successResult && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 text-[#059669]" />
              <span>
                {successResult.receipt?.clearanceStatus === 'PENDING'
                  ? 'Cheque Registered in Waiting Room'
                  : 'Receipt Cleared & Posted to General Ledger'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handlePrintReceipt(successResult.receipt)}
              className="px-3 py-1 bg-[#059669] hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
              data-testid="print-receipt-btn"
            >
              <Printer className="w-3.5 h-3.5" /> Print A4 Receipt
            </button>
          </div>
          <div className="text-xs text-emerald-700 font-mono">
            Amount: {formatPKR(successResult.receipt?.amount ?? successResult.receipt?.totalAmount ?? 0)} • Method: {successResult.receipt?.paymentMethod}
            {successResult.walletAdvanceCredited > 0 && (
              <span className="block mt-0.5 text-emerald-800 font-semibold">
                ✓ Deposited {formatPKR(successResult.walletAdvanceCredited)} into Mobilization Advance Wallet.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Error Banner */}
      {formError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Quick Customer Add Panel */}
      {isAddingNewCustomer ? (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-[#059669]" />
              Quick Client Onboarding
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
              placeholder="Full Name *"
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
              className="text-xs p-2.5 border border-slate-200 rounded-lg bg-white"
              required
            />
            <input
              type="text"
              placeholder="Phone (e.g. 03001234567) *"
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
            {createCustomerMutation.isPending ? 'Registering...' : 'Save & Select Client'}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Customer / Client *
              </label>
              <button
                type="button"
                onClick={() => setIsAddingNewCustomer(true)}
                className="text-xs font-semibold text-[#059669] hover:underline flex items-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" /> + New Client
              </button>
            </div>
            <select
              value={selectedCustomerId}
              onChange={(e) => {
                setSelectedCustomerId(e.target.value);
                setSelectedInvoiceIds([]);
                setSuccessResult(null);
              }}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-medium"
              required
              data-testid="customer-select"
            >
              <option value="">-- Choose Paying Client --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} ({c.phone}) — Advance: {formatPKR(c.walletBalance)}
                </option>
              ))}
            </select>
          </div>

          {/* Unpaid Invoices Reconciliation Box */}
          {selectedCustomerId && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-600" />
                  Target Installment Invoices ({customerUnpaidInvoices.length})
                </div>
                {selectedInvoicesTotal > 0 && (
                  <button
                    type="button"
                    onClick={handleMatchInvoicesSum}
                    className="text-[11px] font-semibold text-[#059669] hover:underline"
                  >
                    Match Total ({formatPKR(selectedInvoicesTotal)})
                  </button>
                )}
              </div>

              {customerUnpaidInvoices.length === 0 ? (
                <div className="p-3 bg-white border border-dashed border-slate-200 rounded-lg text-xs text-slate-500 text-center">
                  No unpaid invoices found. Inflow will be held in client's Advance Mobilization Wallet.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {customerUnpaidInvoices.map((inv) => {
                    const isSelected = selectedInvoiceIds.includes(inv.id);
                    return (
                      <label
                        key={inv.id}
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-emerald-50/70 border-emerald-300'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleInvoiceSelection(inv.id)}
                            className="rounded-sm text-[#059669] focus:ring-emerald-500"
                          />
                          <div>
                            <span className="font-semibold text-slate-800">{inv.description}</span>
                            <div className="text-[10px] text-slate-400">
                              Due: {formatDate(inv.dueDate)} • Route: {inv.dealType}
                            </div>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-slate-900">
                          {formatPKR(inv.amount)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Payment Method Selector Pills */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Payment Method *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`p-2.5 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                  paymentMethod === 'CASH'
                    ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
                data-testid="method-cash-btn"
              >
                <Banknote className="w-3.5 h-3.5" /> Cash
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CHEQUE')}
                className={`p-2.5 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                  paymentMethod === 'CHEQUE'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
                data-testid="method-cheque-btn"
              >
                <CreditCard className="w-3.5 h-3.5" /> Cheque (Escrow)
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('ONLINE')}
                className={`p-2.5 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                  paymentMethod === 'ONLINE'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
                data-testid="method-online-btn"
              >
                <Building2 className="w-3.5 h-3.5" /> Online / Transfer
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Received Amount (PKR) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">
                PKR
              </span>
              <input
                type="number"
                min="1"
                step="any"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-12 pr-3 py-2 text-xs border border-slate-200 rounded-lg font-mono text-slate-900 bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-semibold"
                required
                data-testid="amount-input"
              />
            </div>
            {excessAmount > 0 && selectedInvoiceIds.length > 0 && (
              <p className="text-[11px] text-emerald-600 mt-1 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-500" />
                Excess of {formatPKR(excessAmount)} will be deposited directly to Client Advance Wallet.
              </p>
            )}
          </div>

          {/* Bank Reference Number (Required for Cheque & Online) */}
          {(paymentMethod === 'CHEQUE' || paymentMethod === 'ONLINE') && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {paymentMethod === 'CHEQUE' ? 'Cheque / Leaf Number *' : 'Bank Transfer / UTR Ref *'}
              </label>
              <input
                type="text"
                placeholder={paymentMethod === 'CHEQUE' ? 'e.g. CHQ-987654' : 'e.g. TRX-20260915-01'}
                value={bankRefNumber}
                onChange={(e) => setBankRefNumber(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white font-mono uppercase focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                required
                data-testid="bank-ref-input"
              />
            </div>
          )}

          {/* Target Account (For Cash or Online) */}
          {paymentMethod !== 'CHEQUE' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Deposit Destination Account (Optional / Auto)
              </label>
              <select
                value={targetAccountId}
                onChange={(e) => setTargetAccountId(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                data-testid="target-account-select"
              >
                <option value="">-- Auto-Default Asset Account --</option>
                {assetAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountCode} - {acc.accountName}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-800">
              <strong>Cheque Waiting Room Rule:</strong> Uncleared cheques are routed to Account 1020 (Undeposited Funds / Escrow). Bank destination will be chosen upon clearance.
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={logReceiptMutation.isPending}
            className="w-full py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            data-testid="submit-receipt-btn"
          >
            {logReceiptMutation.isPending ? (
              'Posting to Ledger...'
            ) : (
              <>
                <Plus className="w-4 h-4" /> Record Inflow Receipt
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
