import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthUser, getCurrentUser } from '../utils/api';

export const currentUserQueryKey = ['current-user'] as const;
export const currentUserStaleTime = 5 * 60 * 1000;

export function useCurrentUserQuery() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: currentUserQueryKey,
    queryFn: getCurrentUser,
    staleTime: currentUserStaleTime,
    gcTime: 30 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    const syncCurrentUser = (event: Event) => {
      queryClient.setQueryData<AuthUser | null>(
        currentUserQueryKey,
        (event as CustomEvent<AuthUser | undefined>).detail || null,
      );
    };

    window.addEventListener('auth-user-changed', syncCurrentUser);
    return () => window.removeEventListener('auth-user-changed', syncCurrentUser);
  }, [queryClient]);

  return query;
}

export function useSetCurrentUserCache() {
  const queryClient = useQueryClient();

  return (user: AuthUser | null) => {
    queryClient.setQueryData<AuthUser | null>(currentUserQueryKey, user);
  };
}
