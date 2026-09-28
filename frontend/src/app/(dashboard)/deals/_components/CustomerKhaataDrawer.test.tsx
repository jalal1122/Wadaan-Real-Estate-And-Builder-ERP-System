import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CustomerKhaataDrawer } from './CustomerKhaataDrawer';

let mockCustomerData: any = null;
let mockIsLoading = false;
let mockIsError = false;
const mockRemoveCoClientMutateAsync = vi.fn();
const mockRefetch = vi.fn();

vi.mock('@/features/customers/hooks/useCustomers', () => ({
  useCustomer: () => ({
    data: mockCustomerData,
    isLoading: mockIsLoading,
    isError: mockIsError,
    refetch: mockRefetch,
  }),
  useApplyCustomerWallet: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/features/deals/hooks/useDeals', () => ({
  useRemoveCoClient: () => ({
    mutateAsync: mockRemoveCoClientMutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/features/deals/_components/AddCoClientModal', () => ({
  AddCoClientModal: ({ isOpen, onClose, onSuccess }: any) =>
    isOpen ? (
      <div data-testid="mock-add-coclient-modal">
        <button
          onClick={() => {
            onSuccess?.();
            onClose();
          }}
          data-testid="mock-submit-add-coclient"
        >
          Submit
        </button>
        <button onClick={onClose} data-testid="mock-close-add-coclient">
          Close
        </button>
      </div>
    ) : null,
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

    const milestoneItem = screen.getByTestId('milestone-item-inv-past-due');
    expect(milestoneItem).toBeInTheDocument();
    expect(milestoneItem.className).toContain('bg-red-50');

    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText(/Due: 20 Sept 2026/i)).toBeInTheDocument();
  });

  it('renders co-clients panel with list of registered partners and Add Co-Client button', () => {
    mockCustomerData = {
      id: 'cust-1',
      fullName: 'Tariq Mehmood',
      phone: '0300-1122334',
      walletBalance: 0,
      deals: [
        {
          id: 'deal-primary-1',
          dealType: 'WADAAN_SALE',
          totalValue: 10000000,
          pendingBalance: 5000000,
          createdAt: '2026-01-01T00:00:00Z',
          isPrimary: true,
          invoices: [],
          coClients: [
            {
              id: 'dc-1',
              dealId: 'deal-primary-1',
              customerId: 'cust-partner-1',
              shareLabel: '50% Co-Investor',
              addedAt: '2026-01-02T00:00:00Z',
              customer: {
                id: 'cust-partner-1',
                fullName: 'Kamran Partner',
                phone: '0300-7776655',
              },
            },
          ],
        },
      ],
      receipts: [],
    };

    render(<CustomerKhaataDrawer customerId="cust-1" onClose={vi.fn()} />);

    expect(screen.getByTestId('deal-coclient-section-deal-primary-1')).toBeInTheDocument();
    expect(screen.getByText('Kamran Partner')).toBeInTheDocument();
    expect(screen.getByText('50% Co-Investor')).toBeInTheDocument();
    expect(screen.getByTestId('open-add-coclient-btn-deal-primary-1')).toBeInTheDocument();
  });

  it('opens AddCoClientModal when Add Co-Client button is clicked', () => {
    mockCustomerData = {
      id: 'cust-1',
      fullName: 'Tariq Mehmood',
      phone: '0300-1122334',
      walletBalance: 0,
      deals: [
        {
          id: 'deal-primary-1',
          dealType: 'WADAAN_SALE',
          totalValue: 10000000,
          pendingBalance: 5000000,
          createdAt: '2026-01-01T00:00:00Z',
          isPrimary: true,
          invoices: [],
          coClients: [],
        },
      ],
      receipts: [],
    };

    render(<CustomerKhaataDrawer customerId="cust-1" onClose={vi.fn()} />);

    expect(screen.queryByTestId('mock-add-coclient-modal')).toBeNull();

    fireEvent.click(screen.getByTestId('open-add-coclient-btn-deal-primary-1'));

    expect(screen.getByTestId('mock-add-coclient-modal')).toBeInTheDocument();
  });

  it('renders Co-Client Contract banner when viewing a deal where client is a co-buyer', () => {
    mockCustomerData = {
      id: 'cust-1',
      fullName: 'Tariq Mehmood',
      phone: '0300-1122334',
      walletBalance: 0,
      deals: [
        {
          id: 'deal-co-1',
          dealType: 'CONSTRUCTION',
          totalValue: 8000000,
          pendingBalance: 4000000,
          createdAt: '2026-01-01T00:00:00Z',
          isPrimary: false,
          shareLabel: '40% Partner',
          primaryCustomer: {
            id: 'cust-primary-owner',
            fullName: 'Malik Riaz',
            phone: '0300-9998877',
          },
          invoices: [],
          coClients: [],
        },
      ],
      receipts: [],
    };

    render(<CustomerKhaataDrawer customerId="cust-1" onClose={vi.fn()} />);

    expect(screen.getByTestId('coclient-contract-badge-deal-co-1')).toBeInTheDocument();
    expect(screen.getByText('Co-Client Contract')).toBeInTheDocument();
    expect(screen.getByText('40% Partner')).toBeInTheDocument();
    expect(screen.getByText(/Primary:/i)).toBeInTheDocument();
    expect(screen.getByText('Malik Riaz')).toBeInTheDocument();
  });

  it('displays payer attribution on milestone and receipts when paid by a co-client', () => {
    mockCustomerData = {
      id: 'cust-1',
      fullName: 'Tariq Mehmood',
      phone: '0300-1122334',
      walletBalance: 0,
      deals: [
        {
          id: 'deal-1',
          dealType: 'WADAAN_SALE',
          totalValue: 5000000,
          pendingBalance: 0,
          createdAt: '2026-01-01T00:00:00Z',
          invoices: [
            {
              id: 'inv-1',
              description: 'Booking Advance',
              amount: 2500000,
              dueDate: '2026-01-01T00:00:00Z',
              paymentStatus: 'PAID',
              receipt: {
                id: 'rcpt-1',
                customer: {
                  id: 'cust-coclient-99',
                  fullName: 'Zeeshan Co-Client',
                },
              },
            },
          ],
        },
      ],
      receipts: [
        {
          id: 'rcpt-1',
          amount: 2500000,
          paymentMethod: 'CASH',
          clearanceStatus: 'CLEARED',
          receiptDate: '2026-01-01T00:00:00Z',
          customer: {
            id: 'cust-coclient-99',
            fullName: 'Zeeshan Co-Client',
          },
        },
      ],
    };

    render(<CustomerKhaataDrawer customerId="cust-1" onClose={vi.fn()} />);

    expect(screen.getByText('Paid by: Zeeshan Co-Client')).toBeInTheDocument();
    expect(screen.getByText('• Paid by Zeeshan Co-Client')).toBeInTheDocument();
  });

  it('calls refetch when a co-client is successfully added via AddCoClientModal', () => {
    mockCustomerData = {
      id: 'cust-1',
      fullName: 'Tariq Mehmood',
      phone: '0300-1122334',
      walletBalance: 0,
      deals: [
        {
          id: 'deal-1',
          dealType: 'WADAAN_SALE',
          totalValue: 5000000,
          pendingBalance: 2000000,
          createdAt: '2026-01-01T00:00:00Z',
          invoices: [],
          coClients: [],
        },
      ],
      receipts: [],
    };

    render(<CustomerKhaataDrawer customerId="cust-1" onClose={vi.fn()} />);

    // Click Add Co-Client button
    fireEvent.click(screen.getByTestId('open-add-coclient-btn-deal-1'));
    expect(screen.getByTestId('mock-add-coclient-modal')).toBeInTheDocument();

    // Trigger modal submit
    fireEvent.click(screen.getByTestId('mock-submit-add-coclient'));

    // refetch must be called so drawer immediately updates
    expect(mockRefetch).toHaveBeenCalled();
  });
});

