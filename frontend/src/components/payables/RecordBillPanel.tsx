import React, { useState, useMemo } from 'react';
import { useVendors } from '@/features/vendors/hooks/useVendors';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { useChartOfAccounts } from '@/features/accounting/hooks/useAccounting';
import { useCreateBill } from '@/features/bills/hooks/useBills';
import { PaymentType } from '@/features/bills/types';
import { CreateVendorModal } from './CreateVendorModal';
import { LineItemRow, LineItemState } from './LineItemRow';
import { formatPKR } from '@/lib/formatters';
import {
  Plus,
  Building2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  Loader2,
  Tag,
  CreditCard,
  Wallet,
  Printer,
} from 'lucide-react';
import { printDirectPaymentReceiptDocument } from '@/lib/receiptPrinter';

const createEmptyLineItem = (): LineItemState => ({
  id: Math.random().toString(36).substring(2, 9),
  description: '',
  quantity: 1,
  unitPrice: 0,
  lineTotal: 0,
});

export const RecordBillPanel: React.FC = () => {
  const { data: vendors = [], isLoading: isVendorsLoading } = useVendors();
  const { data: projects = [], isLoading: isProjectsLoading } = useProjects();
  const { data: accountsData, isLoading: isAccountsLoading } = useChartOfAccounts();
  const createBillMutation = useCreateBill();

  // Modal state
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);

  // Form states
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(''); // '' means null / overhead
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [billDate, setBillDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentType, setPaymentType] = useState<PaymentType>('ACCOUNTS_PAYABLE');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [transactionRef, setTransactionRef] = useState('');

  // Line items state
  const [lineItems, setLineItems] = useState<LineItemState[]>([createEmptyLineItem()]);

  // Notifications & errors
  const [fieldErrors, setFieldErrors] = useState<{
    vendorId?: string;
    invoiceNumber?: string;
    sourceAccountId?: string;
    lineItems?: string;
    form?: string;
  }>({});

  const [notification, setNotification] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);

  // Filter asset accounts for DIRECT_CASH
  const assetAccounts = useMemo(() => {
    return accountsData?.accounts?.filter((acc) => acc.category === 'ASSET') ?? [];
  }, [accountsData]);

  // Detect if selected source account is a bank account
  const isSelectedSourceBank = useMemo(() => {
    if (!sourceAccountId) return false;
    const acc = assetAccounts.find((a) => a.id === sourceAccountId);
    return acc?.accountName.toLowerCase().includes('bank') ?? false;
  }, [sourceAccountId, assetAccounts]);

  // Calculate Grand Total
  const grandTotal = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
  }, [lineItems]);

  // Handle line item changes
  const handleLineItemChange = (id: string, field: keyof LineItemState, value: any) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          const qty = field === 'quantity' ? Number(value) : item.quantity;
          const price = field === 'unitPrice' ? Number(value) : item.unitPrice;
          updated.lineTotal = (isNaN(qty) ? 0 : qty) * (isNaN(price) ? 0 : price);
        }
        return updated;
      })
    );
  };

  const handleAddLineItem = () => {
    setLineItems((prev) => [...prev, createEmptyLineItem()]);
  };

  const handleDeleteLineItem = (id: string) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleResetForm = () => {
    setSelectedVendorId('');
    setSelectedProjectId('');
    setInvoiceNumber('');
    setBillDate(new Date().toISOString().split('T')[0]);
    setPaymentType('ACCOUNTS_PAYABLE');
    setSourceAccountId('');
    setTransactionRef('');
    setLineItems([createEmptyLineItem()]);
    setFieldErrors({});
    setNotification(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof fieldErrors = {};

    if (!selectedVendorId) {
      errors.vendorId = 'Please select a vendor';
    }

    if (!invoiceNumber.trim()) {
      errors.invoiceNumber = 'Invoice number is required';
    }

    if (paymentType === 'DIRECT_CASH' && !sourceAccountId) {
      errors.sourceAccountId = 'Please select a source payment account';
    }

    const invalidLines = lineItems.some(
      (item) => !item.description.trim() || item.quantity <= 0 || item.unitPrice <= 0
    );
    if (invalidLines) {
      errors.lineItems = 'All line items must have a valid description, quantity > 0, and unit price > 0';
    }

    if (grandTotal <= 0) {
      errors.form = 'Grand total of the bill must be greater than zero';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setNotification(null);

    createBillMutation.mutate(
      {
        vendorId: selectedVendorId,
        projectId: selectedProjectId ? selectedProjectId : null,
        invoiceNumber: invoiceNumber.trim(),
        billDate,
        paymentType,
        sourceAccountId: paymentType === 'DIRECT_CASH' ? sourceAccountId : null,
        transactionRef: (paymentType === 'DIRECT_CASH' && isSelectedSourceBank) ? (transactionRef.trim() || null) : null,
        lineItems: lineItems.map((item) => ({
          description: item.description.trim(),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      },
      {
        onSuccess: (res) => {
          if (paymentType === 'DIRECT_CASH') {
            const selectedVendor = vendors.find((v) => v.id === selectedVendorId);
            const selectedProj = projects.find((p) => p.id === selectedProjectId);
            const selectedSourceAcc = assetAccounts.find((a) => a.id === sourceAccountId);

            printDirectPaymentReceiptDocument({
              billId: res.bill.id,
              invoiceNumber: res.bill.invoiceNumber,
              billDate: res.bill.billDate,
              vendorName: res.bill.vendor?.vendorName || selectedVendor?.vendorName,
              projectName: res.bill.project?.projectName || selectedProj?.projectName || null,
              sourceAccountName: selectedSourceAcc?.accountName,
              transactionRef: transactionRef.trim() || null,
              grandTotal: res.bill.grandTotal,
              lineItems: res.bill.lineItems || lineItems.map((item) => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                lineTotal: item.lineTotal,
              })),
            });
          }

          if (res.isOverBudget) {
            setNotification({
              type: 'warning',
              message: `Bill saved! Project exceeds approved BOQ by ${formatPKR(res.overBudgetAmount)}.`,
            });
          } else {
            setNotification({
              type: 'success',
              message: paymentType === 'DIRECT_CASH'
                ? `Bill ${res.bill.invoiceNumber} paid direct & Expense Receipt generated!`
                : `Bill ${res.bill.invoiceNumber} posted to General Ledger successfully!`,
            });
          }

          // Reset inputs except keep notification
          setSelectedVendorId('');
          setSelectedProjectId('');
          setInvoiceNumber('');
          setLineItems([createEmptyLineItem()]);
          setSourceAccountId('');
          setTransactionRef('');
        },
        onError: (err: any) => {
          const apiError = err?.response?.data?.error;
          if (apiError?.code === 'DUPLICATE_INVOICE') {
            setFieldErrors((prev) => ({
              ...prev,
              invoiceNumber: `Invoice #${invoiceNumber} already exists for this vendor`,
            }));
          } else {
            setFieldErrors((prev) => ({
              ...prev,
              form: apiError?.message || err.message || 'Failed to record expense bill',
            }));
          }
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {notification && (
        <div
          data-testid="bill-notification-banner"
          className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
            notification.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'warning' ? (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
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

      {fieldErrors.form && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 flex items-center gap-2 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{fieldErrors.form}</span>
        </div>
      )}

      {/* Main Split-Panel Card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
          
          {/* Left Panel: Bill Metadata (col-span-5) */}
          <div className="lg:col-span-5 p-6 space-y-5 bg-slate-50/40">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
              <Receipt className="w-5 h-5 text-slate-700" />
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Bill Metadata</h3>
                <p className="text-[11px] text-slate-500">Specify supplier, GL destination, and terms</p>
              </div>
            </div>

            {/* Vendor Selector with Quick-Create */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Vendor / Supplier *
                </label>
                <button
                  type="button"
                  onClick={() => setIsVendorModalOpen(true)}
                  className="text-xs font-medium text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Vendor
                </button>
              </div>
              <select
                aria-label="Vendor / Supplier"
                value={selectedVendorId}
                onChange={(e) => {
                  setSelectedVendorId(e.target.value);
                  if (fieldErrors.vendorId) {
                    setFieldErrors((prev) => ({ ...prev, vendorId: undefined }));
                  }
                }}
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-white outline-hidden transition-all ${
                  fieldErrors.vendorId
                    ? 'border-red-500 ring-1 ring-red-500'
                    : 'border-slate-300 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]'
                }`}
              >
                <option value="">-- Select Supplier --</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vendorName} {v.phone ? `(${v.phone})` : ''}
                  </option>
                ))}
              </select>
              {fieldErrors.vendorId && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.vendorId}
                </p>
              )}
            </div>

            {/* Project Tag Dropdown with WIP Routing Badge */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  Project Allocation
                </label>
                {/* WIP Capitalization Routing Indicator */}
                {selectedProjectId ? (
                  <span
                    data-testid="wip-routing-badge"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200"
                  >
                    <Building2 className="w-3 h-3" />
                    &rarr; WIP Asset (1200)
                  </span>
                ) : (
                  <span
                    data-testid="wip-routing-badge"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-slate-100 text-slate-600 border border-slate-200"
                  >
                    &rarr; Office Overhead (5000)
                  </span>
                )}
              </div>
              <select
                aria-label="Project Allocation"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] outline-hidden"
              >
                <option value="">None &mdash; General Office Overhead</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.projectPrefix}] {p.projectName}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Allocating to a project automatically debits 1200 WIP and tracks against its BOQ.
              </p>
            </div>

            {/* Invoice Number */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Invoice / Bill Number *
              </label>
              <input
                type="text"
                placeholder="e.g. INV-2026-0891"
                value={invoiceNumber}
                onChange={(e) => {
                  setInvoiceNumber(e.target.value);
                  if (fieldErrors.invoiceNumber) {
                    setFieldErrors((prev) => ({ ...prev, invoiceNumber: undefined }));
                  }
                }}
                className={`w-full px-3 py-2 text-xs font-mono rounded-lg border bg-white outline-hidden transition-all ${
                  fieldErrors.invoiceNumber
                    ? 'border-red-500 ring-1 ring-red-500'
                    : 'border-slate-300 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]'
                }`}
              />
              {fieldErrors.invoiceNumber && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.invoiceNumber}
                </p>
              )}
            </div>

            {/* Bill Date */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Bill Date *
              </label>
              <input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] outline-hidden"
              />
            </div>

            {/* Payment Method Toggle */}
            <div className="pt-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                Settlement Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentType('ACCOUNTS_PAYABLE')}
                  className={`px-3 py-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                    paymentType === 'ACCOUNTS_PAYABLE'
                      ? 'border-[#0F172A] bg-[#0F172A] text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Accounts Payable
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType('DIRECT_CASH')}
                  className={`px-3 py-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                    paymentType === 'DIRECT_CASH'
                      ? 'border-[#0F172A] bg-[#0F172A] text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                  Direct Cash / Bank
                </button>
              </div>
            </div>

            {/* Source Account (Conditional for DIRECT_CASH) */}
            {paymentType === 'DIRECT_CASH' && (
              <div data-testid="source-account-section" className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg space-y-1.5 animate-in fade-in duration-150">
                <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-900">
                  Source Asset Account *
                </label>
                <select
                  data-testid="source-account-select"
                  aria-label="Source Asset Account"
                  value={sourceAccountId}
                  onChange={(e) => {
                    setSourceAccountId(e.target.value);
                    if (fieldErrors.sourceAccountId) {
                      setFieldErrors((prev) => ({ ...prev, sourceAccountId: undefined }));
                    }
                  }}
                  className={`w-full px-3 py-2 text-xs rounded-lg border bg-white outline-hidden ${
                    fieldErrors.sourceAccountId
                      ? 'border-red-500 ring-1 ring-red-500'
                      : 'border-emerald-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                  }`}
                >
                  <option value="">-- Select Cash/Bank Account --</option>
                  {assetAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      [{acc.accountCode}] {acc.accountName}
                    </option>
                  ))}
                </select>
                {fieldErrors.sourceAccountId && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.sourceAccountId}
                  </p>
                )}

                {isSelectedSourceBank && (
                  <div data-testid="transaction-ref-section" className="pt-2 border-t border-emerald-200/60 mt-2 space-y-1">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-emerald-900">
                      Bank Transaction / Online Ref (Optional)
                    </label>
                    <input
                      type="text"
                      data-testid="transaction-ref-input"
                      placeholder="e.g. UTR-982341 / IBFT / Cheque"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-emerald-300 bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden"
                    />
                    <p className="text-[10px] text-emerald-700">
                      Direct transfer reference will be recorded in General Ledger and printed on the Expense Receipt.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Panel: Dynamic Line Items (col-span-7) */}
          <div className="lg:col-span-7 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">Line Items &amp; Quantities</h3>
                  <p className="text-[11px] text-slate-500">Break down invoice items with unit pricing</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Line Item
                </button>
              </div>

              {/* Line Items Table Header */}
              <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">
                <div className="col-span-6">Description</div>
                <div className="col-span-2 text-right">Qty</div>
                <div className="col-span-2 text-right">Unit Price</div>
                <div className="col-span-1 text-right">Total</div>
                <div className="col-span-1 text-center">Action</div>
              </div>

              {/* Line Item Rows */}
              <div className="space-y-1 divide-y divide-slate-50">
                {lineItems.map((item, idx) => (
                  <LineItemRow
                    key={item.id}
                    item={item}
                    index={idx}
                    isOnlyItem={lineItems.length === 1}
                    onChange={handleLineItemChange}
                    onDelete={handleDeleteLineItem}
                  />
                ))}
              </div>

              {fieldErrors.lineItems && (
                <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.lineItems}
                </p>
              )}
            </div>

            {/* Right Panel Bottom Calculation */}
            <div className="pt-6 border-t border-slate-100 mt-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-sm font-semibold text-slate-700">Grand Total</span>
                <span
                  data-testid="grand-total-display"
                  className="text-xl font-bold font-mono text-emerald-700"
                >
                  {formatPKR(grandTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Action Bar */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetForm}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Reset Form
          </button>
          <button
            type="submit"
            disabled={createBillMutation.isPending}
            className={`px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors flex items-center gap-2 ${
              paymentType === 'DIRECT_CASH'
                ? 'bg-emerald-700 hover:bg-emerald-800'
                : 'bg-[#0F172A] hover:bg-slate-800'
            }`}
          >
            {createBillMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : paymentType === 'DIRECT_CASH' ? (
              <Printer className="w-4 h-4" />
            ) : null}
            {paymentType === 'DIRECT_CASH' ? 'Pay & Print Expense Receipt' : 'Save Bill & Post Ledger'}
          </button>
        </div>
      </form>

      {/* Inline Create Vendor Modal */}
      <CreateVendorModal
        isOpen={isVendorModalOpen}
        onClose={() => setIsVendorModalOpen(false)}
        onVendorCreated={(v) => setSelectedVendorId(v.id)}
      />
    </div>
  );
};
