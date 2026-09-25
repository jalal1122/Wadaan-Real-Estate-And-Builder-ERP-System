'use client';

import React, { useState, useMemo } from 'react';
import { usePersonalContacts } from '@/features/personal/hooks/usePersonal';
import { CreateContactModal } from '@/features/personal/components/CreateContactModal';
import { PersonalContactDetailDrawer } from '@/features/personal/components/PersonalContactDetailDrawer';
import { formatPKR } from '@/lib/format';
import {
  UserRound,
  UserPlus,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Scale,
  Users,
  Phone,
  ChevronRight,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

type FilterTab = 'ALL' | 'RECEIVABLE' | 'PAYABLE' | 'SETTLED';

export default function PersonalLedgerPage() {
  const { data, isLoading, isError, refetch } = usePersonalContacts();
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  const kpi = data?.kpi;
  const contacts = data?.contacts || [];

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      // Tab filter
      const net = Number(c.netBalance) || 0;
      if (activeTab === 'RECEIVABLE' && net <= 0) return false;
      if (activeTab === 'PAYABLE' && net >= 0) return false;
      if (activeTab === 'SETTLED' && net !== 0) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesPhone = c.phone?.toLowerCase().includes(q);
        const matchesRelation = c.relation?.toLowerCase().includes(q);
        return matchesName || matchesPhone || matchesRelation;
      }

      return true;
    });
  }, [contacts, activeTab, searchQuery]);

  const netPos = Number(kpi?.netPosition) || 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] flex items-center gap-2.5">
            <UserRound className="w-6 h-6 text-[#059669]" />
            Personal Finance Ledger
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track private money movements, loans given and received with friends, partners and associates.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-slate-800 rounded-lg shadow-xs transition-colors shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          Register Contact
        </button>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Given Out (Outstanding) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Lent (Given)
            </span>
            <ArrowUpRight className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold font-mono text-amber-600 mt-1">
            {formatPKR(kpi?.totalGivenOutstanding ?? 0)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Total friends/associates owe us</p>
        </div>

        {/* Total Received (Outstanding) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Borrowed (Received)
            </span>
            <ArrowDownLeft className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-bold font-mono text-blue-600 mt-1">
            {formatPKR(kpi?.totalReceivedOutstanding ?? 0)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Total we owe to lenders</p>
        </div>

        {/* Net Position */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Net Balance Position
            </span>
            <Scale className={`w-4 h-4 ${netPos >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
          </div>
          <p
            className={`text-xl font-bold font-mono mt-1 ${
              netPos >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {formatPKR(netPos)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {netPos >= 0 ? 'Net in our favor (Receivable)' : 'Net liability (Payable)'}
          </p>
        </div>

        {/* Total Accounts */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Ledger Accounts
            </span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xl font-bold font-mono text-slate-900 mt-1">
            {kpi?.totalContacts ?? 0}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {kpi?.activeLoansTotal ?? 0} unsettled transactions
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0 ${
              activeTab === 'ALL'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Accounts ({contacts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('RECEIVABLE')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0 ${
              activeTab === 'RECEIVABLE'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Receivable ({contacts.filter((c) => Number(c.netBalance) > 0).length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PAYABLE')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0 ${
              activeTab === 'PAYABLE'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Payable ({contacts.filter((c) => Number(c.netBalance) < 0).length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('SETTLED')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0 ${
              activeTab === 'SETTLED'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Settled ({contacts.filter((c) => Number(c.netBalance) === 0).length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search person or relationship..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white rounded-lg border border-slate-200 outline-hidden focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] transition-all"
          />
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Error loading personal finance ledger.</span>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="font-semibold underline hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-pulse">
          <div className="h-56 bg-slate-100 rounded-xl border border-slate-200"></div>
          <div className="h-56 bg-slate-100 rounded-xl border border-slate-200"></div>
          <div className="h-56 bg-slate-100 rounded-xl border border-slate-200"></div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredContacts.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <UserRound className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-900 text-base mb-1">
            {searchQuery || activeTab !== 'ALL' ? 'No matching personal contacts' : 'No personal accounts registered yet'}
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            {searchQuery || activeTab !== 'ALL'
              ? 'Try adjusting your search criteria or tab filters.'
              : 'Add your first personal contact (e.g. Arshad Sir, Zeeshan Sir, family or friends) to track informal loans and repayments.'}
          </p>
          {!searchQuery && activeTab === 'ALL' && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Register First Contact
            </button>
          )}
        </div>
      )}

      {/* Contacts Grid */}
      {!isLoading && !isError && filteredContacts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredContacts.map((contact) => {
            const net = Number(contact.netBalance) || 0;
            return (
              <div
                key={contact.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between gap-4"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-base leading-tight">
                        {contact.name}
                      </h3>
                      {contact.relation && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          {contact.relation}
                        </span>
                      )}
                    </div>
                    {contact.phone && (
                      <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                        <Phone className="w-3 h-3" />
                        <span>{contact.phone}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {contact.activeLoansCount} active
                  </span>
                </div>

                {/* Balance Metrics */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-amber-50/60 p-2.5 rounded-lg border border-amber-100">
                    <span className="text-[10px] uppercase font-semibold text-amber-800 block">
                      Lent (They Owe)
                    </span>
                    <span className="font-mono font-bold text-amber-700 text-sm mt-0.5 block">
                      {formatPKR(contact.outstandingGiven)}
                    </span>
                  </div>

                  <div className="bg-blue-50/60 p-2.5 rounded-lg border border-blue-100">
                    <span className="text-[10px] uppercase font-semibold text-blue-800 block">
                      Borrowed (We Owe)
                    </span>
                    <span className="font-mono font-bold text-blue-700 text-sm mt-0.5 block">
                      {formatPKR(contact.outstandingReceived)}
                    </span>
                  </div>
                </div>

                {/* Net Position Card & Link */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Net Position
                    </span>
                    <span
                      className={`font-mono text-xs font-bold ${
                        net > 0
                          ? 'text-emerald-700'
                          : net < 0
                          ? 'text-red-700'
                          : 'text-slate-500'
                      }`}
                    >
                      {net > 0
                        ? `+${formatPKR(net)} (Owes Us)`
                        : net < 0
                        ? `${formatPKR(net)} (We Owe)`
                        : 'Settled'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedContactId(contact.id)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Open Ledger
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <CreateContactModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Contact Detail Slide-Over Drawer */}
      <PersonalContactDetailDrawer
        contactId={selectedContactId}
        onClose={() => setSelectedContactId(null)}
      />
    </div>
  );
}
