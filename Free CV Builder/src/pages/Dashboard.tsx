import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertCircle, ArrowLeft, Clock3, Edit3, FileText, Loader2, Plus, Trash2, Upload, X } from 'lucide-react';
import { AppShellHeader } from '../components/AppShellHeader';
import { AuthUser, apiFetch, getCurrentUser, setDashboardNotification } from '../utils/api';

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

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function latestUpdate(documents: SavedDocument[]) {
  if (!documents.length) return 'No activity yet';
  return formatDate(documents[0].updatedAt);
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

  useEffect(() => {
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

  const creationLimitReached = Boolean(quota?.reached);

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

  const renderCreationActions = (variant: 'empty' | 'toolbar') => {
    const wrapperClass = variant === 'empty'
      ? 'mx-auto mt-6 grid w-full max-w-sm gap-2 sm:max-w-none sm:grid-cols-2 sm:gap-3'
      : 'grid gap-2 sm:flex sm:items-center';
    const createClass = variant === 'empty'
      ? 'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500 active:scale-[0.98]'
      : 'inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-violet-600/20 transition hover:-translate-y-0.5 hover:bg-violet-500 active:scale-[0.98] sm:w-auto';
    const importClass = variant === 'empty'
      ? 'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-white/10 active:scale-[0.98]'
      : 'inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-white/10 active:scale-[0.98] sm:w-auto';
    const disabledClass = 'cursor-not-allowed opacity-45 hover:-translate-y-0 hover:bg-violet-600 active:scale-100';
    const disabledImportClass = 'cursor-not-allowed opacity-45 hover:bg-white/6 active:scale-100';

    if (creationLimitReached) {
      return (
        <div className="flex flex-col items-end gap-2">
          <span className="inline-block rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-xs font-black text-amber-200 shadow-lg shadow-black/20">
            Limit reached
          </span>
          <div className={wrapperClass}>
            <button type="button" disabled className={`${createClass} ${disabledClass}`} aria-label="Create New CV disabled: limit reached">
              <Plus size={17} />
              Create New CV
            </button>
            <button type="button" disabled className={`${importClass} ${disabledImportClass}`} aria-label="Import CV disabled: limit reached">
              <Upload size={17} />
              Import CV
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={wrapperClass}>
        <Link to="/builder" className={createClass}>
          <Plus size={17} />
          Create New CV
        </Link>
        <Link to="/builder?import=1" className={importClass}>
          <Upload size={17} />
          Import CV
        </Link>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <AppShellHeader />
      <main className="mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6 sm:pt-12 lg:px-8 lg:pt-14">
        <div className="flex flex-row items-start justify-between gap-3 border-b border-white/10 pb-6 sm:gap-5 sm:pb-8">
          <Link
            to="/builder"
            className="order-last -mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-2 text-[10px] font-black uppercase tracking-wider text-slate-100 shadow-lg shadow-black/20 transition hover:bg-white/15 hover:text-white active:scale-[0.98] sm:mt-0 sm:px-3.5 sm:py-2.5 sm:text-sm sm:normal-case sm:tracking-normal"
          >
            <ArrowLeft size={14} />
            Back to builder
          </Link>
          <div className="min-w-0 flex-1 pt-3 sm:pt-0">
            <p className="text-sm font-black uppercase text-emerald-300">Dashboard</p>
            <h1 className="mt-2 break-words font-montserrat text-2xl font-black leading-tight min-[390px]:text-3xl sm:text-5xl">
              Hi, {user?.displayName || 'there'}
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-400">
              View, edit, and manage your saved CV documents.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:px-4 sm:py-3">
            <p className="text-[10px] font-black uppercase text-slate-500 sm:text-xs">Saved CVs</p>
            <p className="mt-1 text-xl font-black text-white sm:text-2xl">{documents.length}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:col-span-2 sm:px-4 sm:py-3">
            <p className="text-[10px] font-black uppercase text-slate-500 sm:text-xs">Latest update</p>
            <p className="mt-1 flex items-center gap-2 text-xs font-bold text-slate-300 sm:text-sm">
              <Clock3 size={14} className="text-emerald-300 sm:size-[15px]" />
              <span className="truncate">{latestUpdate(documents)}</span>
            </p>
          </div>
        </div>

        {user && !user.emailVerified && (
          <section className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 shadow-lg shadow-black/10 sm:flex sm:items-center sm:justify-between sm:gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-300/15 text-amber-200 ring-1 ring-amber-200/20">
                <AlertCircle size={18} />
              </span>
              <div className="min-w-0">
                <h2 className="font-montserrat text-base font-black text-amber-100">Verify your email</h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-amber-100/75">
                  Verify your email to save CVs and download PDFs.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={resendVerification}
              disabled={isResendingVerification}
              className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-amber-300 px-4 py-2.5 text-xs font-black text-slate-950 transition hover:bg-amber-200 active:scale-[0.98] disabled:opacity-70 sm:mt-0 sm:w-auto"
            >
              {isResendingVerification ? 'Sending...' : 'Resend email'}
            </button>
          </section>
        )}

        {isLoading ? (
          <div className="mt-12 flex items-center gap-3 text-sm font-bold text-slate-400">
            <Loader2 className="animate-spin" size={18} />
            Loading your documents...
          </div>
        ) : documents.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-7 text-center sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300 ring-1 ring-violet-400/20">
              <FileText size={26} />
            </div>
            <h2 className="mt-5 font-montserrat text-2xl font-black leading-tight">No saved CVs yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-slate-400">
              Create a CV in the builder, then save it to see it here.
            </p>
            {renderCreationActions('empty')}
          </section>
        ) : (
          <section className="mt-8">
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <h2 className="font-montserrat text-xl font-black sm:text-2xl">Documents</h2>
              {renderCreationActions('toolbar')}
            </div>
            <div className="grid gap-3">
              {documents.map((document) => (
                <article key={document.id} className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-3 transition hover:border-white/20 hover:bg-white/[0.055] sm:grid-cols-[1fr_auto] sm:items-center sm:p-4">
                  <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/6 text-emerald-300 ring-1 ring-white/10 sm:h-11 sm:w-11">
                      <FileText size={16} className="sm:size-[18px]" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate font-montserrat text-lg font-black sm:text-xl">{document.title}</h2>
                      <p className="mt-0.5 text-[10px] font-bold uppercase text-violet-300 sm:text-xs">{document.template} template</p>
                      <p className="mt-1 text-xs font-semibold text-slate-400 sm:text-sm">
                        Edited: {formatDate(document.updatedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:w-56">
                    <button
                      type="button"
                      onClick={() => navigate(`/builder?document=${document.id}`)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-sm font-extrabold text-white transition hover:bg-violet-500 active:scale-[0.98] sm:py-2.5"
                    >
                      <Edit3 size={14} className="sm:size-[15px]" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocumentToDelete(document)}
                      disabled={deletingId === document.id}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm font-extrabold text-red-200 transition hover:bg-red-500/20 active:scale-[0.98] disabled:opacity-60 sm:py-2.5"
                    >
                      {deletingId === document.id ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

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
