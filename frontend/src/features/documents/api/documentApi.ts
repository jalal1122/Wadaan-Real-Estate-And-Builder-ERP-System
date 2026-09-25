import { apiClient } from '@/lib/api';
import { ApiResponse } from '@/types/api';
import { DocumentArchiveFilter, DocumentArchiveResponse } from '../types';

export const fetchDocumentArchive = async (
  filter: DocumentArchiveFilter = {}
): Promise<DocumentArchiveResponse> => {
  const params: Record<string, any> = {};
  if (filter.search) params.search = filter.search;
  if (filter.type && filter.type !== 'ALL') params.type = filter.type;
  if (filter.startDate) params.startDate = filter.startDate;
  if (filter.endDate) params.endDate = filter.endDate;
  if (filter.page) params.page = filter.page;
  if (filter.pageSize) params.pageSize = filter.pageSize;

  const response = await apiClient.get<ApiResponse<DocumentArchiveResponse>>('/documents/archive', {
    params,
  });
  return response.data.data!;
};
