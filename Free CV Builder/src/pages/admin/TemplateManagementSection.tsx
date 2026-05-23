import React from 'react';
import {
  Eye,
  Loader2,
  Plus,
  Search,
  X,
} from 'lucide-react';
import type { AdminTemplateItem } from './adminTypes';
import { emptyCustomTemplateForm, formatDate } from './adminUtils';
import { DetailTile, TemplateAccessBadge } from './AdminSharedComponents';

export default function TemplateManagementSection({
  templates,
  categories,
  loading,
  search,
  categoryFilter,
  accessFilter,
  selectedTemplate,
  templateForm,
  templateFileForm,
  savingTemplate,
  createTemplateOpen,
  customTemplateForm,
  creatingTemplate,
  onSearchChange,
  onCategoryFilterChange,
  onAccessFilterChange,
  onOpenTemplate,
  onCloseDetail,
  onFormChange,
  onTemplateFileFormChange,
  onSelectedTemplateFileChange,
  onSaveTemplate,
  onOpenCreate,
  onCloseCreate,
  onCustomFormChange,
  onCustomFileChange,
  onCreateTemplate,
  onChangeCustomStatus,
}: {
  templates: AdminTemplateItem[];
  categories: string[];
  loading: boolean;
  search: string;
  categoryFilter: string;
  accessFilter: string;
  selectedTemplate: AdminTemplateItem | null;
  templateForm: { label: string; category: string; access: 'free' | 'paid'; thumbnail: string; surfaceColorRole: 'none' | 'sidebar' | 'header'; surfaceColorLabel: string };
  templateFileForm: { indexHtml: string; styleCss: string; thumbnailDataUrl: string };
  savingTemplate: boolean;
  createTemplateOpen: boolean;
  customTemplateForm: typeof emptyCustomTemplateForm;
  creatingTemplate: boolean;
  onSearchChange: (value: string) => void;
  onCategoryFilterChange: (value: string) => void;
  onAccessFilterChange: (value: string) => void;
  onOpenTemplate: (template: AdminTemplateItem) => void;
  onCloseDetail: () => void;
  onFormChange: (value: { label: string; category: string; access: 'free' | 'paid'; thumbnail: string; surfaceColorRole: 'none' | 'sidebar' | 'header'; surfaceColorLabel: string }) => void;
  onTemplateFileFormChange: (value: { indexHtml: string; styleCss: string; thumbnailDataUrl: string }) => void;
  onSelectedTemplateFileChange: (file: File | undefined, field: 'indexHtml' | 'styleCss' | 'thumbnailDataUrl') => void;
  onSaveTemplate: () => void;
  onOpenCreate: () => void;
  onCloseCreate: () => void;
  onCustomFormChange: (value: typeof emptyCustomTemplateForm) => void;
  onCustomFileChange: (file: File | undefined, field: 'indexHtml' | 'styleCss' | 'thumbnailDataUrl') => void;
  onCreateTemplate: () => void;
  onChangeCustomStatus: (template: AdminTemplateItem, action: 'publish' | 'archive') => void;
}) {
  return (
    <section className="mt-6">
      <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 md:grid-cols-[1fr_180px_180px_auto]">
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
        <button
          type="button"
          onClick={onOpenCreate}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-black text-white transition hover:bg-violet-500 active:scale-[0.98]"
        >
          <Plus size={16} />
          Add
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/15">
        <div className="grid grid-cols-[1.2fr_130px_100px_100px_80px_90px] gap-3 border-b border-white/10 px-5 py-3 text-xs font-black uppercase text-slate-500 max-lg:hidden">
          <span>Template</span>
          <span>Category</span>
          <span>Access</span>
          <span>Status</span>
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
          <article key={template.key} className="grid gap-3 border-b border-white/10 px-4 py-4 last:border-b-0 lg:grid-cols-[1.2fr_130px_100px_100px_80px_90px] lg:items-center lg:px-5">
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
            <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ring-1 ${template.status === 'active' ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-300/20' : template.status === 'draft' ? 'bg-amber-400/10 text-amber-300 ring-amber-300/20' : 'bg-slate-400/10 text-slate-300 ring-slate-300/20'}`}>{template.status}</span>
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

      {createTemplateOpen && (
        <div className="fixed inset-0 z-80 flex justify-end bg-slate-950/70 backdrop-blur-sm" role="dialog" aria-modal="true">
          <aside className="h-full w-full max-w-2xl overflow-y-auto border-l border-white/10 bg-slate-950 p-5 text-white shadow-2xl shadow-black/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-violet-300">New Template</p>
                <h2 className="mt-1 font-montserrat text-2xl font-black">Add S3 template</h2>
              </div>
              <button
                type="button"
                onClick={onCloseCreate}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/6 text-slate-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Close add template"
              >
                <X size={17} />
              </button>
            </div>

            <section className="mt-6 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-black text-slate-200">
                  Key
                  <input
                    value={customTemplateForm.key}
                    onChange={(event) => onCustomFormChange({ ...customTemplateForm, key: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                    placeholder="modern-2026"
                    className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400"
                  />
                </label>
                <label className="grid gap-2 text-sm font-black text-slate-200">
                  Label
                  <input
                    value={customTemplateForm.label}
                    onChange={(event) => onCustomFormChange({ ...customTemplateForm, label: event.target.value })}
                    placeholder="Creative 2026"
                    className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400"
                  />
                </label>
                <label className="grid gap-2 text-sm font-black text-slate-200">
                  Category
                  <select
                    value={customTemplateForm.category}
                    onChange={(event) => onCustomFormChange({ ...customTemplateForm, category: event.target.value })}
                    className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400"
                  >
                    {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-black text-slate-200">
                  Access
                  <select
                    value={customTemplateForm.access}
                    onChange={(event) => onCustomFormChange({ ...customTemplateForm, access: event.target.value as 'free' | 'paid' })}
                    className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400"
                  >
                    <option value="paid">Premium</option>
                    <option value="free">Free</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-black text-slate-200">
                  Surface color
                  <select
                    value={customTemplateForm.surfaceColorRole}
                    onChange={(event) => onCustomFormChange({ ...customTemplateForm, surfaceColorRole: event.target.value as 'none' | 'sidebar' | 'header' })}
                    className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400"
                  >
                    <option value="none">None</option>
                    <option value="header">Header</option>
                    <option value="sidebar">Sidebar</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-black text-slate-200">
                  Initial status
                  <select
                    value={customTemplateForm.status}
                    onChange={(event) => onCustomFormChange({ ...customTemplateForm, status: event.target.value as 'draft' | 'active' })}
                    className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="grid gap-2 text-sm font-black text-slate-200">
                  index.html
                  <input type="file" accept=".html,text/html" onChange={(event) => void onCustomFileChange(event.target.files?.[0], 'indexHtml')} className="text-xs font-bold text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-black file:text-white" />
                </label>
                <label className="grid gap-2 text-sm font-black text-slate-200">
                  style.css
                  <input type="file" accept=".css,text/css" onChange={(event) => void onCustomFileChange(event.target.files?.[0], 'styleCss')} className="text-xs font-bold text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-black file:text-white" />
                </label>
                <label className="grid gap-2 text-sm font-black text-slate-200">
                  Thumbnail
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => void onCustomFileChange(event.target.files?.[0], 'thumbnailDataUrl')} className="text-xs font-bold text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-black file:text-white" />
                </label>
              </div>

              <div className="grid gap-4">
                <label className="grid gap-2 text-sm font-black text-slate-200">
                  HTML preview
                  <textarea value={customTemplateForm.indexHtml} onChange={(event) => onCustomFormChange({ ...customTemplateForm, indexHtml: event.target.value })} rows={8} className="rounded-xl border border-white/10 bg-slate-950 p-3 font-mono text-xs text-white outline-none focus:border-violet-400" />
                </label>
                <label className="grid gap-2 text-sm font-black text-slate-200">
                  CSS preview
                  <textarea value={customTemplateForm.styleCss} onChange={(event) => onCustomFormChange({ ...customTemplateForm, styleCss: event.target.value })} rows={8} className="rounded-xl border border-white/10 bg-slate-950 p-3 font-mono text-xs text-white outline-none focus:border-violet-400" />
                </label>
              </div>

              <button
                type="button"
                onClick={onCreateTemplate}
                disabled={creatingTemplate}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-violet-600 px-4 text-sm font-black text-white transition hover:bg-violet-500 active:scale-[0.98] disabled:opacity-60"
              >
                {creatingTemplate ? <Loader2 className="animate-spin" size={16} /> : 'Create template'}
              </button>
            </section>
          </aside>
        </div>
      )}

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
                <label className="grid gap-2 text-sm font-black text-slate-200">
                  Surface color
                  <select
                    value={templateForm.surfaceColorRole}
                    onChange={(event) => onFormChange({ ...templateForm, surfaceColorRole: event.target.value as 'none' | 'sidebar' | 'header' })}
                    className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400"
                  >
                    <option value="none">None</option>
                    <option value="header">Header</option>
                    <option value="sidebar">Sidebar</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-black text-slate-200">
                  Surface label
                  <input
                    value={templateForm.surfaceColorLabel}
                    onChange={(event) => onFormChange({ ...templateForm, surfaceColorLabel: event.target.value })}
                    placeholder="Accent Background"
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
                {selectedTemplate.source === 'custom' && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => onChangeCustomStatus(selectedTemplate, 'publish')}
                      disabled={savingTemplate || selectedTemplate.status === 'active'}
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50"
                    >
                      Publish
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeCustomStatus(selectedTemplate, 'archive')}
                      disabled={savingTemplate || selectedTemplate.status === 'archived'}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/6 px-4 text-sm font-black text-slate-100 transition hover:bg-white/10 active:scale-[0.98] disabled:opacity-50"
                    >
                      Archive
                    </button>
                  </div>
                )}
              </div>
            </section>

            {selectedTemplate.source === 'custom' && (
              <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <h3 className="font-montserrat text-lg font-black">Replace template files</h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Upload only the files you want to overwrite for this key.
                </p>

                <div className="mt-4 grid gap-3">
                  <label className="grid cursor-pointer gap-2 rounded-xl border border-white/10 bg-slate-950/60 p-3 transition hover:border-violet-300/50 hover:bg-white/[0.06]">
                    <span className="text-sm font-black text-slate-100">index.html</span>
                    <span className={`text-xs font-bold ${templateFileForm.indexHtml ? 'text-emerald-300' : 'text-slate-500'}`}>
                      {templateFileForm.indexHtml ? 'HTML file selected' : 'Choose the replacement HTML file'}
                    </span>
                    <input
                      type="file"
                      accept=".html,text/html"
                      onChange={(event) => void onSelectedTemplateFileChange(event.target.files?.[0], 'indexHtml')}
                      className="sr-only"
                    />
                  </label>
                  <label className="grid cursor-pointer gap-2 rounded-xl border border-white/10 bg-slate-950/60 p-3 transition hover:border-violet-300/50 hover:bg-white/[0.06]">
                    <span className="text-sm font-black text-slate-100">style.css</span>
                    <span className={`text-xs font-bold ${templateFileForm.styleCss ? 'text-emerald-300' : 'text-slate-500'}`}>
                      {templateFileForm.styleCss ? 'CSS file selected' : 'Choose the replacement CSS file'}
                    </span>
                    <input
                      type="file"
                      accept=".css,text/css"
                      onChange={(event) => void onSelectedTemplateFileChange(event.target.files?.[0], 'styleCss')}
                      className="sr-only"
                    />
                  </label>
                  <label className="grid cursor-pointer gap-2 rounded-xl border border-white/10 bg-slate-950/60 p-3 transition hover:border-violet-300/50 hover:bg-white/[0.06]">
                    <span className="text-sm font-black text-slate-100">Thumbnail</span>
                    <span className={`text-xs font-bold ${templateFileForm.thumbnailDataUrl ? 'text-emerald-300' : 'text-slate-500'}`}>
                      {templateFileForm.thumbnailDataUrl ? 'Thumbnail selected' : 'Choose a PNG, JPG, WebP, or SVG thumbnail'}
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={(event) => void onSelectedTemplateFileChange(event.target.files?.[0], 'thumbnailDataUrl')}
                      className="sr-only"
                    />
                  </label>
                </div>

                {(templateFileForm.indexHtml || templateFileForm.styleCss) && (
                  <div className="mt-4 grid gap-4">
                    {templateFileForm.indexHtml && (
                      <label className="grid gap-2 text-sm font-black text-slate-200">
                        HTML replacement
                        <textarea
                          value={templateFileForm.indexHtml}
                          onChange={(event) => onTemplateFileFormChange({ ...templateFileForm, indexHtml: event.target.value })}
                          rows={7}
                          className="rounded-xl border border-white/10 bg-slate-950 p-3 font-mono text-xs text-white outline-none focus:border-violet-400"
                        />
                      </label>
                    )}
                    {templateFileForm.styleCss && (
                      <label className="grid gap-2 text-sm font-black text-slate-200">
                        CSS replacement
                        <textarea
                          value={templateFileForm.styleCss}
                          onChange={(event) => onTemplateFileFormChange({ ...templateFileForm, styleCss: event.target.value })}
                          rows={7}
                          className="rounded-xl border border-white/10 bg-slate-950 p-3 font-mono text-xs text-white outline-none focus:border-violet-400"
                        />
                      </label>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={onSaveTemplate}
                  disabled={savingTemplate || (!templateFileForm.indexHtml && !templateFileForm.styleCss && !templateFileForm.thumbnailDataUrl)}
                  className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-violet-600 px-4 text-sm font-black text-white transition hover:bg-violet-500 active:scale-[0.98] disabled:opacity-60"
                >
                  {savingTemplate ? <Loader2 className="animate-spin" size={16} /> : 'Save file changes'}
                </button>
              </section>
            )}

            <section className="mt-6 grid gap-3 sm:grid-cols-2">
              <DetailTile label="Usage Count" value={String(selectedTemplate.usageCount)} />
              <DetailTile label="Source" value={selectedTemplate.source} />
              <DetailTile label="Status" value={selectedTemplate.status} />
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
