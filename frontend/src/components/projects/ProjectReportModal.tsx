'use client';

import React from 'react';
import { useProjectReport } from '@/features/projects/hooks/useProjects';
import { formatPKR, formatDate } from '@/lib/format';
import {
  X,
  Printer,
  Building2,
  AlertCircle,
  TrendingUp,
  Receipt,
  Truck,
  BookOpen,
  DollarSign,
  Calendar,
  Phone,
  User,
  CheckCircle2,
  Clock,
  RotateCcw
} from 'lucide-react';

interface ProjectReportModalProps {
  projectId: string | null;
  onClose: () => void;
}

export const ProjectReportModal: React.FC<ProjectReportModalProps> = ({
  projectId,
  onClose,
}) => {
  const { data, isLoading, isError, refetch } = useProjectReport(projectId);

  if (!projectId) return null;

  const project = data?.project;
  const summary = data?.summary;
  const clientReceipts = data?.clientReceipts || [];
  const vendorExpenses = data?.vendorExpenses || [];
  const glTransactions = data?.glTransactions || [];
  const glSummary = data?.glSummary;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:inset-auto"
      data-testid="project-report-modal"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * {
                visibility: hidden !important;
              }
              #project-report-print-root, #project-report-print-root * {
                visibility: visible !important;
              }
              #project-report-print-root {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 16px !important;
                background: white !important;
                color: #0f172a !important;
                box-shadow: none !important;
                border: none !important;
                max-height: none !important;
                overflow: visible !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `,
        }}
      />

      {/* Modal Dialog Card */}
      <div
        id="project-report-print-root"
        className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:rounded-none print:border-none print:w-full overflow-hidden"
      >
        {/* Top Control Bar (Screen only, hidden in print) */}
        <div className="no-print bg-[#0F172A] text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Project Financial Report
                </h2>
                {project?.projectPrefix && (
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                    {project.projectPrefix}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Printable ledger, client receipts & vendor payables statement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="print-project-report-btn"
              data-testid="modal-print-btn"
              type="button"
              onClick={handlePrint}
              disabled={isLoading || isError}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Export PDF</span>
            </button>
            <button
              data-testid="close-project-report-modal"
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Report Content Area */}
        <div className="flex-1 overflow-y-auto p-8 print:p-0 print:overflow-visible text-slate-900 space-y-8 bg-slate-50/50 print:bg-white">
          {isLoading ? (
            <div
              className="p-8 space-y-6 animate-pulse"
              data-testid="project-report-loading"
            >
              <div className="h-14 bg-slate-200 rounded-xl w-3/4"></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="h-20 bg-slate-200 rounded-xl"></div>
                <div className="h-20 bg-slate-200 rounded-xl"></div>
                <div className="h-20 bg-slate-200 rounded-xl"></div>
                <div className="h-20 bg-slate-200 rounded-xl"></div>
              </div>
              <div className="h-48 bg-slate-200 rounded-xl"></div>
              <div className="h-48 bg-slate-200 rounded-xl"></div>
            </div>
          ) : isError ? (
            <div className="p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                Failed to load project report
              </h3>
              <p className="text-sm text-slate-500">
                An error occurred while aggregating financial report data.
              </p>
              <button
                onClick={() => refetch()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          ) : project && summary ? (
            <div className="space-y-8">
              {/* 1. Institutional Header */}
              <div className="border-b-2 border-slate-900 pb-5">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                      Wadaan Real Estate & Builders (Pvt) Ltd.
                    </h1>
                    <h2 className="text-base font-bold text-emerald-700 uppercase tracking-wide mt-0.5">
                      Project Financial & Audit Report
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Comprehensive statement of revenues, costs, client receipts, vendor payables & general ledger
                    </p>
                  </div>

                  <div className="text-left md:text-right space-y-1">
                    <div className="inline-flex items-center gap-2">
                      <span className="text-lg font-black text-slate-900">
                        {project.projectName}
                      </span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 border border-slate-300 font-bold text-slate-800">
                        {project.projectPrefix}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 flex items-center md:justify-end gap-3">
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Status: {project.status}
                      </span>
                      <span>•</span>
                      <span>Commenced: {formatDate(project.createdAt)}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Report Generated: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Executive Financial KPI Strip */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                  Executive Financial Summary
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* BOQ */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Approved Master BOQ
                    </p>
                    <p className="text-lg font-extrabold text-slate-900 mt-1">
                      {formatPKR(project.masterBOQ)}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">Total approved project budget</p>
                  </div>

                  {/* Spent WIP */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Total Spent (WIP)
                    </p>
                    <p className="text-lg font-extrabold text-amber-600 mt-1">
                      {formatPKR(summary.totalSpentWIP)}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">
                      Burn: <span className={summary.isOverBudget ? 'text-red-600 font-bold' : 'text-slate-700'}>{summary.budgetBurnPct}%</span>
                      {summary.isOverBudget && <span className="ml-1 text-red-600 font-bold">⚠️ OVER BUDGET</span>}
                    </p>
                  </div>

                  {/* Received from Clients */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Received from Clients
                    </p>
                    <p className="text-lg font-extrabold text-emerald-600 mt-1">
                      {formatPKR(summary.totalReceivedFromClients)}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Across {clientReceipts.length} client contract(s)
                    </p>
                  </div>

                  {/* Net Cash Margin */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Net Cash Margin
                    </p>
                    <p
                      className={`text-lg font-extrabold mt-1 ${
                        Number(summary.netCashMargin) >= 0 ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {formatPKR(summary.netCashMargin)}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">
                      {Number(summary.netCashMargin) >= 0 ? '✅ Cash-flow Positive' : '🔻 Net Deficit'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Client Receipts Breakdown */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-emerald-600" />
                      Client Receipts Breakdown
                    </h3>
                    <p className="text-xs text-slate-500">
                      Installments, milestones, and receipts logged per client contract
                    </p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg text-xs font-bold text-emerald-800">
                    Grand Total Received: {formatPKR(data.grandTotalFromClients)}
                  </div>
                </div>

                {clientReceipts.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-3 text-center">
                    No client deals or receipts recorded for this project yet.
                  </p>
                ) : (
                  <div className="space-y-6">
                    {clientReceipts.map((client) => (
                      <div
                        key={client.customerId}
                        className="rounded-lg border border-slate-200 overflow-hidden"
                      >
                        {/* Client Contract Banner */}
                        <div className="bg-slate-100 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                            <User className="w-3.5 h-3.5 text-slate-600" />
                            <span>{client.customerName}</span>
                            {client.customerPhone && (
                              <span className="font-normal text-slate-500">
                                ({client.customerPhone})
                              </span>
                            )}
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-300 uppercase">
                              {client.dealType}
                            </span>
                          </div>
                          <div className="text-xs font-medium text-slate-600 flex items-center gap-3">
                            <span>Contract: <strong>{formatPKR(client.contractValue)}</strong></span>
                            <span>•</span>
                            <span className="text-emerald-700 font-bold">
                              Paid: {formatPKR(client.totalPaid)}
                            </span>
                            <span>•</span>
                            <span className="text-slate-500">
                              Pending: {formatPKR(client.totalPending)}
                            </span>
                          </div>
                        </div>

                        {/* Payments Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                              <tr>
                                <th className="px-3 py-2">Milestone / Description</th>
                                <th className="px-3 py-2">Due Date</th>
                                <th className="px-3 py-2">Receipt Date</th>
                                <th className="px-3 py-2">Paid By (Customer)</th>
                                <th className="px-3 py-2">Method</th>
                                <th className="px-3 py-2">Ref #</th>
                                <th className="px-3 py-2 text-right">Invoice Amount</th>
                                <th className="px-3 py-2 text-right">Paid Amount</th>
                                <th className="px-3 py-2 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                              {client.payments.map((p, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50">
                                  <td className="px-3 py-2 font-sans font-medium text-slate-800">
                                    {p.invoiceDescription}
                                  </td>
                                  <td className="px-3 py-2 text-slate-500">
                                    {formatDate(p.dueDate)}
                                  </td>
                                  <td className="px-3 py-2 text-slate-500">
                                    {formatDate(p.receiptDate)}
                                  </td>
                                  <td className="px-3 py-2 font-sans text-slate-700">
                                    {p.paidByCustomerName || client.customerName}
                                  </td>
                                  <td className="px-3 py-2 font-sans text-slate-600">
                                    {p.paymentMethod || '—'}
                                  </td>
                                  <td className="px-3 py-2 text-slate-500">
                                    {p.bankRefNumber || '—'}
                                  </td>
                                  <td className="px-3 py-2 text-right text-slate-600">
                                    {formatPKR(p.amount)}
                                  </td>
                                  <td className="px-3 py-2 text-right font-bold text-emerald-700">
                                    {formatPKR(p.paidAmount)}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <span
                                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-sans font-bold ${
                                        p.paymentStatus === 'PAID'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : p.paymentStatus === 'PARTIAL'
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {p.paymentStatus}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. Vendor Expenses & Payables */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Truck className="w-4 h-4 text-amber-600" />
                      Vendor Expenses & Subcontractors
                    </h3>
                    <p className="text-xs text-slate-500">
                      Material bills, subcontractor services, and procurement logged to this project
                    </p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg text-xs font-bold text-amber-900">
                    Grand Total to Vendors: {formatPKR(data.grandTotalToVendors)}
                  </div>
                </div>

                {vendorExpenses.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-3 text-center">
                    No vendor bills or direct site expenses logged for this project.
                  </p>
                ) : (
                  <div className="space-y-6">
                    {vendorExpenses.map((vendor) => (
                      <div
                        key={vendor.vendorId}
                        className="rounded-lg border border-slate-200 overflow-hidden"
                      >
                        {/* Vendor Summary Bar */}
                        <div className="bg-slate-100 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                            <Truck className="w-3.5 h-3.5 text-slate-600" />
                            <span>{vendor.vendorName}</span>
                            {vendor.vendorPhone && (
                              <span className="font-normal text-slate-500">
                                ({vendor.vendorPhone})
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-medium text-slate-600 flex items-center gap-3">
                            <span>Total Billed: <strong>{formatPKR(vendor.totalBilled)}</strong></span>
                            <span>•</span>
                            <span className="text-emerald-700 font-bold">
                              Paid: {formatPKR(vendor.totalPaid)}
                            </span>
                            <span>•</span>
                            <span className="text-slate-500">
                              Pending: {formatPKR(vendor.totalPending)}
                            </span>
                          </div>
                        </div>

                        {/* Bills Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                              <tr>
                                <th className="px-3 py-2">Invoice #</th>
                                <th className="px-3 py-2">Bill Date</th>
                                <th className="px-3 py-2">Line Items Summary</th>
                                <th className="px-3 py-2 text-right">Grand Total</th>
                                <th className="px-3 py-2 text-right">Pending Amount</th>
                                <th className="px-3 py-2 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                              {vendor.bills.map((bill, bIdx) => (
                                <tr key={bIdx} className="hover:bg-slate-50/50">
                                  <td className="px-3 py-2 font-bold text-slate-800">
                                    {bill.invoiceNumber}
                                  </td>
                                  <td className="px-3 py-2 text-slate-500">
                                    {formatDate(bill.billDate)}
                                  </td>
                                  <td className="px-3 py-2 font-sans text-slate-600">
                                    {bill.lineItems.length > 0
                                      ? bill.lineItems.map((li) => `${li.description} (${li.quantity})`).join(', ')
                                      : '—'}
                                  </td>
                                  <td className="px-3 py-2 text-right font-bold text-slate-800">
                                    {formatPKR(bill.grandTotal)}
                                  </td>
                                  <td className="px-3 py-2 text-right text-slate-600">
                                    {formatPKR(bill.pendingAmount)}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <span
                                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-sans font-bold ${
                                        bill.paymentStatus === 'PAID'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : bill.paymentStatus === 'PARTIAL'
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {bill.paymentStatus}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 5. General Ledger Audit Trail */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      General Ledger Audit Trail
                    </h3>
                    <p className="text-xs text-slate-500">
                      Chronological journal line postings tagged to this project
                    </p>
                  </div>
                  {glSummary && (
                    <div className="flex items-center gap-3 text-xs font-mono font-semibold">
                      <span className="text-slate-600">Dr: {formatPKR(glSummary.totalDebit)}</span>
                      <span>•</span>
                      <span className="text-slate-600">Cr: {formatPKR(glSummary.totalCredit)}</span>
                      <span>•</span>
                      <span className="text-slate-900 font-bold">Net: {formatPKR(glSummary.netBalance)}</span>
                    </div>
                  )}
                </div>

                {glTransactions.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-3 text-center">
                    No General Ledger entries recorded for this project yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">JV #</th>
                          <th className="px-3 py-2">Account</th>
                          <th className="px-3 py-2">Party / Description</th>
                          <th className="px-3 py-2 text-right">Debit</th>
                          <th className="px-3 py-2 text-right">Credit</th>
                          <th className="px-3 py-2 text-right">Running Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        {glTransactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                              {formatDate(tx.entryDate)}
                            </td>
                            <td className="px-3 py-2 font-bold text-slate-800">
                              {tx.entryNumber}
                            </td>
                            <td className="px-3 py-2 font-sans">
                              <span className="font-mono text-slate-500 font-semibold">
                                {tx.accountCode}
                              </span>{' '}
                              <span className="text-slate-700">{tx.accountName}</span>
                            </td>
                            <td className="px-3 py-2 font-sans text-slate-600">
                              {tx.partyName ? `${tx.partyName} — ` : ''}
                              {tx.memo || tx.journalDescription || '—'}
                            </td>
                            <td className="px-3 py-2 text-right text-emerald-700 font-bold">
                              {Number(tx.debitAmount) > 0 ? formatPKR(tx.debitAmount) : '—'}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-600">
                              {Number(tx.creditAmount) > 0 ? formatPKR(tx.creditAmount) : '—'}
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-slate-900">
                              {formatPKR(tx.runningBalance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 6. Signatures / Institutional Stamp Block */}
              <div className="pt-6 border-t border-slate-200 grid grid-cols-3 gap-8 text-center text-xs text-slate-500">
                <div>
                  <div className="h-14 border-b border-dashed border-slate-400"></div>
                  <p className="mt-2 font-semibold text-slate-700">Project Engineer / Site Manager</p>
                </div>
                <div>
                  <div className="h-14 border-b border-dashed border-slate-400"></div>
                  <p className="mt-2 font-semibold text-slate-700">Finance Controller / Accountant</p>
                </div>
                <div>
                  <div className="h-14 border-b border-dashed border-slate-400"></div>
                  <p className="mt-2 font-semibold text-slate-700">Managing Director Approval</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
