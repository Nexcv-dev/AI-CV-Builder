import { adminNavItems } from './adminUtils';

export type AdminPageKey =
  | 'dashboard'
  | 'analytics'
  | 'users'
  | 'templates'
  | 'billing'
  | 'promotions'
  | 'cms'
  | 'notifications'
  | 'support'
  | 'audit'
  | 'settings'
  | 'roles';

interface AdminPageMeta {
  title: string;
  description: string;
  /** Placeholder for the header search box, or null to hide it on this page. */
  searchPlaceholder: string | null;
}

export const ADMIN_PAGE_META: Record<AdminPageKey, AdminPageMeta> = {
  dashboard: {
    title: 'Admin Dashboard',
    description: 'Operational overview and module foundation.',
    searchPlaceholder: 'Search admin modules',
  },
  analytics: {
    title: 'Analytics Dashboard',
    description: 'Track signups, CV saves, downloads, checkout conversion, and template usage.',
    searchPlaceholder: null,
  },
  users: {
    title: 'User Management',
    description: 'Search users, inspect accounts, and update plan access.',
    searchPlaceholder: 'Search users',
  },
  templates: {
    title: 'Template Management',
    description: 'Manage template metadata, access, categories, and usage stats.',
    searchPlaceholder: 'Search templates',
  },
  billing: {
    title: 'Billing Management',
    description: 'Review payment history, revenue, and transaction status.',
    searchPlaceholder: 'Search payments',
  },
  promotions: {
    title: 'Promotions & Pricing',
    description: 'Manage plan pricing, promotions, and discount coupons.',
    searchPlaceholder: null,
  },
  cms: {
    title: 'CMS Management',
    description: 'Manage landing page content, FAQs, pricing copy, legal pages, and announcements.',
    searchPlaceholder: null,
  },
  notifications: {
    title: 'Email Notifications',
    description: 'Manage transactional email templates and service delivery status.',
    searchPlaceholder: null,
  },
  support: {
    title: 'Support Tickets',
    description: 'Track complaints, bugs, feature requests, and payment issues.',
    searchPlaceholder: 'Search tickets',
  },
  audit: {
    title: 'Audit Logs',
    description: 'Track sensitive admin changes across users, billing, templates, and support.',
    searchPlaceholder: null,
  },
  settings: {
    title: 'Admin Settings',
    description: 'Review runtime, security, and app configuration status.',
    searchPlaceholder: null,
  },
  roles: {
    title: 'Roles & Access',
    description: 'Manage super admin access and review admin permissions.',
    searchPlaceholder: null,
  },
};

/** The nav item for a path: `/admin` matches exactly, every other item by prefix. Unknown paths fall back to the dashboard. */
export function activeAdminNavItem(pathname: string) {
  return adminNavItems.find((item) => item.to === '/admin' ? pathname === '/admin' : pathname.startsWith(item.to)) || adminNavItems[0];
}

export function adminPageKey(navKey: string): AdminPageKey {
  return navKey in ADMIN_PAGE_META ? navKey as AdminPageKey : 'dashboard';
}
