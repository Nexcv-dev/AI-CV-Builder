import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { AuthUser } from '../../../utils/api';
import { apiFetch, getCurrentUser } from '../../../utils/api';
import { clearPageScrollLock } from '../../../utils/scrollLock';
import type { AdminSummary } from '../adminTypes';

export function useAdminBootstrap() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    clearPageScrollLock();
    let ignore = false;

    async function loadAdmin() {
      try {
        const [currentUser, adminSummary] = await Promise.all([
          getCurrentUser(),
          apiFetch<AdminSummary>('/api/admin/summary'),
        ]);

        if (ignore) return;
        setUser(currentUser);
        setSummary(adminSummary);
      } catch (error) {
        if (!ignore) {
          toast.error(error instanceof Error ? error.message : 'Could not load admin panel.');
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    void loadAdmin();
    return () => {
      ignore = true;
    };
  }, []);

  return {
    isLoading,
    summary,
    user,
  };
}
