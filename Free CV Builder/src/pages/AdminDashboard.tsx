import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Bell,
  Check,
  CreditCard,
  Crown,
  FileText,
  LayoutDashboard,
  LayoutTemplate,
  Eye,
  Loader2,
  LogOut,
  MessageSquare,
  Palette,
  Search,
  Settings,
  Shield,
  X,
  UserCog,
  Users,
} from 'lucide-react';
import { ADMIN_ROLE_ACCESS, ADMIN_ROLE_LABELS } from '../adminPermissions';
import { apiFetch, AuthUser, getCurrentUser } from '../utils/api';
import { clearPageScrollLock } from '../utils/scrollLock';

interface AdminSummary {
  widgets: {
    totalUsers: number;
    activeUsersToday: number;
    premiumSubscribers: number;
    totalCvsCreated: number;
    revenue: { cents: number; currency: string };
    supportTickets: Record<'open' | 'pending' | 'resolved' | 'closed', number>;
  };
  recentRegistrations: Array<{
    id: string;
    email: string;
    displayName: string;
    role: string;
    plan: string;
    createdAt: string;
  }>;
  templateUsage: Array<{ template: string; count: number }>;
  charts: {
    userGrowth: Array<{ day: string; count: number }>;
    subscriptionRevenue: Array<{ day: string; cents: number }>;
    cvDownloadsPerDay: Array<{ day: string; count: number }>;
    templateUsage: Array<{ template: string; count: number }>;
  };
  modules: Array<{ key: string; label: string; status: string }>;
}

interface AdminUserListItem {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'super_admin';
  plan: 'free' | 'payg' | 'monthly' | 'unlimited';
  rawPlan: 'free' | 'payg' | 'monthly';
  planExpiresAt?: string;
  emailVerified: boolean;
  authProvider: 'email' | 'google';
  cvCount: number;
  createdAt: string;
  updatedAt: string;
}

interface AdminUserDetail extends AdminUserListItem {
  phone?: string;
  address?: string;
  planStartedAt?: string;
  paygCvSaveCredits: number;
}

interface AdminUserDocument {
  id: string;
  title: string;
  template: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface AdminTemplateItem {
  key: string;
  label: string;
  category: string;
  access: 'free' | 'paid';
  thumbnail: string;
  builtInThumbnail: string;
  surfaceColorRole: string;
  usageCount: number;
  updatedAt?: string;
}

interface AdminPaymentItem {
  id: string;
  provider: string;
  paymentId: string;
  orderId: string;
  user: { id: string; email: string; displayName: string } | null;
  plan: 'payg' | 'monthly' | null;
  amount: string;
  amountCents: number;
  currency: string;
  statusCode: string;
  processed: boolean;
  rawPayload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface AdminPaymentSummary {
  totalRevenueCents: number;
  currency: string;
  processedCount: number;
  revenueByPlan: Record<string, number>;
  dailyRevenue: Array<{ day: string; cents: number }>;
}

interface AdminSupportTicket {
  id: string;
  user: { id: string; email: string; displayName: string } | null;
  fullName: string;
  email: string;
  type: 'complaint' | 'bug' | 'feature_request' | 'payment_issue' | 'general';
  subject: string;
  message: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  adminNotes: string;
  createdAt: string;
  updatedAt: string;
}

const adminNavItems = [
  { key: 'dashboard', label: 'Dashboard', to: '/admin', icon: LayoutDashboard },
  { key: 'users', label: 'Users', to: '/admin/users', icon: Users },
  { key: 'templates', label: 'Templates', to: '/admin/templates', icon: LayoutTemplate },
  { key: 'billing', label: 'Billing', to: '/admin/billing', icon: CreditCard },
  { key: 'cms', label: 'CMS', to: '/admin/cms', icon: Palette },
  { key: 'notifications', label: 'Notifications', to: '/admin/notifications', icon: Bell },
  { key: 'support', label: 'Support', to: '/admin/support', icon: MessageSquare },
  { key: 'settings', label: 'Settings', to: '/admin/settings', icon: Settings },
  { key: 'roles', label: 'Roles', to: '/admin/roles', icon: Shield },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatCurrency(cents: number, currency: string) {
  return `${currency} ${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Math.round(cents / 100))}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

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
  const isSupportPage = location.pathname.startsWith('/admin/support');
  const [templates, setTemplates] = useState<AdminTemplateItem[]>([]);
  const [templateCategories, setTemplateCategories] = useState<string[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('all');
  const [templateAccessFilter, setTemplateAccessFilter] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState<AdminTemplateItem | null>(null);
  const [templateForm, setTemplateForm] = useState({ label: '', category: 'Modern', access: 'paid' as 'free' | 'paid', thumbnail: '' });
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [payments, setPayments] = useState<AdminPaymentItem[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<AdminPaymentSummary | null>(null);
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

  const signOut = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    navigate('/');
  };

  const navAccess = ADMIN_ROLE_ACCESS.super_admin;
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
    });
  };

  const saveSelectedTemplate = async () => {
    if (!selectedTemplate) return;
    setSavingTemplate(true);
    try {
      const data = await apiFetch<{ template: AdminTemplateItem }>(`/api/admin/templates/${selectedTemplate.key}`, {
        method: 'PATCH',
        body: JSON.stringify(templateForm),
      });
      setTemplates((items) => items.map((item) => item.key === data.template.key ? data.template : item));
      setSelectedTemplate(data.template);
      setTemplateForm({
        label: data.template.label,
        category: data.template.category,
        access: data.template.access,
        thumbnail: data.template.thumbnail,
      });
      toast.success('Template metadata updated.');
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

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="lg:flex lg:h-dvh lg:overflow-hidden">
        <aside className="hidden h-dvh w-72 shrink-0 border-r border-white/10 bg-slate-950 px-4 py-5 lg:flex lg:flex-col">
          <Link to="/admin" className="flex items-center gap-3 px-2">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-lg shadow-black/20">
              <img src="/brand/faviconblack.png" alt="" className="h-9 w-9 rounded-xl" />
            </span>
            <span className="font-montserrat text-2xl font-black">NexCV Admin</span>
          </Link>

          <nav className="mt-7 grid gap-1">
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

          <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.035] p-3">
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
                {ADMIN_ROLE_LABELS.super_admin}
              </div>
              <h1 className="mt-2 font-montserrat text-2xl font-black leading-tight sm:text-4xl">
                {isUsersPage ? 'User Management' : isTemplatesPage ? 'Template Management' : isBillingPage ? 'Billing Management' : isSupportPage ? 'Support Tickets' : 'Admin Dashboard'}
              </h1>
              <p className="mt-2 text-sm font-semibold text-slate-400">
                {isUsersPage
                  ? 'Search users, inspect accounts, and update plan access.'
                  : isTemplatesPage
                    ? 'Manage template metadata, access, categories, and usage stats.'
                    : isBillingPage
                      ? 'Review payment history, revenue, and transaction status.'
                      : isSupportPage
                        ? 'Track complaints, bugs, feature requests, and payment issues.'
                    : 'Operational overview and module foundation.'}
              </p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.035] pl-10 pr-3 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400"
                placeholder={isUsersPage ? 'Search users' : isTemplatesPage ? 'Search templates' : isBillingPage ? 'Search payments' : isSupportPage ? 'Search tickets' : 'Search admin modules'}
              />
            </div>
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
              savingTemplate={savingTemplate}
              onSearchChange={setTemplateSearch}
              onCategoryFilterChange={setTemplateCategoryFilter}
              onAccessFilterChange={setTemplateAccessFilter}
              onOpenTemplate={openTemplateDetail}
              onCloseDetail={() => setSelectedTemplate(null)}
              onFormChange={setTemplateForm}
              onSaveTemplate={saveSelectedTemplate}
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

function AdminStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 sm:p-5">
      <div className="flex items-center gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300 ring-1 ring-violet-300/20">
          {icon}
        </span>
        <div className="min-w-0">
          <div className="truncate text-2xl font-black text-white">{value}</div>
          <p className="mt-1 text-sm font-semibold text-slate-400">{label}</p>
        </div>
      </div>
    </article>
  );
}

function ChartBar({ label, value, max }: { label: string; value: number; max: number }) {
  const height = Math.max(8, Math.round((value / max) * 100));
  return (
    <div className="flex h-full min-w-0 flex-col items-center justify-end gap-2">
      <div className="flex w-full items-end rounded-t-xl bg-slate-900">
        <div className="w-full rounded-t-xl bg-violet-500" style={{ height: `${height}%` }} />
      </div>
      <div className="text-[10px] font-bold text-slate-500">{label}</div>
    </div>
  );
}

function MiniRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2">
      <span className="min-w-0 truncate text-sm font-bold text-slate-300">{label}</span>
      <span className="shrink-0 text-sm font-black text-slate-100">{value}</span>
    </div>
  );
}

function UserManagementSection({
  users,
  loading,
  search,
  planFilter,
  roleFilter,
  onSearchChange,
  onPlanFilterChange,
  onRoleFilterChange,
  onOpenUser,
  selectedUser,
  selectedUserDocuments,
  selectedPlan,
  savingPlan,
  onSelectedPlanChange,
  onSavePlan,
  onCloseDetail,
}: {
  users: AdminUserListItem[];
  loading: boolean;
  search: string;
  planFilter: string;
  roleFilter: string;
  onSearchChange: (value: string) => void;
  onPlanFilterChange: (value: string) => void;
  onRoleFilterChange: (value: string) => void;
  onOpenUser: (id: string) => void;
  selectedUser: AdminUserDetail | null;
  selectedUserDocuments: AdminUserDocument[];
  selectedPlan: 'free' | 'payg' | 'monthly';
  savingPlan: boolean;
  onSelectedPlanChange: (value: 'free' | 'payg' | 'monthly') => void;
  onSavePlan: () => void;
  onCloseDetail: () => void;
}) {
  return (
    <section className="mt-6">
      <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 md:grid-cols-[1fr_180px_180px]">
        <label className="relative block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-11 w-full rounded-xl border border-white/10 bg-slate-950 pl-10 pr-3 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400"
            placeholder="Search by name or email"
          />
        </label>
        <select
          value={planFilter}
          onChange={(event) => onPlanFilterChange(event.target.value)}
          className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400"
        >
          <option value="all">All plans</option>
          <option value="free">Free</option>
          <option value="payg">Pay As You Go</option>
          <option value="monthly">Monthly</option>
        </select>
        <select
          value={roleFilter}
          onChange={(event) => onRoleFilterChange(event.target.value)}
          className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400"
        >
          <option value="all">All roles</option>
          <option value="user">User</option>
          <option value="super_admin">Super Admin</option>
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/15">
        <div className="grid grid-cols-[1.3fr_120px_120px_90px_90px] gap-3 border-b border-white/10 px-5 py-3 text-xs font-black uppercase text-slate-500 max-lg:hidden">
          <span>User</span>
          <span>Plan</span>
          <span>Role</span>
          <span>CVs</span>
          <span>Action</span>
        </div>
        {loading && (
          <div className="flex items-center gap-3 px-5 py-5 text-sm font-bold text-slate-400">
            <Loader2 className="animate-spin text-violet-300" size={17} />
            Loading users...
          </div>
        )}
        {!loading && users.length === 0 && (
          <div className="px-5 py-8 text-center text-sm font-bold text-slate-500">No users match these filters.</div>
        )}
        {!loading && users.map((item) => (
          <article key={item.id} className="grid gap-3 border-b border-white/10 px-4 py-4 last:border-b-0 lg:grid-cols-[1.3fr_120px_120px_90px_90px] lg:items-center lg:px-5">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-100">{item.displayName || 'Unnamed user'}</p>
              <p className="mt-1 truncate text-xs font-semibold text-slate-500">{item.email}</p>
              <p className="mt-1 text-xs font-bold text-slate-600">Joined {formatDate(item.createdAt)}</p>
            </div>
            <PlanBadge plan={item.plan} expiresAt={item.planExpiresAt} />
            <span className="w-fit rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-slate-300 ring-1 ring-white/10">
              {item.role === 'super_admin' ? 'Super Admin' : 'User'}
            </span>
            <span className="text-sm font-black text-slate-200">{item.cvCount}</span>
            <button
              type="button"
              onClick={() => onOpenUser(item.id)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/6 px-3 text-xs font-black text-slate-100 transition hover:bg-white/10 active:scale-[0.98]"
            >
              <Eye size={14} />
              View
            </button>
          </article>
        ))}
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-80 flex justify-end bg-slate-950/70 backdrop-blur-sm" role="dialog" aria-modal="true">
          <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-slate-950 p-5 text-white shadow-2xl shadow-black/40">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-violet-300">User Details</p>
                <h2 className="mt-1 truncate font-montserrat text-2xl font-black">{selectedUser.displayName || selectedUser.email}</h2>
                <p className="mt-1 truncate text-sm font-semibold text-slate-400">{selectedUser.email}</p>
              </div>
              <button
                type="button"
                onClick={onCloseDetail}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/6 text-slate-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Close user details"
              >
                <X size={17} />
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <DetailTile label="Role" value={selectedUser.role === 'super_admin' ? 'Super Admin' : 'User'} />
              <DetailTile label="Auth" value={selectedUser.authProvider} />
              <DetailTile label="Email" value={selectedUser.emailVerified ? 'Verified' : 'Not verified'} />
              <DetailTile label="Saved CVs" value={String(selectedUser.cvCount)} />
              <DetailTile label="Joined" value={formatDate(selectedUser.createdAt)} />
              <DetailTile label="Last Updated" value={formatDate(selectedUser.updatedAt)} />
            </div>

            <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <h3 className="font-montserrat text-lg font-black">Change User Plan</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <select
                  value={selectedPlan}
                  onChange={(event) => onSelectedPlanChange(event.target.value as 'free' | 'payg' | 'monthly')}
                  className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400"
                >
                  <option value="free">Free</option>
                  <option value="payg">Pay As You Go</option>
                  <option value="monthly">Monthly</option>
                </select>
                <button
                  type="button"
                  onClick={onSavePlan}
                  disabled={savingPlan || selectedPlan === selectedUser.rawPlan}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-violet-600 px-4 text-sm font-black text-white transition hover:bg-violet-500 active:scale-[0.98] disabled:opacity-60"
                >
                  {savingPlan ? <Loader2 className="animate-spin" size={16} /> : 'Save plan'}
                </button>
              </div>
              <p className="mt-3 text-xs font-semibold text-slate-500">
                Paid plans receive a fresh expiry window. PAYG keeps at least one save credit.
              </p>
            </section>

            <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <h3 className="font-montserrat text-lg font-black">Recent CVs</h3>
              <div className="mt-4 grid gap-3">
                {selectedUserDocuments.length ? selectedUserDocuments.map((document) => (
                  <div key={document.id} className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                    <p className="truncate text-sm font-black text-slate-100">{document.title}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{document.template} - {document.status}</p>
                    <p className="mt-1 text-xs font-bold text-violet-300">Updated {formatDate(document.updatedAt)}</p>
                  </div>
                )) : <p className="text-sm font-semibold text-slate-500">No saved CVs yet.</p>}
              </div>
            </section>
          </aside>
        </div>
      )}
    </section>
  );
}

function PlanBadge({ plan, expiresAt }: { plan: AdminUserListItem['plan']; expiresAt?: string }) {
  const label = plan === 'payg' ? 'PAYG' : plan === 'monthly' ? 'Monthly' : plan === 'unlimited' ? 'Admin' : 'Free';
  const tone = plan === 'free'
    ? 'bg-slate-900 text-slate-300 ring-white/10'
    : plan === 'payg'
      ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-300/20'
      : 'bg-violet-400/10 text-violet-300 ring-violet-300/20';
  return (
    <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ring-1 ${tone}`} title={expiresAt ? `Expires ${formatDate(expiresAt)}` : undefined}>
      {label}
    </span>
  );
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-black text-slate-100">{value}</p>
    </div>
  );
}

function TemplateManagementSection({
  templates,
  categories,
  loading,
  search,
  categoryFilter,
  accessFilter,
  selectedTemplate,
  templateForm,
  savingTemplate,
  onSearchChange,
  onCategoryFilterChange,
  onAccessFilterChange,
  onOpenTemplate,
  onCloseDetail,
  onFormChange,
  onSaveTemplate,
}: {
  templates: AdminTemplateItem[];
  categories: string[];
  loading: boolean;
  search: string;
  categoryFilter: string;
  accessFilter: string;
  selectedTemplate: AdminTemplateItem | null;
  templateForm: { label: string; category: string; access: 'free' | 'paid'; thumbnail: string };
  savingTemplate: boolean;
  onSearchChange: (value: string) => void;
  onCategoryFilterChange: (value: string) => void;
  onAccessFilterChange: (value: string) => void;
  onOpenTemplate: (template: AdminTemplateItem) => void;
  onCloseDetail: () => void;
  onFormChange: (value: { label: string; category: string; access: 'free' | 'paid'; thumbnail: string }) => void;
  onSaveTemplate: () => void;
}) {
  return (
    <section className="mt-6">
      <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 md:grid-cols-[1fr_180px_180px]">
        <label className="relative block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-11 w-full rounded-xl border border-white/10 bg-slate-950 pl-10 pr-3 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400"
            placeholder="Search by template name"
          />
        </label>
        <select
          value={categoryFilter}
          onChange={(event) => onCategoryFilterChange(event.target.value)}
          className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400"
        >
          <option value="all">All categories</option>
          {categories.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
        <select
          value={accessFilter}
          onChange={(event) => onAccessFilterChange(event.target.value)}
          className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400"
        >
          <option value="all">All access</option>
          <option value="free">Free</option>
          <option value="paid">Premium</option>
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/15">
        <div className="grid grid-cols-[1.2fr_150px_120px_100px_90px] gap-3 border-b border-white/10 px-5 py-3 text-xs font-black uppercase text-slate-500 max-lg:hidden">
          <span>Template</span>
          <span>Category</span>
          <span>Access</span>
          <span>Usage</span>
          <span>Action</span>
        </div>
        {loading && (
          <div className="flex items-center gap-3 px-5 py-5 text-sm font-bold text-slate-400">
            <Loader2 className="animate-spin text-violet-300" size={17} />
            Loading templates...
          </div>
        )}
        {!loading && templates.length === 0 && (
          <div className="px-5 py-8 text-center text-sm font-bold text-slate-500">No templates match these filters.</div>
        )}
        {!loading && templates.map((template) => (
          <article key={template.key} className="grid gap-3 border-b border-white/10 px-4 py-4 last:border-b-0 lg:grid-cols-[1.2fr_150px_120px_100px_90px] lg:items-center lg:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-slate-900">
                <img src={template.thumbnail} alt="" className="h-full w-full object-cover object-top" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-100">{template.label}</p>
                <p className="mt-1 truncate text-xs font-semibold text-slate-500">{template.key}</p>
              </div>
            </div>
            <span className="w-fit rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-slate-300 ring-1 ring-white/10">{template.category}</span>
            <TemplateAccessBadge access={template.access} />
            <span className="text-sm font-black text-slate-200">{template.usageCount}</span>
            <button
              type="button"
              onClick={() => onOpenTemplate(template)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/6 px-3 text-xs font-black text-slate-100 transition hover:bg-white/10 active:scale-[0.98]"
            >
              <Eye size={14} />
              Edit
            </button>
          </article>
        ))}
      </div>

      {selectedTemplate && (
        <div className="fixed inset-0 z-80 flex justify-end bg-slate-950/70 backdrop-blur-sm" role="dialog" aria-modal="true">
          <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-slate-950 p-5 text-white shadow-2xl shadow-black/40">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-violet-300">Template Details</p>
                <h2 className="mt-1 truncate font-montserrat text-2xl font-black">{selectedTemplate.label}</h2>
                <p className="mt-1 truncate text-sm font-semibold text-slate-400">{selectedTemplate.key}</p>
              </div>
              <button
                type="button"
                onClick={onCloseDetail}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/6 text-slate-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Close template details"
              >
                <X size={17} />
              </button>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
              <img src={templateForm.thumbnail || selectedTemplate.builtInThumbnail} alt="" className="h-64 w-full object-cover object-top" />
            </div>

            <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <h3 className="font-montserrat text-lg font-black">Metadata</h3>
              <div className="mt-4 grid gap-4">
                <label className="grid gap-2 text-sm font-black text-slate-200">
                  Label
                  <input
                    value={templateForm.label}
                    onChange={(event) => onFormChange({ ...templateForm, label: event.target.value })}
                    className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400"
                  />
                </label>
                <label className="grid gap-2 text-sm font-black text-slate-200">
                  Category
                  <select
                    value={templateForm.category}
                    onChange={(event) => onFormChange({ ...templateForm, category: event.target.value })}
                    className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400"
                  >
                    {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-black text-slate-200">
                  Access
                  <select
                    value={templateForm.access}
                    onChange={(event) => onFormChange({ ...templateForm, access: event.target.value as 'free' | 'paid' })}
                    className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400"
                  >
                    <option value="free">Free</option>
                    <option value="paid">Premium</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-black text-slate-200">
                  Thumbnail path
                  <input
                    value={templateForm.thumbnail}
                    onChange={(event) => onFormChange({ ...templateForm, thumbnail: event.target.value })}
                    className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400"
                  />
                </label>
                <button
                  type="button"
                  onClick={onSaveTemplate}
                  disabled={savingTemplate}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-violet-600 px-4 text-sm font-black text-white transition hover:bg-violet-500 active:scale-[0.98] disabled:opacity-60"
                >
                  {savingTemplate ? <Loader2 className="animate-spin" size={16} /> : 'Save metadata'}
                </button>
              </div>
            </section>

            <section className="mt-6 grid gap-3 sm:grid-cols-2">
              <DetailTile label="Usage Count" value={String(selectedTemplate.usageCount)} />
              <DetailTile label="Surface Color" value={selectedTemplate.surfaceColorRole} />
              <DetailTile label="Built-In Thumbnail" value={selectedTemplate.builtInThumbnail} />
              <DetailTile label="Last Updated" value={selectedTemplate.updatedAt ? formatDate(selectedTemplate.updatedAt) : 'Not customized'} />
            </section>
          </aside>
        </div>
      )}
    </section>
  );
}

function TemplateAccessBadge({ access }: { access: 'free' | 'paid' }) {
  return (
    <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ring-1 ${
      access === 'free'
        ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-300/20'
        : 'bg-violet-400/10 text-violet-300 ring-violet-300/20'
    }`}>
      {access === 'free' ? 'Free' : 'Premium'}
    </span>
  );
}

function BillingManagementSection({
  payments,
  summary,
  loading,
  search,
  planFilter,
  statusFilter,
  selectedPayment,
  onSearchChange,
  onPlanFilterChange,
  onStatusFilterChange,
  onOpenPayment,
  onCloseDetail,
}: {
  payments: AdminPaymentItem[];
  summary: AdminPaymentSummary | null;
  loading: boolean;
  search: string;
  planFilter: string;
  statusFilter: string;
  selectedPayment: AdminPaymentItem | null;
  onSearchChange: (value: string) => void;
  onPlanFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onOpenPayment: (payment: AdminPaymentItem) => void;
  onCloseDetail: () => void;
}) {
  return (
    <section className="mt-6">
      <div className="grid gap-4 md:grid-cols-3">
        <AdminStat icon={<CreditCard size={19} />} label="Total Revenue" value={summary ? formatCurrency(summary.totalRevenueCents, summary.currency) : 'LKR 0'} />
        <AdminStat icon={<Check size={19} />} label="Processed Payments" value={String(summary?.processedCount || 0)} />
        <AdminStat icon={<Crown size={19} />} label="Monthly Revenue" value={formatCurrency(summary?.revenueByPlan.monthly || 0, summary?.currency || 'LKR')} />
      </div>

      <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 md:grid-cols-[1fr_180px_180px]">
        <label className="relative block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-11 w-full rounded-xl border border-white/10 bg-slate-950 pl-10 pr-3 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400"
            placeholder="Search payment, order, or user"
          />
        </label>
        <select value={planFilter} onChange={(event) => onPlanFilterChange(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400">
          <option value="all">All plans</option>
          <option value="payg">Pay As You Go</option>
          <option value="monthly">Monthly</option>
        </select>
        <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400">
          <option value="all">All statuses</option>
          <option value="processed">Processed</option>
          <option value="unprocessed">Unprocessed</option>
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/15">
        <div className="grid grid-cols-[1.2fr_150px_110px_120px_100px] gap-3 border-b border-white/10 px-5 py-3 text-xs font-black uppercase text-slate-500 max-lg:hidden">
          <span>Transaction</span>
          <span>User</span>
          <span>Plan</span>
          <span>Amount</span>
          <span>Action</span>
        </div>
        {loading && (
          <div className="flex items-center gap-3 px-5 py-5 text-sm font-bold text-slate-400">
            <Loader2 className="animate-spin text-violet-300" size={17} />
            Loading payments...
          </div>
        )}
        {!loading && payments.length === 0 && (
          <div className="px-5 py-8 text-center text-sm font-bold text-slate-500">No payments match these filters.</div>
        )}
        {!loading && payments.map((payment) => (
          <article key={payment.id} className="grid gap-3 border-b border-white/10 px-4 py-4 last:border-b-0 lg:grid-cols-[1.2fr_150px_110px_120px_100px] lg:items-center lg:px-5">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-100">{payment.paymentId}</p>
              <p className="mt-1 truncate text-xs font-semibold text-slate-500">{payment.orderId}</p>
              <p className="mt-1 text-xs font-bold text-slate-600">{formatDate(payment.createdAt)}</p>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-200">{payment.user?.displayName || 'Unknown'}</p>
              <p className="mt-1 truncate text-xs font-semibold text-slate-500">{payment.user?.email || 'No linked user'}</p>
            </div>
            <span className="w-fit rounded-full bg-violet-400/10 px-3 py-1 text-xs font-black text-violet-300 ring-1 ring-violet-300/20">{payment.plan || 'Unknown'}</span>
            <div>
              <p className="text-sm font-black text-slate-100">{payment.currency} {payment.amount}</p>
              <PaymentStatusBadge processed={payment.processed} statusCode={payment.statusCode} />
            </div>
            <button type="button" onClick={() => onOpenPayment(payment)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/6 px-3 text-xs font-black text-slate-100 transition hover:bg-white/10 active:scale-[0.98]">
              <Eye size={14} />
              View
            </button>
          </article>
        ))}
      </div>

      {summary && (
        <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10">
          <h2 className="font-montserrat text-lg font-black">Daily Revenue</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-7">
            {summary.dailyRevenue.map((item) => (
              <MiniRow key={item.day} label={item.day.slice(5)} value={formatCurrency(item.cents, summary.currency)} />
            ))}
          </div>
        </section>
      )}

      {selectedPayment && (
        <div className="fixed inset-0 z-80 flex justify-end bg-slate-950/70 backdrop-blur-sm" role="dialog" aria-modal="true">
          <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-slate-950 p-5 text-white shadow-2xl shadow-black/40">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-violet-300">Payment Details</p>
                <h2 className="mt-1 truncate font-montserrat text-2xl font-black">{selectedPayment.paymentId}</h2>
                <p className="mt-1 truncate text-sm font-semibold text-slate-400">{selectedPayment.orderId}</p>
              </div>
              <button type="button" onClick={onCloseDetail} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/6 text-slate-300 transition hover:bg-white/10 hover:text-white" aria-label="Close payment details">
                <X size={17} />
              </button>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <DetailTile label="Provider" value={selectedPayment.provider} />
              <DetailTile label="Status" value={selectedPayment.processed ? 'Processed' : `Code ${selectedPayment.statusCode}`} />
              <DetailTile label="Plan" value={selectedPayment.plan || 'Unknown'} />
              <DetailTile label="Amount" value={`${selectedPayment.currency} ${selectedPayment.amount}`} />
              <DetailTile label="User" value={selectedPayment.user?.email || 'No linked user'} />
              <DetailTile label="Date" value={formatDate(selectedPayment.createdAt)} />
            </div>
            <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <h3 className="font-montserrat text-lg font-black">Payload Summary</h3>
              <pre className="mt-4 max-h-80 overflow-auto rounded-xl bg-slate-900 p-3 text-xs font-semibold text-slate-300">
                {JSON.stringify(selectedPayment.rawPayload, null, 2)}
              </pre>
            </section>
          </aside>
        </div>
      )}
    </section>
  );
}

function PaymentStatusBadge({ processed, statusCode }: { processed: boolean; statusCode: string }) {
  return (
    <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase ring-1 ${
      processed
        ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-300/20'
        : 'bg-amber-400/10 text-amber-300 ring-amber-300/20'
    }`}>
      {processed ? 'Processed' : `Code ${statusCode}`}
    </span>
  );
}

function SupportManagementSection({
  tickets,
  summary,
  loading,
  search,
  statusFilter,
  typeFilter,
  selectedTicket,
  ticketForm,
  savingTicket,
  onSearchChange,
  onStatusFilterChange,
  onTypeFilterChange,
  onOpenTicket,
  onCloseDetail,
  onFormChange,
  onSaveTicket,
}: {
  tickets: AdminSupportTicket[];
  summary: Record<'open' | 'pending' | 'resolved' | 'closed', number> | null;
  loading: boolean;
  search: string;
  statusFilter: string;
  typeFilter: string;
  selectedTicket: AdminSupportTicket | null;
  ticketForm: { status: AdminSupportTicket['status']; priority: AdminSupportTicket['priority']; adminNotes: string };
  savingTicket: boolean;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onTypeFilterChange: (value: string) => void;
  onOpenTicket: (ticket: AdminSupportTicket) => void;
  onCloseDetail: () => void;
  onFormChange: (value: { status: AdminSupportTicket['status']; priority: AdminSupportTicket['priority']; adminNotes: string }) => void;
  onSaveTicket: () => void;
}) {
  return (
    <section className="mt-6">
      <div className="grid gap-3 sm:grid-cols-4">
        {(['open', 'pending', 'resolved', 'closed'] as const).map((status) => (
          <article key={status} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10">
            <p className="text-xs font-black uppercase text-slate-500">{status}</p>
            <p className="mt-2 text-3xl font-black">{summary?.[status] || 0}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 md:grid-cols-[1fr_180px_190px]">
        <label className="relative block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-11 w-full rounded-xl border border-white/10 bg-slate-950 pl-10 pr-3 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400"
            placeholder="Search tickets"
          />
        </label>
        <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400">
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select value={typeFilter} onChange={(event) => onTypeFilterChange(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400">
          <option value="all">All types</option>
          <option value="general">General</option>
          <option value="complaint">Complaint</option>
          <option value="bug">Bug Report</option>
          <option value="feature_request">Feature Request</option>
          <option value="payment_issue">Payment Issue</option>
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/15">
        <div className="grid grid-cols-[1.2fr_140px_110px_110px_90px] gap-3 border-b border-white/10 px-5 py-3 text-xs font-black uppercase text-slate-500 max-lg:hidden">
          <span>Ticket</span>
          <span>User</span>
          <span>Type</span>
          <span>Status</span>
          <span>Action</span>
        </div>
        {loading && (
          <div className="flex items-center gap-3 px-5 py-5 text-sm font-bold text-slate-400">
            <Loader2 className="animate-spin text-violet-300" size={17} />
            Loading tickets...
          </div>
        )}
        {!loading && tickets.length === 0 && (
          <div className="px-5 py-8 text-center text-sm font-bold text-slate-500">No support tickets match these filters.</div>
        )}
        {!loading && tickets.map((ticket) => (
          <article key={ticket.id} className="grid gap-3 border-b border-white/10 px-4 py-4 last:border-b-0 lg:grid-cols-[1.2fr_140px_110px_110px_90px] lg:items-center lg:px-5">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-100">{ticket.subject}</p>
              <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">{ticket.message}</p>
              <p className="mt-1 text-xs font-bold text-slate-600">{formatDate(ticket.createdAt)}</p>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-200">{ticket.fullName}</p>
              <p className="mt-1 truncate text-xs font-semibold text-slate-500">{ticket.email}</p>
            </div>
            <span className="w-fit rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-slate-300 ring-1 ring-white/10">{ticket.type}</span>
            <TicketStatusBadge status={ticket.status} priority={ticket.priority} />
            <button type="button" onClick={() => onOpenTicket(ticket)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/6 px-3 text-xs font-black text-slate-100 transition hover:bg-white/10 active:scale-[0.98]">
              <Eye size={14} />
              View
            </button>
          </article>
        ))}
      </div>

      {selectedTicket && (
        <div className="fixed inset-0 z-80 flex justify-end bg-slate-950/70 backdrop-blur-sm" role="dialog" aria-modal="true">
          <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-slate-950 p-5 text-white shadow-2xl shadow-black/40">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-violet-300">Support Ticket</p>
                <h2 className="mt-1 truncate font-montserrat text-2xl font-black">{selectedTicket.subject}</h2>
                <p className="mt-1 truncate text-sm font-semibold text-slate-400">{selectedTicket.email}</p>
              </div>
              <button type="button" onClick={onCloseDetail} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/6 text-slate-300 transition hover:bg-white/10 hover:text-white" aria-label="Close ticket details">
                <X size={17} />
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <DetailTile label="Name" value={selectedTicket.fullName} />
              <DetailTile label="Email" value={selectedTicket.email} />
              <DetailTile label="Type" value={selectedTicket.type} />
              <DetailTile label="Created" value={formatDate(selectedTicket.createdAt)} />
            </div>

            <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <h3 className="font-montserrat text-lg font-black">Message</h3>
              <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-300">{selectedTicket.message}</p>
            </section>

            <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <h3 className="font-montserrat text-lg font-black">Admin Workflow</h3>
              <div className="mt-4 grid gap-4">
                <select value={ticketForm.status} onChange={(event) => onFormChange({ ...ticketForm, status: event.target.value as AdminSupportTicket['status'] })} className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400">
                  <option value="open">Open</option>
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <select value={ticketForm.priority} onChange={(event) => onFormChange({ ...ticketForm, priority: event.target.value as AdminSupportTicket['priority'] })} className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <textarea value={ticketForm.adminNotes} onChange={(event) => onFormChange({ ...ticketForm, adminNotes: event.target.value })} rows={5} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm font-bold text-white outline-none focus:border-violet-400" placeholder="Admin notes" />
                <button type="button" onClick={onSaveTicket} disabled={savingTicket} className="inline-flex h-11 items-center justify-center rounded-xl bg-violet-600 px-4 text-sm font-black text-white transition hover:bg-violet-500 active:scale-[0.98] disabled:opacity-60">
                  {savingTicket ? <Loader2 className="animate-spin" size={16} /> : 'Save ticket'}
                </button>
              </div>
            </section>
          </aside>
        </div>
      )}
    </section>
  );
}

function TicketStatusBadge({ status, priority }: { status: string; priority: string }) {
  return (
    <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ring-1 ${
      status === 'resolved' || status === 'closed'
        ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-300/20'
        : priority === 'urgent' || priority === 'high'
          ? 'bg-red-400/10 text-red-300 ring-red-300/20'
          : 'bg-amber-400/10 text-amber-300 ring-amber-300/20'
    }`}>
      {status}
    </span>
  );
}
