import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CustomerKhaataDrawer } from './CustomerKhaataDrawer';

let mockCustomerData: any = null;
let mockIsLoading = false;
let mockIsError = false;

vi.mock('@/features/customers/hooks/useCustomers', () => ({
  useCustomer: () => ({
    data: mockCustomerData,
    isLoading: mockIsLoading,
    isError: mockIsError,
  }),
  useApplyCustomerWallet: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

describe('CustomerKhaataDrawer Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
    mockIsError = false;
    mockCustomerData = {
      id: 'cust-1',
      fullName: 'Tariq Mehmood',
      phone: '0300-1122334',
      walletBalance: 0,
      deals: [],
      receipts: [],
    };
  });

  it('renders pulsing skeleton loader while loading financial ledger', () => {
    mockIsLoading = true;
    mockCustomerData = null;

    render(<CustomerKhaataDrawer customerId="cust-1" onClose={vi.fn()} />);

    expect(screen.getByTestId('khaata-skeleton-loader')).toBeInTheDocument();
  });

  it('renders Mobilization Advance Wallet card and zero-advance notice at zero balance', () => {
    render(<CustomerKhaataDrawer customerId="cust-1" onClose={vi.fn()} />);

    expect(screen.getByTestId('khaata-wallet-card')).toBeInTheDocument();
    expect(screen.getByTestId('zero-advance-notice')).toBeInTheDocument();
    expect(screen.getByText(/No advance balance/i)).toBeInTheDocument();
    expect(screen.queryByTestId('apply-advance-form')).toBeNull();
  });

  it('renders apply-advance form when customer has wallet balance and eligible installments', () => {
    mockCustomerData = {
      id: 'cust-1',
      fullName: 'Tariq Mehmood',
      phone: '0300-1122334',
      walletBalance: 1500000,
      deals: [
        {
          id: 'deal-1',
          dealType: 'CONSTRUCTION',
          totalValue: 5000000,
          pendingBalance: 2000000,
          createdAt: '2026-01-01T00:00:00Z',
          invoices: [
            {
              id: 'inv-1',
              description: 'Milestone 1',
              amount: 1000000,
              dueDate: '2026-02-01T00:00:00Z',
              paymentStatus: 'UNPAID',
            },
          ],
        },
      ],
      receipts: [],
    };

    render(<CustomerKhaataDrawer customerId="cust-1" onClose={vi.fn()} />);

    expect(screen.getByTestId('apply-advance-form')).toBeInTheDocument();
    expect(screen.queryByTestId('zero-advance-notice')).toBeNull();
  });
});
