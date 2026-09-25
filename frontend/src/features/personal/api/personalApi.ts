import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/api';
import {
  PersonalContactsListResponse,
  PersonalContactDetailResponse,
  CreateContactPayload,
  CreateLoanPayload,
  AddRepaymentPayload,
} from '../types';

export const fetchPersonalContacts = async (): Promise<PersonalContactsListResponse> => {
  const response = await apiClient.get<ApiResponse<PersonalContactsListResponse>>('/personal/contacts');
  return response.data.data!;
};

export const fetchPersonalContactById = async (id: string): Promise<PersonalContactDetailResponse> => {
  const response = await apiClient.get<ApiResponse<PersonalContactDetailResponse>>(`/personal/contacts/${id}`);
  return response.data.data!;
};

export const createPersonalContact = async (payload: CreateContactPayload) => {
  const response = await apiClient.post<ApiResponse<any>>('/personal/contacts', payload);
  return response.data.data!;
};

export const updatePersonalContact = async (id: string, payload: Partial<CreateContactPayload>) => {
  const response = await apiClient.patch<ApiResponse<any>>(`/personal/contacts/${id}`, payload);
  return response.data.data!;
};

export const deletePersonalContact = async (id: string) => {
  const response = await apiClient.delete<ApiResponse<any>>(`/personal/contacts/${id}`);
  return response.data;
};

export const createPersonalLoan = async (contactId: string, payload: CreateLoanPayload) => {
  const response = await apiClient.post<ApiResponse<any>>(`/personal/contacts/${contactId}/loans`, payload);
  return response.data.data!;
};

export const deletePersonalLoan = async (loanId: string) => {
  const response = await apiClient.delete<ApiResponse<any>>(`/personal/loans/${loanId}`);
  return response.data;
};

export const addPersonalRepayment = async (loanId: string, payload: AddRepaymentPayload) => {
  const response = await apiClient.post<ApiResponse<any>>(`/personal/loans/${loanId}/repayments`, payload);
  return response.data.data!;
};
