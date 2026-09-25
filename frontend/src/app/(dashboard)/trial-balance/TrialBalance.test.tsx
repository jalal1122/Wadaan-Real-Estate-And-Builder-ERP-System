import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TrialBalancePage from './page';

// Mock navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/trial-balance',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Mock useTrialBalance & useAccountLedger
const mockUseTrialBalance = vi.fn();
const mockUseAccountLedger = vi.fn();
vi.mock('@/features/reports/hooks/useReports', () => ({
  useTrialBalance: (start?: string, end?: string) => mockUseTrialBalance(start, end),
  useAccountLedger: (id?: string, start?: string, end?: string) => mockUseAccountLedger(id, start, end),
}));

describe('TrialBalancePage Component', () => {
  const mockReportData = {
    period: { startDate: '2026-07-01T00:00:00.000Z', endDate: '2027-06-30T00:00:00.000Z' },
    accounts: [
      { accountCode: '1001', accountName: 'Meezan Bank', category: 'ASSET', debit: '250000.00', credit: '0.00' },
      { accountCode: '3001', accountName: 'Capital Account', category: 'EQUITY', debit: '0.00', credit: '250000.00' },
    ],
    grandTotalDebit: '250000.00',
    grandTotalCredit: '250000.00',
    isBalanced: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTrialBalance.mockReturnValue({
      data: mockReportData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('1. "This Month" preset updates date range sent to useTrialBalance', () => {
    render(<TrialBalancePage />);

    // Click "This Month" preset button
    const thisMonthBtn = screen.getByRole('button', { name: /This Month/i });
    fireEvent.click(thisMonthBtn);

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const expectedStart = new Date(y, m, 1).toISOString().split('T')[0];
    const expectedEnd = new Date(y, m + 1, 0).toISOString().split('T')[0];

    expect(mockUseTrialBalance).toHaveBeenCalledWith(expectedStart, expectedEnd);
  });

  it('2. Grand Total footer displays "Balances Match" pill when isBalanced is true', () => {
    mockUseTrialBalance.mockReturnValue({
      data: mockReportData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<TrialBalancePage />);

    expect(screen.getByText(/Balances Match — Books are perfectly balanced/i)).toBeInTheDocument();
    expect(screen.queryByText(/Out of Balance/i)).not.toBeInTheDocument();
  });

  it('3. Grand Total footer displays "Out of Balance" pill when isBalanced is false', () => {
    mockUseTrialBalance.mockReturnValue({
      data: {
        ...mockReportData,
        grandTotalDebit: '250000.00',
        grandTotalCredit: '240000.00',
        isBalanced: false,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<TrialBalancePage />);

    expect(screen.getByText(/Out of Balance — Difference:/i)).toBeInTheDocument();
    expect(screen.queryByText(/Balances Match/i)).not.toBeInTheDocument();
  });

  it('4. Filters accounts correctly using search input and handles empty states', () => {
    mockUseTrialBalance.mockReturnValue({
      data: mockReportData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<TrialBalancePage />);

    // Initial render shows both accounts
    expect(screen.getByText('Meezan Bank')).toBeInTheDocument();
    expect(screen.getByText('Capital Account')).toBeInTheDocument();

    // Type filter for "Meezan"
    const searchInput = screen.getByPlaceholderText(/Filter accounts by name or code/i);
    fireEvent.change(searchInput, { target: { value: 'Meezan' } });

    expect(screen.getByText('Meezan Bank')).toBeInTheDocument();
    expect(screen.queryByText('Capital Account')).not.toBeInTheDocument();

    // Search non-existent account
    fireEvent.change(searchInput, { target: { value: 'Nonexistent' } });
    expect(screen.getByText(/No accounts match "Nonexistent"/i)).toBeInTheDocument();
  });

  it('5. "Print Report" button triggers window.print()', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    render(<TrialBalancePage />);

    const printBtn = screen.getByRole('button', { name: /Print trial balance report/i });
    fireEvent.click(printBtn);

    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });

  it('6. Print-only letterhead contains company name and "Trial Balance" report title', () => {
    render(<TrialBalancePage />);

    const letterhead = screen.getByTestId('print-letterhead');
    expect(letterhead).toBeInTheDocument();
    expect(letterhead).toHaveTextContent(/Wadaan Real Estate & Builders \(Pvt\) Ltd\./i);
    expect(letterhead).toHaveTextContent(/Trial Balance/i);
    expect(letterhead).toHaveClass('print-only');
  });

  it('7. Print letterhead and table footer include Grand Total debits, credits, and balance indicator', () => {
    render(<TrialBalancePage />);

    // Top print header summary strip
    const summaryStrip = screen.getByTestId('print-grand-total-summary');
    expect(summaryStrip).toBeInTheDocument();
    expect(summaryStrip).toHaveTextContent(/Grand Total Debit/i);
    expect(summaryStrip).toHaveTextContent(/250,000/);
    expect(summaryStrip).toHaveTextContent(/Grand Total Credit/i);
    expect(summaryStrip).toHaveTextContent(/BALANCES MATCH/i);

    // Bottom table footer
    const tableFooter = screen.getByTestId('print-grand-total');
    expect(tableFooter).toBeInTheDocument();
    expect(tableFooter).toHaveTextContent(/Grand Total/i);
  });

  it('8. Clicking an account row opens AccountLedgerPanel drill-down', () => {
    mockUseAccountLedger.mockReturnValue({
      data: {
        account: {
          id: 'acc-1',
          accountCode: '1001',
          accountName: 'Meezan Bank',
          category: 'ASSET',
          isSystemLocked: false,
        },
        filter: { startDate: '2026-07-01', endDate: '2027-06-30' },
        openingBalance: '50000.00',
        closingBalance: '250000.00',
        totalDebits: '200000.00',
        totalCredits: '0.00',
        transactions: [
          {
            id: 'tx-1',
            journalId: 'j-1',
            entryNumber: 'JE-001',
            entryDate: '2026-07-02T10:00:00Z',
            description: 'Capital Inflow',
            debitAmount: '200000.00',
            creditAmount: '0.00',
            runningBalance: '250000.00',
          },
        ],
      },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(<TrialBalancePage />);

    // Click on Meezan Bank account row
    const row = screen.getByText('Meezan Bank').closest('tr');
    expect(row).toBeInTheDocument();
    fireEvent.click(row!);

    // Check that AccountLedgerPanel opened
    expect(screen.getByTestId('account-ledger-panel')).toBeInTheDocument();
    expect(screen.getByText('Capital Inflow')).toBeInTheDocument();
    expect(screen.getByText('JE-001')).toBeInTheDocument();

    // Close panel
    const closeBtn = screen.getByRole('button', { name: /Close Panel/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByTestId('account-ledger-panel')).not.toBeInTheDocument();
  });
});



