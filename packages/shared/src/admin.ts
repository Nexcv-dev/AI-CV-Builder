export type AdminRole =
  | 'super_admin'
  | 'admin_manager'
  | 'billing_manager'
  | 'template_manager'
  | 'support_agent'
  | 'analyst';

export type UserRole = 'user' | AdminRole;

export type AdminPermission =
  | 'dashboard.read'
  | 'users.read'
  | 'users.plan.update'
  | 'users.role.update'
  | 'templates.read'
  | 'templates.write'
  | 'templates.publish'
  | 'billing.read'
  | 'billing.write'
  | 'support.read'
  | 'support.write'
  | 'settings.read'
  | 'settings.write'
  | 'email.read'
  | 'email.write'
  | 'roles.read'
  | 'audit.read';

export const ADMIN_ROLES = [
  'super_admin',
  'admin_manager',
  'billing_manager',
  'template_manager',
  'support_agent',
  'analyst',
] as const satisfies readonly AdminRole[];

export const ALL_USER_ROLES = ['user', ...ADMIN_ROLES] as const satisfies readonly UserRole[];

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  admin_manager: 'Admin Manager',
  billing_manager: 'Billing Manager',
  template_manager: 'Template Manager',
  support_agent: 'Support Agent',
  analyst: 'Analyst',
};

export const ADMIN_ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  super_admin: [
    'dashboard.read',
    'users.read',
    'users.plan.update',
    'users.role.update',
    'templates.read',
    'templates.write',
    'templates.publish',
    'billing.read',
    'billing.write',
    'support.read',
    'support.write',
    'settings.read',
    'settings.write',
    'email.read',
    'email.write',
    'roles.read',
    'audit.read',
  ],
  admin_manager: ['dashboard.read', 'users.read', 'users.plan.update'],
  billing_manager: ['dashboard.read', 'billing.read', 'billing.write'],
  template_manager: ['dashboard.read', 'templates.read', 'templates.write', 'templates.publish'],
  support_agent: ['dashboard.read', 'support.read', 'support.write'],
  analyst: ['dashboard.read'],
};

export const ADMIN_ROLE_ACCESS: Record<AdminRole, string[]> = {
  super_admin: ['dashboard', 'analytics', 'users', 'templates', 'billing', 'promotions', 'cms', 'notifications', 'support', 'settings', 'roles', 'audit'],
  admin_manager: ['dashboard', 'users'],
  billing_manager: ['dashboard', 'billing', 'promotions'],
  template_manager: ['dashboard', 'templates'],
  support_agent: ['dashboard', 'support'],
  analyst: ['dashboard', 'analytics'],
};

export function isAdminRole(role: unknown): role is AdminRole {
  return typeof role === 'string' && ADMIN_ROLES.includes(role as AdminRole);
}

export function isUserRole(role: unknown): role is UserRole {
  return typeof role === 'string' && ALL_USER_ROLES.includes(role as UserRole);
}

export function hasAdminPermission(user: { role?: unknown } | null | undefined, permission: AdminPermission) {
  return isAdminRole(user?.role) && ADMIN_ROLE_PERMISSIONS[user.role].includes(permission);
}

export function getRoleAccess(role: unknown) {
  return isAdminRole(role) ? ADMIN_ROLE_ACCESS[role] : [];
}
