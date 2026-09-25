import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import DealHubPage from './page';
import { DealTable } from './_components/DealTable';
import { DealKPIStrip } from './_components/DealKPIStrip';
import { CreateDealModal } from './_components/CreateDealModal';

// Mock hooks
const mockCreateDealMutate = vi.fn();
const mockTransferFileMutate = vi.fn();
const mockCreateCustomerMutate = vi.fn();
const mockApplyWalletMutate = vi.fn();
const mockRefetchDeals = vi.fn();
const mockRefetchCustomers = vi.fn();

const mockCustomers = [
  {
    id: 'cust-1',
    fullName: 'Muhammad Bilal',
    phone: '03001234567',
    walletBalance: 250000,
    _count: { deals: 1, receipts: 1 },
  },
  {
    id: 'cust-2',
    fullName: 'Zain Tariq',
    phone: '03219876543',
    walletBalance: 0,
    _count: { deals: 1, receipts: 0 },
  },
];

const mockDeals = [
  {
    id: 'deal-sale-1',
    customerId: 'cust-1',
    projectId: null,
    dealType: 'WADAAN_SALE',
    totalValue: 5000000,
    commissionAmount: null,
    createdAt: '2026-09-01T10:00:00.000Z',
    pendingBalance: 2000000,
    customer: mockCustomers[0],
    project: null,
    invoices: [
      {
        id: 'inv-1',
        dealId: 'deal-sale-1',
        description: 'Advance Token',
        amount: 3000000,
        dueDate: '2026-09-01T00:00:00.000Z',
        paymentStatus: 'PAID',
      },
      {
        id: 'inv-2',
        dealId: 'deal-sale-1',
        description: 'Remaining Installment',
        amount: 2000000,
        dueDate: '2026-10-01T00:00:00.000Z',
        paymentStatus: 'UNPAID',
      },
    ],
  },
  {
    id: 'deal-const-1',
    customerId: 'cust-2',
    projectId: 'proj-1',
    dealType: 'CONSTRUCTION',
    totalValue: 12000000,
    commissionAmount: null,
    createdAt: '2026-09-05T10:00:00.000Z',
    pendingBalance: 12000000,
    customer: mockCustomers[1],
    project: {
      id: 'proj-1',
      name: 'Wadaan Residency',
      code: 'WRES',
      status: 'ACTIVE',
      masterBOQ: 10000000,
      spentToDate: 4000000,
    },
    invoices: [
      {
        id: 'inv-3',
        dealId: 'deal-const-1',
        description: 'Foundation Stage',
        amount: 4000000,
        dueDate: '2026-09-15T00:00:00.000Z',
        paymentStatus: 'UNPAID',
      },
      {
        id: 'inv-4',
        dealId: 'deal-const-1',
        description: 'Grey Structure Stage',
        amount: 8000000,
        dueDate: '2026-12-01T00:00:00.000Z',
        paymentStatus: 'UNPAID',
      },
    ],
  },
];

const mockCustomerDetail = {
  ...mockCustomers[0],
  deals: [mockDeals[0]],
  receipts: [
    {
      id: 'rcpt-1',
      customerId: 'cust-1',
      amount: 3000000,
      paymentMethod: 'CASH',
      bankRefNumber: null,
      clearanceStatus: 'CLEARED',
      receiptDate: '2026-09-01T10:00:00.000Z',
      customer: mockCustomers[0],
      invoices: [mockDeals[0].invoices[0]],
    },
  ],
};

// Mock the feature hooks
vi.mock('@/features/deals/hooks/useDeals', () => ({
  useDeals: () => ({
    data: mockDeals,
    isLoading: false,
    isError: false,
    refetch: mockRefetchDeals,
  }),
  useDeal: (id: string) => ({
    data: mockDeals.find((d) => d.id === id) || mockDeals[0],
    isLoading: false,
  }),
  useCreateDeal: () => ({
    mutateAsync: mockCreateDealMutate,
    isPending: false,
  }),
  useTransferFile: () => ({
    mutateAsync: mockTransferFileMutate,
    isPending: false,
  }),
}));

vi.mock('@/features/customers/hooks/useCustomers', () => ({
  useCustomers: () => ({
    data: mockCustomers,
    isLoading: false,
    refetch: mockRefetchCustomers,
  }),
  useCustomer: (id: string | null) => ({
    data: id === 'cust-1' ? mockCustomerDetail : mockCustomers.find((c) => c.id === id) || null,
    isLoading: false,
    isError: false,
  }),
  useCreateCustomer: () => ({
    mutateAsync: mockCreateCustomerMutate,
    isPending: false,
  }),
  useApplyCustomerWallet: () => ({
    mutateAsync: mockApplyWalletMutate,
    isPending: false,
  }),
}));

vi.mock('@/features/projects/hooks/useProjects', () => ({
  useProjects: () => ({
    data: [
      {
        id: 'proj-1',
        projectName: 'Wadaan Residency',
        projectPrefix: 'WRES',
        status: 'ACTIVE',
        masterBOQ: 10000000,
      },
    ],
    isLoading: false,
  }),
}));

describe('Screen 8: Deal Hub & Customer Portfolio (DealHubPage)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. renders Screen 8 header title and primary "+ New Deal" button', () => {
    render(<DealHubPage />);

    expect(screen.getByTestId('screen8-title')).toHaveTextContent('Deal Hub & Customers');
    expect(screen.getByTestId('btn-new-deal')).toBeInTheDocument();
  });

  it('2. DealKPIStrip calculates and renders Active Receivables and Mobilization Advances', () => {
    render(<DealHubPage />);

    // Total pending balance = 2,000,000 + 12,000,000 = 14,000,000
    expect(screen.getByTestId('kpi-active-receivables')).toHaveTextContent(/14,000,000/);
    // Total wallet balance = 250,000
    expect(screen.getByTestId('kpi-advance-mobilization')).toHaveTextContent(/250,000/);
    // Construction volume = 12,000,000
    expect(screen.getByTestId('kpi-construction-volume')).toHaveTextContent(/12,000,000/);
  });

  it('3. Master Deal Table displays deal rows with customer name, type badge, and values', () => {
    render(<DealHubPage />);

    const saleRow = screen.getByTestId('deal-row-deal-sale-1');
    const constRow = screen.getByTestId('deal-row-deal-const-1');

    expect(saleRow).toBeInTheDocument();
    expect(constRow).toBeInTheDocument();

    expect(screen.getByText('Muhammad Bilal')).toBeInTheDocument();
    expect(screen.getByText('Zain Tariq')).toBeInTheDocument();
    expect(screen.getByText('Wadaan Sale')).toBeInTheDocument();
    expect(within(constRow).getByText('Construction')).toBeInTheDocument();
  });

  it('4. filters deals table when typing into the search box', () => {
    render(<DealHubPage />);

    const searchInput = screen.getByTestId('deal-search-input');
    fireEvent.change(searchInput, { target: { value: 'Bilal' } });

    expect(screen.getByTestId('deal-row-deal-sale-1')).toBeInTheDocument();
    expect(screen.queryByTestId('deal-row-deal-const-1')).not.toBeInTheDocument();
  });

  it('5. filters deals table by route filter pills (Construction only)', () => {
    render(<DealHubPage />);

    const constructionPill = screen.getByRole('button', { name: 'Construction' });
    fireEvent.click(constructionPill);

    expect(screen.queryByTestId('deal-row-deal-sale-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('deal-row-deal-const-1')).toBeInTheDocument();
  });

  it('6. clicking "Khaata" action button opens CustomerKhaataDrawer', () => {
    render(<DealHubPage />);

    const khaataBtn = screen.getByTestId('btn-khaata-deal-sale-1');
    fireEvent.click(khaataBtn);

    expect(screen.getByTestId('customer-khaata-drawer')).toBeInTheDocument();
    expect(screen.getByText('Mobilization Advance Wallet')).toBeInTheDocument();
  });

  it('7. CustomerKhaataDrawer applies advance wallet balance against unpaid installment', async () => {
    mockApplyWalletMutate.mockResolvedValueOnce({ success: true });
    render(<DealHubPage />);

    // Open drawer for cust-1
    fireEvent.click(screen.getByTestId('btn-khaata-deal-sale-1'));

    expect(screen.getByText(/Apply Advance to Unpaid Installment/i)).toBeInTheDocument();

    // Fill invoice and submit
    const invoiceSelect = screen.getByRole('combobox');
    fireEvent.change(invoiceSelect, { target: { value: 'inv-2' } });

    const applyBtn = screen.getByRole('button', { name: 'Apply' });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(mockApplyWalletMutate).toHaveBeenCalledWith({
        customerId: 'cust-1',
        payload: {
          invoiceId: 'inv-2',
          amount: 250000,
        },
      });
    });
  });

  it('8. clicking "+ New Deal" opens CreateDealModal wizard', () => {
    render(<DealHubPage />);

    fireEvent.click(screen.getByTestId('btn-new-deal'));
    expect(screen.getByTestId('create-deal-modal')).toBeInTheDocument();
    expect(screen.getByText('Select Customer / Client')).toBeInTheDocument();
  });

  it('9. CreateDealModal enforces zero-sum math: blocks submission if milestones sum does not equal totalValue', async () => {
    render(<DealHubPage />);

    fireEvent.click(screen.getByTestId('btn-new-deal'));

    // Step 1: select customer
    const clientSelect = screen.getByRole('combobox');
    fireEvent.change(clientSelect, { target: { value: 'cust-1' } });

    const continueBtn1 = screen.getByRole('button', { name: /Continue/i });
    fireEvent.click(continueBtn1);

    // Step 2: enter totalValue 5,000,000
    const totalInput = screen.getByPlaceholderText('e.g. 5000000');
    fireEvent.change(totalInput, { target: { value: '5000000' } });

    const continueBtn2 = screen.getByRole('button', { name: /Continue/i });
    fireEvent.click(continueBtn2);

    // Step 3: milestones initial amount is empty, so schedule is not balanced
    const initBtn = screen.getByRole('button', { name: /Initialize Deal Contract/i });
    expect(initBtn).toBeDisabled();

    // Match lump sum
    const lumpSumBtn = screen.getByRole('button', { name: 'Single Lump Sum' });
    fireEvent.click(lumpSumBtn);

    // Now it matches perfectly
    expect(screen.getByText(/✓ PERFECT MATCH/i)).toBeInTheDocument();
    expect(initBtn).not.toBeDisabled();
  });

  it('10. clicking "Transfer" opens TransferFileModal and executes file transfer', async () => {
    mockTransferFileMutate.mockResolvedValueOnce({ success: true });
    render(<DealHubPage />);

    const transferBtn = screen.getByTestId('btn-transfer-deal-sale-1');
    fireEvent.click(transferBtn);

    expect(screen.getByText('Transfer File Ownership')).toBeInTheDocument();

    // Select receiving customer
    const selectCustomer = screen.getByRole('combobox');
    fireEvent.change(selectCustomer, { target: { value: 'cust-2' } });

    // Submit transfer
    const submitBtn = screen.getByRole('button', { name: 'Execute File Transfer' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockTransferFileMutate).toHaveBeenCalledWith({
        dealId: 'deal-sale-1',
        payload: {
          newCustomerId: 'cust-2',
          transferFeeAmount: 0,
        },
      });
    });
  });

  it('11. DealTable and DealKPIStrip render safely through loading and loaded state transitions without hook errors', () => {
    // Test DealTable loading -> loaded transition
    const { rerender } = render(
      <DealTable deals={mockDeals as any} onSelectCustomer={vi.fn()} onTransferDeal={vi.fn()} isLoading={true} />
    );
    expect(screen.queryByTestId('deal-table-container')).not.toBeInTheDocument();

    // Rerender as loaded
    rerender(
      <DealTable deals={mockDeals as any} onSelectCustomer={vi.fn()} onTransferDeal={vi.fn()} isLoading={false} />
    );
    expect(screen.getByTestId('deal-table-container')).toBeInTheDocument();

    // Test DealKPIStrip loading -> loaded transition
    const { rerender: rerenderKPI } = render(
      <DealKPIStrip deals={mockDeals as any} customers={mockCustomers as any} isLoading={true} />
    );

    rerenderKPI(
      <DealKPIStrip deals={mockDeals as any} customers={mockCustomers as any} isLoading={false} />
    );
    expect(screen.getByTestId('deal-kpi-strip')).toBeInTheDocument();
  });

  it('12. CreateDealModal resets form fields when reopened after being closed or initialized', () => {
    const mockClose = vi.fn();
    const { rerender } = render(
      <CreateDealModal customers={mockCustomers as any} isOpen={true} onClose={mockClose} />
    );

    // Select customer cust-1
    const customerSelect = screen.getByRole('combobox');
    fireEvent.change(customerSelect, { target: { value: 'cust-1' } });
    expect((customerSelect as HTMLSelectElement).value).toBe('cust-1');

    // Click Continue to go to Step 2
    const continueBtn = screen.getByRole('button', { name: /Continue/i });
    fireEvent.click(continueBtn);

    // Enter totalValue
    const totalInput = screen.getByPlaceholderText('e.g. 5000000');
    fireEvent.change(totalInput, { target: { value: '6000000' } });
    expect((totalInput as HTMLInputElement).value).toBe('6000000');

    // Close the modal
    rerender(
      <CreateDealModal customers={mockCustomers as any} isOpen={false} onClose={mockClose} />
    );
    expect(screen.queryByTestId('create-deal-modal')).not.toBeInTheDocument();

    // Reopen the modal
    rerender(
      <CreateDealModal customers={mockCustomers as any} isOpen={true} onClose={mockClose} />
    );

    // Expect to be back on Step 1 with empty selection
    expect(screen.getByText('Select Customer / Client')).toBeInTheDocument();
    const reopenedSelect = screen.getByRole('combobox');
    expect((reopenedSelect as HTMLSelectElement).value).toBe('');
  });
});
