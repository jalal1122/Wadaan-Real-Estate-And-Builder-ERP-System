import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditProjectModal } from './EditProjectModal';
import { ProjectItem } from '@/features/projects/types';

const mockUpdateProjectMutate = vi.fn();

vi.mock('@/features/projects/hooks/useProjects', () => ({
  useUpdateProject: () => ({
    mutate: mockUpdateProjectMutate,
    isPending: false,
  }),
}));

describe('EditProjectModal Component', () => {
  const mockProject: ProjectItem = {
    id: 'proj-1',
    projectName: 'Wadaan Heights',
    projectPrefix: 'WH',
    masterBOQ: 50000000,
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    spentToDate: 20000000,
    budgetVariance: 30000000,
    isOverBudget: false,
    budgetBurnPercentage: 40.0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with pre-filled project data', () => {
    render(
      <EditProjectModal
        project={mockProject}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Edit Project Details')).toBeDefined();
    expect(screen.getByDisplayValue('Wadaan Heights')).toBeDefined();
    expect(screen.getByDisplayValue('50000000')).toBeDefined();
    expect(screen.getByDisplayValue('WH')).toBeDefined();
  });

  it('validates empty project name and displays error', () => {
    render(
      <EditProjectModal
        project={mockProject}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const nameInput = screen.getByDisplayValue('Wadaan Heights');
    fireEvent.change(nameInput, { target: { value: '' } });

    const submitBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText('Project name cannot be empty')).toBeDefined();
    expect(mockUpdateProjectMutate).not.toHaveBeenCalled();
  });

  it('calls useUpdateProject mutation with valid data', () => {
    render(
      <EditProjectModal
        project={mockProject}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const nameInput = screen.getByDisplayValue('Wadaan Heights');
    fireEvent.change(nameInput, { target: { value: 'Wadaan Heights Luxury Tower' } });

    const boqInput = screen.getByDisplayValue('50000000');
    fireEvent.change(boqInput, { target: { value: '65000000' } });

    const submitBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(submitBtn);

    expect(mockUpdateProjectMutate).toHaveBeenCalledWith(
      {
        id: 'proj-1',
        payload: {
          projectName: 'Wadaan Heights Luxury Tower',
          masterBOQ: 65000000,
        },
      },
      expect.anything()
    );
  });
});
