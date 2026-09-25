import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchPersonalContacts,
  fetchPersonalContactById,
  createPersonalContact,
  updatePersonalContact,
  deletePersonalContact,
  createPersonalLoan,
  deletePersonalLoan,
  addPersonalRepayment,
} from '../api/personalApi';
import {
  PersonalContactsListResponse,
  PersonalContactDetailResponse,
  CreateContactPayload,
  CreateLoanPayload,
  AddRepaymentPayload,
} from '../types';

export const usePersonalContacts = () => {
  return useQuery<PersonalContactsListResponse, Error>({
    queryKey: ['personal-contacts'],
    queryFn: fetchPersonalContacts,
    retry: false,
    staleTime: 1000 * 60 * 2,
  });
};

export const usePersonalContact = (id: string | null | undefined) => {
  return useQuery<PersonalContactDetailResponse, Error>({
    queryKey: ['personal-contacts', id],
    queryFn: () => fetchPersonalContactById(id!),
    enabled: !!id,
    retry: false,
  });
};

export const useCreateContact = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, CreateContactPayload>({
    mutationFn: (payload) => createPersonalContact(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-contacts'] });
    },
  });
};

export const useUpdateContact = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { id: string; payload: Partial<CreateContactPayload> }>({
    mutationFn: ({ id, payload }) => updatePersonalContact(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['personal-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['personal-contacts', id] });
    },
  });
};

export const useDeleteContact = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, string>({
    mutationFn: (id) => deletePersonalContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-contacts'] });
    },
  });
};

export const useCreateLoan = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { contactId: string; payload: CreateLoanPayload }>({
    mutationFn: ({ contactId, payload }) => createPersonalLoan(contactId, payload),
    onSuccess: (_, { contactId }) => {
      queryClient.invalidateQueries({ queryKey: ['personal-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['personal-contacts', contactId] });
    },
  });
};

export const useDeleteLoan = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { contactId: string; loanId: string }>({
    mutationFn: ({ loanId }) => deletePersonalLoan(loanId),
    onSuccess: (_, { contactId }) => {
      queryClient.invalidateQueries({ queryKey: ['personal-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['personal-contacts', contactId] });
    },
  });
};

export const useAddRepayment = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { contactId: string; loanId: string; payload: AddRepaymentPayload }>({
    mutationFn: ({ loanId, payload }) => addPersonalRepayment(loanId, payload),
    onSuccess: (_, { contactId }) => {
      queryClient.invalidateQueries({ queryKey: ['personal-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['personal-contacts', contactId] });
    },
  });
};
