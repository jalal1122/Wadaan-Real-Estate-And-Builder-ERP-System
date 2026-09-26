import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddCoClientModal } from './AddCoClientModal';

let mockCustomers: any[] = [];
let mockIsLoadingCustomers = false;
const mockMutateAsync = vi.fn();
let mockIsPending = false;

vi.mock('@/features/customers/hooks/useCustomers', () => ({
  useCustomers: () => ({
    data: mockCustomers,
    isLoading: mockIsLoadingCustomers,
  }),
}));

vi.mock('@/features/deals/hooks/useDeals', () => ({
  useAddCoClient: () => ({
    mutateAsync: mockMutateAsync,
    isPending: mockIsPending,
  }),
}));

describe('AddCoClientModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoadingCustomers = false;
    mockIsPending = false;
    mockCustomers = [
      { id: 'cust-primary', fullName: 'Primary Client', phone: '03001111111' },
      { id: 'cust-existing-co', fullName: 'Existing Co-Client', phone: '03002222222' },
      { id: 'cust-eligible-1', fullName: 'Eligible Partner 1', phone: '03003333333' },
      { id: 'cust-eligible-2', fullName: 'Eligible Partner 2', phone: '03004444444' },
    ];
  });

  it('1. does not render when isOpen is false', () => {
    render(
      <AddCoClientModal
        dealId="deal-1"
        primaryCustomerId="cust-primary"
        existingCoClientIds={['cust-existing-co']}
        isOpen={false}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByTestId('add-co-client-modal')).toBeNull();
  });

  it('2. filters out primary customer and already-registered co-clients from customer select', () => {
    render(
      <AddCoClientModal
        dealId="deal-1"
        primaryCustomerId="cust-primary"
        existingCoClientIds={['cust-existing-co']}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('add-co-client-modal')).toBeInTheDocument();

    const options = screen.getAllByRole('option');
    // Header placeholder + 2 eligible customers = 3 options
    expect(options).toHaveLength(3);

    const optionTexts = options.map((o) => o.textContent);
    expect(optionTexts.some((t) => t?.includes('Primary Client'))).toBe(false);
    expect(optionTexts.some((t) => t?.includes('Existing Co-Client'))).toBe(false);
    expect(optionTexts.some((t) => t?.includes('Eligible Partner 1'))).toBe(true);
    expect(optionTexts.some((t) => t?.includes('Eligible Partner 2'))).toBe(true);
  });

  it('3. successfully submits co-client with shareLabel and calls mutateAsync', async () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();
    mockMutateAsync.mockResolvedValueOnce({ id: 'dc-new' });

    render(
      <AddCoClientModal
        dealId="deal-1"
        primaryCustomerId="cust-primary"
        existingCoClientIds={['cust-existing-co']}
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    // Select customer
    fireEvent.change(screen.getByTestId('co-client-select'), {
      target: { value: 'cust-eligible-1' },
    });

    // Enter share label
    fireEvent.change(screen.getByTestId('co-client-share-label'), {
      target: { value: '50% Co-Investor' },
    });

    // Submit form
    fireEvent.click(screen.getByTestId('submit-add-co-client'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        dealId: 'deal-1',
        payload: {
          customerId: 'cust-eligible-1',
          shareLabel: '50% Co-Investor',
        },
      });
      expect(handleSuccess).toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('4. displays error message when API call fails', async () => {
    mockMutateAsync.mockRejectedValueOnce({
      response: { data: { message: 'Customer is already registered as a co-client' } },
    });

    render(
      <AddCoClientModal
        dealId="deal-1"
        primaryCustomerId="cust-primary"
        existingCoClientIds={[]}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    fireEvent.change(screen.getByTestId('co-client-select'), {
      target: { value: 'cust-eligible-1' },
    });

    fireEvent.click(screen.getByTestId('submit-add-co-client'));

    await waitFor(() => {
      expect(screen.getByTestId('add-co-client-error')).toBeInTheDocument();
      expect(
        screen.getByText('Customer is already registered as a co-client')
      ).toBeInTheDocument();
    });
  });
});
