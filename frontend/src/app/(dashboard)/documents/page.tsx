'use client';

import React, { useState } from 'react';
import { useDocumentArchive } from '@/features/documents/hooks/useDocuments';
import { DocumentFilterType, ArchiveDocumentItem } from '@/features/documents/types';
import { formatPKR } from '@/lib/formatters';
import {
  printPaymentReceiptDocument,
  printDirectPaymentReceiptDocument,
  printInflowReceiptDocument,
} from '@/lib/receiptPrinter';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Printer,
  FileText,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Receipt,
  Download,
} from 'lucide-react';

const TYPE_TABS: Array<{ id: DocumentFilterType; label: string }> = [
  { id: 'ALL', label: 'All Documents' },
  { id: 'CPV', label: 'Payment Vouchers (CPV)' },
  { id: 'DPR', label: 'Direct Expense (DPR)' },
  { id: 'REC', label: 'Inflow Receipts (REC)' },
];

export default function DocumentArchivePage() {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<DocumentFilterType>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const { data, isLoading, isFetching, refetch } = useDocumentArchive({
    search: search.trim() || undefined,
    type: selectedType,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    page,
    pageSize,
  });

  const handlePrintDocument = (doc: ArchiveDocumentItem) => {
    try {
      if (doc.documentType === 'CPV') {
        printPaymentReceiptDocument(doc.printPayload);
      } else if (doc.documentType === 'DPR') {
        printDirectPaymentReceiptDocument(doc.printPayload);
      } else if (doc.documentType === 'REC') {
        printInflowReceiptDocument(doc.printPayload);
      }
    } catch (err) {
      console.error('Failed to print document:', err);
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedType('ALL');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(search || selectedType !== 'ALL' || startDate || endDate);

  const getDocBadge = (type: string) => {
    switch (type) {
      case 'CPV':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'DPR':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'REC':
        return 'bg-violet-50 text-violet-700 border-violet-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'POSTED':
      case 'REALIZED':
      case 'CLEARED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PENDING':
      case 'PENDING_CLEARANCE':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Document Archive &amp; Receipts
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-700 rounded-full border border-slate-200">
              {data?.total ?? 0} Records
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Search, traverse, and re-print dual-copy institutional vouchers and official financial receipts.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-xs self-start sm:self-auto"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
        {/* Type Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">
            Type:
          </span>
          {TYPE_TABS.map((tab) => {
            const isSelected = selectedType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedType(tab.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-[#0F172A] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search & Date Controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by Document #, Vendor, Customer, or Reference..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] outline-hidden transition-colors"
            />
          </div>

          {/* Date Range Inputs */}
          <div className="md:col-span-4 flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="date"
                title="Start Date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] outline-hidden"
              />
            </div>
            <span className="text-xs text-slate-400">to</span>
            <div className="relative flex-1">
              <input
                type="date"
                title="End Date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] outline-hidden"
              />
            </div>
          </div>

          {/* Clear Filters Button */}
          <div className="md:col-span-2 flex justify-end">
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-xs font-semibold text-red-600 hover:text-red-700 px-2 py-1 hover:bg-red-50 rounded transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-semibold select-none">
              <tr>
                <th className="py-3 px-4">Doc #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Party / Name</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Cost Centre</th>
                <th className="py-3 px-4 text-right">Amount (PKR)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3.5 px-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-3.5 px-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="py-3.5 px-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="py-3.5 px-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-3.5 px-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-3.5 px-4 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                    <td className="py-3.5 px-4 text-center"><Skeleton className="h-4 w-16 mx-auto rounded-full" /></td>
                    <td className="py-3.5 px-4 text-center"><Skeleton className="h-7 w-20 mx-auto rounded" /></td>
                  </tr>
                ))
              ) : !data?.documents || data.documents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Receipt className="w-8 h-8 text-slate-300" />
                      <p className="text-xs font-medium text-slate-600">No documents found matching the criteria</p>
                      <p className="text-[11px] text-slate-400">Try adjusting your search keywords or clearing date filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.documents.map((doc) => {
                  const formattedDate = new Date(doc.date).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <tr
                      key={`${doc.documentType}-${doc.id}`}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Document # */}
                      <td className="py-3 px-4 font-mono font-bold">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-semibold ${getDocBadge(
                            doc.documentType
                          )}`}
                        >
                          {doc.documentNumber}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {formattedDate}
                      </td>

                      {/* Party / Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900 truncate max-w-[160px]">
                            {doc.partyName}
                          </span>
                          <span
                            className={`text-[9.5px] px-1 py-0.2 rounded font-medium ${
                              doc.partyType === 'VENDOR'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {doc.partyType === 'VENDOR' ? 'Supplier' : 'Client'}
                          </span>
                        </div>
                      </td>

                      {/* Reference */}
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px] truncate max-w-[140px]">
                        {doc.reference || '—'}
                      </td>

                      {/* Project / Cost Centre */}
                      <td className="py-3 px-4 text-slate-600 text-xs">
                        {doc.projectName || <span className="text-slate-400 italic">Office Overhead</span>}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatPKR(doc.amount)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase ${getStatusBadge(
                            doc.status
                          )}`}
                        >
                          {doc.status}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handlePrintDocument(doc)}
                          title="Print / Download PDF"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-600" />
                          <span>Print</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {data && data.totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing <span className="font-semibold">{Math.min((data.page - 1) * data.pageSize + 1, data.total)}</span> to{' '}
              <span className="font-semibold">{Math.min(data.page * data.pageSize, data.total)}</span> of{' '}
              <span className="font-semibold">{data.total}</span> documents
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={data.page <= 1}
                className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 py-1 font-medium font-mono text-slate-800">
                Page {data.page} of {data.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={data.page >= data.totalPages}
                className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
