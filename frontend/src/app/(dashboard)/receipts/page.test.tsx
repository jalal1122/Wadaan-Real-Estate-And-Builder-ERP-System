import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import ReceiptsPage from './page';

// Mock mutations and hooks
const mockLogReceiptMutate = vi.fn();
const mockClearChequeMutate = vi.fn();
const mockBounceChequeMutate = vi.fn();
const mockRefetchWaitingRoom = vi.fn();

const mockCustomers = [
  {
    id: 'cust-1',
    fullName: 'Muhammad Bilal',
    phone: '03001234567',
    walletBalance: 150000,
  },
  {
    id: 'cust-2',
    fullName: 'Tariq Mehmood',
    phone: '03217654321',
    walletBalance: 0,
  },
];

const mockCustomerDetail = {
  ...mockCustomers[0],
  deals: [
    {
      id: 'deal-1',
      dealType: 'WADAAN_SALE',
      invoices: [
        {
          id: 'inv-1',
          description: 'Down Payment Milestone',
          amount: 500000,
          dueDate: '2026-09-20T00:00:00.000Z',
          paymentStatus: 'UNPAID',
        },
        {
          id: 'inv-2',
          description: 'Milestone 2',
          amount: 500000,
          dueDate: '2026-10-20T00:00:00.000Z',
          paymentStatus: 'UNPAID',
        },
      ],
    },
  ],
};

const mockAccounts = [
  {
    id: 'acc-safe',
    accountCode: '1001',
    accountName: 'Office Cash Safe',
    category: 'ASSET',
    balance: '1200000',
    isArchived: false,
  },
  {
    id: 'acc-meezan',
    accountCode: '1010',
    accountName: 'Meezan Bank - Main Ops',
    category: 'ASSET',
    balance: '8500000',
    isArchived: false,
  },
  {
    id: 'acc-hbl',
    accountCode: '1011',
    accountName: 'HBL - Corporate',
    category: 'ASSET',
    balance: '4300000',
    isArchived: false,
  },
];

const mockWaitingRoom = [
  {
    id: 'rcpt-pending-1',
    customerId: 'cust-2',
    amount: 750000,
    paymentMethod: 'CHEQUE',
    bankRefNumber: 'CHQ-554433',
    clearanceStatus: 'PENDING',
    receiptDate: '2026-09-18T10:00:00.000Z',
    customer: mockCustomers[1],
    invoices: [
      {
        id: 'inv-3',
        description: 'Booking Advance',
        amount: 750000,
      },
    ],
  },
];

// Mock the feature hooks
vi.mock('@/features/receipts/hooks/useReceipts', () => ({
  useWaitingRoom: () => ({
    data: mockWaitingRoom,
    isLoading: false,
    isFetching: false,
    refetch: mockRefetchWaitingRoom,
  }),
  useLogReceipt: () => ({
    mutateAsync: mockLogReceiptMutate,
    isPending: false,
  }),
  useClearCheque: () => ({
    mutateAsync: mockClearChequeMutate,
    isPending: false,
  }),
  useBounceCheque: () => ({
    mutateAsync: mockBounceChequeMutate,
    isPending: false,
  }),
}));

vi.mock('@/features/customers/hooks/useCustomers', () => ({
  useCustomers: () => ({
    data: mockCustomers,
    isLoading: false,
  }),
  useCustomer: (id: string | null) => ({
    data: id === 'cust-1' ? mockCustomerDetail : null,
    isLoading: false,
  }),
  useCreateCustomer: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/features/accounting/hooks/useAccounting', () => ({
  useChartOfAccounts: () => ({
    data: {
      accounts: mockAccounts,
    },
    isLoading: false,
  }),
}));

describe('Screen 9: Cash & Cheque Gateway (ReceiptsPage)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. renders Screen 9 header title and refresh button', () => {
    render(<ReceiptsPage />);

    expect(screen.getByTestId('screen9-title')).toHaveTextContent('Cash & Cheque Gateway');
    expect(screen.getByTestId('refresh-receipts-btn')).toBeInTheDocument();
  });

  it('2. FastInflowForm loads customers list into client dropdown', () => {
    render(<ReceiptsPage />);

    const select = screen.getByTestId('customer-select');
    expect(select).toBeInTheDocument();
    expect(within(select).getByText(/Muhammad Bilal/i)).toBeInTheDocument();
    expect(within(select).getByText(/Tariq Mehmood/i)).toBeInTheDocument();
  });

  it('3. selecting customer populates their unpaid invoices and displays advance wallet total', () => {
    render(<ReceiptsPage />);

    const select = screen.getByTestId('customer-select');
    fireEvent.change(select, { target: { value: 'cust-1' } });

    expect(screen.getByText(/Target Installment Invoices/i)).toBeInTheDocument();
    expect(screen.getByText('Down Payment Milestone')).toBeInTheDocument();
    expect(screen.getByText('Milestone 2')).toBeInTheDocument();
  });

  it('4. toggling invoices updates amount to match selected total', () => {
    render(<ReceiptsPage />);

    const select = screen.getByTestId('customer-select');
    fireEvent.change(select, { target: { value: 'cust-1' } });

    // Select first invoice checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    const amountInput = screen.getByTestId('amount-input') as HTMLInputElement;
    expect(amountInput.value).toBe('500000');
  });

  it('5. payment method CASH displays default Safe Inflow and does not require bank ref', () => {
    render(<ReceiptsPage />);

    const cashBtn = screen.getByTestId('method-cash-btn');
    fireEvent.click(cashBtn);

    expect(screen.queryByTestId('bank-ref-input')).not.toBeInTheDocument();
  });

  it('6. payment method CHEQUE enforces Cheque / Leaf Number and displays Escrow Waiting Room rule', () => {
    render(<ReceiptsPage />);

    const chequeBtn = screen.getByTestId('method-cheque-btn');
    fireEvent.click(chequeBtn);

    expect(screen.getByTestId('bank-ref-input')).toBeInTheDocument();
    expect(screen.getByText(/Cheque Waiting Room Rule:/i)).toBeInTheDocument();
  });

  it('7. payment method ONLINE enforces Bank Transfer / UTR Ref input', () => {
    render(<ReceiptsPage />);

    const onlineBtn = screen.getByTestId('method-online-btn');
    fireEvent.click(onlineBtn);

    const refInput = screen.getByTestId('bank-ref-input');
    expect(refInput).toBeInTheDocument();
    expect(screen.getByText(/Bank Transfer \/ UTR Ref \*/i)).toBeInTheDocument();
  });

  it('8. submitting valid cash receipt triggers logReceipt mutation and displays print button', async () => {
    mockLogReceiptMutate.mockResolvedValueOnce({
      receipt: {
        id: 'rcpt-new-1',
        amount: 500000,
        paymentMethod: 'CASH',
        clearanceStatus: 'CLEARED',
      },
      walletAdvanceCredited: 0,
    });

    render(<ReceiptsPage />);

    // Select customer
    fireEvent.change(screen.getByTestId('customer-select'), { target: { value: 'cust-1' } });

    // Set amount
    fireEvent.change(screen.getByTestId('amount-input'), { target: { value: '500000' } });

    // Submit
    fireEvent.click(screen.getByTestId('submit-receipt-btn'));

    await waitFor(() => {
      expect(mockLogReceiptMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'cust-1',
          amount: 500000,
          paymentMethod: 'CASH',
        })
      );
    });

    expect(await screen.findByTestId('print-receipt-btn')).toBeInTheDocument();
  });

  it('9. WaitingRoomTable displays uncleared cheques with ref, drawer, amount, and PENDING badge', () => {
    render(<ReceiptsPage />);

    const row = screen.getByTestId('waiting-room-row-rcpt-pending-1');
    expect(row).toBeInTheDocument();

    expect(within(row).getByText('CHQ-554433')).toBeInTheDocument();
    expect(within(row).getByText('Tariq Mehmood')).toBeInTheDocument();
    expect(within(row).getAllByText(/750,000/).length).toBeGreaterThan(0);
    expect(within(row).getByText('PENDING')).toBeInTheDocument();
  });

  it('10. clicking "Clear" in WaitingRoomTable opens ClearanceModal, selects bank, and confirms settlement', async () => {
    mockClearChequeMutate.mockResolvedValueOnce({ success: true });

    render(<ReceiptsPage />);

    // Click Clear button
    fireEvent.click(screen.getByTestId('btn-clear-rcpt-pending-1'));

    expect(screen.getByTestId('clearance-modal')).toBeInTheDocument();
    expect(screen.getByText('Clear Escrow Cheque')).toBeInTheDocument();

    // Select depository bank account
    const bankSelect = screen.getByTestId('target-bank-account-select');
    fireEvent.change(bankSelect, { target: { value: 'acc-meezan' } });

    // Confirm clearance
    fireEvent.click(screen.getByTestId('confirm-clear-cheque-btn'));

    await waitFor(() => {
      expect(mockClearChequeMutate).toHaveBeenCalledWith({
        id: 'rcpt-pending-1',
        payload: {
          targetBankAccountId: 'acc-meezan',
        },
      });
    });
  });
});
