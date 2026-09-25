import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/api';
import { CreateJournalPayload, JournalEntry, JournalEntriesResponse } from '../types/journal';

/**
 * Creates a new manual double-entry journal voucher.
 * POST /api/v1/journals
 */
export const createJournalEntry = async (
  payload: CreateJournalPayload
): Promise<JournalEntry> => {
  const response = await apiClient.post<ApiResponse<JournalEntry>>('/journals', payload);
  return response.data.data!;
};

/**
 * Fetches a paginated list of all journal entries, newest first.
 * GET /api/v1/journals?page=1&limit=20
 */
export const fetchJournalEntries = async (
  page: number = 1,
  limit: number = 20
): Promise<JournalEntriesResponse> => {
  const response = await apiClient.get<ApiResponse<JournalEntriesResponse>>(
    `/journals?page=${page}&limit=${limit}`
  );
  return response.data.data!;
};
