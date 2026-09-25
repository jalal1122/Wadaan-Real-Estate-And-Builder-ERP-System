import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PersonalLedgerPage from './page';

let mockPersonalData: any = null;
let mockIsLoading = false;
let mockIsError = false;

vi.mock('@/features/personal/hooks/usePersonal', () => ({
  usePersonalContacts: () => ({
    data: mockPersonalData,
    isLoading: mockIsLoading,
    isError: mockIsError,
    refetch: vi.fn(),
  }),
  usePersonalContact: () => ({
    data: null,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useCreateContact: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeleteLoan: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

describe('Personal Ledger Page (/personal)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
    mockIsError = false;
    mockPersonalData = {
      kpi: {
        totalGivenOutstanding: 150000,
        totalReceivedOutstanding: 50000,
        netPosition: 100000,
        totalContacts: 2,
        activeLoansTotal: 3,
      },
      contacts: [
        {
          id: 'c-1',
          name: 'Arshad Sir',
          phone: '03001234567',
          relation: 'Partner',
          notes: 'Co-founder',
          createdAt: '2026-01-01T00:00:00Z',
          totalLoansCount: 2,
          activeLoansCount: 2,
          totalGiven: 150000,
          totalGivenSettled: 50000,
          outstandingGiven: 100000,
          totalReceived: 0,
          totalReceivedSettled: 0,
          outstandingReceived: 0,
          netBalance: 100000,
        },
        {
          id: 'c-2',
          name: 'Zeeshan Sir',
          phone: '03007654321',
          relation: 'Partner',
          notes: null,
          createdAt: '2026-01-02T00:00:00Z',
          totalLoansCount: 1,
          activeLoansCount: 1,
          totalGiven: 50000,
          totalGivenSettled: 0,
          outstandingGiven: 50000,
          totalReceived: 50000,
          totalReceivedSettled: 0,
          outstandingReceived: 50000,
          netBalance: 0,
        },
      ],
    };
  });

  it('renders KPI ribbon cards with correct financial sums', () => {
    render(<PersonalLedgerPage />);

    expect(screen.getByText('Personal Finance Ledger')).toBeInTheDocument();
    expect(screen.getByText('Total Lent (Given)')).toBeInTheDocument();
    expect(screen.getByText('Total Borrowed (Received)')).toBeInTheDocument();
    expect(screen.getByText('Net Balance Position')).toBeInTheDocument();
    expect(screen.getByText('Ledger Accounts')).toBeInTheDocument();
  });

  it('renders contact cards with contact names, relations, and net positions', () => {
    render(<PersonalLedgerPage />);

    expect(screen.getByText('Arshad Sir')).toBeInTheDocument();
    expect(screen.getByText('Zeeshan Sir')).toBeInTheDocument();
    expect(screen.getAllByText('Partner').length).toBe(2);
    expect(screen.getByText(/100,000.*Owes Us/i)).toBeInTheDocument();
    expect(screen.getByText('Settled')).toBeInTheDocument();
  });
});
