import { AuthUser } from './utils/api';
import {
  ADMIN_ROLE_ACCESS,
  ADMIN_ROLE_LABELS,
  ADMIN_ROLE_PERMISSIONS,
  ADMIN_ROLES,
  ALL_USER_ROLES,
  getRoleAccess,
  hasAdminPermission,
  isAdminRole,
  isUserRole,
} from './adminAccess';

export {
  ADMIN_ROLE_ACCESS,
  ADMIN_ROLE_LABELS,
  ADMIN_ROLE_PERMISSIONS,
  ADMIN_ROLES,
  ALL_USER_ROLES,
  getRoleAccess,
  hasAdminPermission,
  isAdminRole,
  isUserRole,
};
export type { AdminPermission, AdminRole, UserRole } from './adminAccess';

export function isAdminUser(user: AuthUser | null | undefined) {
  return isAdminRole(user?.role);
}
