import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Download,
  Edit3,
  FileText,
  Filter,
  FolderArchive,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { AppShellHeader } from '../components/AppShellHeader';
import { AppSidebar } from '../components/AppSidebar';
import { apiFetch, setDashboardNotification } from '../utils/api';
import { clearPageScrollLock } from '../utils/scrollLock';
import { useTemplateConfig, type TemplateConfigItem } from '../hooks/useTemplateConfig';
import { useDocumentsQuery, useRemoveDocumentFromCache, type SavedDocument } from '../hooks/useDocumentsQuery';

type FilterTab = 'all' | 'recent' | 'drafts' | 'archived';

function formatRelativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

export default function MyCvs() {
  const navigate = useNavigate();
  const { templateMap } = useTemplateConfig();
  const {
    data: documentsData,
    isPending: isLoading,
    error: documentsError,
  } = useDocumentsQuery();
  const removeDocumentFromCache = useRemoveDocumentFromCache();
  const documents = documentsData?.documents ?? [];
  const quota = documentsData?.quota ?? null;
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [documentToDelete, setDocumentToDelete] = useState<SavedDocument | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openActionsDocumentId, setOpenActionsDocumentId] = useState<string | null>(null);

  useEffect(() => {
    clearPageScrollLock();
    setDashboardNotification(false);
  }, []);

  useEffect(() => {
    if (!documentsError) return;
    toast.error(documentsError instanceof Error ? documentsError.message : 'Could not load your CVs.');
  }, [documentsError]);

  const stats = useMemo(() => {
    const drafts = documents.filter((doc) => doc.status === 'draft').length;
    const completed = documents.filter((doc) => doc.status !== 'draft').length;
    return { drafts, completed };
  }, [documents]);

  const searchedDocuments = useMemo(() => {
    const term = search.trim().toLowerCase();
    let base: SavedDocument[] = [];

    if (activeTab === 'recent') {
      base = documents;
    } else if (activeTab === 'drafts') {
      base = documents.filter((doc) => doc.status === 'draft');
    } else if (activeTab === 'all') {
      base = documents;
    }

    return term ? base.filter((document) => {
      const templateLabel = templateMap.get(document.template as any)?.label || document.template;
      return `${document.title} ${templateLabel}`.toLowerCase().includes(term);
    }) : base;
  }, [activeTab, documents, search, templateMap]);

  const deleteDocument = async (id: string) => {
    setDeletingId(id);
    try {
      await apiFetch(`/api/documents/${id}`, { method: 'DELETE' });
      removeDocumentFromCache(id);
      setDocumentToDelete(null);
      toast.success('CV deleted successfully.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete this document.');
    } finally {
      setDeletingId(null);
    }
  };

  const creationLimitReached = Boolean(quota?.reached);

  useEffect(() => {
    if (!openActionsDocumentId) return;

    const closeOpenMenu = (event: PointerEvent) => {
      if ((event.target as HTMLElement | null)?.closest('[data-cv-actions-menu]')) return;
      setOpenActionsDocumentId(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenActionsDocumentId(null);
    };

    window.addEventListener('pointerdown', closeOpenMenu);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('pointerdown', closeOpenMenu);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [openActionsDocumentId]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 text-white">
      <AppShellHeader />
      <div className="lg:flex lg:h-dvh lg:overflow-hidden">
        <AppSidebar />
        <main className="scrollbar-hide mx-auto min-w-0 max-w-7xl flex-1 px-4 pb-28 pt-5 sm:px-6 sm:pb-32 sm:pt-8 lg:h-dvh lg:overflow-y-auto lg:px-8 lg:pb-10">
          <section className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h1 className="font-montserrat text-2xl font-black leading-tight min-[380px]:text-3xl sm:text-4xl">My CVs</h1>
              <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-400">
                Create, edit and manage all your CV documents.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:grid-cols-[minmax(220px,1fr)_auto_auto] lg:w-[590px]">
              <label className="relative col-span-2 block sm:col-span-1">
                <Search size={17} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.035] pl-4 pr-10 text-base sm:text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400"
                  placeholder="Search CVs..."
                />
              </label>
              <button
                type="button"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-4 text-sm font-extrabold text-slate-200 transition hover:bg-white/8"
              >
                <Filter size={16} />
                Filter
              </button>
              {creationLimitReached ? (
                <span className="inline-flex h-12 cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 text-sm font-extrabold text-white opacity-45 sm:px-4">
                  <Plus size={17} />
                  <span className="hidden min-[380px]:inline">Create New CV</span>
                  <span className="min-[380px]:hidden">Create</span>
                </span>
              ) : (
                <Link
                  to="/builder?import=1"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 text-sm font-extrabold text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-500 active:scale-[0.98] sm:px-4"
                >
                  <Plus size={17} />
                  <span className="hidden min-[380px]:inline">Create New CV</span>
                  <span className="min-[380px]:hidden">Create</span>
                </Link>
              )}
            </div>
          </section>

          <section className="mt-6 grid items-start gap-5 lg:grid-cols-[1fr_300px]">
            <div className="min-w-0 self-start rounded-2xl border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/15">
              <div className="scrollbar-hide flex gap-1 overflow-x-auto border-b border-white/10 px-2 pt-2 sm:px-3 sm:pt-3">
                <FilterButton active={activeTab === 'all'} onClick={() => setActiveTab('all')} label="All CVs" count={documents.length} />
                <FilterButton active={activeTab === 'recent'} onClick={() => setActiveTab('recent')} label="Recent" count={documents.length} />
                <FilterButton active={activeTab === 'drafts'} onClick={() => setActiveTab('drafts')} label="Drafts" count={stats.drafts} />
                <FilterButton active={activeTab === 'archived'} onClick={() => setActiveTab('archived')} label="Archived" count={0} />
              </div>

              {isLoading ? (
                <div className="flex items-center gap-3 p-5 text-sm font-bold text-slate-400">
                  <Loader2 className="animate-spin text-violet-300" size={18} />
                  Loading your CVs...
                </div>
              ) : searchedDocuments.length === 0 ? (
                <div className="flex min-h-[340px] flex-col items-center justify-center px-4 py-10 text-center sm:min-h-[420px] sm:py-12">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300 ring-1 ring-violet-300/20 sm:h-16 sm:w-16">
                    <FileText size={28} />
                  </div>
                  <h2 className="mt-4 font-montserrat text-xl font-black">No CVs found</h2>
                  <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-6 text-slate-400">
                    Try another search or create a new CV.
                  </p>
                </div>
              ) : (
                <>
                  <div className="dark-scrollbar min-h-[420px] divide-y divide-white/10 overflow-y-auto sm:max-h-[calc(100dvh-320px)]">
                    {searchedDocuments.map((document) => (
                      <CvListItem
                  key={document.id}
                  document={document}
                  templateMap={templateMap}
                  deleting={deletingId === document.id}
                        menuOpen={openActionsDocumentId === document.id}
                        onToggleMenu={() => setOpenActionsDocumentId((current) => current === document.id ? null : document.id)}
                        onEdit={() => navigate(`/builder?document=${document.id}`)}
                        onDownload={() => navigate(`/builder?document=${document.id}&download=1`)}
                        onDelete={() => {
                          setOpenActionsDocumentId(null);
                          setDocumentToDelete(document);
                        }}
                      />
                    ))}
                  </div>
                  <div className="px-4 py-4 text-center text-xs font-bold text-slate-500">
                    Showing 1 to {searchedDocuments.length} of {searchedDocuments.length} CVs
                  </div>
                </>
              )}
            </div>

            <aside className="grid gap-4 self-start">
              <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 sm:p-5">
                <h2 className="font-montserrat text-lg font-black">CV Overview</h2>
                <div className="mt-4 grid gap-3">
                  <OverviewRow icon={<FileText size={16} />} label="Total CVs" value={documents.length} tone="violet" />
                  <OverviewRow icon={<CheckCircle2 size={16} />} label="Completed" value={stats.completed} tone="emerald" />
                  <OverviewRow icon={<FileText size={16} />} label="Drafts" value={stats.drafts} tone="slate" />
                  <OverviewRow icon={<FolderArchive size={16} />} label="Archived" value={0} tone="slate" />
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 sm:p-5">
                <div className="flex items-center justify-between text-sm font-bold">
                  <span>Storage Used</span>
                  <span className="text-slate-300">{documents.length ? Math.min(100, documents.length * 3) : 0}%</span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-violet-500" style={{ width: `${documents.length ? Math.min(100, documents.length * 3) : 0}%` }} />
                </div>
              </section>


            </aside>
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

function FilterButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-w-max items-center gap-2 border-b-2 px-3 py-3 text-sm font-extrabold transition sm:px-4 sm:py-4 ${active ? 'border-violet-500 text-violet-300' : 'border-transparent text-slate-400 hover:text-slate-200'
        }`}
    >
      {label}
      <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs text-slate-300">{count}</span>
    </button>
  );
}

function CvListItem({ document, templateMap, deleting, menuOpen, onToggleMenu, onEdit, onDownload, onDelete }: { document: SavedDocument; templateMap: Map<string, TemplateConfigItem>; deleting: boolean; menuOpen: boolean; onToggleMenu: () => void; onEdit: () => void; onDownload: () => void; onDelete: () => void }) {
  const meta = templateMap.get(document.template as any);
  const image = meta?.thumbnail || '/templates/professional.webp';
  const templateLabel = meta?.label || document.template;

  return (
    <article className="relative grid gap-3 px-3 py-4 pr-14 transition hover:bg-white/[0.035] min-[380px]:px-5 min-[380px]:py-5 min-[380px]:pr-14 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-5 sm:pr-5">
      <div className="flex min-w-0 gap-3 min-[380px]:gap-5">
        <div className="h-24 w-20 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-slate-900 shadow-lg shadow-black/15 min-[380px]:h-28 min-[380px]:w-[5.5rem]">
          <img src={image} alt="" className="h-full w-full object-cover object-top" />
        </div>
        <div className="min-w-0 py-0.5 min-[380px]:py-1">
          <div className="flex min-w-0 flex-col items-start gap-1 min-[430px]:flex-row min-[430px]:items-center min-[430px]:gap-2">
            <h3 className="max-w-full truncate font-montserrat text-base font-black text-white sm:text-lg">{document.title}</h3>
            {document.status === 'draft' ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/12 px-2 py-0.5 text-[10px] font-black text-amber-300 ring-1 ring-amber-300/15 min-[380px]:px-2.5 min-[380px]:py-1">
                <Clock3 size={12} />
                Draft
              </span>
            ) : (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[10px] font-black text-emerald-300 ring-1 ring-emerald-300/15 min-[380px]:px-2.5 min-[380px]:py-1">
                <CheckCircle2 size={12} />
                Completed
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-sm font-semibold text-slate-400">{templateLabel} template</p>
          <p className="mt-2 text-xs font-bold text-slate-500">Updated {formatRelativeTime(document.updatedAt)}</p>
        </div>
      </div>
      <div className="absolute right-3 top-3 min-[380px]:right-4 min-[380px]:top-4 sm:hidden" data-cv-actions-menu>
        <button
          type="button"
          onClick={onToggleMenu}
          className="flex h-9 w-9 items-center justify-center text-slate-300 transition hover:text-white active:scale-95"
          aria-label={`Open actions for ${document.title}`}
          aria-expanded={menuOpen}
        >
          <MoreHorizontal size={17} />
        </button>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              className="absolute right-0 z-20 mt-2 w-36 -translate-x-2 overflow-hidden rounded-xl border border-white/10 bg-slate-900 py-1 text-sm font-extrabold text-slate-100 shadow-2xl shadow-black/40"
            >
              <button type="button" onClick={onEdit} className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition hover:bg-white/8">
                <Edit3 size={14} />
                Edit
              </button>
              <button type="button" onClick={onDownload} className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition hover:bg-white/8">
                <Download size={14} />
                Download
              </button>
              <button type="button" onClick={onDelete} disabled={deleting} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-red-200 transition hover:bg-red-500/10 disabled:opacity-60">
                {deleting ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                Delete
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="hidden gap-2 sm:flex sm:justify-end">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-xs font-extrabold text-slate-200 transition hover:bg-white/10 active:scale-[0.98] min-[380px]:gap-2 min-[380px]:px-3"
        >
          <Edit3 size={14} />
          Edit
        </button>
        <button type="button" onClick={onDownload} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-xs font-extrabold text-slate-200 transition hover:bg-white/10 active:scale-[0.98] min-[380px]:gap-2 min-[380px]:px-3">
          <Download size={14} />
          <span className="hidden min-[380px]:inline">Download</span>
          <span className="min-[380px]:hidden">PDF</span>
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-red-400/20 bg-red-500/10 px-2 py-2 text-xs font-extrabold text-red-200 transition hover:bg-red-500/20 active:scale-[0.98] disabled:opacity-60 min-[380px]:px-3"
          aria-label={`Delete ${document.title}`}
        >
          {deleting ? <Loader2 className="animate-spin" size={15} /> : <Trash2 size={15} />}
        </button>
      </div>
    </article>
  );
}

function OverviewRow({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: 'violet' | 'emerald' | 'slate' }) {
  const toneClass = {
    violet: 'text-violet-300',
    emerald: 'text-emerald-300',
    slate: 'text-slate-400',
  }[tone];

  return (
    <div className="flex items-center gap-3 text-sm font-semibold text-slate-300">
      <span className={toneClass}>{icon}</span>
      <span className="flex-1">{label}</span>
      <span className="text-base font-black text-white">{value}</span>
    </div>
  );
}
