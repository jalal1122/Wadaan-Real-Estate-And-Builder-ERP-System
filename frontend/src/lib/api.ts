import axios, { AxiosError } from 'axios';
import { ApiErrorPayload, ApiErrorResponse } from '../types/api';
import { queryClient } from './queryClient';

export const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined' && window.location) {
    // When served by Express in packaged Electron or production desktop bundle
    if (window.location.port === '4000' || window.location.origin.includes(':4000')) {
      return `${window.location.origin}/api/v1`;
    }
  }
  return 'http://localhost:4000/api/v1';
};

export const API_BASE_URL = getApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // CRITICAL: Mandates transmission of HttpOnly JWT cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dynamic request interceptor to align origin when running in packaged desktop
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined' && window.location) {
    if (window.location.port === '4000' || window.location.origin.includes(':4000')) {
      config.baseURL = `${window.location.origin}/api/v1`;
    }
  }
  return config;
});

// Global Axios response interceptor for unified error parsing & 401 session expiry redirect
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    if (error.response?.status === 401) {
      const isAuthMe = error.config?.url?.includes('/auth/me');
      if (!isAuthMe) {
        // Silently kill the cache so stale data is not re-displayed on re-login
        queryClient.clear();
        // Hard redirect — works outside React component tree (Electron-safe)
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.replace('/login');
        }
      }
      return Promise.reject(
        error.response.data?.error || {
          code: 'SESSION_EXPIRED',
          message: 'Your session has expired. Please log in again.',
        }
      );
    }

    if (error.response?.data?.error) {
      // Backend returned standardized AppError payload
      return Promise.reject(error.response.data.error);
    }

    if (error.code === 'ERR_NETWORK' || !error.response) {
      // Physical network drop or Express server offline
      const offlineError: ApiErrorPayload = {
        code: 'NETWORK_OFFLINE',
        message: 'Unable to reach backend server. Please verify your connection.',
      };
      return Promise.reject(offlineError);
    }

    const genericError: ApiErrorPayload = {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred.',
    };
    return Promise.reject(genericError);
  }
);

export default apiClient;

