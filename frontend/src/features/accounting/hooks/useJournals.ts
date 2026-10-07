import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createJournalEntry,
  fetchJournalEntries,
  reverseJournalEntry,
  reverseLastJournalEntry,
} from '../api/journalsApi';
import { CreateJournalPayload, JournalEntriesResponse, JournalEntry } from '../types/journal';

/**
 * Hook to fetch a paginated list of journal entries (newest first).
 */
export const useJournalEntries = (page: number = 1, limit: number = 20) => {
  return useQuery<JournalEntriesResponse, Error>({
    queryKey: ['journals', { page, limit }],
    queryFn: () => fetchJournalEntries(page, limit),
    staleTime: 1000 * 60, // 1 minute stale time
  });
};

/**
 * Hook to post a new manual journal entry.
 * On success, invalidates both journals (list) and accounts (live balances) queries.
 */
export const useCreateJournal = () => {
  const queryClient = useQueryClient();

  return useMutation<JournalEntry, Error, CreateJournalPayload>({
    mutationFn: (payload: CreateJournalPayload) => createJournalEntry(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journals'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] }); // Refresh live balances
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['trial-balance'] });
      queryClient.invalidateQueries({ queryKey: ['account-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
};

/**
 * Hook to reverse a specific journal entry by ID.
 */
export const useReverseJournal = () => {
  const queryClient = useQueryClient();

  return useMutation<JournalEntry, Error, string>({
    mutationFn: (id: string) => reverseJournalEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journals'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['trial-balance'] });
      queryClient.invalidateQueries({ queryKey: ['account-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
};

/**
 * Hook to revert the last posted non-reversal journal entry in the ledger.
 */
export const useRevertLastJournal = () => {
  const queryClient = useQueryClient();

  return useMutation<{ reversal: JournalEntry; original: JournalEntry }, Error, void>({
    mutationFn: () => reverseLastJournalEntry(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journals'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['trial-balance'] });
      queryClient.invalidateQueries({ queryKey: ['account-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
};
