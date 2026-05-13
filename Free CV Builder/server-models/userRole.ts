import type { IUser } from './User';

export type UserRole = 'user' | 'super_admin';

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
  const nextRole = roleForEmail(user.email);
  if (user.role !== nextRole) {
    user.role = nextRole;
  }
  if (typeof user.isModified === 'function' ? user.isModified() : true) {
    await user.save();
  }
  return user;
}

export function isSuperAdmin(user: Pick<IUser, 'role'> | null | undefined) {
  return user?.role === SUPER_ADMIN_ROLE;
}
