import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import DashboardLayout from './DashboardLayout';
import * as authHook from '@/hooks/useAuth';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Mock react-query
const mockRefetchQueries = vi.fn().mockResolvedValue([]);
const mockInvalidateQueries = vi.fn().mockResolvedValue([]);
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: () => ({
      refetchQueries: mockRefetchQueries,
      invalidateQueries: mockInvalidateQueries,
    }),
  };
});

describe('DashboardLayout Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      currentUser: {
        userId: 'u-1',
        fullName: 'Chief Administrator',
        role: 'SUPER_ADMIN',
      },
      isLoadingUser: false,
      login: vi.fn(),
      isLoggingIn: false,
      loginError: null,
      logout: vi.fn(),
      isLoggingOut: false,
      forgotPassword: vi.fn(),
      isRequestingReset: false,
      resetPassword: vi.fn(),
      isResettingPassword: false,
      getLockoutStatus: vi.fn(),
    });
  });

  it('renders top header with title and reload data button', () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    expect(screen.getByText('Wadaan Real Estate & Builders ERP')).toBeInTheDocument();
    expect(screen.getByTestId('header-reload-data-btn')).toBeInTheDocument();
    expect(screen.getByText('Reload Data')).toBeInTheDocument();
  });

  it('triggers full query refetch and invalidation when Reload Data button is clicked', async () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    const reloadBtn = screen.getByTestId('header-reload-data-btn');
    fireEvent.click(reloadBtn);

    await waitFor(() => {
      expect(mockRefetchQueries).toHaveBeenCalledWith({ type: 'active' });
      expect(mockInvalidateQueries).toHaveBeenCalled();
    });
  });

  it('displays offline notice and reconnect button when window fires offline event', async () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    // Fire offline event
    act(() => {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Internet connection lost/i)).toBeInTheDocument();
      expect(screen.getByTestId('offline-reconnect-btn')).toBeInTheDocument();
    });

    // Click reconnect
    fireEvent.click(screen.getByTestId('offline-reconnect-btn'));

    await waitFor(() => {
      expect(mockRefetchQueries).toHaveBeenCalled();
      expect(mockInvalidateQueries).toHaveBeenCalled();
    });

    // Fire online event
    act(() => {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(screen.queryByText(/Internet connection lost/i)).not.toBeInTheDocument();
    });
  });
});
