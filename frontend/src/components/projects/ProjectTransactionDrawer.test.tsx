import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectTransactionDrawer } from './ProjectTransactionDrawer';

let mockTransactionsData: any = null;
let mockIsLoading = false;
let mockIsError = false;

vi.mock('@/features/projects/hooks/useProjects', () => ({
  useProjectTransactions: () => ({
    data: mockTransactionsData,
    isLoading: mockIsLoading,
    isError: mockIsError,
    refetch: vi.fn(),
  }),
}));

describe('ProjectTransactionDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
    mockIsError = false;
    mockTransactionsData = {
      project: {
        id: 'proj-1',
        projectName: 'Wadaan Heights',
        projectPrefix: 'WH',
        status: 'ACTIVE',
        masterBOQ: 10000000,
        createdAt: '2026-01-01T00:00:00Z',
      },
      totalDebit: 250000,
      totalCredit: 0,
      netBalance: 250000,
      transactions: [
        {
          id: 'line-1',
          journalId: 'jv-1',
          entryNumber: 'JV-0001',
          entryDate: '2026-01-05T00:00:00Z',
          journalDescription: 'Expense for Project: Wadaan Heights',
          memo: 'Red Bricks',
          accountCode: '1200',
          accountName: 'Work In Progress',
          accountCategory: 'ASSET',
          debitAmount: 200000,
          creditAmount: 0,
          runningBalance: 200000,
          partyName: 'Ali Hardware',
        },
      ],
    };
  });

  it('renders null when projectId is null', () => {
    const { container } = render(
      <ProjectTransactionDrawer projectId={null} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders project transactions table, JV number, party name, and net balance', () => {
    render(
      <ProjectTransactionDrawer projectId="proj-1" onClose={vi.fn()} />
    );

    expect(screen.getByText('Wadaan Heights')).toBeInTheDocument();
    expect(screen.getByText('WH')).toBeInTheDocument();
    expect(screen.getByText('JV-0001')).toBeInTheDocument();
    expect(screen.getByText('Red Bricks')).toBeInTheDocument();
    expect(screen.getByText('Ali Hardware')).toBeInTheDocument();
    expect(screen.getByText('Work In Progress')).toBeInTheDocument();
  });

  it('shows skeleton loading state when isLoading is true', () => {
    mockIsLoading = true;
    mockTransactionsData = null;

    render(
      <ProjectTransactionDrawer projectId="proj-1" onClose={vi.fn()} />
    );

    expect(screen.getByTestId('project-transactions-skeleton')).toBeInTheDocument();
  });
});
