import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Hooks
import { useCreateDeal } from '@/features/deals/hooks/useDeals';
import { useLogReceipt } from '@/features/receipts/hooks/useReceipts';
import { useCreateBill } from '@/features/bills/hooks/useBills';
import { useExecutePaymentRun } from '@/features/payments/hooks/usePayments';
import { useCreateJournal } from '@/features/accounting/hooks/useJournals';
import { useCreateVendor } from '@/features/vendors/hooks/useVendors';
import { useCreateCustomer } from '@/features/customers/hooks/useCustomers';
import { useSystemInit } from '@/hooks/useSystemInit';

// APIs to mock
import * as dealApi from '@/features/deals/api/dealApi';
import * as receiptApi from '@/features/receipts/api/receiptApi';
import * as billApi from '@/features/bills/api/billApi';
import * as paymentApi from '@/features/payments/api/paymentApi';
import * as journalApi from '@/features/accounting/api/journalsApi';
import * as vendorApi from '@/features/vendors/api/vendorApi';
import * as customerApi from '@/features/customers/api/customerApi';

vi.mock('@/features/deals/api/dealApi');
vi.mock('@/features/receipts/api/receiptApi');
vi.mock('@/features/bills/api/billApi');
vi.mock('@/features/payments/api/paymentApi');
vi.mock('@/features/accounting/api/journalsApi');
vi.mock('@/features/vendors/api/vendorApi');
vi.mock('@/features/customers/api/customerApi');
vi.mock('@/lib/api', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { data: {} } }),
    post: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

describe('Comprehensive Cache Invalidation Matrix Tests', () => {
  let queryClient: QueryClient;
  let invalidateSpy: any;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useCreateDeal invalidates projects, reports, trial-balance, account-ledger, and documents', async () => {
    const wrapper = createWrapper();
    vi.mocked(dealApi.createDeal).mockResolvedValueOnce({ id: 'deal-1' } as any);

    const { result } = renderHook(() => useCreateDeal(), { wrapper });
    await result.current.mutateAsync({} as any);

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['deals'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['projects'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['reports'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['trial-balance'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['account-ledger'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['documents'] });
  });

  it('useLogReceipt invalidates receipts, accounts, projects, reports, trial-balance, account-ledger, documents', async () => {
    const wrapper = createWrapper();
    vi.mocked(receiptApi.createReceipt).mockResolvedValueOnce({ id: 'rec-1' } as any);

    const { result } = renderHook(() => useLogReceipt(), { wrapper });
    await result.current.mutateAsync({} as any);

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['receipts', 'waiting-room'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['projects'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['reports'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['trial-balance'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['account-ledger'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['documents'] });
  });

  it('useCreateBill invalidates vendor-unpaid, bills, projects, reports, trial-balance, account-ledger, journals, documents', async () => {
    const wrapper = createWrapper();
    vi.mocked(billApi.createBill).mockResolvedValueOnce({ id: 'bill-1' } as any);

    const { result } = renderHook(() => useCreateBill(), { wrapper });
    await result.current.mutateAsync({} as any);

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['bills'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['vendor-unpaid'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['projects'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['reports'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['trial-balance'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['account-ledger'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['journals'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['documents'] });
  });

  it('useExecutePaymentRun invalidates vendor-unpaid, payments, projects, reports, trial-balance, account-ledger, documents', async () => {
    const wrapper = createWrapper();
    vi.mocked(paymentApi.executePaymentRun).mockResolvedValueOnce({ id: 'pay-1' } as any);

    const { result } = renderHook(() => useExecutePaymentRun(), { wrapper });
    await result.current.mutateAsync({ vendorId: 'v1', totalPaid: '100', paymentMethod: 'CASH', billAllocations: [] } as any);

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['vendor-unpaid'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['payments'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['projects'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['reports'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['trial-balance'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['account-ledger'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['documents'] });
  });

  it('useCreateJournal invalidates journals, accounts, reports, trial-balance, account-ledger, vendors, customers, documents', async () => {
    const wrapper = createWrapper();
    vi.mocked(journalApi.createJournalEntry).mockResolvedValueOnce({ id: 'jv-1' } as any);

    const { result } = renderHook(() => useCreateJournal(), { wrapper });
    await result.current.mutateAsync({} as any);

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['journals'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['accounts'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['reports'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['trial-balance'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['account-ledger'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['vendors'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['customers'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['documents'] });
  });

  it('useCreateVendor and useCreateCustomer invalidate parties dropdown and reports', async () => {
    const wrapper = createWrapper();
    vi.mocked(vendorApi.createVendor).mockResolvedValueOnce({ id: 'v-1' } as any);
    vi.mocked(customerApi.createCustomer).mockResolvedValueOnce({ id: 'c-1' } as any);

    const { result: vendorRes } = renderHook(() => useCreateVendor(), { wrapper });
    await vendorRes.current.mutateAsync({ vendorName: 'New Vendor' } as any);

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['vendors'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['parties'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['reports'] });

    const { result: custRes } = renderHook(() => useCreateCustomer(), { wrapper });
    await custRes.current.mutateAsync({ fullName: 'New Customer' } as any);

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['customers'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['parties'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['reports'] });
  });

  it('useSystemInit completeInitialization broadly invalidates all cached queries', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useSystemInit(), { wrapper });

    await result.current.completeInitialization();
    expect(invalidateSpy).toHaveBeenCalledWith();
  });
});
