import type { IUser } from './User';
import { isAdminRole, type UserRole } from '@nexcv/shared/admin';
export type { UserRole } from '@nexcv/shared/admin';

export const DEFAULT_USER_ROLE: UserRole = 'user';
export const SUPER_ADMIN_ROLE: UserRole = 'super_admin';

export function getSuperAdminEmails() {
  return (process.env.SUPER_ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperAdminEmail(email: unknown) {
  return typeof email === 'string' && getSuperAdminEmails().includes(email.trim().toLowerCase());
}

export function roleForEmail(email: unknown): UserRole {
  return isSuperAdminEmail(email) ? SUPER_ADMIN_ROLE : DEFAULT_USER_ROLE;
}

export async function syncUserRoleFromAllowlist(user: IUser) {
  if (isSuperAdminEmail(user.email) && user.role !== SUPER_ADMIN_ROLE) {
    user.role = SUPER_ADMIN_ROLE;
  }
  if (typeof user.isModified === 'function' ? user.isModified() : true) {
    await user.save();
  }
  return user;
}

export function isSuperAdmin(user: Pick<IUser, 'role'> | null | undefined) {
  return user?.role === SUPER_ADMIN_ROLE;
}

export function isAdminUserRole(user: Pick<IUser, 'role'> | null | undefined) {
  return isAdminRole(user?.role);
}
