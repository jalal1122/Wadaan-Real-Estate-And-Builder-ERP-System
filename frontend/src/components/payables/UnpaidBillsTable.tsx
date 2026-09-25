import React from 'react';
import { UnpaidBillItem } from '@/features/payments/types';
import { formatPKR } from '@/lib/formatters';
import { Tag, CheckCircle2, CheckSquare, Square, AlertCircle } from 'lucide-react';
import { SkeletonTable } from '@/components/ui/skeleton';

interface UnpaidBillsTableProps {
  bills: UnpaidBillItem[];
  isLoading: boolean;
  selectedBillIds?: Set<string>;
  billAllocations?: Record<string, string>;
  onToggleSelectBill?: (billId: string, pendingAmount: number | string) => void;
  onAllocationChange?: (billId: string, amount: string) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
}

export const UnpaidBillsTable: React.FC<UnpaidBillsTableProps> = ({
  bills,
  isLoading,
  selectedBillIds = new Set(),
  billAllocations = {},
  onToggleSelectBill,
  onAllocationChange,
  onSelectAll,
  onDeselectAll,
}) => {
  if (isLoading) {
    return <SkeletonTable rows={4} columns={7} />;
  }

  if (bills.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <p className="text-xs font-semibold text-slate-800">No Pending Invoices</p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          All supplier bills have been fully settled. No outstanding payables due.
        </p>
      </div>
    );
  }

  const allSelected = bills.length > 0 && bills.every((b) => selectedBillIds.has(b.id));
  const someSelected = selectedBillIds.size > 0 && !allSelected;

  const totalSelectedAmount = Array.from(selectedBillIds).reduce((sum, id) => {
    const raw = billAllocations[id];
    const val = raw !== undefined ? parseFloat(raw) : 0;
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white space-y-0">
      {/* Top Interactive Selector Toolbar */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (allSelected) {
                onDeselectAll?.();
              } else {
                onSelectAll?.();
              }
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-md border border-slate-300 transition-colors shadow-2xs"
          >
            {allSelected ? (
              <>
                <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>Deselect All</span>
              </>
            ) : (
              <>
                <Square className="w-3.5 h-3.5 text-slate-400" />
                <span>Select All Invoices</span>
              </>
            )}
          </button>

          {selectedBillIds.size > 0 && (
            <button
              type="button"
              onClick={onDeselectAll}
              className="text-[11px] text-slate-500 hover:text-red-600 underline font-medium"
            >
              Clear
            </button>
          )}
        </div>

        <div>
          {selectedBillIds.size > 0 ? (
            <span
              data-testid="selected-invoices-summary"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md"
            >
              <span>{selectedBillIds.size} of {bills.length} selected</span>
              <span>&bull;</span>
              <span className="font-mono">{formatPKR(totalSelectedAmount)}</span>
            </span>
          ) : (
            <span className="text-[11px] text-slate-500">
              Check invoices to allocate specific payments, or leave unchecked for automatic FIFO
            </span>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[10px] font-semibold">
              <th className="py-3 px-3 w-10 text-center">
                <span className="sr-only">Select</span>
              </th>
              <th className="py-3 px-3">Queue</th>
              <th className="py-3 px-4">Invoice #</th>
              <th className="py-3 px-4">Bill Date</th>
              <th className="py-3 px-4">Project Allocation</th>
              <th className="py-3 px-4 text-right">Pending Debt</th>
              <th className="py-3 px-4">Pay This Run (PKR)</th>
              <th className="py-3 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bills.map((bill, index) => {
              const formattedDate = new Date(bill.billDate).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });

              const isSelected = selectedBillIds.has(bill.id);
              const allocValue = billAllocations[bill.id] ?? bill.pendingAmount.toString();
              const numAlloc = parseFloat(allocValue) || 0;
              const maxPending = Number(bill.pendingAmount);
              const isRowInvalid = isSelected && (numAlloc <= 0 || numAlloc > maxPending);

              return (
                <tr
                  key={bill.id}
                  className={`transition-colors ${
                    isSelected ? 'bg-emerald-50/40 hover:bg-emerald-50/60' : 'hover:bg-slate-50/75'
                  }`}
                >
                  {/* Checkbox */}
                  <td className="py-3 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelectBill?.(bill.id, bill.pendingAmount)}
                      aria-label={`Select invoice ${bill.invoiceNumber}`}
                      data-testid={`select-bill-${bill.id}`}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                    />
                  </td>

                  {/* Queue # */}
                  <td className="py-3 px-3">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-mono text-[10px] font-bold inline-flex items-center justify-center">
                      #{index + 1}
                    </span>
                  </td>

                  {/* Invoice # */}
                  <td className="py-3 px-4 font-mono font-medium text-slate-900">
                    {bill.invoiceNumber}
                  </td>

                  {/* Bill Date */}
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                    {formattedDate}
                  </td>

                  {/* Project Allocation */}
                  <td className="py-3 px-4">
                    {bill.project ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        <Tag className="w-3 h-3 text-slate-400" />
                        {bill.project.projectPrefix}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">General Overhead</span>
                    )}
                  </td>

                  {/* Pending Debt */}
                  <td className="py-3 px-4 text-right font-mono font-bold text-red-600 whitespace-nowrap">
                    {formatPKR(bill.pendingAmount)}
                  </td>

                  {/* Pay This Run Input */}
                  <td className="py-3 px-4">
                    {isSelected ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0.01"
                            max={maxPending}
                            step="any"
                            value={allocValue}
                            onChange={(e) => onAllocationChange?.(bill.id, e.target.value)}
                            aria-label={`Allocation for ${bill.invoiceNumber}`}
                            data-testid={`allocation-input-${bill.id}`}
                            className={`w-32 px-2.5 py-1 text-xs font-mono font-semibold rounded-md border outline-hidden transition-all ${
                              isRowInvalid
                                ? 'border-red-500 bg-red-50 text-red-700 ring-1 ring-red-500'
                                : 'border-slate-300 bg-white text-slate-900 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => onAllocationChange?.(bill.id, bill.pendingAmount.toString())}
                            className="px-1.5 py-1 text-[10px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200"
                            title="Pay full remaining balance"
                          >
                            Full
                          </button>
                        </div>
                        {isRowInvalid && (
                          <p
                            data-testid={`row-error-${bill.id}`}
                            className="text-[10px] text-red-600 font-medium flex items-center gap-0.5"
                          >
                            <AlertCircle className="w-3 h-3" />
                            Max {formatPKR(maxPending)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">—</span>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td className="py-3 px-4 text-center">
                    {bill.paymentStatus === 'PARTIAL' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-amber-100 text-amber-800">
                        Partial
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-red-100 text-red-800">
                        Unpaid
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
