import {
  Bell,
  BarChart3,
  CreditCard,
  History,
  LayoutDashboard,
  LayoutTemplate,
  MessageSquare,
  Palette,
  Settings,
  Shield,
  Tag,
  Users,
} from 'lucide-react';
import type { AdminBillingPlan, AdminBillingPlanDraft } from './adminTypes';

export const adminNavItems = [
  { key: 'dashboard', label: 'Dashboard', to: '/admin', icon: LayoutDashboard },
  { key: 'analytics', label: 'Analytics', to: '/admin/analytics', icon: BarChart3 },
  { key: 'users', label: 'Users', to: '/admin/users', icon: Users },
  { key: 'templates', label: 'Templates', to: '/admin/templates', icon: LayoutTemplate },
  { key: 'billing', label: 'Billing', to: '/admin/billing', icon: CreditCard },
  { key: 'promotions', label: 'Promotions', to: '/admin/promotions', icon: Tag },
  { key: 'cms', label: 'CMS', to: '/admin/cms', icon: Palette },
  { key: 'notifications', label: 'Notifications', to: '/admin/notifications', icon: Bell },
  { key: 'support', label: 'Support', to: '/admin/support', icon: MessageSquare },
  { key: 'audit', label: 'Audit Logs', to: '/admin/audit', icon: History },
  { key: 'settings', label: 'Settings', to: '/admin/settings', icon: Settings },
  { key: 'roles', label: 'Roles', to: '/admin/roles', icon: Shield },
];

export const emptyCustomTemplateForm = {
  key: '',
  label: '',
  category: 'Modern',
  access: 'paid' as 'free' | 'paid',
  surfaceColorRole: 'none' as 'none' | 'sidebar' | 'header',
  surfaceColorLabel: '',
  indexHtml: '',
  styleCss: '',
  thumbnailDataUrl: '',
  status: 'draft' as 'draft' | 'active',
};

export function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

export function formatCurrency(cents: number, currency: string) {
  return `${currency} ${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Math.round(cents / 100))}`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

export function billingPlanDraftFromPlan(plan: AdminBillingPlan): AdminBillingPlanDraft {
  return {
    label: plan.label,
    amount: String(Math.round(plan.baseAmountCents || plan.cents) / 100),
    promotionActive: Boolean(plan.promotionActive),
    promotionLabel: plan.promotionLabel || '',
    promotionDiscountType: plan.promotionDiscountType || 'fixed' as 'fixed' | 'percent',
    promotionDiscountValue: plan.promotionDiscountType === 'percent'
      ? String(plan.promotionDiscountValue || '')
      : String(Math.round((plan.promotionDiscountValue || 0) / 100)),
  };
}
