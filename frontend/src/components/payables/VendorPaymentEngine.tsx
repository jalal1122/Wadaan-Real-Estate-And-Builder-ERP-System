import React, { useState, useMemo } from 'react';
import { useChartOfAccounts } from '@/features/accounting/hooks/useAccounting';
import { useExecutePaymentRun } from '@/features/payments/hooks/usePayments';
import { VendorUnpaidQueueResponse, PaymentMode } from '@/features/payments/types';
import { UnpaidBillsTable } from './UnpaidBillsTable';
import { formatPKR } from '@/lib/formatters';
import { printPaymentReceiptDocument } from '@/lib/receiptPrinter';
import {
  Banknote,
  CheckCircle2,
  AlertCircle,
  Printer,
  Loader2,
  Lock,
} from 'lucide-react';

interface VendorPaymentEngineProps {
  queueData: VendorUnpaidQueueResponse | undefined;
  isLoading: boolean;
  onPaymentSuccess?: () => void;
}

export const VendorPaymentEngine: React.FC<VendorPaymentEngineProps> = ({
  queueData,
  isLoading,
  onPaymentSuccess,
}) => {
  const { data: accountsData } = useChartOfAccounts();
  const executePaymentMutation = useExecutePaymentRun();

  const [selectedBillIds, setSelectedBillIds] = useState<Set<string>>(new Set());
  const [billAllocations, setBillAllocations] = useState<Record<string, string>>({});
  const [amountPaid, setAmountPaid] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CHEQUE');
  const [chequeRef, setChequeRef] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [notification, setNotification] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);

  // Filter asset accounts for payment disbursement
  const assetAccounts = useMemo(() => {
    return accountsData?.accounts?.filter((acc) => acc.category === 'ASSET') ?? [];
  }, [accountsData]);

  // Selected account object
  const selectedAccount = useMemo(() => {
    return assetAccounts.find((a) => a.id === sourceAccountId);
  }, [assetAccounts, sourceAccountId]);

  // Cheque lock condition: Is this a bank account? (name contains 'bank')
  const isBankAccount = useMemo(() => {
    if (!selectedAccount) return false;
    const name = selectedAccount.accountName.toLowerCase();
    return name.includes('bank');
  }, [selectedAccount]);

  const totalOutstanding = Number(queueData?.totalOutstanding) || 0;

  // Invoice selection handlers
  const handleToggleSelectBill = (billId: string, pendingAmount: number | string) => {
    setSelectedBillIds((prev) => {
      const next = new Set(prev);
      if (next.has(billId)) {
        next.delete(billId);
      } else {
        next.add(billId);
        setBillAllocations((allocs) => {
          if (!allocs[billId]) {
            return { ...allocs, [billId]: pendingAmount.toString() };
          }
          return allocs;
        });
      }
      return next;
    });
  };

  const handleAllocationChange = (billId: string, amount: string) => {
    setBillAllocations((prev) => ({ ...prev, [billId]: amount }));
  };

  const handleSelectAll = () => {
    if (!queueData?.bills) return;
    const allIds = new Set(queueData.bills.map((b) => b.id));
    setSelectedBillIds(allIds);
    const allocs: Record<string, string> = {};
    queueData.bills.forEach((b) => {
      allocs[b.id] = b.pendingAmount.toString();
    });
    setBillAllocations(allocs);
  };

  const handleDeselectAll = () => {
    setSelectedBillIds(new Set());
  };

  // Determine selective mode sum
  const selectiveTotal = useMemo(() => {
    if (selectedBillIds.size === 0) return 0;
    return Array.from(selectedBillIds).reduce((sum, id) => {
      const raw = billAllocations[id];
      const val = raw !== undefined ? parseFloat(raw) : 0;
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  }, [selectedBillIds, billAllocations]);

  // Effective payment amount
  const isSelectiveMode = selectedBillIds.size > 0;
  const numAmount = isSelectiveMode ? selectiveTotal : parseFloat(amountPaid) || 0;
  const displayedAmount = isSelectiveMode ? (selectiveTotal > 0 ? selectiveTotal.toString() : '') : amountPaid;

  // Check if any selected invoice has an invalid allocation
  const hasInvalidAllocation = useMemo(() => {
    if (!isSelectiveMode) return false;
    return Array.from(selectedBillIds).some((id) => {
      const raw = billAllocations[id];
      const val = parseFloat(raw || '0');
      const bill = queueData?.bills?.find((b) => b.id === id);
      if (!bill) return true;
      const maxPending = Number(bill.pendingAmount);
      return isNaN(val) || val <= 0 || val > maxPending;
    });
  }, [isSelectiveMode, selectedBillIds, billAllocations, queueData?.bills]);

  // Guardrail 1: No overpay lock
  const isOverpaying = numAmount > totalOutstanding && totalOutstanding > 0;

  // Guardrail 2: Bank Reference Lock (Cheque vs Online)
  const isRefMissing =
    isBankAccount &&
    ((paymentMode === 'CHEQUE' && !chequeRef.trim()) ||
     (paymentMode === 'ONLINE' && !transactionId.trim()));

  // Validate form readiness
  const isSubmitDisabled =
    executePaymentMutation.isPending ||
    numAmount <= 0 ||
    isOverpaying ||
    !sourceAccountId ||
    isRefMissing ||
    totalOutstanding <= 0 ||
    hasInvalidAllocation;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitDisabled || !queueData) return;

    setNotification(null);

    const invoiceAllocations = isSelectiveMode
      ? Array.from(selectedBillIds)
          .map((billId) => ({
            billId,
            amount: parseFloat(billAllocations[billId] || '0') || 0,
          }))
          .filter((item) => item.amount > 0)
      : undefined;

    executePaymentMutation.mutate(
      {
        vendorId: queueData.vendorId,
        sourceAccountId,
        amountPaid: numAmount,
        invoiceAllocations,
        chequeRef: isBankAccount && paymentMode === 'CHEQUE' ? chequeRef.trim() : null,
        transactionId: isBankAccount && paymentMode === 'ONLINE' ? transactionId.trim() : null,
        paymentDate,
      },
      {
        onSuccess: (res) => {
          // Unified printing: triggers identical A4 receipt dialog in both Electron & Browser
          try {
            printPaymentReceiptDocument({
              ...res.payment,
              vendorName: queueData.vendorName,
              settledBills: res.settledBills,
            });
          } catch (printErr) {
            console.warn('Payment receipt printing fallback triggered:', printErr);
          }

          setNotification({
            type: 'success',
            message: `Payment of ${formatPKR(res.payment.amountPaid)} posted successfully! ${
              res.settledBills.length
            } bill(s) settled.`,
          });

          setAmountPaid('');
          setSelectedBillIds(new Set());
          setBillAllocations({});
          setChequeRef('');
          setTransactionId('');
          if (onPaymentSuccess) {
            onPaymentSuccess();
          }
        },
        onError: (err: any) => {
          setNotification({
            type: 'error',
            message:
              err?.response?.data?.error?.message ||
              err.message ||
              'Payment processing failed. Please check ledger balance.',
          });
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Selected Supplier Queue
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5">
            {queueData?.vendorName || 'Select a vendor'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Select individual invoices to settle specific amounts, or leave unchecked for automatic FIFO waterfall.
          </p>
        </div>

        <div className="text-left md:text-right bg-red-50/70 p-3.5 rounded-lg border border-red-100">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-red-600">
            Total Outstanding Debt
          </p>
          <p
            data-testid="total-outstanding-display"
            className="text-2xl font-bold font-mono text-red-700"
          >
            {formatPKR(totalOutstanding)}
          </p>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          data-testid="payment-notification-banner"
          className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-xs font-semibold underline hover:opacity-75"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Unpaid Bills Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 text-xs uppercase tracking-wider">
            Unpaid Bill Queue ({queueData?.bills?.length ?? 0} Invoices)
          </h3>
          <span className="text-[11px] text-slate-400">
            {isSelectiveMode ? 'Selective invoice settlement active' : 'Oldest invoices cleared first'}
          </span>
        </div>
        <UnpaidBillsTable
          bills={queueData?.bills ?? []}
          isLoading={isLoading}
          selectedBillIds={selectedBillIds}
          billAllocations={billAllocations}
          onToggleSelectBill={handleToggleSelectBill}
          onAllocationChange={handleAllocationChange}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
        />
      </div>

      {/* Payment Action Box */}
      <div className="bg-slate-50/70 rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
          <Banknote className="w-5 h-5 text-emerald-700" />
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Execute Payment Run</h3>
            <p className="text-[11px] text-slate-500">
              Debits Accounts Payable (2000) &amp; credits selected payment account
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Payment Amount */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  Payment Amount (PKR) *
                  {isSelectiveMode && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-normal normal-case">
                      sum of {selectedBillIds.size} selected
                    </span>
                  )}
                </label>
                {totalOutstanding > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectAll();
                      setAmountPaid(totalOutstanding.toString());
                    }}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 underline"
                  >
                    Pay Full Debt
                  </button>
                )}
              </div>
              <input
                type="number"
                min="0.01"
                step="any"
                placeholder="0.00"
                value={displayedAmount}
                onChange={(e) => {
                  if (selectedBillIds.size > 0) {
                    setSelectedBillIds(new Set());
                    setBillAllocations({});
                  }
                  setAmountPaid(e.target.value);
                }}
                className={`w-full px-3.5 py-2 text-sm font-mono rounded-lg border bg-white outline-hidden transition-all ${
                  isOverpaying
                    ? 'border-red-500 ring-1 ring-red-500'
                    : 'border-slate-300 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]'
                }`}
              />
              {/* Guardrail 1: Overpayment Error */}
              {isOverpaying && (
                <p
                  data-testid="overpay-error-message"
                  className="text-xs text-red-600 mt-1 flex items-center gap-1 font-medium"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  Payment exceeds outstanding debt ({formatPKR(totalOutstanding)})
                </p>
              )}
            </div>

            {/* Source Account Dropdown */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Disbursement Account (Asset) *
              </label>
              <select
                aria-label="Disbursement Account"
                value={sourceAccountId}
                onChange={(e) => setSourceAccountId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] outline-hidden"
              >
                <option value="">-- Select Bank or Safe Account --</option>
                {assetAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    [{acc.accountCode}] {acc.accountName}
                  </option>
                ))}
              </select>
            </div>

            {/* Bank Payment Method: Cheque vs Online */}
            {isBankAccount && (
              <div data-testid="bank-payment-mode-container" className="md:col-span-2 space-y-3">
                {/* Mode Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Bank Payment Method *
                  </span>
                  <div className="inline-flex p-1 bg-slate-200/70 rounded-lg text-xs font-semibold shrink-0">
                    <button
                      type="button"
                      onClick={() => setPaymentMode('CHEQUE')}
                      className={`px-3 py-1 rounded-md transition-all ${
                        paymentMode === 'CHEQUE'
                          ? 'bg-white text-amber-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Cheque Payment
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMode('ONLINE')}
                      className={`px-3 py-1 rounded-md transition-all ${
                        paymentMode === 'ONLINE'
                          ? 'bg-white text-blue-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Online Transfer
                    </button>
                  </div>
                </div>

                {/* Cheque Box */}
                {paymentMode === 'CHEQUE' && (
                  <div
                    data-testid="cheque-ref-container"
                    className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-lg space-y-2 animate-in fade-in duration-150"
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-700" />
                        Cheque Number * (Audit Mandatory)
                      </label>
                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded">
                        Routes to Clearance Room
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. CHQ-994201"
                      value={chequeRef}
                      onChange={(e) => setChequeRef(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-amber-300 bg-white focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-hidden"
                    />
                    <p className="text-[11px] text-amber-800">
                      Cheque payments are recorded as pending clearance and must be cleared or bounced in the waiting room audit.
                    </p>
                  </div>
                )}

                {/* Online Transfer Box */}
                {paymentMode === 'ONLINE' && (
                  <div
                    data-testid="online-ref-container"
                    className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-lg space-y-2 animate-in fade-in duration-150"
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />
                        Transaction ID / Wire Reference *
                      </label>
                      <span className="text-[10px] font-semibold text-blue-800 bg-blue-100/90 px-2 py-0.5 rounded">
                        Direct Settlement • No Clearance Needed
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. FT-202609-8819 or RRN-499120"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-blue-300 bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-hidden"
                    />
                    <p className="text-[11px] text-blue-800">
                      Online bank transfers settle immediately. The transaction ID is stored directly on the payment record for audit trail.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Payment Date */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Payment Date
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] outline-hidden"
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="px-6 py-2.5 text-xs font-semibold text-white bg-[#0F172A] hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              {executePaymentMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              Execute Payment &amp; Print Receipt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
