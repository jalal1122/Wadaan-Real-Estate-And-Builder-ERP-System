'use client';

import React, { useState } from 'react';
import { useCustomer, useApplyCustomerWallet } from '@/features/customers/hooks/useCustomers';
import { useRemoveCoClient } from '@/features/deals/hooks/useDeals';
import { AddCoClientModal } from '@/features/deals/_components/AddCoClientModal';
import { Deal } from '@/features/deals/types';
import { formatPKR, formatDate, isInvoiceOverdue, getDaysOverdue } from '@/lib/format';
import {
  X,
  Wallet,
  Phone,
  User,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  FileText,
  Building2,
  Sparkles,
  Users,
  UserPlus,
  Trash2,
  Warehouse,
} from 'lucide-react';

interface CustomerKhaataDrawerProps {
  customerId: string | null;
  onClose: () => void;
}

export const CustomerKhaataDrawer: React.FC<CustomerKhaataDrawerProps> = ({
  customerId,
  onClose,
}) => {
  const { data: customer, isLoading, isError, refetch } = useCustomer(customerId);
  const applyWalletMutation = useApplyCustomerWallet();
  const removeCoClientMutation = useRemoveCoClient();

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [applyAmount, setApplyAmount] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Co-Client Modal & Management State
  const [coClientDeal, setCoClientDeal] = useState<Deal | null>(null);
  const [isAddCoClientOpen, setIsAddCoClientOpen] = useState<boolean>(false);
  const [coClientError, setCoClientError] = useState<string | null>(null);

  React.useEffect(() => {
    setSelectedInvoiceId('');
    setApplyAmount('');
    setActionError(null);
    setActionSuccess(null);
    setCoClientDeal(null);
    setIsAddCoClientOpen(false);
    setCoClientError(null);
  }, [customerId]);

  const handleRemoveCoClient = async (dealId: string, clientId: string, name?: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name || 'this co-client'} from this contract?`)) {
      return;
    }
    setCoClientError(null);
    try {
      await removeCoClientMutation.mutateAsync({ dealId, clientId });
      refetch();
    } catch (err: any) {
      setCoClientError(
        err?.response?.data?.message || err?.message || 'Failed to remove co-client'
      );
    }
  };

  if (!customerId) return null;

  const walletBalance = Number(customer?.walletBalance) || 0;

  // Find all unpaid or partially paid invoices across this customer's deals (including co-client deals)
  const eligibleInvoices: Array<{
    id: string;
    description: string;
    amount: number;
    totalAmount: number;
    dealType: string;
    dueDate: string;
    isCoClientDeal: boolean;
    shareLabel?: string | null;
  }> = [];

  customer?.deals?.forEach((deal) => {
    deal.invoices?.forEach((inv) => {
      if (inv.paymentStatus === 'UNPAID' || inv.paymentStatus === 'PARTIAL') {
        const totalAmt = Number(inv.amount) || 0;
        const paidAmt = Number(inv.paidAmount) || 0;
        const remainingAmt = Math.max(0, totalAmt - paidAmt);
        eligibleInvoices.push({
          id: inv.id,
          description: inv.description,
          amount: remainingAmt,
          totalAmount: totalAmt,
          dealType: deal.dealType,
          dueDate: inv.dueDate,
          isCoClientDeal: deal.isPrimary === false,
          shareLabel: deal.shareLabel,
        });
      }
    });
  });

  const handleApplyWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    const amountNum = parseFloat(applyAmount);
    if (!selectedInvoiceId) {
      setActionError('Please select an invoice to apply funds to.');
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      setActionError('Please enter a valid amount greater than 0.');
      return;
    }
    if (amountNum > walletBalance) {
      setActionError(`Amount cannot exceed available wallet balance (${formatPKR(walletBalance)}).`);
      return;
    }

    try {
      await applyWalletMutation.mutateAsync({
        customerId,
        payload: {
          invoiceId: selectedInvoiceId,
          amount: amountNum,
        },
      });
      setActionSuccess(`Successfully applied ${formatPKR(amountNum)} from advance wallet!`);
      setSelectedInvoiceId('');
      setApplyAmount('');
      refetch();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err.message || 'Failed to apply wallet balance');
    }
  };

  const getDealBadge = (dealType: string) => {
    switch (dealType) {
      case 'CONSTRUCTION':
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-50 text-blue-700 rounded-md border border-blue-200">Construction</span>;
      case 'BROKERAGE':
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">Brokerage</span>;
      default:
        return <span className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-800 rounded-md border border-slate-200">Sale</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 rounded-full">Paid</span>;
      case 'PARTIAL':
        return <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 rounded-full">Partial</span>;
      case 'PENDING_CLEARANCE':
        return <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 rounded-full">In Escrow</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-semibold bg-red-50 text-red-700 rounded-full">Unpaid</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end" data-testid="customer-khaata-drawer">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-6 bg-[#0F172A] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200">
              <User className="w-5 h-5 text-[#059669]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">
                {customer?.fullName || 'Loading Customer...'}
              </h2>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  {customer?.phone || '—'}
                </span>
                <span>•</span>
                <span>Client Khaata Portfolio</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            data-testid="close-khaata-drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="space-y-6 animate-pulse" data-testid="khaata-skeleton-loader">
              {/* Wallet Card Skeleton */}
              <div className="h-32 bg-slate-800/80 rounded-xl p-5 border border-slate-700 flex flex-col justify-between">
                <div className="flex justify-between items-center">
                  <div className="h-3 w-40 bg-slate-700 rounded-md"></div>
                  <div className="h-4 w-4 bg-slate-700 rounded-full"></div>
                </div>
                <div className="h-7 w-32 bg-slate-700 rounded-md"></div>
                <div className="h-3 w-64 bg-slate-700/70 rounded-md"></div>
              </div>

              {/* Contracts Skeleton */}
              <div className="space-y-3">
                <div className="h-4 w-44 bg-slate-200 rounded-md"></div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between">
                    <div className="h-4 w-24 bg-slate-200 rounded-md"></div>
                    <div className="h-3 w-16 bg-slate-200 rounded-md"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 py-2 border-y border-slate-200/60">
                    <div className="h-6 bg-slate-200 rounded-md"></div>
                    <div className="h-6 bg-slate-200 rounded-md"></div>
                  </div>
                  <div className="h-10 bg-slate-200/70 rounded-lg"></div>
                </div>
              </div>

              {/* Receipts Ledger Skeleton */}
              <div className="space-y-3">
                <div className="h-4 w-48 bg-slate-200 rounded-md"></div>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white p-3 space-y-2">
                  <div className="h-8 bg-slate-100 rounded-md"></div>
                  <div className="h-8 bg-slate-100 rounded-md"></div>
                  <div className="h-8 bg-slate-100 rounded-md"></div>
                </div>
              </div>
            </div>
          ) : isError || !customer ? (
            <div className="text-center py-12 text-red-600 text-sm flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <span>Failed to load customer portfolio</span>
            </div>
          ) : (
            <>
              {/* Wallet Summary Card */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-5 border border-slate-700 shadow-sm" data-testid="khaata-wallet-card">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Mobilization Advance Wallet
                  </span>
                  <Wallet className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="mt-2 text-2xl font-bold font-mono text-emerald-400" data-testid="khaata-wallet-balance">
                  {formatPKR(walletBalance)}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Unallocated client funds held in mobilization liability account (Escrow).
                </p>

                {/* Apply Wallet Advance Form or Explanatory State */}
                {walletBalance > 0 && eligibleInvoices.length > 0 ? (
                  <form onSubmit={handleApplyWallet} className="mt-4 pt-4 border-t border-slate-700/60 space-y-3" data-testid="apply-advance-form">
                    <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Apply Advance to Unpaid Installment
                    </div>
                    {actionError && (
                      <div className="p-2 text-xs bg-red-900/40 border border-red-700 text-red-200 rounded-md">
                        {actionError}
                      </div>
                    )}
                    {actionSuccess && (
                      <div className="p-2 text-xs bg-emerald-900/40 border border-emerald-700 text-emerald-200 rounded-md">
                        {actionSuccess}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select
                        value={selectedInvoiceId}
                        onChange={(e) => {
                          setSelectedInvoiceId(e.target.value);
                          const inv = eligibleInvoices.find((i) => i.id === e.target.value);
                          if (inv) {
                            setApplyAmount(String(Math.min(walletBalance, inv.amount)));
                          }
                        }}
                        className="text-xs bg-slate-800 border border-slate-600 rounded-lg p-2 text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                        required
                      >
                        <option value="">Select Invoice / Installment</option>
                        {eligibleInvoices.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.isCoClientDeal ? `[Co-Buyer${inv.shareLabel ? `: ${inv.shareLabel}` : ''}] ` : ''}
                            {inv.description} (Remaining: {formatPKR(inv.amount)}) - Due {formatDate(inv.dueDate)}
                          </option>
                        ))}
                      </select>

                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Amount (PKR)"
                          value={applyAmount}
                          onChange={(e) => setApplyAmount(e.target.value)}
                          max={walletBalance}
                          min={1}
                          className="w-full text-xs bg-slate-800 border border-slate-600 rounded-lg p-2 text-white font-mono focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                          required
                        />
                        <button
                          type="submit"
                          disabled={applyWalletMutation.isPending}
                          className="px-3 py-2 bg-[#059669] hover:bg-emerald-600 text-white font-semibold text-xs rounded-lg transition-colors shrink-0 disabled:opacity-50"
                        >
                          {applyWalletMutation.isPending ? 'Applying...' : 'Apply'}
                        </button>
                      </div>
                    </div>
                  </form>
                ) : walletBalance > 0 && eligibleInvoices.length === 0 ? (
                  <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Advance balance available. All milestone installments for this client are currently settled.</span>
                  </div>
                ) : (
                  <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center gap-2 text-xs text-slate-400" data-testid="zero-advance-notice">
                    <Sparkles className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>No advance balance. Mobilization receipts and overpayments will appear here.</span>
                  </div>
                )}
              </div>

              {/* Section 1: Active Deals & Invoices */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    Contract Agreements ({customer.deals?.length || 0})
                  </h3>
                </div>

                {customer.deals?.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
                    No contracts recorded for this client yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customer.deals?.map((deal) => {
                      const dealHasOverdue = deal.invoices?.some((i) => isInvoiceOverdue(i.dueDate, i.paymentStatus));
                      const isCoDeal = deal.isPrimary === false;

                      return (
                        <div
                          key={deal.id}
                          className={`bg-white border rounded-xl p-4 shadow-2xs space-y-3 transition-colors ${
                            dealHasOverdue ? 'border-red-300 ring-1 ring-red-100' : 'border-slate-200'
                          }`}
                        >
                          {/* Co-Client Contract Header Badge if applicable */}
                          {isCoDeal && (
                            <div
                              className="flex items-center justify-between px-3 py-1.5 bg-amber-50 text-amber-900 text-xs font-medium rounded-lg border border-amber-200"
                              data-testid={`coclient-contract-badge-${deal.id}`}
                            >
                              <div className="flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span className="font-semibold">Co-Client Contract</span>
                                {deal.shareLabel && (
                                  <span className="font-mono px-1 py-0.2 bg-amber-100 text-amber-800 rounded text-[11px]">
                                    {deal.shareLabel}
                                  </span>
                                )}
                              </div>
                              {deal.primaryCustomer && (
                                <span className="text-amber-700 text-[11px]">
                                  Primary: <span className="font-semibold">{deal.primaryCustomer.fullName}</span>
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getDealBadge(deal.dealType)}
                              <span className="font-mono text-xs font-semibold text-slate-700">
                                #{deal.id.slice(0, 8)}
                              </span>
                              {dealHasOverdue && (
                                <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-red-100 text-red-700 border border-red-200 flex items-center gap-0.5">
                                  <AlertCircle className="w-2.5 h-2.5 text-red-600 shrink-0" />
                                  Overdue Milestones
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-500">
                              {formatDate(deal.createdAt)}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 py-2 border-y border-slate-100 text-xs">
                            <div>
                              <span className="text-slate-500">Total Contract Value:</span>
                              <div className="font-mono font-bold text-slate-900 mt-0.5">
                                {formatPKR(deal.totalValue)}
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-500">Outstanding Balance:</span>
                              <div className={`font-mono font-bold mt-0.5 ${dealHasOverdue ? 'text-red-600' : 'text-amber-600'}`}>
                                {formatPKR(deal.pendingBalance ?? 0)}
                              </div>
                            </div>
                          </div>

                          {/* Linked Construction Project & Realized Site Cost/Margin */}
                          {deal.project && (
                            <div data-testid={`deal-project-card-${deal.id}`} className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 text-xs space-y-2">
                              <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                                  <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span>Site: {deal.project.projectName || deal.project.name}</span>
                                  {(deal.project.projectPrefix || deal.project.code) && (
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      ({deal.project.projectPrefix || deal.project.code})
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                                  Construction Site
                                </span>
                              </div>

                              <div className="grid grid-cols-3 gap-2 font-mono text-[11px] pt-0.5">
                                <div>
                                  <span className="text-slate-500 text-[10px] block font-sans">Client Paid</span>
                                  <span className="font-bold text-emerald-600">{formatPKR(deal.totalCollected ?? 0)}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 text-[10px] block font-sans">Site Spent (WIP)</span>
                                  <span className="font-bold text-slate-800">{formatPKR(deal.spentOnSite ?? 0)}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 text-[10px] block font-sans">Net Cash Margin</span>
                                  <span
                                    className={`font-bold ${
                                      Number(deal.netMargin ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-600'
                                    }`}
                                  >
                                    {formatPKR(deal.netMargin ?? 0)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Linked Owned Asset & Acquisition Cost / True Profit */}
                          {deal.asset && (
                            <div data-testid={`deal-asset-card-${deal.id}`} className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-3 text-xs space-y-2">
                              <div className="flex items-center justify-between border-b border-amber-200/60 pb-1.5">
                                <div className="flex items-center gap-1.5 font-semibold text-amber-950">
                                  <Warehouse className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>Owned Asset: {deal.asset.assetTitle}</span>
                                </div>
                                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                  {deal.asset.assetCategory}
                                </span>
                              </div>

                              <div className="grid grid-cols-3 gap-2 font-mono text-[11px] pt-0.5">
                                <div>
                                  <span className="text-amber-800/70 text-[10px] block font-sans">Contract Value</span>
                                  <span className="font-bold text-slate-900">{formatPKR(deal.totalValue)}</span>
                                </div>
                                <div>
                                  <span className="text-amber-800/70 text-[10px] block font-sans">Acquisition Cost</span>
                                  <span className="font-bold text-amber-900">{formatPKR(deal.asset.acquisitionCost)}</span>
                                </div>
                                <div>
                                  <span className="text-amber-800/70 text-[10px] block font-sans">True Gross Profit</span>
                                  <span
                                    className={`font-bold ${
                                      Number(deal.totalValue) - Number(deal.asset.acquisitionCost) >= 0
                                        ? 'text-emerald-700'
                                        : 'text-red-600'
                                    }`}
                                  >
                                    {formatPKR(Number(deal.totalValue) - Number(deal.asset.acquisitionCost))}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Co-Clients / Co-Buyers Panel */}
                          <div
                            className="bg-slate-50/80 border border-slate-200/70 rounded-lg p-3 text-xs space-y-2"
                            data-testid={`deal-coclient-section-${deal.id}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                                <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>Co-Clients & Partners ({deal.coClients?.length || 0})</span>
                              </div>
                              {!isCoDeal && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCoClientDeal(deal);
                                    setIsAddCoClientOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200 transition-colors cursor-pointer"
                                  data-testid={`open-add-coclient-btn-${deal.id}`}
                                >
                                  <UserPlus className="w-3 h-3" />
                                  Add Co-Client
                                </button>
                              )}
                            </div>

                            {deal.coClients && deal.coClients.length > 0 ? (
                              <div className="space-y-1.5 pt-1">
                                {deal.coClients.map((cc) => (
                                  <div
                                    key={cc.id}
                                    className="flex items-center justify-between p-2 rounded-md bg-white border border-slate-200/60 shadow-2xs"
                                    data-testid={`coclient-row-${cc.id}`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                                        {cc.customer?.fullName?.charAt(0) || 'C'}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 truncate">
                                          <span className="font-semibold text-slate-800 truncate">
                                            {cc.customer?.fullName}
                                          </span>
                                          {cc.shareLabel && (
                                            <span className="px-1.5 py-0.2 text-[9px] font-mono font-medium bg-emerald-50 text-emerald-700 rounded border border-emerald-200 shrink-0">
                                              {cc.shareLabel}
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[10px] text-slate-400">
                                          {cc.customer?.phone || 'No phone'}
                                        </div>
                                      </div>
                                    </div>
                                    {!isCoDeal && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveCoClient(deal.id, cc.id, cc.customer?.fullName)}
                                        disabled={removeCoClientMutation.isPending}
                                        className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer shrink-0"
                                        title="Remove Co-Client"
                                        data-testid={`remove-coclient-btn-${cc.id}`}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[11px] text-slate-400 italic">
                                No co-buyers registered. Single-client contract.
                              </p>
                            )}
                          </div>

                          {/* Invoices Timeline */}
                          <div className="space-y-1.5 pt-1">
                            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                              Installment Milestones
                            </div>
                            {deal.invoices?.map((inv) => {
                              const totalAmt = Number(inv.amount) || 0;
                              const paidAmt = Number(inv.paidAmount) || (inv.paymentStatus === 'PAID' ? totalAmt : 0);
                              const remainingAmt = Math.max(0, totalAmt - paidAmt);
                              const isPartial = inv.paymentStatus === 'PARTIAL';
                              const isOverdue = isInvoiceOverdue(inv.dueDate, inv.paymentStatus);
                              const daysOverdue = getDaysOverdue(inv.dueDate);

                              return (
                                <div
                                  key={inv.id}
                                  className={`flex items-center justify-between p-2.5 rounded-lg text-xs transition-colors ${
                                    isOverdue
                                      ? 'bg-red-50/90 border border-red-200 shadow-2xs'
                                      : 'bg-slate-50'
                                  }`}
                                  data-testid={`milestone-item-${inv.id}`}
                                >
                                  <div className="min-w-0 pr-2">
                                    <p className={`font-semibold truncate ${isOverdue ? 'text-red-950 font-bold' : 'text-slate-800'}`}>
                                      {inv.description}
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px] mt-0.5">
                                      <span className={isOverdue ? 'text-red-600 font-bold flex items-center gap-1' : 'text-slate-400'}>
                                        {isOverdue && <AlertTriangle className="w-3 h-3 text-red-600 shrink-0 inline" />}
                                        Due: {formatDate(inv.dueDate)}
                                        {isOverdue && ` (${daysOverdue > 0 ? `${daysOverdue}d overdue` : 'Overdue'})`}
                                      </span>
                                      {inv.receipt?.customer && (
                                        <>
                                          <span className="text-slate-300">•</span>
                                          <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-medium">
                                            Paid by: {inv.receipt.customer.fullName}
                                          </span>
                                        </>
                                      )}
                                      {isPartial && paidAmt > 0 && (
                                        <>
                                          <span className="text-slate-300">•</span>
                                          <span className="text-emerald-600 font-semibold">
                                            Paid: {formatPKR(paidAmt)}
                                          </span>
                                          <span className="text-slate-300">•</span>
                                          <span className="text-amber-600 font-semibold">
                                            Remaining: {formatPKR(remainingAmt)}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <div className="text-right">
                                      <span className={`font-mono font-bold block ${isOverdue ? 'text-red-700' : 'text-slate-800'}`}>
                                        {isPartial ? formatPKR(remainingAmt) : formatPKR(totalAmt)}
                                      </span>
                                      {isPartial && (
                                        <span className="text-[10px] text-slate-400 font-mono block">
                                          Total: {formatPKR(totalAmt)}
                                        </span>
                                      )}
                                    </div>
                                    {isOverdue ? (
                                      <span className="px-2 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded-full flex items-center gap-1 shadow-2xs">
                                        <AlertTriangle className="w-2.5 h-2.5 text-white shrink-0" />
                                        {isPartial ? 'Partial Overdue' : 'Overdue'}
                                      </span>
                                    ) : (
                                      getStatusBadge(inv.paymentStatus)
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Section 2: Receipt History */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                    <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                    Payment & Receipts Ledger ({customer.receipts?.length || 0})
                  </h3>
                </div>

                {customer.receipts?.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
                    No payment receipts issued to this client yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                    {customer.receipts?.map((rcpt) => (
                      <div key={rcpt.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">
                              {formatPKR(rcpt.amount ?? rcpt.totalAmount)}
                            </span>
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded-md">
                              {rcpt.paymentMethod}
                            </span>
                            {rcpt.clearanceStatus === 'PENDING' ? (
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 rounded-md flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Waiting Room
                              </span>
                            ) : rcpt.clearanceStatus === 'BOUNCED' ? (
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-red-50 text-red-700 rounded-md flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Bounced
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 rounded-md flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Cleared
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {formatDate(rcpt.receiptDate)}
                            {rcpt.bankRefNumber ? ` • Ref: ${rcpt.bankRefNumber}` : ''}
                            {rcpt.customer && rcpt.customer.id !== customer.id && (
                              <span className="ml-1 text-emerald-600 font-medium">
                                • Paid by {rcpt.customer.fullName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Co-Client Modal */}
      {coClientDeal && (
        <AddCoClientModal
          dealId={coClientDeal.id}
          primaryCustomerId={coClientDeal.customerId}
          existingCoClientIds={coClientDeal.coClients?.map((c) => c.customerId) || []}
          isOpen={isAddCoClientOpen}
          onClose={() => {
            setIsAddCoClientOpen(false);
            setCoClientDeal(null);
          }}
          onSuccess={() => {
            refetch();
          }}
        />
      )}
    </div>
  );
};
