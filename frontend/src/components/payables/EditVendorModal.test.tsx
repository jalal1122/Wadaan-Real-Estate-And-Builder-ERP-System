import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditVendorModal } from './EditVendorModal';
import { VendorItem } from '@/features/vendors/types';

const mockUpdateVendorMutate = vi.fn();

vi.mock('@/features/vendors/hooks/useVendors', () => ({
  useUpdateVendor: () => ({
    mutate: mockUpdateVendorMutate,
    isPending: false,
  }),
}));

describe('EditVendorModal Component', () => {
  const mockVendor: VendorItem = {
    id: 'vend-1',
    vendorName: 'Bestway Cement',
    phone: '+92 300 1234567',
    totalOutstanding: 500000,
    totalPaid: 200000,
    unpaidBillsCount: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with pre-filled vendor data', () => {
    render(
      <EditVendorModal
        vendor={mockVendor}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Edit Vendor Details')).toBeDefined();
    expect(screen.getByDisplayValue('Bestway Cement')).toBeDefined();
    expect(screen.getByDisplayValue('+92 300 1234567')).toBeDefined();
  });

  it('validates empty vendor name and prevents submit', () => {
    render(
      <EditVendorModal
        vendor={mockVendor}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const nameInput = screen.getByDisplayValue('Bestway Cement');
    fireEvent.change(nameInput, { target: { value: '' } });

    const submitBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText('Vendor name is required')).toBeDefined();
    expect(mockUpdateVendorMutate).not.toHaveBeenCalled();
  });

  it('submits updated vendor name and phone', () => {
    render(
      <EditVendorModal
        vendor={mockVendor}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const nameInput = screen.getByDisplayValue('Bestway Cement');
    fireEvent.change(nameInput, { target: { value: 'Bestway Cement (Hattar Plant)' } });

    const phoneInput = screen.getByDisplayValue('+92 300 1234567');
    fireEvent.change(phoneInput, { target: { value: '+92 300 9999999' } });

    const submitBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(submitBtn);

    expect(mockUpdateVendorMutate).toHaveBeenCalledWith(
      {
        id: 'vend-1',
        payload: {
          vendorName: 'Bestway Cement (Hattar Plant)',
          phone: '+92 300 9999999',
        },
      },
      expect.anything()
    );
  });
});
