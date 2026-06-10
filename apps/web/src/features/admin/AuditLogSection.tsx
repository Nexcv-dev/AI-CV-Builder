import React from 'react';
import { Loader2, Search } from 'lucide-react';
import type { AdminAuditLogItem } from './adminTypes';
import { formatDate } from './adminUtils';

const actionLabel = (action: string) => action.split('.').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');

export default function AuditLogSection({
  logs,
  loading,
  search,
  actionFilter,
  targetTypeFilter,
  actions,
  targetTypes,
  onSearchChange,
  onActionFilterChange,
  onTargetTypeFilterChange,
}: {
  logs: AdminAuditLogItem[];
  loading: boolean;
  search: string;
  actionFilter: string;
  targetTypeFilter: string;
  actions: string[];
  targetTypes: string[];
  onSearchChange: (value: string) => void;
  onActionFilterChange: (value: string) => void;
  onTargetTypeFilterChange: (value: string) => void;
}) {
  return (
    <section className="mt-6">
      <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 md:grid-cols-[1fr_220px_180px]">
        <label className="relative block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-11 w-full rounded-xl border border-white/10 bg-slate-950 pl-10 pr-3 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400"
            placeholder="Search action, target, or label"
          />
        </label>
        <select
          value={actionFilter}
          onChange={(event) => onActionFilterChange(event.target.value)}
          className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400"
        >
          <option value="all">All actions</option>
          {actions.map((action) => <option key={action} value={action}>{actionLabel(action)}</option>)}
        </select>
        <select
          value={targetTypeFilter}
          onChange={(event) => onTargetTypeFilterChange(event.target.value)}
          className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400"
        >
          <option value="all">All targets</option>
          {targetTypes.map((targetType) => <option key={targetType} value={targetType}>{targetType}</option>)}
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/15">
        <div className="grid grid-cols-[180px_1fr_180px_150px] gap-3 border-b border-white/10 px-5 py-3 text-xs font-black uppercase text-slate-500 max-lg:hidden">
          <span>Time</span>
          <span>Action</span>
          <span>Actor</span>
          <span>Target</span>
        </div>
        {loading && (
          <div className="flex items-center gap-3 px-5 py-5 text-sm font-bold text-slate-400">
            <Loader2 className="animate-spin text-violet-300" size={17} />
            Loading audit logs...
          </div>
        )}
        {!loading && logs.length === 0 && (
          <div className="px-5 py-8 text-center text-sm font-bold text-slate-500">No audit logs match these filters.</div>
        )}
        {!loading && logs.map((log) => (
          <article key={log.id} className="grid gap-3 border-b border-white/10 px-4 py-4 last:border-b-0 lg:grid-cols-[180px_1fr_180px_150px] lg:items-center lg:px-5">
            <div>
              <p className="text-sm font-black text-slate-100">{formatDate(log.createdAt)}</p>
              <p className="mt-1 text-xs font-semibold text-slate-600">{new Date(log.createdAt).toLocaleTimeString()}</p>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-100">{actionLabel(log.action)}</p>
              <p className="mt-1 truncate text-xs font-semibold text-slate-500">{metadataPreview(log.metadata)}</p>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-200">{log.actor?.displayName || 'System'}</p>
              <p className="mt-1 truncate text-xs font-semibold text-slate-500">{log.actor?.email || log.ip || 'Unknown'}</p>
            </div>
            <div className="min-w-0">
              <span className="rounded-full bg-violet-400/10 px-3 py-1 text-xs font-black text-violet-300 ring-1 ring-violet-300/20">
                {log.targetType}
              </span>
              <p className="mt-2 truncate text-xs font-bold text-slate-400">{log.targetLabel || log.targetId || 'Unknown'}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function metadataPreview(metadata: Record<string, unknown>) {
  const pairs = Object.entries(metadata || {})
    .filter(([, value]) => value !== undefined && value !== null && typeof value !== 'object')
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${String(value)}`);
  return pairs.join(' | ') || 'No details';
}
