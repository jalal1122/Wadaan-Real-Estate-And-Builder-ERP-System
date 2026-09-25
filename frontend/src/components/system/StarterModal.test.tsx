import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StarterModal } from './StarterModal';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockInitializeSystem = vi.fn();
const mockCompleteInitialization = vi.fn();

vi.mock('../../hooks/useSystemInit', () => ({
  useSystemInit: () => ({
    initializeSystem: mockInitializeSystem,
    completeInitialization: mockCompleteInitialization,
    isInitializing: false,
    status: { isInitialized: false, goLiveDate: null },
  }),
}));

describe('StarterModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Step 0: Database Link on open', () => {
    render(<StarterModal isOpen={true} />);

    expect(screen.getByText('Cloud Database Connection')).toBeInTheDocument();
    expect(screen.getByText('Transaction Pooler URL (DATABASE_URL - Port 6543)')).toBeInTheDocument();
  });

  it('allows stepping forward from Step 0 to Step 1: Admin Setup', () => {
    render(<StarterModal isOpen={true} />);

    const nextBtn = screen.getByRole('button', { name: /Next Step/i });
    fireEvent.click(nextBtn);

    expect(screen.getByText('Master Administrator Setup')).toBeInTheDocument();
    expect(screen.getByText('4-Digit Master PIN')).toBeInTheDocument();
  });

  it('prevents stepping past Admin Setup if PIN is not 4 digits', () => {
    render(<StarterModal isOpen={true} />);

    // Step 0 -> Step 1
    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
    expect(screen.getByText('Master Administrator Setup')).toBeInTheDocument();

    // Try to advance without valid PIN
    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
    expect(screen.getByText(/Please complete all required fields on this step with valid entries/i)).toBeInTheDocument();
  });

  it('navigates through Cash & Banks, allows adding an account, and calculates liquidity', () => {
    render(<StarterModal isOpen={true} />);

    // Advance to Step 1
    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));

    // Set 4-digit PIN
    const pinInput = screen.getByPlaceholderText('••••');
    fireEvent.change(pinInput, { target: { value: '4321' } });

    // Advance to Step 2: Cash & Banks
    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
    expect(screen.getByText('Liquid Assets & Bank Balances')).toBeInTheDocument();

    // Verify initial accounts exist
    expect(screen.getByDisplayValue('Office Safe (Vault A)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Meezan Bank')).toBeInTheDocument();

    // Add account
    const addAccountBtn = screen.getByText('Add Another Cash or Bank Account');
    fireEvent.click(addAccountBtn);

    expect(screen.getByDisplayValue('Secondary Bank Account')).toBeInTheDocument();
  });

  it('submitting on step 5 calls initializeSystem, displays RecoveryKeyModal, and only proceeds on confirmation', async () => {
    mockInitializeSystem.mockResolvedValueOnce({
      success: true,
      masterRecoveryKey: 'A1B2-C3D4-E5F6-G7H8',
      goLiveDate: new Date().toISOString(),
    });

    render(<StarterModal isOpen={true} />);

    // Step 0 -> Step 1
    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));

    // Fill Admin PIN
    fireEvent.change(screen.getByPlaceholderText('••••'), { target: { value: '1122' } });

    // Step 1 -> Step 2
    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));

    // Step 2 -> Step 3
    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));

    // Step 3 -> Step 4
    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));

    // Step 4 -> Step 5
    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));

    expect(screen.getByText('Active Customer Deals & Token Receivables')).toBeInTheDocument();

    const launchBtn = screen.getByRole('button', { name: /Execute Atomic Go-Live & Launch ERP/i });
    fireEvent.click(launchBtn);

    await waitFor(() => {
      expect(mockInitializeSystem).toHaveBeenCalledTimes(1);
      expect(screen.getByText('A1B2-C3D4-E5F6-G7H8')).toBeInTheDocument();
    });

    // Check confirmation checkbox to unlock proceed button
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    fireEvent.click(checkbox);

    // Proceed to Authentication Vault
    const proceedBtn = screen.getByRole('button', { name: /Proceed to Authentication Vault/i });
    expect(proceedBtn).toBeEnabled();
    fireEvent.click(proceedBtn);

    await waitFor(() => {
      expect(mockCompleteInitialization).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });
});
