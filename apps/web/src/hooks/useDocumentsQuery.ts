import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../utils/api';
export type { CvCreationQuota, DocumentsResponse, SavedDocument } from '@nexcv/api-contracts/documents';
import type { DocumentsResponse } from '@nexcv/api-contracts/documents';

export const documentsQueryKey = ['documents'] as const;
export const documentsStaleTime = 5 * 60 * 1000;

export function fetchDocuments() {
  return apiFetch<DocumentsResponse>('/api/documents');
}

export function useDocumentsQuery() {
  return useQuery({
    queryKey: documentsQueryKey,
    queryFn: fetchDocuments,
    staleTime: documentsStaleTime,
    gcTime: 30 * 60 * 1000,
  });
}

export function useRemoveDocumentFromCache() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.setQueryData<DocumentsResponse>(documentsQueryKey, (current) => {
      if (!current) return current;

      const documents = current.documents.filter((document) => document.id !== id);
      const quota = {
        ...current.quota,
        used: Math.max(current.quota.used - 1, 0),
        remaining: current.quota.remaining === null ? null : current.quota.remaining + 1,
        reached: false,
      };

      return { ...current, documents, quota };
    });
  };
}
