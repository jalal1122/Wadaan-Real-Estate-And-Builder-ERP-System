'use client';

import React, { useState, useEffect } from 'react';
import { useUpdateBill } from '@/features/bills/hooks/useBills';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { ExpenseBillItem, BillLineItemPayload } from '@/features/bills/types';
import { formatPKR } from '@/lib/formatters';
import {
  X,
  Receipt,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Building,
  Info,
} from 'lucide-react';

interface EditBillModalProps {
  bill: ExpenseBillItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditBillModal: React.FC<EditBillModalProps> = ({
  bill,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const updateBillMutation = useUpdateBill();
  const { data: projects = [] } = useProjects();

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [billDate, setBillDate] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [lineItems, setLineItems] = useState<BillLineItemPayload[]>([
    { description: '', quantity: 1, unitPrice: '' },
  ]);
  const [error, setError] = useState<string | null>(null);

  const amountAlreadyPaid = bill
    ? Math.max(0, Number(bill.grandTotal) - Number(bill.pendingAmount))
    : 0;

  useEffect(() => {
    if (bill) {
      setInvoiceNumber(bill.invoiceNumber || '');
      const rawDate = bill.billDate ? new Date(bill.billDate) : new Date();
      setBillDate(rawDate.toISOString().split('T')[0]);
      setProjectId(bill.projectId || '');

      if (bill.lineItems && bill.lineItems.length > 0) {
        setLineItems(
          bill.lineItems.map((li) => ({
            description: li.description,
            quantity: Number(li.quantity),
            unitPrice: Number(li.unitPrice),
          }))
        );
      } else {
        setLineItems([
          { description: 'Expense Item', quantity: 1, unitPrice: Number(bill.grandTotal) },
        ]);
      }
      setError(null);
    }
  }, [bill, isOpen]);

  if (!isOpen || !bill) return null;

  const handleLineItemChange = (
    index: number,
    field: keyof BillLineItemPayload,
    value: string | number
  ) => {
    setLineItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleAddLineItem = () => {
    setLineItems((prev) => [...prev, { description: '', quantity: 1, unitPrice: '' }]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const grandTotal = lineItems.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!invoiceNumber.trim()) {
      setError('Invoice number is required.');
      return;
    }
    if (!billDate) {
      setError('Bill date is required.');
      return;
    }
    if (lineItems.length === 0) {
      setError('At least one line item is required.');
      return;
    }

    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      if (!item.description.trim()) {
        setError(`Line item #${i + 1} must have a description.`);
        return;
      }
      const qty = Number(item.quantity);
      const price = Number(item.unitPrice);
      if (isNaN(qty) || qty <= 0) {
        setError(`Line item #${i + 1} quantity must be a positive integer.`);
        return;
      }
      if (isNaN(price) || price <= 0) {
        setError(`Line item #${i + 1} unit price must be greater than zero.`);
        return;
      }
    }

    if (amountAlreadyPaid > 0 && grandTotal < amountAlreadyPaid) {
      setError(
        `Cannot reduce bill total below already settled amount of ${formatPKR(
          amountAlreadyPaid
        )}.`
      );
      return;
    }

    try {
      await updateBillMutation.mutateAsync({
        id: bill.id,
        payload: {
          invoiceNumber: invoiceNumber.trim(),
          billDate,
          projectId: projectId || null,
          lineItems: lineItems.map((item) => ({
            description: item.description.trim(),
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
          })),
        },
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to update bill');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      data-testid="edit-bill-modal"
    >
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-[#0F172A] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-800 rounded-lg text-emerald-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Edit Posted Bill</h2>
              <p className="text-xs text-slate-400">
                Update invoice number, bill date, project cost center, or line item details
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Vendor & Status Header Strip */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
              Supplier:
            </span>
            <span className="font-bold text-slate-900">
              {bill.vendor?.vendorName || 'Unknown Vendor'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                bill.paymentStatus === 'PAID'
                  ? 'bg-emerald-100 text-emerald-800'
                  : bill.paymentStatus === 'PARTIAL'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {bill.paymentStatus}
            </span>
            {amountAlreadyPaid > 0 && (
              <span className="text-emerald-700 font-medium">
                Settled: {formatPKR(amountAlreadyPaid)}
              </span>
            )}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {amountAlreadyPaid > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-800">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Partial Payment Active</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Payments have already settled {formatPKR(amountAlreadyPaid)} of this invoice.
                  The grand total cannot be reduced below this settled amount.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Invoice Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Invoice Number *
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-1045"
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                data-testid="edit-bill-invoice-input"
              />
            </div>

            {/* Bill Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bill Date *
              </label>
              <input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                data-testid="edit-bill-date-input"
              />
            </div>

            {/* Project Cost Center */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cost Center / Project
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                data-testid="edit-bill-project-select"
              >
                <option value="">None — General Office Overhead</option>
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.projectName} ({proj.projectPrefix})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Line Items Section */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Line Items Breakdown</span>
              <button
                type="button"
                onClick={handleAddLineItem}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                data-testid="add-bill-line-item-btn"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2">
              {lineItems.map((item, index) => {
                const itemTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                return (
                  <div
                    key={index}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center gap-2 text-xs"
                    data-testid={`edit-bill-line-item-${index}`}
                  >
                    <div className="flex-1 w-full">
                      <input
                        type="text"
                        placeholder="Description (e.g. Cement bags)"
                        value={item.description}
                        onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                        className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
                        data-testid={`line-item-desc-${index}`}
                      />
                    </div>
                    <div className="w-24 sm:w-20">
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                        className="w-full text-xs px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-right"
                        data-testid={`line-item-qty-${index}`}
                      />
                    </div>
                    <div className="w-32 sm:w-28">
                      <input
                        type="number"
                        min="0"
                        placeholder="Unit Price"
                        value={item.unitPrice}
                        onChange={(e) => handleLineItemChange(index, 'unitPrice', e.target.value)}
                        className="w-full text-xs px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-right"
                        data-testid={`line-item-price-${index}`}
                      />
                    </div>
                    <div className="w-32 text-right font-mono font-bold text-slate-800 pr-2">
                      {formatPKR(itemTotal)}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveLineItem(index)}
                      disabled={lineItems.length <= 1}
                      className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grand Total Strip */}
          <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Revised Grand Total
            </span>
            <span
              className="text-lg font-bold font-mono text-emerald-400"
              data-testid="edit-bill-grand-total"
            >
              {formatPKR(grandTotal)}
            </span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateBillMutation.isPending}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              data-testid="save-edit-bill-btn"
            >
              {updateBillMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>Save Bill Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
