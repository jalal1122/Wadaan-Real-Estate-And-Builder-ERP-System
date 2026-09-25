import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditAccountModal from './EditAccountModal';
import { AccountWithBalance } from '@/features/accounting/types';

const mockMutateAsync = vi.fn();
const mockIsPending = false;

vi.mock('@/features/accounting/hooks/useAccounting', () => ({
  useUpdateAccount: () => ({
    mutateAsync: mockMutateAsync,
    isPending: mockIsPending,
  }),
}));

const mockNormalAccount: AccountWithBalance = {
  id: 'acc-1',
  accountCode: '1020',
  accountName: 'Site Cash Box',
  category: 'ASSET',
  isSystemLocked: false,
  totalDebit: '15000.00',
  totalCredit: '5000.00',
  balance: '10000.00',
};

const mockLockedAccount: AccountWithBalance = {
  id: 'acc-locked',
  accountCode: '2000',
  accountName: 'Accounts Payable',
  category: 'LIABILITY',
  isSystemLocked: true,
  totalDebit: '0.00',
  totalCredit: '25000.00',
  balance: '25000.00',
};

describe('EditAccountModal Component', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false or account is null', () => {
    const { rerender } = render(
      <EditAccountModal isOpen={false} account={mockNormalAccount} onClose={mockOnClose} />
    );
    expect(screen.queryByText('Edit Account')).not.toBeInTheDocument();

    rerender(<EditAccountModal isOpen={true} account={null} onClose={mockOnClose} />);
    expect(screen.queryByText('Edit Account')).not.toBeInTheDocument();
  });

  it('renders modal pre-populated with account data and immutable accountCode', () => {
    render(<EditAccountModal isOpen={true} account={mockNormalAccount} onClose={mockOnClose} />);

    expect(screen.getByText('Edit Account')).toBeInTheDocument();
    expect(screen.getByText(/Code: 1020/i)).toBeInTheDocument();

    const codeInput = screen.getByLabelText(/Account Code/i) as HTMLInputElement;
    expect(codeInput).toBeDisabled();
    expect(codeInput.value).toBe('1020');

    const nameInput = screen.getByLabelText(/Account Name/i) as HTMLInputElement;
    expect(nameInput.value).toBe('Site Cash Box');

    const categorySelect = screen.getByLabelText(/Category/i) as HTMLSelectElement;
    expect(categorySelect.value).toBe('ASSET');
    expect(categorySelect).not.toBeDisabled();
  });

  it('disables category select and shows locked badge for system-locked account', () => {
    render(<EditAccountModal isOpen={true} account={mockLockedAccount} onClose={mockOnClose} />);

    expect(screen.getByText('System Locked')).toBeInTheDocument();
    const categorySelect = screen.getByLabelText(/Category/i) as HTMLSelectElement;
    expect(categorySelect).toBeDisabled();
    expect(
      screen.getByText(/System accounts cannot change category to preserve ledger reconciliation/i)
    ).toBeInTheDocument();
  });

  it('submits update and calls onClose on success for unlocked account', async () => {
    mockMutateAsync.mockResolvedValueOnce({
      ...mockNormalAccount,
      accountName: 'Site Cash Box North',
      category: 'EXPENSE',
    });

    render(<EditAccountModal isOpen={true} account={mockNormalAccount} onClose={mockOnClose} />);

    fireEvent.change(screen.getByLabelText(/Account Name/i), {
      target: { value: 'Site Cash Box North' },
    });
    fireEvent.change(screen.getByLabelText(/Category/i), {
      target: { value: 'EXPENSE' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        id: 'acc-1',
        payload: {
          accountName: 'Site Cash Box North',
          category: 'EXPENSE',
        },
      });
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('omits category from payload when updating a system-locked account', async () => {
    mockMutateAsync.mockResolvedValueOnce({
      ...mockLockedAccount,
      accountName: 'Master Accounts Payable',
    });

    render(<EditAccountModal isOpen={true} account={mockLockedAccount} onClose={mockOnClose} />);

    fireEvent.change(screen.getByLabelText(/Account Name/i), {
      target: { value: 'Master Accounts Payable' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        id: 'acc-locked',
        payload: {
          accountName: 'Master Accounts Payable',
          category: undefined,
        },
      });
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('displays inline validation error if accountName is cleared', async () => {
    render(<EditAccountModal isOpen={true} account={mockNormalAccount} onClose={mockOnClose} />);

    fireEvent.change(screen.getByLabelText(/Account Name/i), {
      target: { value: '   ' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(screen.getByText('Account name cannot be empty')).toBeInTheDocument();
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('displays error when backend rejects with OPERATION_FORBIDDEN', async () => {
    mockMutateAsync.mockRejectedValueOnce({
      code: 'OPERATION_FORBIDDEN',
      message: 'Cannot change category of a system-locked account.',
    });

    render(<EditAccountModal isOpen={true} account={mockNormalAccount} onClose={mockOnClose} />);

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Cannot change category of a system-locked account.')
      ).toBeInTheDocument();
    });

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('calls onClose when Cancel button is clicked', () => {
    render(<EditAccountModal isOpen={true} account={mockNormalAccount} onClose={mockOnClose} />);

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    expect(mockOnClose).toHaveBeenCalled();
  });
});
