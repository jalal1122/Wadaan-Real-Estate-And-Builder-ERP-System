import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecoveryKeyModal } from './RecoveryKeyModal';

describe('RecoveryKeyModal Component', () => {
  it('displays the master recovery key and enforces confirmation checkbox before proceeding', () => {
    const mockProceed = vi.fn();
    const testKey = 'X7B9-V2M1-K8P4-Q5W2';

    render(<RecoveryKeyModal recoveryKey={testKey} onProceed={mockProceed} />);

    expect(screen.getByText(testKey)).toBeInTheDocument();
    expect(screen.getByText('Save Your Master Recovery Key')).toBeInTheDocument();

    const proceedBtn = screen.getByRole('button', { name: /Proceed to Authentication Vault/i });
    expect(proceedBtn).toBeDisabled();

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(proceedBtn).not.toBeDisabled();
    fireEvent.click(proceedBtn);
    expect(mockProceed).toHaveBeenCalledTimes(1);
  });
});
