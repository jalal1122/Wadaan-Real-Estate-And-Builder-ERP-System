import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectCard } from './ProjectCard';
import { ProjectItem } from '@/features/projects/types';

const mockUpdateStatusMutate = vi.fn();

vi.mock('@/features/projects/hooks/useProjects', () => ({
  useUpdateProjectStatus: () => ({
    mutate: mockUpdateStatusMutate,
  }),
}));

describe('ProjectCard Component', () => {
  const mockProjectWithClient: ProjectItem = {
    id: 'proj-wh',
    projectName: 'Wadaan Heights',
    projectPrefix: 'WH',
    masterBOQ: 15000000,
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
    spentToDate: 5000000,
    budgetVariance: 10000000,
    isOverBudget: false,
    budgetBurnPercentage: 33.33,
    clientInfo: {
      customerName: 'Chaudri Aslam',
      customerPhone: '03002222222',
      dealType: 'WADAAN_SALE',
      contractValue: 12000000,
      totalCollected: 8000000,
      pendingReceivable: 4000000,
      netCashMargin: 3000000,
    },
  };

  const mockProjectWithoutClient: ProjectItem = {
    id: 'proj-spec',
    projectName: 'Speculative Tower',
    projectPrefix: 'ST',
    masterBOQ: 20000000,
    status: 'ON_HOLD',
    createdAt: '2026-01-01T00:00:00.000Z',
    spentToDate: 12000000,
    budgetVariance: 8000000,
    isOverBudget: false,
    budgetBurnPercentage: 60.0,
    clientInfo: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. renders project name, prefix, status badge, and budget metrics', () => {
    render(<ProjectCard project={mockProjectWithClient} />);

    expect(screen.getByText('Wadaan Heights')).toBeInTheDocument();
    expect(screen.getByText('WH')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('33.3%')).toBeInTheDocument();
  });

  it('2. renders clientInfo details accurately when project is linked to a customer deal', () => {
    render(<ProjectCard project={mockProjectWithClient} />);

    const clientBlock = screen.getByTestId('project-client-info-proj-wh');
    expect(clientBlock).toBeInTheDocument();
    expect(screen.getByText(/Client: Chaudri Aslam/i)).toBeInTheDocument();
    expect(screen.getByText('(03002222222)')).toBeInTheDocument();
    expect(screen.getByText('Client Contract')).toBeInTheDocument();
  });

  it('3. dynamically reflects new owner after deal file transfer cache invalidation and rerender', () => {
    const { rerender } = render(<ProjectCard project={mockProjectWithClient} />);

    // Initially shows Chaudri Aslam
    expect(screen.getByText(/Client: Chaudri Aslam/i)).toBeInTheDocument();

    // Transferred to new client Malik Usman and rerendered
    const updatedProject: ProjectItem = {
      ...mockProjectWithClient,
      clientInfo: {
        ...mockProjectWithClient.clientInfo!,
        customerName: 'Malik Usman',
        customerPhone: '03009998888',
      },
    };

    rerender(<ProjectCard project={updatedProject} />);

    expect(screen.queryByText(/Client: Chaudri Aslam/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Client: Malik Usman/i)).toBeInTheDocument();
    expect(screen.getByText('(03009998888)')).toBeInTheDocument();
  });

  it('4. does not render clientInfo block when project has no associated customer deal', () => {
    render(<ProjectCard project={mockProjectWithoutClient} />);

    expect(screen.queryByTestId('project-client-info-proj-spec')).toBeNull();
    expect(screen.getByText('ON HOLD')).toBeInTheDocument();
  });

  it('5. triggers onViewTransactions callback when View GL Entries button is clicked', () => {
    const mockViewTx = vi.fn();
    render(<ProjectCard project={mockProjectWithClient} onViewTransactions={mockViewTx} />);

    const viewTxBtn = screen.getByRole('button', { name: /View GL Entries/i });
    fireEvent.click(viewTxBtn);

    expect(mockViewTx).toHaveBeenCalledWith('proj-wh');
  });

  it('6. triggers onPrintReport callback when Print Report button is clicked', () => {
    const mockPrint = vi.fn();
    render(<ProjectCard project={mockProjectWithClient} onPrintReport={mockPrint} />);

    const printBtn = screen.getByRole('button', { name: /Print Report/i });
    fireEvent.click(printBtn);

    expect(mockPrint).toHaveBeenCalledWith('proj-wh');
  });

  it('7. allows changing project status via actions dropdown menu', () => {
    render(<ProjectCard project={mockProjectWithClient} />);

    // Open dropdown
    const menuBtn = screen.getByLabelText('Project actions');
    fireEvent.click(menuBtn);

    // Select "Set On Hold"
    const onHoldOption = screen.getByRole('button', { name: /Set On Hold/i });
    fireEvent.click(onHoldOption);

    expect(mockUpdateStatusMutate).toHaveBeenCalledWith({
      id: 'proj-wh',
      status: 'ON_HOLD',
    });
  });
});
