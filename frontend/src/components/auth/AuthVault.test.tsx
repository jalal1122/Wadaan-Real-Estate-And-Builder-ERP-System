import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AuthVault } from './AuthVault';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock useAuth
const mockLogin = vi.fn();
const mockForgotPassword = vi.fn();
const mockResetPassword = vi.fn();
const mockGetLockoutStatus = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
    forgotPassword: mockForgotPassword,
    resetPassword: mockResetPassword,
    getLockoutStatus: mockGetLockoutStatus,
    currentUser: null,
    isLoadingUser: false,
    isLoggingIn: false,
    loginError: null,
  }),
}));

vi.mock('../../hooks/useSystemInit', () => ({
  useSystemInit: () => ({
    status: { isInitialized: true, goLiveDate: null },
    isLoadingStatus: false,
    refetchStatus: vi.fn(),
  }),
}));

describe('AuthVault Component', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    mockGetLockoutStatus.mockResolvedValue({
      isLocked: false,
      remainingSeconds: 0,
      failedAttempts: 0,
      maxAttempts: 5,
      lockoutTier: 0,
      displayTier: 1,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders 4 discrete PIN boxes and the Institutional Access title', () => {
    render(<AuthVault />);

    expect(screen.getByText('Institutional Access')).toBeInTheDocument();
    expect(screen.getByText('Enter your 4-digit Master PIN to unlock ledger operations.')).toBeInTheDocument();

    expect(screen.getByTestId('pin-box-0')).toBeInTheDocument();
    expect(screen.getByTestId('pin-box-1')).toBeInTheDocument();
    expect(screen.getByTestId('pin-box-2')).toBeInTheDocument();
    expect(screen.getByTestId('pin-box-3')).toBeInTheDocument();
  });

  it('entering 4 digits invokes the login mutation', async () => {
    mockLogin.mockResolvedValueOnce({ success: true });

    render(<AuthVault />);

    const hiddenInput = document.getElementById('realPinInput') as HTMLInputElement;
    expect(hiddenInput).toBeInTheDocument();

    fireEvent.change(hiddenInput, { target: { value: '1234' } });

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({ pin: '1234' });
    });
  });

  it('displays countdown banner when account is locked', async () => {
    mockLogin.mockRejectedValueOnce({
      code: 'ACCOUNT_LOCKED',
      message: 'Account locked. Try again in 45 seconds.',
    });

    render(<AuthVault />);

    const hiddenInput = document.getElementById('realPinInput') as HTMLInputElement;
    fireEvent.change(hiddenInput, { target: { value: '9999' } });

    await waitFor(() => {
      expect(screen.getByText(/Security Lock Active/i)).toBeInTheDocument();
    });
  });

  it('opens the Forgot PIN inline modal when clicked', () => {
    render(<AuthVault />);

    const forgotBtn = screen.getByText('Forgot PIN?');
    fireEvent.click(forgotBtn);

    expect(screen.getByText('Email PIN Reset')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('admin@wadaan.com.pk')).toBeInTheDocument();
  });

  it('opens the Offline Recovery Key inline modal when clicked', () => {
    render(<AuthVault />);

    const recoveryBtn = screen.getByText('Use Offline Recovery Key');
    fireEvent.click(recoveryBtn);

    expect(screen.getByText('Master Recovery Vault')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('XXXX-XXXX-XXXX-XXXX')).toBeInTheDocument();
  });

  it('captures global keyboard digits directly and auto-submits on 4th digit', async () => {
    mockLogin.mockResolvedValueOnce({ success: true });

    render(<AuthVault />);

    fireEvent.keyDown(window, { key: '5' });
    fireEvent.keyDown(window, { key: '6' });
    fireEvent.keyDown(window, { key: '7' });
    fireEvent.keyDown(window, { key: '8' });

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({ pin: '5678' });
    });
  });

  it('updates attempts indicator dynamically on invalid PIN and adapts to Tier 1', async () => {
    mockLogin.mockRejectedValueOnce({
      code: 'INVALID_PIN',
      message: 'Invalid PIN.',
      failedAttempts: 1,
      maxAttempts: 5,
      lockoutTier: 0,
    });

    render(<AuthVault />);

    const hiddenInput = document.getElementById('realPinInput') as HTMLInputElement;
    fireEvent.change(hiddenInput, { target: { value: '1111' } });

    await waitFor(() => {
      expect(screen.getByTestId('attempt-indicator')).toHaveTextContent('Attempt 1/5');
    });
  });

  it('resets attempt counter and updates max attempts to 4 for Tier 2 after lockout expires', async () => {
    vi.useFakeTimers();

    mockLogin.mockRejectedValueOnce({
      code: 'ACCOUNT_LOCKED',
      message: 'Account locked. Try again in 2 seconds.',
      remainingSeconds: 2,
      lockoutTier: 1,
      maxAttempts: 4,
    });

    render(<AuthVault />);

    const hiddenInput = document.getElementById('realPinInput') as HTMLInputElement;
    fireEvent.change(hiddenInput, { target: { value: '9999' } });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    await vi.waitFor(() => {
      expect(screen.getByText(/Security Lock Active/i)).toBeInTheDocument();
    });

    // Advance timers step by step to allow intermediate render cycles
    for (let i = 0; i < 4; i++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }

    await vi.waitFor(() => {
      expect(screen.queryByText(/Security Lock Active/i)).not.toBeInTheDocument();
      expect(screen.getByTestId('attempt-indicator')).toHaveTextContent('Attempt 0/4 (Tier 2)');
    });

    vi.useRealTimers();
  });

  it('subsequent invalid attempt in Tier 2 shows Attempt 1/4 (Tier 2)', async () => {
    vi.useFakeTimers();

    mockLogin.mockRejectedValueOnce({
      code: 'ACCOUNT_LOCKED',
      message: 'Account locked. Try again in 1 second.',
      remainingSeconds: 1,
      lockoutTier: 1,
      maxAttempts: 4,
    });

    render(<AuthVault />);

    const hiddenInput = document.getElementById('realPinInput') as HTMLInputElement;
    fireEvent.change(hiddenInput, { target: { value: '9999' } });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    await vi.waitFor(() => {
      expect(screen.getByText(/Security Lock Active/i)).toBeInTheDocument();
    });

    for (let i = 0; i < 3; i++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }

    await vi.waitFor(() => {
      expect(screen.getByTestId('attempt-indicator')).toHaveTextContent('Attempt 0/4 (Tier 2)');
    });

    // Next wrong attempt in Tier 2
    mockLogin.mockRejectedValueOnce({
      code: 'INVALID_PIN',
      message: 'Invalid PIN.',
      failedAttempts: 1,
      maxAttempts: 4,
      lockoutTier: 1,
    });

    fireEvent.change(hiddenInput, { target: { value: '2222' } });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    await vi.waitFor(() => {
      expect(screen.getByTestId('attempt-indicator')).toHaveTextContent('Attempt 1/4 (Tier 2)');
    });

    vi.useRealTimers();
  });

  it('network error does not increment the attempt counter', async () => {
    mockLogin.mockRejectedValueOnce({
      code: 'NETWORK_OFFLINE',
      message: 'Unable to reach backend server. Please verify your connection.',
    });

    render(<AuthVault />);

    const hiddenInput = document.getElementById('realPinInput') as HTMLInputElement;
    fireEvent.change(hiddenInput, { target: { value: '1111' } });

    await waitFor(() => {
      expect(screen.getByText('Unable to reach backend server. Please verify your connection.')).toBeInTheDocument();
      expect(screen.getByTestId('attempt-indicator')).toHaveTextContent('Attempt 0/5');
    });
  });

  it('mounts with active lockout initializing countdown banner from server', async () => {
    mockGetLockoutStatus.mockResolvedValueOnce({
      isLocked: true,
      remainingSeconds: 45,
      failedAttempts: 0,
      maxAttempts: 4,
      lockoutTier: 1,
      displayTier: 2,
    });

    render(<AuthVault />);

    await waitFor(() => {
      expect(screen.getByText(/Security Lock Active • Tier 2/i)).toBeInTheDocument();
      expect(screen.getByTestId('attempt-indicator')).toHaveTextContent('Attempt 0/4 (Tier 2)');
    });
  });
});
