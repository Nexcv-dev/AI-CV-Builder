import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../../utils/api';
import type { AdminUserDetail, AdminUserDocument, AdminUserListItem } from '../adminTypes';

export function useAdminUsers({ enabled }: { enabled: boolean }) {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [selectedUserDocuments, setSelectedUserDocuments] = useState<AdminUserDocument[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'payg' | 'monthly'>('free');
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let ignore = false;
    const timer = window.setTimeout(async () => {
      setUsersLoading(true);
      try {
        const params = new URLSearchParams();
        if (userSearch.trim()) params.set('search', userSearch.trim());
        if (planFilter !== 'all') params.set('plan', planFilter);
        if (roleFilter !== 'all') params.set('role', roleFilter);
        const data = await apiFetch<{ users: AdminUserListItem[] }>(`/api/admin/users?${params.toString()}`);
        if (!ignore) setUsers(data.users);
      } catch (error) {
        if (!ignore) toast.error(error instanceof Error ? error.message : 'Could not load users.');
      } finally {
        if (!ignore) setUsersLoading(false);
      }
    }, 250);

    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [enabled, planFilter, roleFilter, userSearch]);

  const openUserDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const data = await apiFetch<{ user: AdminUserDetail; documents: AdminUserDocument[] }>(`/api/admin/users/${id}`);
      setSelectedUser(data.user);
      setSelectedPlan(data.user.rawPlan);
      setSelectedUserDocuments(data.documents);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load user details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const updateSelectedUserPlan = async () => {
    if (!selectedUser) return;
    setSavingPlan(true);
    try {
      const data = await apiFetch<{ user: AdminUserListItem }>(`/api/admin/users/${selectedUser.id}/plan`, {
        method: 'PATCH',
        body: JSON.stringify({ plan: selectedPlan }),
      });
      setUsers((items) => items.map((item) => item.id === data.user.id ? { ...item, ...data.user } : item));
      setSelectedUser((current) => current ? { ...current, ...data.user } : current);
      toast.success('User plan updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update plan.');
    } finally {
      setSavingPlan(false);
    }
  };

  return {
    detailLoading,
    openUserDetail,
    planFilter,
    roleFilter,
    savingPlan,
    selectedPlan,
    selectedUser,
    selectedUserDocuments,
    setPlanFilter,
    setRoleFilter,
    setSelectedPlan,
    setSelectedUser,
    setUsers,
    setUserSearch,
    updateSelectedUserPlan,
    userSearch,
    users,
    usersLoading,
  };
}
