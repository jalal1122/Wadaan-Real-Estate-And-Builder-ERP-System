import { useQuery } from '@tanstack/react-query';
import { fetchDocumentArchive } from '../api/documentApi';
import { DocumentArchiveFilter, DocumentArchiveResponse } from '../types';

export const useDocumentArchive = (filter: DocumentArchiveFilter) => {
  return useQuery<DocumentArchiveResponse, Error>({
    queryKey: ['documents', 'archive', filter],
    queryFn: () => fetchDocumentArchive(filter),
    staleTime: 1000 * 15,
  });
};
