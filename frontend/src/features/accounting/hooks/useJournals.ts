import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createJournalEntry, fetchJournalEntries } from '../api/journalsApi';
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
    },
  });
};
