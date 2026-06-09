import { describe, expect, it } from 'vitest';
import { ADMIN_ROLES, ALL_USER_ROLES, getRoleAccess, hasAdminPermission, isAdminRole, isUserRole } from './admin';

describe('admin contracts', () => {
  it('keeps role guards aligned with exported roles', () => {
    expect(ADMIN_ROLES).toContain('super_admin');
    expect(ALL_USER_ROLES).toContain('user');
    expect(isAdminRole('template_manager')).toBe(true);
    expect(isAdminRole('user')).toBe(false);
    expect(isUserRole('user')).toBe(true);
  });

  it('checks permissions by role', () => {
    expect(hasAdminPermission({ role: 'billing_manager' }, 'billing.write')).toBe(true);
    expect(hasAdminPermission({ role: 'billing_manager' }, 'templates.write')).toBe(false);
  });

  it('returns role navigation access', () => {
    expect(getRoleAccess('support_agent')).toEqual(['dashboard', 'support']);
    expect(getRoleAccess('user')).toEqual([]);
  });
});
