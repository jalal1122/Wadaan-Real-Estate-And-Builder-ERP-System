import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreateAccountModal from './CreateAccountModal';
import { AxiosError } from 'axios';

const mockMutateAsync = vi.fn();
const mockIsPending = false;

vi.mock('@/features/accounting/hooks/useAccounting', () => ({
  useCreateAccount: () => ({
    mutateAsync: mockMutateAsync,
    isPending: mockIsPending,
  }),
}));

describe('CreateAccountModal Component', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(<CreateAccountModal isOpen={false} onClose={mockOnClose} />);
    expect(screen.queryByText('Add New Account')).not.toBeInTheDocument();
  });

  it('renders modal dialog when isOpen is true', () => {
    render(<CreateAccountModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('Add New Account')).toBeInTheDocument();
    expect(screen.getByLabelText(/Account Code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Account Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Category/i)).toBeInTheDocument();
  });

  it('submits form with correct payload and calls onClose on success', async () => {
    mockMutateAsync.mockResolvedValueOnce({
      id: 'acc-123',
      accountCode: '1090',
      accountName: 'Regional Office Cash',
      category: 'ASSET',
    });

    render(<CreateAccountModal isOpen={true} onClose={mockOnClose} />);

    fireEvent.change(screen.getByLabelText(/Account Code/i), {
      target: { value: '1090' },
    });
    fireEvent.change(screen.getByLabelText(/Account Name/i), {
      target: { value: 'Regional Office Cash' },
    });
    fireEvent.change(screen.getByLabelText(/Category/i), {
      target: { value: 'ASSET' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Save Account/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        accountCode: '1090',
        accountName: 'Regional Office Cash',
        category: 'ASSET',
      });
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('displays inline error when backend rejects with ApiErrorPayload DUPLICATE_RECORD', async () => {
    // This tests the exact payload returned by apiClient interceptor
    mockMutateAsync.mockRejectedValueOnce({
      code: 'DUPLICATE_RECORD',
      message: "Account with code '1010' already exists.",
    });

    render(<CreateAccountModal isOpen={true} onClose={mockOnClose} />);

    fireEvent.change(screen.getByLabelText(/Account Code/i), {
      target: { value: '1010' },
    });
    fireEvent.change(screen.getByLabelText(/Account Name/i), {
      target: { value: 'Existing Cash' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Save Account/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Account with code '1010' already exists.")
      ).toBeInTheDocument();
    });

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('prevents submission and displays inline error when code exists in existingCodes', async () => {
    render(
      <CreateAccountModal
        isOpen={true}
        onClose={mockOnClose}
        existingCodes={['1000', '1010', '2000']}
      />
    );

    fireEvent.change(screen.getByLabelText(/Account Code/i), {
      target: { value: '1000' },
    });
    fireEvent.change(screen.getByLabelText(/Account Name/i), {
      target: { value: 'Duplicate Cash Account' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Save Account/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Account code '1000' is already in use")
      ).toBeInTheDocument();
    });

    // Verify network call was completely prevented
    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('displays session expired message when backend returns UNAUTHORIZED', async () => {
    mockMutateAsync.mockRejectedValueOnce({
      code: 'UNAUTHORIZED',
      message: 'No active session found.',
    });

    render(<CreateAccountModal isOpen={true} onClose={mockOnClose} />);

    fireEvent.change(screen.getByLabelText(/Account Code/i), {
      target: { value: '1099' },
    });
    fireEvent.change(screen.getByLabelText(/Account Name/i), {
      target: { value: 'Test Cash' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Save Account/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Your session has expired. Please log in again.')
      ).toBeInTheDocument();
    });
  });

  it('displays general error when backend returns VALIDATION_ERROR', async () => {
    mockMutateAsync.mockRejectedValueOnce({
      code: 'VALIDATION_ERROR',
      message: 'accountName: Account name must be at least 2 characters',
    });

    render(<CreateAccountModal isOpen={true} onClose={mockOnClose} />);

    fireEvent.change(screen.getByLabelText(/Account Code/i), {
      target: { value: '1099' },
    });
    fireEvent.change(screen.getByLabelText(/Account Name/i), {
      target: { value: 'X' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Save Account/i }));

    await waitFor(() => {
      expect(
        screen.getByText('accountName: Account name must be at least 2 characters')
      ).toBeInTheDocument();
    });
  });

  it('calls onClose when Cancel button is clicked', () => {
    render(<CreateAccountModal isOpen={true} onClose={mockOnClose} />);

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    expect(mockOnClose).toHaveBeenCalled();
  });
});

