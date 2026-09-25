import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import {
  LoginCredentials,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ApiResponse,
  UserContext,
  ApiErrorPayload,
  LockoutStatus,
} from '../types/api';

export const getLockoutStatus = async (): Promise<LockoutStatus> => {
  const res = await apiClient.get<ApiResponse<LockoutStatus>>('/auth/lockout-status');
  return res.data.data as LockoutStatus;
};

export function useAuth() {
  const queryClient = useQueryClient();

  const currentUserQuery = useQuery<UserContext | null>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const res = await apiClient.get<ApiResponse<UserContext>>('/auth/me');
        return res.data.data || null;
      } catch (err: unknown) {
        const apiErr = err as Partial<ApiErrorPayload> | undefined;
        if (apiErr?.code === 'UNAUTHORIZED' || apiErr?.code === 'TOKEN_EXPIRED') {
          return null;
        }
        throw err;
      }
    },
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const res = await apiClient.post<ApiResponse<UserContext>>('/auth/login', credentials);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<ApiResponse>('/auth/logout');
      return res.data;
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (payload: ForgotPasswordRequest) => {
      const res = await apiClient.post<ApiResponse>('/auth/forgot-password', payload);
      return res.data;
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (payload: ResetPasswordRequest) => {
      const res = await apiClient.post<ApiResponse>('/auth/reset-password', payload);
      return res.data;
    },
  });

  return {
    currentUser: currentUserQuery.data,
    isLoadingUser: currentUserQuery.isLoading,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error as ApiErrorPayload | null,
    logout: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,
    forgotPassword: forgotPasswordMutation.mutateAsync,
    isRequestingReset: forgotPasswordMutation.isPending,
    resetPassword: resetPasswordMutation.mutateAsync,
    isResettingPassword: resetPasswordMutation.isPending,
    getLockoutStatus,
  };
}
