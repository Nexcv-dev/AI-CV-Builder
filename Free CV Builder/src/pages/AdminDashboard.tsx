import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  CreditCard,
  FileText,
  Loader2,
  LogOut,
  Search,
  Shield,
  UserCog,
  Users,
} from 'lucide-react';
import { ADMIN_ROLE_LABELS, getRoleAccess, hasAdminPermission, isAdminRole, type UserRole } from '../adminPermissions';
import { apiFetch, AuthUser, getCurrentUser } from '../utils/api';
import { clearPageScrollLock } from '../utils/scrollLock';

import type {
  AdminBillingPlan,
  AdminBillingPlanDraft,
  AdminAuditLogItem,
  AdminCoupon,
  AdminPaymentItem,
  AdminPaymentSummary,
  AdminRoleConfig,
  AdminSettingsSummary,
  AdminSummary,
  AdminSupportTicket,
  AdminTemplateItem,
  AdminUserDetail,
  AdminUserDocument,
  AdminUserListItem,
} from './admin/adminTypes';
import { adminNavItems, emptyCustomTemplateForm, formatCurrency, formatDate, formatNumber } from './admin/adminUtils';
import { AdminStat, ChartBar, MiniRow } from './admin/AdminSharedComponents';
import UserManagementSection from './admin/UserManagementSection';
import TemplateManagementSection from './admin/TemplateManagementSection';
import BillingManagementSection from './admin/BillingManagementSection';
import PromotionManagementSection from './admin/PromotionManagementSection';
import SupportManagementSection from './admin/SupportManagementSection';
import RoleManagementSection from './admin/RoleManagementSection';
import SettingsManagementSection from './admin/SettingsManagementSection';
import AuditLogSection from './admin/AuditLogSection';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [selectedUserDocuments, setSelectedUserDocuments] = useState<AdminUserDocument[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'payg' | 'monthly'>('free');
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const isUsersPage = location.pathname.startsWith('/admin/users');
  const isTemplatesPage = location.pathname.startsWith('/admin/templates');
  const isBillingPage = location.pathname.startsWith('/admin/billing');
  const isPromotionsPage = location.pathname.startsWith('/admin/promotions');
  const isSupportPage = location.pathname.startsWith('/admin/support');
  const isRolesPage = location.pathname.startsWith('/admin/roles');
  const isSettingsPage = location.pathname.startsWith('/admin/settings');
  const isAuditPage = location.pathname.startsWith('/admin/audit');
  const [templates, setTemplates] = useState<AdminTemplateItem[]>([]);
  const [templateCategories, setTemplateCategories] = useState<string[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('all');
  const [templateAccessFilter, setTemplateAccessFilter] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState<AdminTemplateItem | null>(null);
  const [templateForm, setTemplateForm] = useState({ label: '', category: 'Modern', access: 'paid' as 'free' | 'paid', thumbnail: '', surfaceColorRole: 'none' as 'none' | 'sidebar' | 'header', surfaceColorLabel: '' });
  const [templateFileForm, setTemplateFileForm] = useState({ indexHtml: '', styleCss: '', thumbnailDataUrl: '' });
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);
  const [customTemplateForm, setCustomTemplateForm] = useState(emptyCustomTemplateForm);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [payments, setPayments] = useState<AdminPaymentItem[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<AdminPaymentSummary | null>(null);
  const [billingPlans, setBillingPlans] = useState<AdminBillingPlan[]>([]);
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [couponForm, setCouponForm] = useState({ code: '', label: '', discountType: 'fixed' as 'fixed' | 'percent', discountValue: '', appliesTo: 'both', active: true });
  const [savingBilling, setSavingBilling] = useState(false);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentPlanFilter, setPaymentPlanFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState<AdminPaymentItem | null>(null);
  const [supportTickets, setSupportTickets] = useState<AdminSupportTicket[]>([]);
  const [supportSummary, setSupportSummary] = useState<Record<'open' | 'pending' | 'resolved' | 'closed', number> | null>(null);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportSearch, setSupportSearch] = useState('');
  const [supportStatusFilter, setSupportStatusFilter] = useState('all');
  const [supportTypeFilter, setSupportTypeFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<AdminSupportTicket | null>(null);
  const [ticketForm, setTicketForm] = useState({ status: 'open' as AdminSupportTicket['status'], priority: 'normal' as AdminSupportTicket['priority'], adminNotes: '' });
  const [savingTicket, setSavingTicket] = useState(false);
  const [roles, setRoles] = useState<AdminRoleConfig[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUserListItem[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [savingRoleUserId, setSavingRoleUserId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AdminSettingsSummary | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogItem[]>([]);
  const [auditActions, setAuditActions] = useState<string[]>([]);
  const [auditTargetTypes, setAuditTargetTypes] = useState<string[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [auditTargetTypeFilter, setAuditTargetTypeFilter] = useState('all');

  useEffect(() => {
    clearPageScrollLock();
    let ignore = false;

    async function loadAdmin() {
      try {
        const [currentUser, adminSummary] = await Promise.all([
          getCurrentUser(),
          apiFetch<AdminSummary>('/api/admin/summary'),
        ]);

        if (ignore) return;
        setUser(currentUser);
        setSummary(adminSummary);
      } catch (error) {
        if (!ignore) {
          toast.error(error instanceof Error ? error.message : 'Could not load admin panel.');
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    void loadAdmin();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!isUsersPage) return;
    let ignore = false;
    const timer = window.setTimeout(async () => {
      setUsersLoading(true);
      try {
        const params = new URLSearchParams();
        if (userSearch.trim()) params.set('search', userSearch.trim());
        if (planFilter !== 'all') params.set('plan', planFilter);
        if (roleFilter !== 'all') params.set('role', roleFilter);
        const data = await apiFetch<{ users: AdminUserListItem[] }>(`/api/admin/users?${params.toString()}`);
        if (!ignore) setUsers(data.users);
      } catch (error) {
        if (!ignore) toast.error(error instanceof Error ? error.message : 'Could not load users.');
      } finally {
        if (!ignore) setUsersLoading(false);
      }
    }, 250);

    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [isUsersPage, planFilter, roleFilter, userSearch]);

  useEffect(() => {
    if (!isTemplatesPage) return;
    let ignore = false;
    setTemplatesLoading(true);

    apiFetch<{ templates: AdminTemplateItem[]; categories: string[] }>('/api/admin/templates')
      .then((data) => {
        if (ignore) return;
        setTemplates(data.templates);
        setTemplateCategories(data.categories);
      })
      .catch((error) => {
        if (!ignore) toast.error(error instanceof Error ? error.message : 'Could not load templates.');
      })
      .finally(() => {
        if (!ignore) setTemplatesLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [isTemplatesPage]);

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
    if (!isSettingsPage) return;
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
  }, [isSettingsPage]);

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

  const navAccess = getRoleAccess(user?.role);
  const userRoleLabel = isAdminRole(user?.role) ? ADMIN_ROLE_LABELS[user.role] : 'Admin';
  const canUpdateUserPlans = hasAdminPermission(user, 'users.plan.update');
  const canUpdateRoles = hasAdminPermission(user, 'users.role.update');
  const activeNav = adminNavItems.find((item) => item.to === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(item.to)) || adminNavItems[0];
  const maxChartValue = useMemo(() => {
    const values = [
      ...(summary?.charts.userGrowth.map((item) => item.count) || []),
      ...(summary?.charts.cvDownloadsPerDay.map((item) => item.count) || []),
    ];
    return Math.max(1, ...values);
  }, [summary]);

  const openUserDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const data = await apiFetch<{ user: AdminUserDetail; documents: AdminUserDocument[] }>(`/api/admin/users/${id}`);
      setSelectedUser(data.user);
      setSelectedPlan(data.user.rawPlan);
      setSelectedUserDocuments(data.documents);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load user details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const updateSelectedUserPlan = async () => {
    if (!selectedUser) return;
    setSavingPlan(true);
    try {
      const data = await apiFetch<{ user: AdminUserListItem }>(`/api/admin/users/${selectedUser.id}/plan`, {
        method: 'PATCH',
        body: JSON.stringify({ plan: selectedPlan }),
      });
      setUsers((items) => items.map((item) => item.id === data.user.id ? { ...item, ...data.user } : item));
      setSelectedUser((current) => current ? { ...current, ...data.user } : current);
      toast.success('User plan updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update plan.');
    } finally {
      setSavingPlan(false);
    }
  };

  const openTemplateDetail = (template: AdminTemplateItem) => {
    setSelectedTemplate(template);
    setTemplateForm({
      label: template.label,
      category: template.category,
      access: template.access,
      thumbnail: template.thumbnail,
      surfaceColorRole: template.surfaceColorRole || 'none',
      surfaceColorLabel: template.surfaceColorLabel || '',
    });
    setTemplateFileForm({ indexHtml: '', styleCss: '', thumbnailDataUrl: '' });
  };

  const saveSelectedTemplate = async () => {
    if (!selectedTemplate) return;
    setSavingTemplate(true);
    try {
      const data = await apiFetch<{ template: AdminTemplateItem }>(`/api/admin/templates/${selectedTemplate.key}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...templateForm,
          ...(templateFileForm.indexHtml ? { indexHtml: templateFileForm.indexHtml } : {}),
          ...(templateFileForm.styleCss ? { styleCss: templateFileForm.styleCss } : {}),
          ...(templateFileForm.thumbnailDataUrl ? { thumbnailDataUrl: templateFileForm.thumbnailDataUrl } : {}),
        }),
      });
      setTemplates((items) => items.map((item) => item.key === data.template.key ? data.template : item));
      setSelectedTemplate(data.template);
      setTemplateForm({
        label: data.template.label,
        category: data.template.category,
        access: data.template.access,
        thumbnail: data.template.thumbnail,
        surfaceColorRole: data.template.surfaceColorRole || 'none',
        surfaceColorLabel: data.template.surfaceColorLabel || '',
      });
      setTemplateFileForm({ indexHtml: '', styleCss: '', thumbnailDataUrl: '' });
      toast.success(templateFileForm.indexHtml || templateFileForm.styleCss || templateFileForm.thumbnailDataUrl ? 'Template files updated.' : 'Template metadata updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update template.');
    } finally {
      setSavingTemplate(false);
    }
  };

  const visibleTemplates = useMemo(() => templates.filter((template) => {
    const query = templateSearch.trim().toLowerCase();
    const matchesSearch = !query || template.label.toLowerCase().includes(query) || template.key.toLowerCase().includes(query);
    const matchesCategory = templateCategoryFilter === 'all' || template.category === templateCategoryFilter;
    const matchesAccess = templateAccessFilter === 'all' || template.access === templateAccessFilter;
    return matchesSearch && matchesCategory && matchesAccess;
  }), [templateAccessFilter, templateCategoryFilter, templateSearch, templates]);

  const readTemplateFile = (file: File, mode: 'text' | 'dataUrl') => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.onload = () => resolve(String(reader.result || ''));
    if (mode === 'dataUrl') reader.readAsDataURL(file);
    else reader.readAsText(file);
  });

  const createCustomTemplate = async () => {
    setCreatingTemplate(true);
    try {
      const data = await apiFetch<{ template: AdminTemplateItem }>('/api/admin/templates', {
        method: 'POST',
        body: JSON.stringify(customTemplateForm),
      });
      setTemplates((items) => [...items, data.template]);
      setSelectedTemplate(data.template);
      setTemplateForm({
        label: data.template.label,
        category: data.template.category,
        access: data.template.access,
        thumbnail: data.template.thumbnail,
        surfaceColorRole: data.template.surfaceColorRole || 'none',
        surfaceColorLabel: data.template.surfaceColorLabel || '',
      });
      setCustomTemplateForm(emptyCustomTemplateForm);
      setCreateTemplateOpen(false);
      toast.success(data.template.status === 'active' ? 'Template created and published.' : 'Template draft created.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create template.');
    } finally {
      setCreatingTemplate(false);
    }
  };

  const changeCustomTemplateStatus = async (template: AdminTemplateItem, action: 'publish' | 'archive') => {
    setSavingTemplate(true);
    try {
      const data = await apiFetch<{ template: AdminTemplateItem }>(`/api/admin/templates/${template.key}/${action}`, { method: 'POST' });
      setTemplates((items) => items.map((item) => item.key === data.template.key ? data.template : item));
      setSelectedTemplate(data.template);
      toast.success(action === 'publish' ? 'Template published.' : 'Template archived.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Could not ${action} template.`);
    } finally {
      setSavingTemplate(false);
    }
  };

  const setCustomTemplateFile = async (file: File | undefined, field: 'indexHtml' | 'styleCss' | 'thumbnailDataUrl') => {
    if (!file) return;
    try {
      const value = await readTemplateFile(file, field === 'thumbnailDataUrl' ? 'dataUrl' : 'text');
      setCustomTemplateForm((current) => ({ ...current, [field]: value }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not read file.');
    }
  };

  const openTicketDetail = (ticket: AdminSupportTicket) => {
    setSelectedTicket(ticket);
    setTicketForm({ status: ticket.status, priority: ticket.priority, adminNotes: ticket.adminNotes || '' });
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

  const setSelectedTemplateFile = async (file: File | undefined, field: 'indexHtml' | 'styleCss' | 'thumbnailDataUrl') => {
    if (!file) return;
    try {
      const value = await readTemplateFile(file, field === 'thumbnailDataUrl' ? 'dataUrl' : 'text');
      setTemplateFileForm((current) => ({ ...current, [field]: value }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not read file.');
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
          amountCents,
          promotionActive: draft.promotionActive,
          promotionLabel: draft.promotionLabel,
          promotionDiscountType: draft.promotionDiscountType,
          promotionDiscountValue: draft.promotionDiscountType === 'fixed'
            ? Math.round(Number(draft.promotionDiscountValue) * 100)
            : Number(draft.promotionDiscountValue),
        }),
      });
      setBillingPlans((items) => items.map((item) => item.plan === data.plan.plan ? data.plan : item));
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
      const appliesTo = couponForm.appliesTo === 'both' ? ['payg', 'monthly'] : [couponForm.appliesTo];
      const data = await apiFetch<{ coupon: AdminCoupon }>('/api/admin/billing/coupons', {
        method: 'POST',
        body: JSON.stringify({
          ...couponForm,
          discountValue: couponForm.discountType === 'fixed' ? Math.round(Number(couponForm.discountValue) * 100) : Number(couponForm.discountValue),
          appliesTo,
        }),
      });
      setCoupons((items) => [data.coupon, ...items.filter((item) => item.code !== data.coupon.code)]);
      setCouponForm({ code: '', label: '', discountType: 'fixed', discountValue: '', appliesTo: 'both', active: true });
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

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="lg:flex lg:h-dvh lg:overflow-hidden">
        <aside className="hidden h-dvh w-72 shrink-0 overflow-hidden border-r border-white/10 bg-slate-950 px-4 py-5 lg:flex lg:flex-col">
          <Link to="/admin" className="flex items-center gap-3 px-2">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-lg shadow-black/20">
              <img src="/brand/faviconblack.png" alt="" className="h-9 w-9 rounded-xl" />
            </span>
            <span className="font-montserrat text-2xl font-black">NexCV Admin</span>
          </Link>

          <nav className="scrollbar-hide mt-7 grid min-h-0 flex-1 gap-1 overflow-y-auto pr-1">
            {adminNavItems.filter((item) => navAccess.includes(item.key)).map((item) => {
              const Icon = item.icon;
              const active = activeNav.key === item.key;
              return (
                <Link
                  key={item.key}
                  to={item.to}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-extrabold transition ${
                    active ? 'bg-violet-500/15 text-violet-200 ring-1 ring-violet-300/15' : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-100'
                  }`}
                >
                  <Icon size={18} className={active ? 'text-violet-300' : 'text-slate-500'} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 shrink-0 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
            <p className="truncate text-sm font-extrabold text-slate-100">{user?.displayName || 'Admin'}</p>
            <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{user?.email || 'Signed in'}</p>
            <button
              type="button"
              onClick={signOut}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2.5 text-sm font-extrabold text-red-200 transition hover:bg-red-500/20 active:scale-[0.98]"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </aside>

        <main className="scrollbar-hide mx-auto min-w-0 max-w-7xl flex-1 px-3 pb-10 pt-5 sm:px-6 lg:h-dvh lg:overflow-y-auto lg:px-8 lg:pt-8">
          <nav className="mb-5 flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.035] p-2 lg:hidden" aria-label="Admin navigation">
            {adminNavItems.filter((item) => navAccess.includes(item.key)).map((item) => {
              const Icon = item.icon;
              const active = activeNav.key === item.key;
              return (
                <Link
                  key={item.key}
                  to={item.to}
                  className={`inline-flex min-w-max items-center gap-2 rounded-xl px-3 py-2 text-xs font-black transition ${
                    active ? 'bg-violet-500/15 text-violet-200 ring-1 ring-violet-300/15' : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-100'
                  }`}
                >
                  <Icon size={15} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <header className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-violet-300">
                <Shield size={14} />
                {userRoleLabel}
              </div>
              <h1 className="mt-2 font-montserrat text-2xl font-black leading-tight sm:text-4xl">
                {isUsersPage ? 'User Management' : isTemplatesPage ? 'Template Management' : isBillingPage ? 'Billing Management' : isPromotionsPage ? 'Promotions & Pricing' : isSupportPage ? 'Support Tickets' : isRolesPage ? 'Roles & Access' : isSettingsPage ? 'Admin Settings' : isAuditPage ? 'Audit Logs' : 'Admin Dashboard'}
              </h1>
              <p className="mt-2 text-sm font-semibold text-slate-400">
                {isUsersPage
                  ? 'Search users, inspect accounts, and update plan access.'
                  : isTemplatesPage
                    ? 'Manage template metadata, access, categories, and usage stats.'
                    : isBillingPage
                      ? 'Review payment history, revenue, and transaction status.'
                      : isPromotionsPage
                        ? 'Manage plan pricing, promotions, and discount coupons.'
                        : isSupportPage
                        ? 'Track complaints, bugs, feature requests, and payment issues.'
                        : isRolesPage
                          ? 'Manage super admin access and review admin permissions.'
                          : isSettingsPage
                            ? 'Review runtime, security, and service configuration status.'
                            : isAuditPage
                              ? 'Track sensitive admin changes across users, billing, templates, and support.'
                              : 'Operational overview and module foundation.'}
              </p>
            </div>
            {!isPromotionsPage && !isRolesPage && !isSettingsPage && !isAuditPage && (
              <div className="relative w-full sm:max-w-xs">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.035] pl-10 pr-3 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400"
                  placeholder={isUsersPage ? 'Search users' : isTemplatesPage ? 'Search templates' : isBillingPage ? 'Search payments' : isSupportPage ? 'Search tickets' : 'Search admin modules'}
                />
              </div>
            )}
          </header>

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
              onSearchChange={setPaymentSearch}
              onPlanFilterChange={setPaymentPlanFilter}
              onStatusFilterChange={setPaymentStatusFilter}
              onOpenPayment={setSelectedPayment}
              onCloseDetail={() => setSelectedPayment(null)}
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
              savingTicket={savingTicket}
              onSearchChange={setSupportSearch}
              onStatusFilterChange={setSupportStatusFilter}
              onTypeFilterChange={setSupportTypeFilter}
              onOpenTicket={openTicketDetail}
              onCloseDetail={() => setSelectedTicket(null)}
              onFormChange={setTicketForm}
              onSaveTicket={saveSelectedTicket}
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
            <>
              <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <AdminStat icon={<Users size={19} />} label="Total Users" value={formatNumber(summary.widgets.totalUsers)} />
                <AdminStat icon={<UserCog size={19} />} label="Active Users Today" value={formatNumber(summary.widgets.activeUsersToday)} />
                <AdminStat icon={<CreditCard size={19} />} label="Premium Subscribers" value={formatNumber(summary.widgets.premiumSubscribers)} />
                <AdminStat icon={<FileText size={19} />} label="Total CVs Created" value={formatNumber(summary.widgets.totalCvsCreated)} />
              </section>

              <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
                <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-montserrat text-lg font-black">User Growth</h2>
                      <p className="mt-1 text-sm font-semibold text-slate-400">Last 7 days</p>
                    </div>
                    <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-black text-emerald-300 ring-1 ring-emerald-300/15">
                      Live data
                    </span>
                  </div>
                  <div className="mt-5 grid h-52 grid-cols-7 items-end gap-2">
                    {summary.charts.userGrowth.map((item) => (
                      <ChartBar key={item.day} label={item.day.slice(5)} value={item.count} max={maxChartValue} />
                    ))}
                  </div>
                </article>

                <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 sm:p-5">
                  <h2 className="font-montserrat text-lg font-black">Revenue Overview</h2>
                  <div className="mt-4 text-3xl font-black">{formatCurrency(summary.widgets.revenue.cents, summary.widgets.revenue.currency)}</div>
                  <p className="mt-1 text-sm font-semibold text-slate-400">Processed payment sample</p>
                  <div className="mt-5 grid gap-2">
                    {summary.charts.subscriptionRevenue.map((item) => (
                      <MiniRow key={item.day} label={item.day.slice(5)} value={formatCurrency(item.cents, summary.widgets.revenue.currency)} />
                    ))}
                  </div>
                </article>
              </section>

              <section className="mt-4 grid gap-4 lg:grid-cols-3">
                <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 sm:p-5">
                  <h2 className="font-montserrat text-lg font-black">Most Used Templates</h2>
                  <div className="mt-4 grid gap-3">
                    {summary.templateUsage.length ? summary.templateUsage.map((item) => (
                      <MiniRow key={item.template} label={item.template} value={formatNumber(item.count)} />
                    )) : <p className="text-sm font-semibold text-slate-500">No template usage yet.</p>}
                  </div>
                </article>

                <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 sm:p-5">
                  <h2 className="font-montserrat text-lg font-black">Recent Registrations</h2>
                  <div className="mt-4 grid gap-3">
                    {summary.recentRegistrations.map((item) => (
                      <div key={item.id} className="min-w-0 border-b border-white/10 pb-3 last:border-b-0 last:pb-0">
                        <p className="truncate text-sm font-black text-slate-100">{item.displayName || item.email}</p>
                        <p className="mt-1 truncate text-xs font-semibold text-slate-500">{item.email}</p>
                        <p className="mt-1 text-xs font-bold text-violet-300">{item.plan} - {formatDate(item.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 sm:p-5">
                  <h2 className="font-montserrat text-lg font-black">Support Tickets</h2>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {Object.entries(summary.widgets.supportTickets).map(([status, count]) => (
                      <div key={status} className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                        <p className="text-xs font-black uppercase text-slate-500">{status}</p>
                        <p className="mt-2 text-2xl font-black">{count}</p>
                      </div>
                    ))}
                  </div>
                </article>
              </section>

              <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 sm:p-5">
                <h2 className="font-montserrat text-lg font-black">Module Structure</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {summary.modules.map((module) => (
                    <div key={module.key} className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                      <p className="text-sm font-black text-slate-100">{module.label}</p>
                      <p className="mt-2 text-xs font-bold uppercase text-amber-300">{module.status}</p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
