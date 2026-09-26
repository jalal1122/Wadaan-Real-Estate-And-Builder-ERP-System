import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import DashboardRouteLayout from './layout';
import * as authHook from '@/hooks/useAuth';

// Mock next/navigation
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

// Mock DashboardLayout shell
vi.mock('@/components/layout/DashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}));

describe('DashboardRouteLayout Guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading spinner and session verification message when user status is loading', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      currentUser: null,
      isLoadingUser: true,
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

    render(
      <DashboardRouteLayout>
        <div data-testid="child-content">Protected Content</div>
      </DashboardRouteLayout>
    );

    expect(screen.getByText('Verifying session...')).toBeInTheDocument();
    expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('redirects to /login and hides children when currentUser is null', async () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      currentUser: null,
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

    render(
      <DashboardRouteLayout>
        <div data-testid="child-content">Protected Content</div>
      </DashboardRouteLayout>
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
    expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();
  });

  it('renders child components inside DashboardLayout when user is authenticated', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      currentUser: {
        userId: 'u-1',
        fullName: 'Test Admin',
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

    render(
      <DashboardRouteLayout>
        <div data-testid="child-content">Protected Content</div>
      </DashboardRouteLayout>
    );

    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('redirects to /login when user session expires mid-session (authenticated -> null)', async () => {
    const authSpy = vi.spyOn(authHook, 'useAuth').mockReturnValue({
      currentUser: {
        userId: 'u-1',
        fullName: 'Test Admin',
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

    const { rerender } = render(
      <DashboardRouteLayout>
        <div data-testid="child-content">Protected Content</div>
      </DashboardRouteLayout>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();

    // Simulate mid-session 401: currentUser transitions to null
    authSpy.mockReturnValue({
      currentUser: null,
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

    rerender(
      <DashboardRouteLayout>
        <div data-testid="child-content">Protected Content</div>
      </DashboardRouteLayout>
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
    expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();
  });

  it('does NOT redirect during a background refetch (isFetchingUser=true, currentUser=null) and shows loading indicator', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      currentUser: null,
      isLoadingUser: false,
      isFetchingUser: true,
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

    render(
      <DashboardRouteLayout>
        <div data-testid="child-content">Protected Content</div>
      </DashboardRouteLayout>
    );

    expect(screen.getByText('Verifying session...')).toBeInTheDocument();
    expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('renders child components smoothly without showing spinner when user is authenticated during background refetch', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      currentUser: {
        id: 'u-1',
        email: 'admin@wadaan.com.pk',
        fullName: 'Test Admin',
      },
      isLoadingUser: false,
      isFetchingUser: true,
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

    render(
      <DashboardRouteLayout>
        <div data-testid="child-content">Protected Content</div>
      </DashboardRouteLayout>
    );

    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.queryByText('Verifying session...')).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});


