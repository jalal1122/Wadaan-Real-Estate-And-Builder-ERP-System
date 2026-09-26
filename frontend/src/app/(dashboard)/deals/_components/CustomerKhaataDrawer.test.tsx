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

  it('highlights overdue installment milestones with bright red styling and Overdue badge', () => {
    mockCustomerData = {
      id: 'cust-1',
      fullName: 'Chaudhry Aslam',
      phone: '0300-5554433',
      walletBalance: 0,
      deals: [
        {
          id: 'deal-overdue-1',
          dealType: 'BROKERAGE',
          totalValue: 20000000,
          pendingBalance: 20000000,
          createdAt: '2026-09-20T00:00:00Z',
          invoices: [
            {
              id: 'inv-past-due',
              description: 'Full Contract Lump Sum',
              amount: 20000000,
              dueDate: '2026-09-20T00:00:00Z',
              paymentStatus: 'UNPAID',
            },
          ],
        },
      ],
      receipts: [],
    };

    render(<CustomerKhaataDrawer customerId="cust-1" onClose={vi.fn()} />);

    // Verify the milestone container has red alert background
    const milestoneItem = screen.getByTestId('milestone-item-inv-past-due');
    expect(milestoneItem).toBeInTheDocument();
    expect(milestoneItem.className).toContain('bg-red-50');

    // Verify Overdue badge and text
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText(/Due: 20 Sept 2026/i)).toBeInTheDocument();
  });
});
