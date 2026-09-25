import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AccountLedgerPanel } from './AccountLedgerPanel';

// Mock useAccountLedger
const mockUseAccountLedger = vi.fn();
vi.mock('@/features/reports/hooks/useReports', () => ({
  useAccountLedger: (id?: string, start?: string, end?: string) => mockUseAccountLedger(id, start, end),
}));

describe('AccountLedgerPanel Component', () => {
  const mockAccount = {
    accountId: 'uuid-1',
    accountCode: '1010-01',
    accountName: 'Office Safe',
    category: 'ASSET' as any,
    debit: '1000',
    credit: '0'
  };

  const mockLedgerData = {
    openingBalance: 500,
    closingBalance: 1000,
    totalDebits: 500,
    totalCredits: 0,
    transactions: [
      {
        id: 'tx-1',
        entryDate: '2026-09-01T00:00:00.000Z',
        entryNumber: 'JE-001',
        description: 'Test transaction',
        debitAmount: '500',
        creditAmount: '0',
        runningBalance: 1000
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAccountLedger.mockReturnValue({
      data: mockLedgerData,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    
    // Mock window.print
    window.print = vi.fn();
  });

  it('1. renders without crashing when given an account', () => {
    render(<AccountLedgerPanel account={mockAccount} onClose={vi.fn()} />);
    expect(screen.getAllByText('1010-01')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Office Safe')[0]).toBeInTheDocument();
  });

  it('2. contains a Print Export button that triggers window.print()', () => {
    render(<AccountLedgerPanel account={mockAccount} onClose={vi.fn()} />);
    
    const printBtn = screen.getByTitle('Print Export');
    expect(printBtn).toBeInTheDocument();
    
    fireEvent.click(printBtn);
    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it('3. has print-specific CSS classes for proper PDF/Paper generation', () => {
    render(<AccountLedgerPanel account={mockAccount} onClose={vi.fn()} />);
    
    // Header should be no-print
    const printBtn = screen.getByTitle('Print Export');
    const headerContainer = printBtn.closest('.no-print');
    expect(headerContainer).toBeInTheDocument();

    // Print-only letterhead should exist
    const letterhead = screen.getByText('Wadaan Real Estate & Builders (Pvt) Ltd.');
    const letterheadContainer = letterhead.closest('.print-only');
    expect(letterheadContainer).toBeInTheDocument();
  });
});
