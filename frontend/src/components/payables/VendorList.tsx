import React, { useState, useMemo } from 'react';
import { VendorItem } from '@/features/vendors/types';
import { formatPKR } from '@/lib/formatters';
import { Search, Building, Phone, AlertCircle } from 'lucide-react';
import { SkeletonList } from '@/components/ui/skeleton';

interface VendorListProps {
  vendors: VendorItem[];
  selectedVendorId: string | null;
  onSelectVendor: (id: string) => void;
  isLoading: boolean;
}

export const VendorList: React.FC<VendorListProps> = ({
  vendors,
  selectedVendorId,
  onSelectVendor,
  isLoading,
}) => {
  const [search, setSearch] = useState('');

  const filteredVendors = useMemo(() => {
    if (!search.trim()) return vendors;
    const q = search.toLowerCase();
    return vendors.filter(
      (v) =>
        v.vendorName.toLowerCase().includes(q) ||
        (v.phone && v.phone.toLowerCase().includes(q))
    );
  }, [vendors, search]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900 text-sm">Suppliers &amp; Debt</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono font-medium">
            {vendors.length} Total
          </span>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filter suppliers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white rounded-lg border border-slate-200 outline-hidden focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]"
          />
        </div>
      </div>

      {/* List items */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[550px]">
        {isLoading && (
          <div className="p-3">
            <SkeletonList count={5} />
          </div>
        )}

        {!isLoading && filteredVendors.length === 0 && (
          <div className="p-6 text-center text-xs text-slate-400">
            No suppliers found
          </div>
        )}

        {!isLoading &&
          filteredVendors.map((vendor) => {
            const isSelected = vendor.id === selectedVendorId;
            const outstanding = Number(vendor.totalOutstanding) || 0;

            return (
              <button
                key={vendor.id}
                type="button"
                onClick={() => onSelectVendor(vendor.id)}
                className={`w-full text-left p-3.5 transition-colors flex items-start justify-between gap-2 ${
                  isSelected
                    ? 'border-l-4 border-[#0F172A] bg-slate-50'
                    : 'hover:bg-slate-50/60 border-l-4 border-transparent'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={`text-xs truncate ${isSelected ? 'font-bold text-slate-900' : 'font-medium text-slate-800'}`}>
                      {vendor.vendorName}
                    </p>
                    {vendor.unpaidBillsCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-100 text-red-700 font-semibold shrink-0">
                        {vendor.unpaidBillsCount}
                      </span>
                    )}
                  </div>
                  {vendor.phone && (
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" />
                      {vendor.phone}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Payable
                  </p>
                  <p
                    className={`font-mono text-xs font-bold ${
                      outstanding > 0 ? 'text-red-600' : 'text-slate-500'
                    }`}
                  >
                    {formatPKR(outstanding)}
                  </p>
                </div>
              </button>
            );
          })}
      </div>
    </div>
  );
};
