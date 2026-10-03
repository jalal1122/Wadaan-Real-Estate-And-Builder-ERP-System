import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditCustomerModal } from './EditCustomerModal';

const mockUpdateCustomerMutate = vi.fn();

vi.mock('@/features/customers/hooks/useCustomers', () => ({
  useUpdateCustomer: () => ({
    mutate: mockUpdateCustomerMutate,
    isPending: false,
  }),
}));

describe('EditCustomerModal Component', () => {
  const mockCustomer = {
    id: 'cust-1',
    fullName: 'Tariq Mehmood',
    phone: '+92 300 1234567',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with pre-filled customer data', () => {
    render(
      <EditCustomerModal
        customer={mockCustomer}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Edit Client Profile')).toBeDefined();
    expect(screen.getByDisplayValue('Tariq Mehmood')).toBeDefined();
    expect(screen.getByDisplayValue('+92 300 1234567')).toBeDefined();
  });

  it('validates empty name or phone and prevents submit', () => {
    render(
      <EditCustomerModal
        customer={mockCustomer}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const nameInput = screen.getByDisplayValue('Tariq Mehmood');
    fireEvent.change(nameInput, { target: { value: '' } });

    const submitBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText('Client full name is required')).toBeDefined();
    expect(mockUpdateCustomerMutate).not.toHaveBeenCalled();
  });

  it('submits updated full name and phone', () => {
    render(
      <EditCustomerModal
        customer={mockCustomer}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const nameInput = screen.getByDisplayValue('Tariq Mehmood');
    fireEvent.change(nameInput, { target: { value: 'Malik Tariq Mehmood' } });

    const phoneInput = screen.getByDisplayValue('+92 300 1234567');
    fireEvent.change(phoneInput, { target: { value: '+92 300 7654321' } });

    const submitBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(submitBtn);

    expect(mockUpdateCustomerMutate).toHaveBeenCalledWith(
      {
        id: 'cust-1',
        payload: {
          fullName: 'Malik Tariq Mehmood',
          phone: '+92 300 7654321',
        },
      },
      expect.anything()
    );
  });
});
