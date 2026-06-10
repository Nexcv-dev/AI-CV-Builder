import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { ADMIN_ROLE_LABELS, getRoleAccess, hasAdminPermission, isAdminRole, type UserRole } from './adminPermissions';
import { apiFetch } from '../../utils/api';

import type {
  AdminBillingPlan,
  AdminBillingPlanDraft,
  AdminAuditLogItem,
  AdminCoupon,
  AdminPaymentItem,
  AdminPaymentSummary,
  AdminRoleConfig,
  AdminSettingsSummary,
  AdminSupportTicket,
  AdminUserListItem,
} from './adminTypes';
import { adminNavItems } from './adminUtils';
import { AdminMobileNav, AdminPageHeader, AdminSidebar } from './AdminShellComponents';
import { AdminOverviewSection, AnalyticsDashboardSection } from './AdminOverviewSections';
import { useAdminBootstrap } from './hooks/useAdminBootstrap';
import { useAdminTemplates } from './hooks/useAdminTemplates';
import { useAdminUsers } from './hooks/useAdminUsers';

const UserManagementSection = lazy(() => import('./UserManagementSection'));
const TemplateManagementSection = lazy(() => import('./TemplateManagementSection'));
const BillingManagementSection = lazy(() => import('./BillingManagementSection'));
const PromotionManagementSection = lazy(() => import('./PromotionManagementSection'));
const SupportManagementSection = lazy(() => import('./SupportManagementSection'));
const RoleManagementSection = lazy(() => import('./RoleManagementSection'));
const SettingsManagementSection = lazy(() => import('./SettingsManagementSection'));
const EmailManagementSection = lazy(() => import('./EmailManagementSection'));
const AuditLogSection = lazy(() => import('./AuditLogSection'));

function AdminSectionFallback() {
  return (
    <div className="mt-10 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm font-bold text-slate-400">
      <Loader2 className="animate-spin text-violet-300" size={18} />
      Loading admin section...
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading, summary, user } = useAdminBootstrap();
  const isUsersPage = location.pathname.startsWith('/admin/users');
  const isAnalyticsPage = location.pathname.startsWith('/admin/analytics');
  const isTemplatesPage = location.pathname.startsWith('/admin/templates');
  const isBillingPage = location.pathname.startsWith('/admin/billing');
  const isPromotionsPage = location.pathname.startsWith('/admin/promotions');
  const isCmsPage = location.pathname.startsWith('/admin/cms');
  const isSupportPage = location.pathname.startsWith('/admin/support');
  const isRolesPage = location.pathname.startsWith('/admin/roles');
  const isSettingsPage = location.pathname.startsWith('/admin/settings');
  const isEmailPage = location.pathname.startsWith('/admin/notifications');
  const isAuditPage = location.pathname.startsWith('/admin/audit');
  const {
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
  } = useAdminUsers({ enabled: isUsersPage });
  const {
    changeCustomTemplateStatus,
    createCustomTemplate,
    createTemplateOpen,
    creatingTemplate,
    customTemplateForm,
    openTemplateDetail,
    saveSelectedTemplate,
    savingTemplate,
    selectedTemplate,
    setCreateTemplateOpen,
    setCustomTemplateFile,
    setCustomTemplateForm,
    setSelectedTemplate,
    setSelectedTemplateFile,
    setTemplateAccessFilter,
    setTemplateCategoryFilter,
    setTemplateFileForm,
    setTemplateForm,
    setTemplateSearch,
    templateAccessFilter,
    templateCategories,
    templateCategoryFilter,
    templateFileForm,
    templateForm,
    templateValidation,
    templateWarningConfirmationPending,
    templates,
    templatesLoading,
    templateSearch,
    visibleTemplates,
  } = useAdminTemplates({ enabled: isTemplatesPage || isSettingsPage });
  const [payments, setPayments] = useState<AdminPaymentItem[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<AdminPaymentSummary | null>(null);
  const [billingPlans, setBillingPlans] = useState<AdminBillingPlan[]>([]);
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [couponForm, setCouponForm] = useState({ code: '', label: '', discountType: 'fixed' as 'fixed' | 'percent', discountValue: '', appliesTo: 'pro', maxRedemptions: '25', active: true });
  const [savingBilling, setSavingBilling] = useState(false);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentPlanFilter, setPaymentPlanFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState<AdminPaymentItem | null>(null);
  const [billingReviewNote, setBillingReviewNote] = useState('');
  const [reviewingPaymentId, setReviewingPaymentId] = useState<string | null>(null);
  const [supportTickets, setSupportTickets] = useState<AdminSupportTicket[]>([]);
  const [supportSummary, setSupportSummary] = useState<Record<'open' | 'pending' | 'resolved' | 'closed', number> | null>(null);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportSearch, setSupportSearch] = useState('');
  const [supportStatusFilter, setSupportStatusFilter] = useState('all');
  const [supportTypeFilter, setSupportTypeFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<AdminSupportTicket | null>(null);
  const [ticketForm, setTicketForm] = useState({ status: 'open' as AdminSupportTicket['status'], priority: 'normal' as AdminSupportTicket['priority'], adminNotes: '' });
  const [supportReplyMessage, setSupportReplyMessage] = useState('');
  const [savingTicket, setSavingTicket] = useState(false);
  const [sendingSupportReply, setSendingSupportReply] = useState(false);
  const [roles, setRoles] = useState<AdminRoleConfig[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUserListItem[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [savingRoleUserId, setSavingRoleUserId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AdminSettingsSummary | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogItem[]>([]);
  const [auditActions, setAuditActions] = useState<string[]>([]);
  const [auditTargetTypes, setAuditTargetTypes] = useState<string[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [auditTargetTypeFilter, setAuditTargetTypeFilter] = useState('all');

  useEffect(() => {
    if (!isBillingPage) return;
    let ignore = false;
    const timer = window.setTimeout(async () => {
      setPaymentsLoading(true);
      try {
        const params = new URLSearchParams();
        if (paymentSearch.trim()) params.set('search', paymentSearch.trim());
        if (paymentPlanFilter !== 'all') params.set('plan', paymentPlanFilter);
        if (paymentStatusFilter !== 'all') params.set('status', paymentStatusFilter);
        const data = await apiFetch<{ payments: AdminPaymentItem[]; summary: AdminPaymentSummary }>(`/api/admin/payments?${params.toString()}`);
        if (ignore) return;
        setPayments(data.payments);
        setPaymentSummary(data.summary);
      } catch (error) {
        if (!ignore) toast.error(error instanceof Error ? error.message : 'Could not load payments.');
      } finally {
        if (!ignore) setPaymentsLoading(false);
      }
    }, 250);

    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [isBillingPage, paymentPlanFilter, paymentSearch, paymentStatusFilter]);

  useEffect(() => {
    if (!isPromotionsPage) return;
    let ignore = false;
    apiFetch<{ plans: AdminBillingPlan[]; coupons: AdminCoupon[] }>('/api/admin/billing/config')
      .then((data) => {
        if (ignore) return;
        setBillingPlans(data.plans);
        setCoupons(data.coupons);
      })
      .catch((error) => {
        if (!ignore) toast.error(error instanceof Error ? error.message : 'Could not load billing settings.');
      });
    return () => {
      ignore = true;
    };
  }, [isPromotionsPage]);

  useEffect(() => {
    if (!isSupportPage) return;
    let ignore = false;
    const timer = window.setTimeout(async () => {
      setSupportLoading(true);
      try {
        const params = new URLSearchParams();
        if (supportSearch.trim()) params.set('search', supportSearch.trim());
        if (supportStatusFilter !== 'all') params.set('status', supportStatusFilter);
        if (supportTypeFilter !== 'all') params.set('type', supportTypeFilter);
        const data = await apiFetch<{ tickets: AdminSupportTicket[]; summary: Record<'open' | 'pending' | 'resolved' | 'closed', number> }>(`/api/admin/support/tickets?${params.toString()}`);
        if (ignore) return;
        setSupportTickets(data.tickets);
        setSupportSummary(data.summary);
      } catch (error) {
        if (!ignore) toast.error(error instanceof Error ? error.message : 'Could not load support tickets.');
      } finally {
        if (!ignore) setSupportLoading(false);
      }
    }, 250);

    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [isSupportPage, supportSearch, supportStatusFilter, supportTypeFilter]);

  useEffect(() => {
    if (!isRolesPage) return;
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
        setUsers(userData.users);
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
  }, [isRolesPage]);

  useEffect(() => {
    if (!isSettingsPage && !isEmailPage && !isCmsPage) return;
    let ignore = false;
    setSettingsLoading(true);

    apiFetch<AdminSettingsSummary>('/api/admin/settings')
      .then((data) => {
        if (!ignore) setSettings(data);
      })
      .catch((error) => {
        if (!ignore) toast.error(error instanceof Error ? error.message : 'Could not load settings.');
      })
      .finally(() => {
        if (!ignore) setSettingsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [isCmsPage, isEmailPage, isSettingsPage]);

  useEffect(() => {
    if (!isAuditPage) return;
    let ignore = false;
    const timer = window.setTimeout(async () => {
      setAuditLoading(true);
      try {
        const params = new URLSearchParams();
        if (auditSearch.trim()) params.set('search', auditSearch.trim());
        if (auditActionFilter !== 'all') params.set('action', auditActionFilter);
        if (auditTargetTypeFilter !== 'all') params.set('targetType', auditTargetTypeFilter);
        const data = await apiFetch<{ logs: AdminAuditLogItem[]; filters: { actions: string[]; targetTypes: string[] } }>(`/api/admin/audit-logs?${params.toString()}`);
        if (ignore) return;
        setAuditLogs(data.logs);
        setAuditActions(data.filters.actions);
        setAuditTargetTypes(data.filters.targetTypes);
      } catch (error) {
        if (!ignore) toast.error(error instanceof Error ? error.message : 'Could not load audit logs.');
      } finally {
        if (!ignore) setAuditLoading(false);
      }
    }, 250);

    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [auditActionFilter, auditSearch, auditTargetTypeFilter, isAuditPage]);

  const signOut = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    navigate('/');
  };

  const saveSettings = async (appSettings: AdminSettingsSummary['app']) => {
    setSavingSettings(true);
    try {
      const data = await apiFetch<{ app: AdminSettingsSummary['app'] }>('/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({ app: appSettings }),
      });
      setSettings((current) => current ? { ...current, app: data.app } : current);
      toast.success('Settings updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const sendTestEmail = async (recipient: string) => {
    setSendingTestEmail(true);
    try {
      const data = await apiFetch<{ message: string }>('/api/admin/settings/test-email', {
        method: 'POST',
        body: JSON.stringify({ to: recipient }),
      });
      toast.success(data.message || 'Test email sent.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send test email.');
    } finally {
      setSendingTestEmail(false);
    }
  };

  const navAccess = getRoleAccess(user?.role);
  const userRoleLabel = isAdminRole(user?.role) ? ADMIN_ROLE_LABELS[user.role] : 'Admin';
  const canUpdateUserPlans = hasAdminPermission(user, 'users.plan.update');
  const canUpdateRoles = hasAdminPermission(user, 'users.role.update');
  const canUpdateSettings = hasAdminPermission(user, 'settings.write');
  const canUpdateEmail = hasAdminPermission(user, 'email.write');
  const canReviewBilling = hasAdminPermission(user, 'billing.write');
  const activeNav = adminNavItems.find((item) => item.to === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(item.to)) || adminNavItems[0];
  const pageTitle = isUsersPage ? 'User Management' : isAnalyticsPage ? 'Analytics Dashboard' : isTemplatesPage ? 'Template Management' : isBillingPage ? 'Billing Management' : isPromotionsPage ? 'Promotions & Pricing' : isCmsPage ? 'CMS Management' : isSupportPage ? 'Support Tickets' : isRolesPage ? 'Roles & Access' : isSettingsPage ? 'Admin Settings' : isEmailPage ? 'Email Notifications' : isAuditPage ? 'Audit Logs' : 'Admin Dashboard';
  const pageDescription = isUsersPage
    ? 'Search users, inspect accounts, and update plan access.'
    : isAnalyticsPage
      ? 'Track signups, CV saves, downloads, checkout conversion, and template usage.'
      : isTemplatesPage
        ? 'Manage template metadata, access, categories, and usage stats.'
        : isBillingPage
          ? 'Review payment history, revenue, and transaction status.'
          : isPromotionsPage
            ? 'Manage plan pricing, promotions, and discount coupons.'
            : isCmsPage
              ? 'Manage landing page content, FAQs, pricing copy, legal pages, and announcements.'
              : isSupportPage
                ? 'Track complaints, bugs, feature requests, and payment issues.'
                : isRolesPage
                  ? 'Manage super admin access and review admin permissions.'
                  : isSettingsPage
                    ? 'Review runtime, security, and app configuration status.'
                    : isEmailPage
                      ? 'Manage transactional email templates and service delivery status.'
                      : isAuditPage
                        ? 'Track sensitive admin changes across users, billing, templates, and support.'
                        : 'Operational overview and module foundation.';
  const showHeaderSearch = !isAnalyticsPage && !isPromotionsPage && !isCmsPage && !isRolesPage && !isSettingsPage && !isEmailPage && !isAuditPage;
  const searchPlaceholder = isUsersPage ? 'Search users' : isTemplatesPage ? 'Search templates' : isBillingPage ? 'Search payments' : isSupportPage ? 'Search tickets' : 'Search admin modules';
  const maxChartValue = useMemo(() => {
    const values = [
      ...(summary?.charts.userGrowth.map((item) => item.count) || []),
      ...(summary?.charts.cvSavesPerDay.map((item) => item.count) || []),
      ...(summary?.charts.cvDownloadsPerDay.map((item) => item.count) || []),
    ];
    return Math.max(1, ...values);
  }, [summary]);

  const openTicketDetail = (ticket: AdminSupportTicket) => {
    setSelectedTicket(ticket);
    setTicketForm({ status: ticket.status, priority: ticket.priority, adminNotes: ticket.adminNotes || '' });
    setSupportReplyMessage('');
  };

  const openPaymentDetail = (payment: AdminPaymentItem) => {
    setSelectedPayment(payment);
    setBillingReviewNote(payment.reviewNote || '');
  };

  const markBillingReviewResolved = async (payment: AdminPaymentItem) => {
    if (!payment.reviewType) return;
    setReviewingPaymentId(payment.id);
    try {
      const data = await apiFetch<{ payment: AdminPaymentItem }>(`/api/admin/billing/review/${payment.reviewType}/${payment.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ note: billingReviewNote }),
      });
      setPayments((items) => paymentStatusFilter === 'review'
        ? items.filter((item) => item.id !== data.payment.id)
        : items.map((item) => item.id === data.payment.id ? data.payment : item));
      setPaymentSummary((current) => {
        if (!current || payment.billingReviewStatus === 'resolved') return current;
        const isCheckoutReview = payment.reviewType === 'checkout';
        return {
          ...current,
          checkoutReviewCount: isCheckoutReview ? Math.max(0, current.checkoutReviewCount - 1) : current.checkoutReviewCount,
          failedPaymentCount: isCheckoutReview ? current.failedPaymentCount : Math.max(0, current.failedPaymentCount - 1),
        };
      });
      setSelectedPayment(data.payment);
      setBillingReviewNote(data.payment.reviewNote || '');
      toast.success('Billing review resolved.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not resolve billing review.');
    } finally {
      setReviewingPaymentId(null);
    }
  };

  const saveSelectedTicket = async () => {
    if (!selectedTicket) return;
    setSavingTicket(true);
    try {
      const data = await apiFetch<{ ticket: AdminSupportTicket }>(`/api/admin/support/tickets/${selectedTicket.id}`, {
        method: 'PATCH',
        body: JSON.stringify(ticketForm),
      });
      setSupportTickets((items) => items.map((item) => item.id === data.ticket.id ? data.ticket : item));
      setSelectedTicket(data.ticket);
      setTicketForm({ status: data.ticket.status, priority: data.ticket.priority, adminNotes: data.ticket.adminNotes || '' });
      toast.success('Support ticket updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update support ticket.');
    } finally {
      setSavingTicket(false);
    }
  };

  const sendSupportReply = async () => {
    if (!selectedTicket) return;
    setSendingSupportReply(true);
    try {
      const data = await apiFetch<{ ticket: AdminSupportTicket; message: string }>(`/api/admin/support/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ replyMessage: supportReplyMessage }),
      });
      setSupportTickets((items) => items.map((item) => item.id === data.ticket.id ? data.ticket : item));
      setSelectedTicket(data.ticket);
      setTicketForm({ status: data.ticket.status, priority: data.ticket.priority, adminNotes: data.ticket.adminNotes || '' });
      setSupportReplyMessage('');
      toast.success(data.message || 'Support reply sent.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send support reply.');
    } finally {
      setSendingSupportReply(false);
    }
  };

  const changeUserRole = async (userId: string, role: UserRole) => {
    setSavingRoleUserId(userId);
    try {
      const data = await apiFetch<{ user: AdminUserListItem }>(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      setUsers((items) => items.map((item) => item.id === data.user.id ? { ...item, ...data.user } : item));
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

  const updateBillingPlanPrice = async (plan: AdminBillingPlan, draft: AdminBillingPlanDraft) => {
    setSavingBilling(true);
    try {
      const amountCents = Math.round(Number(draft.amount) * 100);
      const data = await apiFetch<{ plan: AdminBillingPlan }>(`/api/admin/billing/plans/${plan.plan}`, {
        method: 'PATCH',
        body: JSON.stringify({
          label: draft.label,
          market: plan.market,
          amountCents,
          promotionActive: draft.promotionActive,
          promotionLabel: draft.promotionLabel,
          promotionDiscountType: draft.promotionDiscountType,
          promotionDiscountValue: draft.promotionDiscountType === 'fixed'
            ? Math.round(Number(draft.promotionDiscountValue) * 100)
            : Number(draft.promotionDiscountValue),
        }),
      });
      setBillingPlans((items) => items.map((item) => item.plan === data.plan.plan && item.market === data.plan.market ? data.plan : item));
      toast.success('Plan price updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update plan price.');
    } finally {
      setSavingBilling(false);
    }
  };

  const saveCoupon = async () => {
    setSavingBilling(true);
    try {
      const appliesTo = couponForm.appliesTo === 'both'
        ? ['payg', 'monthly', 'quarterly']
        : couponForm.appliesTo === 'pro'
          ? ['monthly', 'quarterly']
          : [couponForm.appliesTo];
      const data = await apiFetch<{ coupon: AdminCoupon }>('/api/admin/billing/coupons', {
        method: 'POST',
        body: JSON.stringify({
          ...couponForm,
          discountValue: couponForm.discountType === 'fixed' ? Math.round(Number(couponForm.discountValue) * 100) : Number(couponForm.discountValue),
          appliesTo,
          maxRedemptions: couponForm.maxRedemptions,
        }),
      });
      setCoupons((items) => [data.coupon, ...items.filter((item) => item.code !== data.coupon.code)]);
      setCouponForm({ code: '', label: '', discountType: 'fixed', discountValue: '', appliesTo: 'pro', maxRedemptions: '25', active: true });
      toast.success('Coupon saved.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save coupon.');
    } finally {
      setSavingBilling(false);
    }
  };

  const toggleCoupon = async (coupon: AdminCoupon) => {
    setSavingBilling(true);
    try {
      const data = await apiFetch<{ coupon: AdminCoupon }>(`/api/admin/billing/coupons/${coupon.code}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...coupon, active: !coupon.active }),
      });
      setCoupons((items) => items.map((item) => item.code === data.coupon.code ? data.coupon : item));
      toast.success(data.coupon.active ? 'Coupon activated.' : 'Coupon paused.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update coupon.');
    } finally {
      setSavingBilling(false);
    }
  };

  const deleteCoupon = async (coupon: AdminCoupon) => {
    setSavingBilling(true);
    try {
      await apiFetch(`/api/admin/billing/coupons/${coupon.code}`, {
        method: 'DELETE',
      });
      setCoupons((items) => items.filter((item) => item.code !== coupon.code));
      toast.success('Coupon deleted.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete coupon.');
    } finally {
      setSavingBilling(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="lg:flex lg:h-dvh lg:overflow-hidden">
        <AdminSidebar
          items={adminNavItems}
          activeKey={activeNav.key}
          navAccess={navAccess}
          user={user}
          onSignOut={signOut}
        />

        <main className="scrollbar-hide mx-auto min-w-0 max-w-7xl flex-1 px-3 pb-10 pt-5 sm:px-6 lg:h-dvh lg:overflow-y-auto lg:px-8 lg:pt-8">
          <AdminMobileNav items={adminNavItems} activeKey={activeNav.key} navAccess={navAccess} />
          <AdminPageHeader
            title={pageTitle}
            description={pageDescription}
            userRoleLabel={userRoleLabel}
            showSearch={showHeaderSearch}
            searchPlaceholder={searchPlaceholder}
          />

          <Suspense fallback={<AdminSectionFallback />}>
          {isUsersPage ? (
            <UserManagementSection
              users={users}
              loading={usersLoading || detailLoading}
              search={userSearch}
              planFilter={planFilter}
              roleFilter={roleFilter}
              onSearchChange={setUserSearch}
              onPlanFilterChange={setPlanFilter}
              onRoleFilterChange={setRoleFilter}
              onOpenUser={openUserDetail}
              selectedUser={selectedUser}
              selectedUserDocuments={selectedUserDocuments}
              selectedPlan={selectedPlan}
              savingPlan={savingPlan}
              canUpdatePlan={canUpdateUserPlans}
              onSelectedPlanChange={setSelectedPlan}
              onSavePlan={updateSelectedUserPlan}
              onCloseDetail={() => setSelectedUser(null)}
            />
          ) : isAnalyticsPage ? (
            isLoading ? (
              <div className="mt-10 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm font-bold text-slate-400">
                <Loader2 className="animate-spin text-violet-300" size={18} />
                Loading analytics...
              </div>
            ) : !summary ? (
              <div className="mt-10 rounded-2xl border border-red-400/20 bg-red-500/10 p-5 text-sm font-bold text-red-100">
                Analytics could not be loaded.
              </div>
            ) : (
              <AnalyticsDashboardSection summary={summary} maxChartValue={maxChartValue} />
            )
          ) : isTemplatesPage ? (
            <TemplateManagementSection
              templates={visibleTemplates}
              categories={templateCategories}
              loading={templatesLoading}
              search={templateSearch}
              categoryFilter={templateCategoryFilter}
              accessFilter={templateAccessFilter}
              selectedTemplate={selectedTemplate}
              templateForm={templateForm}
              templateFileForm={templateFileForm}
              templateValidation={templateValidation}
              templateWarningConfirmationPending={templateWarningConfirmationPending}
              savingTemplate={savingTemplate}
              createTemplateOpen={createTemplateOpen}
              customTemplateForm={customTemplateForm}
              creatingTemplate={creatingTemplate}
              onSearchChange={setTemplateSearch}
              onCategoryFilterChange={setTemplateCategoryFilter}
              onAccessFilterChange={setTemplateAccessFilter}
              onOpenTemplate={openTemplateDetail}
              onCloseDetail={() => setSelectedTemplate(null)}
              onFormChange={setTemplateForm}
              onTemplateFileFormChange={setTemplateFileForm}
              onSelectedTemplateFileChange={setSelectedTemplateFile}
              onSaveTemplate={saveSelectedTemplate}
              onOpenCreate={() => setCreateTemplateOpen(true)}
              onCloseCreate={() => setCreateTemplateOpen(false)}
              onCustomFormChange={setCustomTemplateForm}
              onCustomFileChange={setCustomTemplateFile}
              onCreateTemplate={createCustomTemplate}
              onChangeCustomStatus={changeCustomTemplateStatus}
            />
          ) : isBillingPage ? (
            <BillingManagementSection
              payments={payments}
              summary={paymentSummary}
              loading={paymentsLoading}
              search={paymentSearch}
              planFilter={paymentPlanFilter}
              statusFilter={paymentStatusFilter}
              selectedPayment={selectedPayment}
              reviewNote={billingReviewNote}
              reviewingPaymentId={reviewingPaymentId}
              canReviewPayments={canReviewBilling}
              onSearchChange={setPaymentSearch}
              onPlanFilterChange={setPaymentPlanFilter}
              onStatusFilterChange={setPaymentStatusFilter}
              onOpenPayment={openPaymentDetail}
              onCloseDetail={() => {
                setSelectedPayment(null);
                setBillingReviewNote('');
              }}
              onReviewNoteChange={setBillingReviewNote}
              onMarkReviewed={markBillingReviewResolved}
            />
          ) : isPromotionsPage ? (
            <PromotionManagementSection
              billingPlans={billingPlans}
              coupons={coupons}
              couponForm={couponForm}
              savingBilling={savingBilling}
              onUpdatePlanPrice={updateBillingPlanPrice}
              onCouponFormChange={setCouponForm}
              onSaveCoupon={saveCoupon}
              onToggleCoupon={toggleCoupon}
              onDeleteCoupon={deleteCoupon}
            />
          ) : isCmsPage ? (
            <SettingsManagementSection
              settings={settings}
              loading={settingsLoading}
              saving={savingSettings}
              canUpdateSettings={canUpdateSettings}
              templates={templates}
              onSave={saveSettings}
              mode="cms"
            />
          ) : isSupportPage ? (
            <SupportManagementSection
              tickets={supportTickets}
              summary={supportSummary}
              loading={supportLoading}
              search={supportSearch}
              statusFilter={supportStatusFilter}
              typeFilter={supportTypeFilter}
              selectedTicket={selectedTicket}
              ticketForm={ticketForm}
              replyMessage={supportReplyMessage}
              savingTicket={savingTicket}
              sendingReply={sendingSupportReply}
              onSearchChange={setSupportSearch}
              onStatusFilterChange={setSupportStatusFilter}
              onTypeFilterChange={setSupportTypeFilter}
              onOpenTicket={openTicketDetail}
              onCloseDetail={() => setSelectedTicket(null)}
              onFormChange={setTicketForm}
              onSaveTicket={saveSelectedTicket}
              onReplyMessageChange={setSupportReplyMessage}
              onSendReply={sendSupportReply}
            />
          ) : isRolesPage ? (
            <RoleManagementSection
              roles={roles}
              admins={adminUsers}
              users={users}
              loading={rolesLoading}
              savingUserId={savingRoleUserId}
              canUpdateRoles={canUpdateRoles}
              onChangeRole={changeUserRole}
            />
          ) : isSettingsPage ? (
            <SettingsManagementSection
              settings={settings}
              loading={settingsLoading}
              saving={savingSettings}
              canUpdateSettings={canUpdateSettings}
              templates={templates}
              onSave={saveSettings}
            />
          ) : isEmailPage ? (
            <EmailManagementSection
              settings={settings}
              loading={settingsLoading}
              saving={savingSettings}
              sendingTestEmail={sendingTestEmail}
              canUpdateEmail={canUpdateEmail}
              onSave={saveSettings}
              onSendTestEmail={sendTestEmail}
            />
          ) : isAuditPage ? (
            <AuditLogSection
              logs={auditLogs}
              loading={auditLoading}
              search={auditSearch}
              actionFilter={auditActionFilter}
              targetTypeFilter={auditTargetTypeFilter}
              actions={auditActions}
              targetTypes={auditTargetTypes}
              onSearchChange={setAuditSearch}
              onActionFilterChange={setAuditActionFilter}
              onTargetTypeFilterChange={setAuditTargetTypeFilter}
            />
          ) : isLoading ? (
            <div className="mt-10 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm font-bold text-slate-400">
              <Loader2 className="animate-spin text-violet-300" size={18} />
              Loading admin panel...
            </div>
          ) : !summary ? (
            <div className="mt-10 rounded-2xl border border-red-400/20 bg-red-500/10 p-5 text-sm font-bold text-red-100">
              Admin summary could not be loaded.
            </div>
          ) : (
            <AdminOverviewSection summary={summary} maxChartValue={maxChartValue} />
          )}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
