import React, { useState } from 'react';
import { useVendors } from '@/features/vendors/hooks/useVendors';
import { useVendorUnpaidBills } from '@/features/payments/hooks/usePayments';
import { VendorList } from './VendorList';
import { VendorPaymentEngine } from './VendorPaymentEngine';
import { Users, Banknote } from 'lucide-react';

export const PaymentRunPanel: React.FC = () => {
  const { data: vendors = [], isLoading: isVendorsLoading } = useVendors();
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);

  const {
    data: queueData,
    isLoading: isQueueLoading,
    refetch: refetchQueue,
  } = useVendorUnpaidBills(selectedVendorId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Sidebar: Vendor Directory & Debt Balance */}
      <div className="lg:col-span-4">
        <VendorList
          vendors={vendors}
          selectedVendorId={selectedVendorId}
          onSelectVendor={(id) => setSelectedVendorId(id)}
          isLoading={isVendorsLoading}
        />
      </div>

      {/* Right Content Area: Payment Engine & FIFO Queue */}
      <div className="lg:col-span-8">
        {selectedVendorId ? (
          <VendorPaymentEngine
            queueData={queueData}
            isLoading={isQueueLoading}
            onPaymentSuccess={() => refetchQueue()}
          />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Banknote className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">Select Supplier to Initiate Payment Run</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Choose a supplier from the directory on the left to inspect their FIFO invoice queue, review pending balances, and execute a settlement.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
