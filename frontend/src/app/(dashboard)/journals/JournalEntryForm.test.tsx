import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import JournalsPage from './page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/journals',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Mock hooks
const mockPostJournal = vi.fn();
let mockIsPending = false;

const mockAccounts = [
  { id: 'acc-cash', accountCode: '1001', accountName: 'Cash in Bank', category: 'ASSET', isSystemLocked: false, isArchived: false },
  { id: 'acc-eq', accountCode: '3001', accountName: 'Owner Equity', category: 'EQUITY', isSystemLocked: false, isArchived: false },
  { id: 'acc-locked', accountCode: '2100', accountName: 'Accounts Payable', category: 'LIABILITY', isSystemLocked: true, isArchived: false },
  { id: 'acc-archived', accountCode: '5999', accountName: 'Old Expense', category: 'EXPENSE', isSystemLocked: false, isArchived: true },
];

const mockCustomers = [
  { id: 'cust-1', label: 'Tariq Mehmood (Customer)', type: 'customer' },
];

const mockVendors = [
  { id: 'vend-1', label: 'Ali Cement Supplier (Vendor)', type: 'vendor' },
];

const mockProjects = [
  { id: 'proj-1', projectName: 'Wadaan Residency Tower A' },
];

vi.mock('@/features/accounting/hooks/useAccounting', () => ({
  useChartOfAccounts: () => ({
    data: { accounts: mockAccounts },
    isLoading: false,
  }),
}));

let mockJournalEntriesData = {
  entries: [] as any[],
  total: 0,
  page: 1,
  limit: 25,
};
const mockUseJournalEntriesHook = vi.fn((page: number = 1, limit: number = 25) => ({
  data: { ...mockJournalEntriesData, page, limit },
  isLoading: false,
  refetch: vi.fn(),
}));

vi.mock('@/features/accounting/hooks/useJournals', () => ({
  useCreateJournal: () => ({
    mutate: mockPostJournal,
    isPending: mockIsPending,
    error: null,
  }),
  useJournalEntries: (page?: number, limit?: number) => mockUseJournalEntriesHook(page, limit),
}));

vi.mock('@/features/accounting/hooks/useParties', () => ({
  useCustomers: () => ({ data: mockCustomers, isLoading: false }),
  useVendors: () => ({ data: mockVendors, isLoading: false }),
}));

vi.mock('@/features/projects/hooks/useProjects', () => ({
  useProjects: () => ({ data: mockProjects, isLoading: false }),
}));

describe('JournalEntryForm / JournalsPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPending = false;
  });

  it('1. "Post Journal Entry" button is disabled initially with empty form', () => {
    render(<JournalsPage />);
    const postButton = screen.getByRole('button', { name: /Post Journal Entry/i });
    expect(postButton).toBeDisabled();
  });

  it('2. "Post Journal Entry" button is disabled when debits do not equal credits', () => {
    render(<JournalsPage />);

    // Enter description
    const descInput = screen.getByPlaceholderText(/e\.g\. Owner withdrawal/i);
    fireEvent.change(descInput, { target: { value: 'Test entry' } });

    // Select accounts for both rows
    const accountSelects = screen.getAllByRole('combobox').filter((select) =>
      select.innerHTML.includes('1001')
    );
    fireEvent.change(accountSelects[0], { target: { value: 'acc-cash' } });
    fireEvent.change(accountSelects[1], { target: { value: 'acc-eq' } });

    // Set debit on row 1 = 5000, credit on row 2 = 4000 (unbalanced)
    const debitInputs = screen.getAllByPlaceholderText('0.00').filter((input, i) => i % 2 === 0);
    const creditInputs = screen.getAllByPlaceholderText('0.00').filter((input, i) => i % 2 === 1);

    fireEvent.change(debitInputs[0], { target: { value: '5000' } });
    fireEvent.change(creditInputs[1], { target: { value: '4000' } });

    const postButton = screen.getByRole('button', { name: /Post Journal Entry/i });
    expect(postButton).toBeDisabled();
    expect(screen.getByText(/Diff:/i)).toBeInTheDocument();
  });

  it('3. "Post Journal Entry" button is enabled when totalDebits === totalCredits > 0 and required fields are filled', () => {
    render(<JournalsPage />);

    // Enter description
    const descInput = screen.getByPlaceholderText(/e\.g\. Owner withdrawal/i);
    fireEvent.change(descInput, { target: { value: 'Capital contribution' } });

    // Select accounts
    const accountSelects = screen.getAllByRole('combobox').filter((select) =>
      select.innerHTML.includes('1001')
    );
    fireEvent.change(accountSelects[0], { target: { value: 'acc-cash' } });
    fireEvent.change(accountSelects[1], { target: { value: 'acc-eq' } });

    // Balanced amounts
    const debitInputs = screen.getAllByPlaceholderText('0.00').filter((input, i) => i % 2 === 0);
    const creditInputs = screen.getAllByPlaceholderText('0.00').filter((input, i) => i % 2 === 1);

    fireEvent.change(debitInputs[0], { target: { value: '5000' } });
    fireEvent.change(creditInputs[1], { target: { value: '5000' } });

    const postButton = screen.getByRole('button', { name: /Post Journal Entry/i });
    expect(postButton).not.toBeDisabled();
    expect(screen.getByText(/Balanced/i)).toBeInTheDocument();
  });

  it('4. Debit input is disabled when credit field has a value > 0', () => {
    render(<JournalsPage />);

    const debitInputs = screen.getAllByPlaceholderText('0.00').filter((input, i) => i % 2 === 0);
    const creditInputs = screen.getAllByPlaceholderText('0.00').filter((input, i) => i % 2 === 1);

    // Enter credit in row 1
    fireEvent.change(creditInputs[0], { target: { value: '2500' } });

    // Debit in row 1 should now be disabled
    expect(debitInputs[0]).toBeDisabled();
  });

  it('5. System-locked and archived accounts do not appear in the Account dropdown', () => {
    render(<JournalsPage />);

    const accountSelects = screen.getAllByRole('combobox').filter((select) =>
      select.innerHTML.includes('1001')
    );
    const optionsText = accountSelects[0].textContent || '';

    // Should include unlocked active accounts
    expect(optionsText).toContain('1001 — Cash in Bank');
    expect(optionsText).toContain('3001 — Owner Equity');

    // Should NOT include system-locked or archived accounts
    expect(optionsText).not.toContain('2100 — Accounts Payable');
    expect(optionsText).not.toContain('5999 — Old Expense');
  });

  it('6. On successful POST, form resets and success message appears', async () => {
    mockPostJournal.mockImplementation((payload, opts) => {
      opts?.onSuccess?.({ entryNumber: 'JV-2026-0042' });
    });

    render(<JournalsPage />);

    const descInput = screen.getByPlaceholderText(/e\.g\. Owner withdrawal/i);
    fireEvent.change(descInput, { target: { value: 'Valid posting' } });

    const accountSelects = screen.getAllByRole('combobox').filter((select) =>
      select.innerHTML.includes('1001')
    );
    fireEvent.change(accountSelects[0], { target: { value: 'acc-cash' } });
    fireEvent.change(accountSelects[1], { target: { value: 'acc-eq' } });

    const debitInputs = screen.getAllByPlaceholderText('0.00').filter((input, i) => i % 2 === 0);
    const creditInputs = screen.getAllByPlaceholderText('0.00').filter((input, i) => i % 2 === 1);

    fireEvent.change(debitInputs[0], { target: { value: '1000' } });
    fireEvent.change(creditInputs[1], { target: { value: '1000' } });

    const postButton = screen.getByRole('button', { name: /Post Journal Entry/i });
    expect(postButton).not.toBeDisabled();
    fireEvent.click(postButton);

    await waitFor(() => {
      expect(mockPostJournal).toHaveBeenCalled();
      expect(screen.getByText(/Journal entry JV-2026-0042 posted successfully\./i)).toBeInTheDocument();
    });
  });

  it('7. renders pagination controls and navigates pages when total entries exceed limit', () => {
    mockJournalEntriesData = {
      entries: [
        {
          id: 'j-1',
          entryNumber: 'JV-2026-0001',
          entryDate: '2026-09-01',
          description: 'Initial Opening Balance',
          lines: [
            { id: 'l-1', accountId: 'acc-cash', debitAmount: '50000', creditAmount: '0', memo: null, customerId: null, vendorId: null, projectId: null, account: { id: 'acc-cash', accountCode: '1001', accountName: 'Cash', category: 'ASSET' }, customer: null, vendor: null, project: null },
            { id: 'l-2', accountId: 'acc-eq', debitAmount: '0', creditAmount: '50000', memo: null, customerId: null, vendorId: null, projectId: null, account: { id: 'acc-eq', accountCode: '3001', accountName: 'Equity', category: 'EQUITY' }, customer: null, vendor: null, project: null },
          ],
        },
      ],
      total: 60,
      page: 1,
      limit: 25,
    };

    render(<JournalsPage />);

    expect(
      screen.getByText((_, el) => el?.tagName.toLowerCase() === 'p' && /Showing 1 to 25 of 60 entries/.test(el.textContent || ''))
    ).toBeInTheDocument();
    expect(screen.getByText(/Page 1 of 3/i)).toBeInTheDocument();

    const prevButton = screen.getByRole('button', { name: /Previous/i });
    const nextButton = screen.getByRole('button', { name: /Next/i });

    expect(prevButton).toBeDisabled();
    expect(nextButton).not.toBeDisabled();

    fireEvent.click(nextButton);

    expect(mockUseJournalEntriesHook).toHaveBeenCalledWith(2, 25);
  });
});
