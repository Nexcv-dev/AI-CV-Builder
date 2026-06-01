import React from 'react';
import type { AdminUserListItem } from './adminTypes';
import { formatDate } from './adminUtils';

export function AdminStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
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

export function ChartBar({ label, value, max }: { label: string; value: number; max: number }) {
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

export function MiniRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2">
      <span className="min-w-0 truncate text-sm font-bold text-slate-300">{label}</span>
      <span className="shrink-0 text-sm font-black text-slate-100">{value}</span>
    </div>
  );
}

export function PlanBadge({ plan, expiresAt }: { plan: AdminUserListItem['plan']; expiresAt?: string }) {
  const label = plan === 'payg' ? 'Pass' : plan === 'monthly' ? 'Monthly' : plan === 'quarterly' ? 'Quarterly' : plan === 'unlimited' ? 'Admin' : 'Free';
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

export function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-black text-slate-100">{value}</p>
    </div>
  );
}

export function TemplateAccessBadge({ access }: { access: 'free' | 'paid' }) {
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

export function PaymentStatusBadge({ processed, statusCode }: { processed: boolean; statusCode: string }) {
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

export function TicketStatusBadge({ status, priority }: { status: string; priority: string }) {
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
