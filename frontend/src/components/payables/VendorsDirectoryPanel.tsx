'use client';

import React, { useState, useMemo } from 'react';
import { useVendors } from '@/features/vendors/hooks/useVendors';
import { VendorItem } from '@/features/vendors/types';
import { formatPKR } from '@/lib/formatters';
import { EditVendorModal } from './EditVendorModal';
import { CreateVendorModal } from './CreateVendorModal';
import { SkeletonList } from '@/components/ui/skeleton';
import {
  Search,
  Building,
  Phone,
  Plus,
  Pencil,
  AlertCircle,
  CreditCard,
  CheckCircle2,
} from 'lucide-react';

export const VendorsDirectoryPanel: React.FC = () => {
  const { data: vendors = [], isLoading } = useVendors();
  const [search, setSearch] = useState('');
  const [editingVendor, setEditingVendor] = useState<VendorItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filteredVendors = useMemo(() => {
    if (!search.trim()) return vendors;
    const q = search.toLowerCase();
    return vendors.filter(
      (v) =>
        v.vendorName.toLowerCase().includes(q) ||
        (v.phone && v.phone.toLowerCase().includes(q))
    );
  }, [vendors, search]);

  const totalOutstanding = useMemo(() => {
    return vendors.reduce((sum, v) => sum + (Number(v.totalOutstanding) || 0), 0);
  }, [vendors]);

  return (
    <div className="space-y-6">
      {/* KPI & Controls Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Active Suppliers
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <Building className="w-5 h-5 text-blue-600" />
            <span className="text-2xl font-bold font-mono text-slate-900">
              {vendors.length}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Accounts Payable
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <CreditCard className="w-5 h-5 text-red-600" />
            <span className="text-2xl font-bold font-mono text-red-600">
              {formatPKR(totalOutstanding)}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-center">
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="w-full py-2.5 px-4 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            data-testid="add-new-vendor-btn"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Add New Supplier / Vendor</span>
          </button>
        </div>
      </div>

      {/* Directory Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by vendor name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white rounded-xl border border-slate-200 outline-hidden focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]"
              data-testid="vendor-search-input"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Showing {filteredVendors.length} of {vendors.length} vendors
          </span>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-6">Supplier Details</th>
                <th className="py-3 px-6">Contact Number</th>
                <th className="py-3 px-6 text-center">Unpaid Bills</th>
                <th className="py-3 px-6 text-right">Total Outstanding</th>
                <th className="py-3 px-6 text-right">Total Paid to Date</th>
                <th className="py-3 px-6 text-right w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-6">
                    <SkeletonList count={4} />
                  </td>
                </tr>
              ) : filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                    No suppliers found matching your query.
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor) => {
                  const outstanding = Number(vendor.totalOutstanding) || 0;
                  const paid = Number(vendor.totalPaid) || 0;
                  return (
                    <tr
                      key={vendor.id}
                      className="hover:bg-slate-50/70 transition-colors"
                      data-testid={`vendor-row-${vendor.id}`}
                    >
                      <td className="py-3.5 px-6">
                        <div className="font-bold text-slate-900 text-sm">
                          {vendor.vendorName}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ID: {vendor.id.slice(0, 8)}
                        </span>
                      </td>

                      <td className="py-3.5 px-6">
                        {vendor.phone ? (
                          <div className="inline-flex items-center gap-1.5 text-slate-600 font-medium">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{vendor.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No phone</span>
                        )}
                      </td>

                      <td className="py-3.5 px-6 text-center">
                        {vendor.unpaidBillsCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            {vendor.unpaidBillsCount} Pending
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                            0 Unpaid
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-6 text-right">
                        <span
                          className={`font-mono font-bold text-xs ${
                            outstanding > 0 ? 'text-red-600' : 'text-slate-500'
                          }`}
                        >
                          {formatPKR(outstanding)}
                        </span>
                      </td>

                      <td className="py-3.5 px-6 text-right font-mono text-emerald-700 font-semibold">
                        {formatPKR(paid)}
                      </td>

                      <td className="py-3.5 px-6 text-right">
                        <button
                          type="button"
                          onClick={() => setEditingVendor(vendor)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors shadow-2xs cursor-pointer"
                          title={`Edit ${vendor.vendorName}`}
                          data-testid={`edit-vendor-btn-${vendor.id}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit Vendor</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Vendor Modal */}
      <EditVendorModal
        vendor={editingVendor}
        isOpen={!!editingVendor}
        onClose={() => setEditingVendor(null)}
      />

      {/* Create Vendor Modal */}
      <CreateVendorModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </div>
  );
};
