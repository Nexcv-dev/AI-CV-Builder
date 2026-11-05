import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../../utils/api';
import { isAdminRole, type UserRole } from '../adminPermissions';
import type { AdminRoleConfig, AdminUserListItem } from '../adminTypes';

export function useAdminRoles({ enabled }: { enabled: boolean }) {
  const [roles, setRoles] = useState<AdminRoleConfig[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUserListItem[]>([]);
  // Recent accounts offered for role assignment. The page lists the regular users among them.
  const [recentUsers, setRecentUsers] = useState<AdminUserListItem[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [savingRoleUserId, setSavingRoleUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let ignore = false;
    setRolesLoading(true);

    Promise.all([
      apiFetch<{ roles: AdminRoleConfig[]; admins: AdminUserListItem[] }>('/api/admin/roles'),
      apiFetch<{ users: AdminUserListItem[] }>('/api/admin/users?limit=20'),
    ])
      .then(([roleData, userData]) => {
        if (ignore) return;
        setRoles(roleData.roles);
        setAdminUsers(roleData.admins);
        setRecentUsers(userData.users);
      })
      .catch((error) => {
        if (!ignore) toast.error(error instanceof Error ? error.message : 'Could not load roles.');
      })
      .finally(() => {
        if (!ignore) setRolesLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [enabled]);

  const changeUserRole = async (userId: string, role: UserRole) => {
    setSavingRoleUserId(userId);
    try {
      const data = await apiFetch<{ user: AdminUserListItem }>(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      setRecentUsers((items) => items.map((item) => item.id === data.user.id ? { ...item, ...data.user } : item));
      setAdminUsers((items) => {
        const withoutUser = items.filter((item) => item.id !== data.user.id);
        return isAdminRole(data.user.role) ? [data.user, ...withoutUser] : withoutUser;
      });
      toast.success(role === 'user' ? 'Admin access removed.' : 'User role updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update role.');
    } finally {
      setSavingRoleUserId(null);
    }
  };

  return {
    adminUsers,
    changeUserRole,
    recentUsers,
    roles,
    rolesLoading,
    savingRoleUserId,
  };
}
