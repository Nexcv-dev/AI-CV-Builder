import { AuthUser } from './utils/api';

export type AdminRole = 'super_admin' | 'admin_manager' | 'editor' | 'support_agent' | 'analyst';

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  admin_manager: 'Admin Manager',
  editor: 'Editor',
  support_agent: 'Support Agent',
  analyst: 'Analyst',
};

export const ADMIN_ROLE_ACCESS: Record<AdminRole, string[]> = {
  super_admin: ['dashboard', 'users', 'templates', 'billing', 'promotions', 'cms', 'notifications', 'support', 'settings', 'roles'],
  admin_manager: ['dashboard', 'users', 'templates'],
  editor: ['dashboard', 'cms'],
  support_agent: ['dashboard', 'support'],
  analyst: ['dashboard', 'reports'],
};

export function isAdminUser(user: AuthUser | null | undefined) {
  return user?.role === 'super_admin';
}
