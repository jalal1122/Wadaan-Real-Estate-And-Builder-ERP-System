import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProjectsPage from './page';
import { ProjectItem } from '@/features/projects/types';

// Mock mutation hooks
const mockCreateProjectMutate = vi.fn();
const mockUpdateStatusMutate = vi.fn();

let mockProjectsData: ProjectItem[] = [];
let mockIsLoading = false;
let mockIsError = false;

vi.mock('@/features/projects/hooks/useProjects', () => ({
  useProjects: () => ({
    data: mockProjectsData,
    isLoading: mockIsLoading,
    isError: mockIsError,
    error: null,
    refetch: vi.fn(),
  }),
  useCreateProject: () => ({
    mutate: mockCreateProjectMutate,
    isPending: false,
  }),
  useUpdateProjectStatus: () => ({
    mutate: mockUpdateStatusMutate,
    isPending: false,
  }),
  useProjectTransactions: () => ({
    data: null,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

describe('Projects & WIP Page (Screen 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
    mockIsError = false;
    mockProjectsData = [
      {
        id: 'proj-1',
        projectName: 'Green Heights',
        projectPrefix: 'GRN',
        masterBOQ: 10000000,
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        spentToDate: 4000000,
        budgetVariance: 6000000,
        isOverBudget: false,
        budgetBurnPercentage: 40.0,
      },
      {
        id: 'proj-2',
        projectName: 'Amber Towers',
        projectPrefix: 'AMB',
        masterBOQ: 10000000,
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        spentToDate: 8500000,
        budgetVariance: 1500000,
        isOverBudget: false,
        budgetBurnPercentage: 85.0,
      },
      {
        id: 'proj-3',
        projectName: 'Red Mall',
        projectPrefix: 'RED',
        masterBOQ: 5000000,
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        spentToDate: 6500000,
        budgetVariance: -1500000,
        isOverBudget: true,
        budgetBurnPercentage: 130.0,
      },
    ];
  });

  it('renders loading skeletons while isLoading is true', () => {
    mockIsLoading = true;
    mockProjectsData = [];

    render(<ProjectsPage />);
    const skeletons = screen.getAllByTestId('project-card-skeleton');
    expect(skeletons.length).toBe(3);
  });

  it('renders project cards with correct names and prefixes', () => {
    render(<ProjectsPage />);

    expect(screen.getByText('Green Heights')).toBeInTheDocument();
    expect(screen.getByText('GRN')).toBeInTheDocument();
    expect(screen.getByText('Amber Towers')).toBeInTheDocument();
    expect(screen.getByText('Red Mall')).toBeInTheDocument();
  });

  it('verifies health bar color: bg-emerald-500 when utilization is under 80%', () => {
    render(<ProjectsPage />);

    const card1 = screen.getByTestId('project-card-proj-1');
    const barFill1 = card1.querySelector('[data-testid="health-bar-fill"]');
    expect(barFill1).toHaveClass('bg-emerald-500');
    expect(barFill1).not.toHaveClass('bg-red-500');
    expect(barFill1).not.toHaveClass('bg-amber-500');
  });

  it('verifies health bar color: bg-amber-500 when utilization is over 80%', () => {
    render(<ProjectsPage />);

    const card2 = screen.getByTestId('project-card-proj-2');
    const barFill2 = card2.querySelector('[data-testid="health-bar-fill"]');
    expect(barFill2).toHaveClass('bg-amber-500');
  });

  it('verifies health bar color: bg-red-500, capped at 100%, and shows Over Budget badge when isOverBudget is true', () => {
    render(<ProjectsPage />);

    const card3 = screen.getByTestId('project-card-proj-3');
    const barFill3 = card3.querySelector('[data-testid="health-bar-fill"]');
    expect(barFill3).toHaveClass('bg-red-500');
    // Visual bar width must be capped at 100%
    expect(barFill3).toHaveStyle({ width: '100%' });

    // Warning badge must be displayed
    const overBudgetBadge = screen.getByTestId('over-budget-badge');
    expect(overBudgetBadge).toBeInTheDocument();
    expect(overBudgetBadge).toHaveTextContent(/Over Budget/i);
  });

  it('opens Create Project modal and submits with uppercase prefix', () => {
    render(<ProjectsPage />);

    // Click "New Project"
    const newProjectBtn = screen.getByRole('button', { name: /New Project/i });
    fireEvent.click(newProjectBtn);

    // Modal appears
    expect(screen.getByText('Initialize New Project')).toBeInTheDocument();

    // Fill inputs
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Wadaan Heights/i), {
      target: { value: 'City Center' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. WHT, DHA, EXV/i), {
      target: { value: 'cct' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. 50000000/i), {
      target: { value: '25000000' },
    });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Initialize Project/i });
    fireEvent.click(submitBtn);

    expect(mockCreateProjectMutate).toHaveBeenCalledWith(
      {
        projectName: 'City Center',
        projectPrefix: 'CCT', // forced uppercase
        masterBOQ: 25000000,
      },
      expect.any(Object)
    );
  });
});
