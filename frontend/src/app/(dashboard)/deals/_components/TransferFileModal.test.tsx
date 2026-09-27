import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TransferFileModal } from './TransferFileModal';

const mockTransferMutateAsync = vi.fn();
let mockTransferIsPending = false;
const mockCreateCustomerMutateAsync = vi.fn();
let mockCreateCustomerIsPending = false;

vi.mock('@/features/deals/hooks/useDeals', () => ({
  useTransferFile: () => ({
    mutateAsync: mockTransferMutateAsync,
    isPending: mockTransferIsPending,
  }),
}));

vi.mock('@/features/customers/hooks/useCustomers', () => ({
  useCreateCustomer: () => ({
    mutateAsync: mockCreateCustomerMutateAsync,
    isPending: mockCreateCustomerIsPending,
  }),
}));

describe('TransferFileModal Component', () => {
  const mockDeal = {
    id: 'deal-sale-999',
    customerId: 'cust-tariq',
    projectId: 'proj-wh',
    dealType: 'WADAAN_SALE' as const,
    totalValue: 12000000,
    pendingBalance: 4000000,
    customer: {
      id: 'cust-tariq',
      fullName: 'Tariq Current Owner',
      phone: '03001111111',
      walletBalance: 0,
    },
    invoices: [],
  };

  const mockCustomers = [
    { id: 'cust-tariq', fullName: 'Tariq Current Owner', phone: '03001111111', walletBalance: 0 },
    { id: 'cust-aslam', fullName: 'Chaudri Aslam', phone: '03002222222', walletBalance: 0 },
    { id: 'cust-zeeshan', fullName: 'Zeeshan Buyer', phone: '03003333333', walletBalance: 50000 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockTransferIsPending = false;
    mockCreateCustomerIsPending = false;
  });

  it('1. returns null and does not render when deal is null', () => {
    const { container } = render(
      <TransferFileModal deal={null} customers={mockCustomers} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('2. renders deal details and excludes current owner from target client dropdown', () => {
    render(
      <TransferFileModal deal={mockDeal as any} customers={mockCustomers} onClose={vi.fn()} />
    );

    expect(screen.getByText('Transfer File Ownership')).toBeInTheDocument();
    expect(screen.getByText('Tariq Current Owner')).toBeInTheDocument();

    const options = screen.getAllByRole('option');
    // 1 default placeholder + 2 eligible customers (excluding cust-tariq)
    expect(options).toHaveLength(3);
    const optionValues = options.map((opt) => (opt as HTMLOptionElement).value);
    expect(optionValues).not.toContain('cust-tariq');
    expect(optionValues).toContain('cust-aslam');
    expect(optionValues).toContain('cust-zeeshan');
  });

  it('3. shows validation error when submitting without selecting a new client', async () => {
    render(
      <TransferFileModal deal={mockDeal as any} customers={mockCustomers} onClose={vi.fn()} />
    );

    const submitBtn = screen.getByRole('button', { name: 'Execute File Transfer' });
    fireEvent.submit(submitBtn.closest('form')!);

    expect(screen.getByText('Please select the receiving client.')).toBeInTheDocument();
    expect(mockTransferMutateAsync).not.toHaveBeenCalled();
  });

  it('4. shows validation error when entering a negative transfer fee', async () => {
    render(
      <TransferFileModal deal={mockDeal as any} customers={mockCustomers} onClose={vi.fn()} />
    );

    // Select customer
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'cust-aslam' } });

    // Enter negative fee
    const feeInput = screen.getByPlaceholderText('0');
    fireEvent.change(feeInput, { target: { value: '-5000' } });

    const submitBtn = screen.getByRole('button', { name: 'Execute File Transfer' });
    fireEvent.submit(submitBtn.closest('form')!);

    expect(screen.getByText('Transfer fee must be a valid non-negative number.')).toBeInTheDocument();
    expect(mockTransferMutateAsync).not.toHaveBeenCalled();
  });

  it('5. successfully executes file transfer with fee and calls onSuccess and onClose', async () => {
    mockTransferMutateAsync.mockResolvedValueOnce({ success: true });
    const mockOnClose = vi.fn();
    const mockOnSuccess = vi.fn();

    render(
      <TransferFileModal
        deal={mockDeal as any}
        customers={mockCustomers}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Select receiving client
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'cust-aslam' } });

    // Set custom fee
    const feeInput = screen.getByPlaceholderText('0');
    fireEvent.change(feeInput, { target: { value: '75000' } });

    const submitBtn = screen.getByRole('button', { name: 'Execute File Transfer' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockTransferMutateAsync).toHaveBeenCalledWith({
        dealId: 'deal-sale-999',
        payload: {
          newCustomerId: 'cust-aslam',
          transferFeeAmount: 75000,
        },
      });
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('6. displays server error message when transfer mutation fails', async () => {
    mockTransferMutateAsync.mockRejectedValueOnce({
      response: { data: { message: 'Cannot transfer file while cheque clearance is pending.' } },
    });

    render(
      <TransferFileModal deal={mockDeal as any} customers={mockCustomers} onClose={vi.fn()} />
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'cust-aslam' } });

    const submitBtn = screen.getByRole('button', { name: 'Execute File Transfer' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText('Cannot transfer file while cheque clearance is pending.')
      ).toBeInTheDocument();
    });
  });

  it('7. allows creating a new customer inline via quick-add flow', async () => {
    mockCreateCustomerMutateAsync.mockResolvedValueOnce({
      id: 'cust-brand-new',
      fullName: 'Brand New Client',
      phone: '03007777777',
    });

    render(
      <TransferFileModal deal={mockDeal as any} customers={mockCustomers} onClose={vi.fn()} />
    );

    // Toggle quick add customer
    const newClientToggle = screen.getByRole('button', { name: /New Client/i });
    fireEvent.click(newClientToggle);

    expect(screen.getByPlaceholderText('Full Name *')).toBeInTheDocument();

    // Fill form
    fireEvent.change(screen.getByPlaceholderText('Full Name *'), {
      target: { value: 'Brand New Client' },
    });
    fireEvent.change(screen.getByPlaceholderText('Phone Number (e.g. 03001234567) *'), {
      target: { value: '03007777777' },
    });

    const addBtn = screen.getByRole('button', { name: 'Save & Select Client' });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(mockCreateCustomerMutateAsync).toHaveBeenCalledWith({
        fullName: 'Brand New Client',
        phone: '03007777777',
      });
    });
  });
});
