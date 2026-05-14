import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Download,
  Edit3,
  Eye,
  FileText,
  LayoutTemplate,
  Loader2,
  Mail,
  MoreHorizontal,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppShellHeader } from '../components/AppShellHeader';
import { AppSidebar } from '../components/AppSidebar';
import { AuthUser, apiFetch, getCurrentUser, setDashboardNotification } from '../utils/api';
import { clearPageScrollLock } from '../utils/scrollLock';
import { CV_TEMPLATES } from '../templates';

interface SavedDocument {
  id: string;
  title: string;
  template: string;
  createdAt: string;
  updatedAt: string;
}

interface CvCreationQuota {
  limit: number | null;
  used: number;
  remaining: number | null;
  reached: boolean;
}

const templateMeta = new Map(CV_TEMPLATES.map((template) => [template.key, template]));

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function formatRelativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return formatDate(value);
}

function latestUpdate(documents: SavedDocument[]) {
  if (!documents.length) return 'No activity yet';
  return formatRelativeTime(documents[0].updatedAt);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [documents, setDocuments] = useState<SavedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<SavedDocument | null>(null);
  const [quota, setQuota] = useState<CvCreationQuota | null>(null);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [verificationBannerDismissed, setVerificationBannerDismissed] = useState(false);

  useEffect(() => {
    clearPageScrollLock();
    setDashboardNotification(false);

    let ignore = false;

    async function loadDashboard() {
      try {
        const [currentUser, documentsData] = await Promise.all([
          getCurrentUser(),
          apiFetch<{ documents: SavedDocument[]; quota: CvCreationQuota }>('/api/documents'),
        ]);

        if (!ignore) {
          setUser(currentUser);
          setDocuments(documentsData.documents);
          setQuota(documentsData.quota);
        }
      } catch (err) {
        if (!ignore) {
          const message = err instanceof Error ? err.message : 'Could not load dashboard.';
          toast.error(message);
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadDashboard();
    return () => {
      ignore = true;
    };
  }, []);

  const recentDocuments = useMemo(() => documents.slice(0, 3), [documents]);
  const templatesUsed = useMemo(() => new Set(documents.map((document) => document.template)).size, [documents]);
  const creationLimitReached = Boolean(quota?.reached);

  const deleteDocument = async (id: string) => {
    setDeletingId(id);
    try {
      await apiFetch(`/api/documents/${id}`, { method: 'DELETE' });
      setDocuments((items) => items.filter((item) => item.id !== id));
      setDocumentToDelete(null);
      toast.success('CV deleted successfully.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not delete this document.';
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  const resendVerification = async () => {
    if (isResendingVerification) return;

    setIsResendingVerification(true);
    try {
      const data = await apiFetch<{ user: AuthUser; message: string }>('/api/auth/resend-verification', {
        method: 'POST',
      });
      setUser(data.user);
      toast.success(data.message || 'Verification email sent.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not send verification email.';
      toast.error(message);
    } finally {
      setIsResendingVerification(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 text-white">
      <AppShellHeader />
      <div className="lg:flex lg:h-dvh lg:overflow-hidden">
      <AppSidebar />
      <main className="scrollbar-hide mx-auto min-w-0 max-w-7xl flex-1 px-3 pb-28 pt-6 sm:px-6 sm:pb-32 sm:pt-10 lg:h-dvh lg:overflow-y-auto lg:px-8 lg:pb-10">
        <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="break-words font-montserrat text-2xl font-black leading-tight min-[380px]:text-3xl sm:text-4xl">
              Welcome back, {user?.displayName || 'there'}!
            </h1>
            <p className="mt-2 text-sm font-semibold text-slate-400">
              Manage your CVs, track your progress, and stay career ready.
            </p>
          </div>
          <Link
            to="/builder"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-500 active:scale-[0.98] sm:w-auto"
          >
            <ArrowRight size={17} />
            Back to builder
          </Link>
        </section>

        <section className="mt-7 grid gap-4 md:grid-cols-3">
          <DashboardStat
            icon={<FileText size={20} />}
            tone="violet"
            value={documents.length}
            label="Saved CVs"
            action={documents.length ? 'View recent CVs' : 'Create your first CV'}
          />
          <DashboardStat
            icon={<LayoutTemplate size={20} />}
            tone="sky"
            value={templatesUsed}
            label="Templates Used"
            action="Explore templates"
          />
          <DashboardStat
            icon={<Clock3 size={20} />}
            tone="amber"
            value={latestUpdate(documents)}
            label="Latest Update"
            action={documents.length ? 'Keep building' : 'Start building now'}
            compactValue
          />
        </section>

        <AnimatePresence initial={false}>
          {user && !user.emailVerified && !verificationBannerDismissed && (
            <motion.section
              key="dashboard-verify-banner"
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -8 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              className="mt-5 overflow-hidden"
            >
              <div className="relative rounded-2xl border border-amber-300/25 bg-amber-400/10 p-4 shadow-lg shadow-black/10 sm:flex sm:items-center sm:justify-between sm:gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-300/15 text-amber-200 ring-1 ring-amber-200/20">
                    <Mail size={18} />
                  </span>
                  <div className="min-w-0 pr-10 sm:pr-0">
                    <h2 className="font-montserrat text-base font-black text-amber-100">Verify your email</h2>
                    <p className="mt-1 text-sm font-semibold leading-6 text-amber-100/75">
                      Verify your email to save CVs and download PDFs.
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 sm:mt-0">
                  <button
                    type="button"
                    onClick={resendVerification}
                    disabled={isResendingVerification}
                    className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-amber-300 px-4 py-2.5 text-xs font-black text-slate-950 transition hover:bg-amber-200 active:scale-[0.98] disabled:opacity-70 sm:flex-none"
                  >
                    {isResendingVerification ? 'Sending...' : 'Resend email'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerificationBannerDismissed(true)}
                    className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-amber-200/20 text-amber-100 transition hover:bg-amber-200/10 active:scale-95 sm:static sm:h-10 sm:w-10"
                    aria-label="Dismiss verification banner"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {isLoading ? (
          <div className="mt-10 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm font-bold text-slate-400">
            <Loader2 className="animate-spin text-violet-300" size={18} />
            Loading your dashboard...
          </div>
        ) : documents.length === 0 ? (
          <section className="mt-6 rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.20),rgba(15,23,42,0.38)_34%,rgba(255,255,255,0.035)_100%)] px-4 py-8 text-center shadow-2xl shadow-black/20 sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500 text-white shadow-2xl shadow-violet-600/30 sm:h-20 sm:w-20 sm:rounded-3xl">
              <FileText size={30} />
            </div>
            <h2 className="mt-5 font-montserrat text-xl font-black sm:mt-6 sm:text-2xl">You haven't created any CVs yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-slate-400">
              Create a professional CV in minutes with our easy builder.
            </p>
            <div className="mx-auto mt-6 grid max-w-2xl gap-3 sm:grid-cols-2">
              <DashboardActionLink to="/builder?import=1" disabled={creationLimitReached} primary icon={<Plus size={17} />}>
                Create New CV
              </DashboardActionLink>
              <DashboardActionLink to="/builder?import=1" disabled={creationLimitReached} icon={<Upload size={17} />}>
                Import CV
              </DashboardActionLink>
            </div>
          </section>
        ) : (
          <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/15">
            <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <h2 className="font-montserrat text-xl font-black">Recent CVs</h2>
                <p className="mt-1 text-sm font-semibold text-slate-400">Your latest saved documents.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <DashboardActionLink to="/builder?import=1" disabled={creationLimitReached} primary icon={<Plus size={16} />}>
                  Create
                </DashboardActionLink>
                <DashboardActionLink to="/builder?import=1" disabled={creationLimitReached} icon={<Upload size={16} />}>
                  Import
                </DashboardActionLink>
              </div>
            </div>
            <div className="divide-y divide-white/10">
              {recentDocuments.map((document) => (
                <RecentCvRow
                  key={document.id}
                  document={document}
                  deleting={deletingId === document.id}
                  onEdit={() => navigate(`/builder?document=${document.id}`)}
                  onDelete={() => setDocumentToDelete(document)}
                />
              ))}
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs font-bold text-slate-500 sm:px-5">
              <span>Showing {recentDocuments.length} of {documents.length} CVs</span>
              {documents.length > 3 && (
                <Link to="/my-cvs" className="inline-flex items-center gap-1.5 text-violet-300 transition hover:text-violet-200">
                  View all
                  <ArrowRight size={14} />
                </Link>
              )}
            </div>
          </section>
        )}

        <section className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 sm:p-5">
            <h2 className="font-montserrat text-lg font-black">Get Started</h2>
            <p className="mt-1 text-sm font-semibold text-slate-400">Simple steps to create your perfect CV.</p>
            <div className="mt-6 grid gap-5 sm:mt-7 sm:grid-cols-3">
              {[
                ['1', 'Choose Template', 'Pick a professional template'],
                ['2', 'Add Information', 'Fill in your details'],
                ['3', 'Download & Share', 'Download your CV and apply'],
              ].map(([step, title, copy]) => (
                <div key={step} className="relative text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-600 text-lg font-black text-white shadow-lg shadow-violet-600/25">
                    {step}
                  </div>
                  <h3 className="mt-4 text-sm font-black text-slate-100">{title}</h3>
                  <p className="mx-auto mt-2 max-w-40 text-xs font-semibold leading-5 text-slate-400">{copy}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 sm:p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-montserrat text-lg font-black">Tips & Resources</h2>
              <Link to="/tips" className="text-xs font-black text-violet-300 transition hover:text-violet-200">View all</Link>
            </div>
            <div className="mt-4 grid gap-2">
              {[
                ['How to write a professional CV', '5 min read', '/tips'],
                ['Top CV formats for 2026', '7 min read', '/tips'],
                ['CV mistakes to avoid', '6 min read', '/tips'],
              ].map(([title, meta, href]) => (
                <Link
                  key={title}
                  to={href}
                  className="group flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/35 p-3 transition hover:border-violet-300/30 hover:bg-white/[0.055]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300 ring-1 ring-violet-300/20">
                    <BookOpen size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-extrabold text-slate-200">{title}</span>
                    <span className="text-xs font-semibold text-slate-500">{meta}</span>
                  </span>
                  <ArrowRight size={15} className="text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-violet-300" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      </div>

      {documentToDelete && (
        <div className="fixed inset-0 z-80 flex items-center justify-center bg-slate-950/75 px-4 py-5 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-900 text-white shadow-2xl shadow-black/40">
            <div className="h-1 bg-linear-to-r from-red-500 via-orange-400 to-violet-500" />
            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black uppercase text-red-300">Delete CV</p>
                  <h2 className="mt-1 font-montserrat text-2xl font-black">Are you sure?</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setDocumentToDelete(null)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/6 text-slate-300 transition hover:bg-white/10 hover:text-white"
                  aria-label="Close delete confirmation"
                >
                  <X size={17} />
                </button>
              </div>

              <p className="mt-4 text-sm font-semibold leading-6 text-slate-400">
                This will permanently delete <span className="text-slate-100">{documentToDelete.title}</span>. This action cannot be undone.
              </p>

              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setDocumentToDelete(null)}
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-extrabold text-slate-200 transition hover:bg-white/10 active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => deleteDocument(documentToDelete.id)}
                  disabled={deletingId === documentToDelete.id}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-red-500 active:scale-[0.98] disabled:opacity-70"
                >
                  {deletingId === documentToDelete.id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                  Delete CV
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardStat({
  icon,
  tone,
  value,
  label,
  action,
  compactValue,
}: {
  icon: React.ReactNode;
  tone: 'violet' | 'sky' | 'amber';
  value: number | string;
  label: string;
  action: string;
  compactValue?: boolean;
}) {
  const tones = {
    violet: 'bg-violet-500/15 text-violet-300 ring-violet-300/20',
    sky: 'bg-sky-500/15 text-sky-300 ring-sky-300/20',
    amber: 'bg-amber-500/15 text-amber-300 ring-amber-300/20',
  };

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 transition hover:border-white/15 hover:bg-white/[0.05] sm:p-5">
      <div className="flex items-center gap-4">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 sm:h-12 sm:w-12 ${tones[tone]}`}>
          {icon}
        </span>
        <div className="min-w-0">
          <div className={`${compactValue ? 'truncate text-sm sm:text-base' : 'text-3xl'} font-black text-white`}>
            {value}
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-300">{label}</p>
          <p className="mt-2 text-xs font-black text-violet-300">{action}</p>
        </div>
      </div>
    </article>
  );
}

function DashboardActionLink({
  to,
  disabled,
  primary,
  icon,
  children,
}: {
  to: string;
  disabled?: boolean;
  primary?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const className = primary
    ? 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-3 text-sm font-extrabold text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-500 active:scale-[0.98] sm:px-4'
    : 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/6 px-3 py-3 text-sm font-extrabold text-white transition hover:bg-white/10 active:scale-[0.98] sm:px-4';

  if (disabled) {
    return (
      <span className={`${className} pointer-events-none opacity-45`}>
        {icon}
        {children}
      </span>
    );
  }

  return (
    <Link to={to} className={className}>
      {icon}
      {children}
    </Link>
  );
}

function RecentCvRow({
  document,
  deleting,
  onEdit,
  onDelete,
}: {
  document: SavedDocument;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = templateMeta.get(document.template as any);
  const templateLabel = meta?.label || document.template;
  const image = meta?.image || '/templates/professional.png';

  return (
    <article className="grid gap-3 px-3 py-4 transition hover:bg-white/[0.035] sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4 sm:px-5">
      <div className="flex min-w-0 gap-3 sm:gap-4">
        <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-slate-900 shadow-lg shadow-black/15 sm:h-24 sm:w-20">
          <img src={image} alt="" className="h-full w-full object-cover object-top" />
        </div>
        <div className="min-w-0 py-0.5 sm:py-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="max-w-full truncate font-montserrat text-sm font-black text-white min-[380px]:text-base sm:text-lg">{document.title}</h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2.5 py-1 text-[10px] font-black text-emerald-300 ring-1 ring-emerald-300/15">
              <CheckCircle2 size={12} />
              Saved
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-400">{templateLabel} template</p>
          <p className="mt-2 text-xs font-bold text-slate-500">Updated {formatRelativeTime(document.updatedAt)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 min-[520px]:grid-cols-4 sm:flex sm:justify-end">
        <button type="button" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-extrabold text-slate-200 transition hover:bg-white/10 active:scale-[0.98]">
          <Eye size={14} />
          Preview
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-extrabold text-slate-200 transition hover:bg-white/10 active:scale-[0.98]"
        >
          <Edit3 size={14} />
          Edit
        </button>
        <button type="button" className="hidden items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-extrabold text-slate-200 transition hover:bg-white/10 active:scale-[0.98] min-[460px]:inline-flex">
          <Download size={14} />
          Download
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="inline-flex items-center justify-center rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-extrabold text-red-200 transition hover:bg-red-500/20 active:scale-[0.98] disabled:opacity-60"
          aria-label={`Delete ${document.title}`}
        >
          {deleting ? <Loader2 className="animate-spin" size={15} /> : <MoreHorizontal size={15} />}
        </button>
      </div>
    </article>
  );
}
