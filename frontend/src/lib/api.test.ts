import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from './api';
import { queryClient } from './queryClient';

describe('apiClient 401 response interceptor', () => {
  const originalLocation = window.location;
  let mockReplace: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReplace = vi.fn();
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      pathname: '/dashboard',
      replace: mockReplace,
    } as any;
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  it('1. Clears queryClient cache and redirects to /login on 401 response when on a protected page', async () => {
    const clearSpy = vi.spyOn(queryClient, 'clear');

    apiClient.defaults.adapter = async (config) => {
      const error: any = new Error('Request failed with status code 401');
      error.isAxiosError = true;
      error.response = {
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config,
        data: {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'No active session found.' },
        },
      };
      throw error;
    };

    await expect(apiClient.get('/auth/test-401')).rejects.toEqual({
      code: 'UNAUTHORIZED',
      message: 'No active session found.',
    });

    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('2. Does NOT call window.location.replace when already on /login to prevent redirect loops', async () => {
    window.location.pathname = '/login';
    const clearSpy = vi.spyOn(queryClient, 'clear');

    apiClient.defaults.adapter = async (config) => {
      const error: any = new Error('Request failed with status code 401');
      error.isAxiosError = true;
      error.response = {
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config,
        data: {
          success: false,
          error: { code: 'TOKEN_EXPIRED', message: 'Session expired. Please log in again.' },
        },
      };
      throw error;
    };

    await expect(apiClient.get('/auth/test-401-on-login')).rejects.toEqual({
      code: 'TOKEN_EXPIRED',
      message: 'Session expired. Please log in again.',
    });

    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('3. Non-401 server errors (e.g. 500) do NOT clear cache or trigger redirect to /login', async () => {
    const clearSpy = vi.spyOn(queryClient, 'clear');

    apiClient.defaults.adapter = async (config) => {
      const error: any = new Error('Request failed with status code 500');
      error.isAxiosError = true;
      error.response = {
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config,
        data: {
          success: false,
          error: { code: 'INTERNAL_SERVER_ERROR', message: 'Database connection failed.' },
        },
      };
      throw error;
    };

    await expect(apiClient.get('/system/test-500')).rejects.toEqual({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Database connection failed.',
    });

    expect(clearSpy).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('4. Falls back to SESSION_EXPIRED error payload if backend returns 401 without error object', async () => {
    apiClient.defaults.adapter = async (config) => {
      const error: any = new Error('Request failed with status code 401');
      error.isAxiosError = true;
      error.response = {
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config,
        data: null,
      };
      throw error;
    };

    await expect(apiClient.get('/auth/bare-401')).rejects.toEqual({
      code: 'SESSION_EXPIRED',
      message: 'Your session has expired. Please log in again.',
    });

    expect(mockReplace).toHaveBeenCalledWith('/login');
  });
});
