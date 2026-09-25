import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DeleteAccountDialog from './DeleteAccountDialog';
import { AccountWithBalance } from '@/features/accounting/types';

const mockMutateAsync = vi.fn();
const mockIsPending = false;

vi.mock('@/features/accounting/hooks/useAccounting', () => ({
  useDeleteAccount: () => ({
    mutateAsync: mockMutateAsync,
    isPending: mockIsPending,
  }),
}));

const mockAccountWithHistory: AccountWithBalance = {
  id: 'acc-with-history',
  accountCode: '1020',
  accountName: 'Operating Cash',
  category: 'ASSET',
  isSystemLocked: false,
  totalDebit: '45000.00',
  totalCredit: '12000.00',
  balance: '33000.00',
};

const mockAccountZeroHistory: AccountWithBalance = {
  id: 'acc-zero-history',
  accountCode: '1099',
  accountName: 'Unused Cash Box',
  category: 'ASSET',
  isSystemLocked: false,
  totalDebit: '0.00',
  totalCredit: '0.00',
  balance: '0.00',
};

const mockSystemLockedAccount: AccountWithBalance = {
  id: 'acc-sys-locked',
  accountCode: '2000',
  accountName: 'Accounts Payable',
  category: 'LIABILITY',
  isSystemLocked: true,
  totalDebit: '0.00',
  totalCredit: '0.00',
  balance: '0.00',
};

describe('DeleteAccountDialog Component', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false or account is null', () => {
    const { rerender } = render(
      <DeleteAccountDialog isOpen={false} account={mockAccountZeroHistory} onClose={mockOnClose} />
    );
    expect(screen.queryByText(/Delete Account|Archive Account/i)).not.toBeInTheDocument();

    rerender(<DeleteAccountDialog isOpen={true} account={null} onClose={mockOnClose} />);
    expect(screen.queryByText(/Delete Account|Archive Account/i)).not.toBeInTheDocument();
  });

  it('renders Archive mode when account has transaction history', () => {
    render(
      <DeleteAccountDialog
        isOpen={true}
        account={mockAccountWithHistory}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByRole('heading', { name: 'Archive Account' })).toBeInTheDocument();
    expect(
      screen.getByText(/Transaction History Detected \(Soft Delete \/ Archive\)/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/PKR 45000.00/i)).toBeInTheDocument();
    expect(screen.getByText(/PKR 12000.00/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Archive Account/i })).toBeInTheDocument();
  });

  it('renders Permanent Deletion mode when account has zero transaction history', () => {
    render(
      <DeleteAccountDialog
        isOpen={true}
        account={mockAccountZeroHistory}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByRole('heading', { name: 'Delete Account' })).toBeInTheDocument();
    expect(screen.getByText(/Zero Activity — Permanent Deletion/i)).toBeInTheDocument();
    expect(
      screen.getByText(/This account has zero journal entries or transactions/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Permanently Delete/i })).toBeInTheDocument();
  });

  it('renders protected banner and hides delete button when isSystemLocked is true', () => {
    render(
      <DeleteAccountDialog
        isOpen={true}
        account={mockSystemLockedAccount}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Account Protected')).toBeInTheDocument();
    expect(screen.getByText('This is a System Locked Account')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Archive Account/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Permanently Delete/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('calls mutateAsync and onClose when user confirms deletion', async () => {
    mockMutateAsync.mockResolvedValueOnce({
      message: 'Account deleted successfully.',
      data: { action: 'DELETED' },
    });

    render(
      <DeleteAccountDialog
        isOpen={true}
        account={mockAccountZeroHistory}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Permanently Delete/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith('acc-zero-history');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('calls mutateAsync and onClose when user confirms archiving', async () => {
    mockMutateAsync.mockResolvedValueOnce({
      message: 'Account archived successfully.',
      data: { action: 'ARCHIVED' },
    });

    render(
      <DeleteAccountDialog
        isOpen={true}
        account={mockAccountWithHistory}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Archive Account/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith('acc-with-history');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('displays error message when backend operation fails', async () => {
    mockMutateAsync.mockRejectedValueOnce({
      code: 'OPERATION_FORBIDDEN',
      message: 'System-locked accounts cannot be deleted or archived.',
    });

    render(
      <DeleteAccountDialog
        isOpen={true}
        account={mockAccountZeroHistory}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Permanently Delete/i }));

    await waitFor(() => {
      expect(
        screen.getByText('System-locked accounts cannot be deleted or archived.')
      ).toBeInTheDocument();
    });

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('calls onClose when Cancel button is clicked', () => {
    render(
      <DeleteAccountDialog
        isOpen={true}
        account={mockAccountZeroHistory}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    expect(mockOnClose).toHaveBeenCalled();
  });
});
