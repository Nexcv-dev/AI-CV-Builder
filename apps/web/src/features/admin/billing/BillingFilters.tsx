import React from 'react';
import { Search } from 'lucide-react';

export function BillingFilters({
  search,
  planFilter,
  statusFilter,
  onSearchChange,
  onPlanFilterChange,
  onStatusFilterChange,
}: {
  search: string;
  planFilter: string;
  statusFilter: string;
  onSearchChange: (value: string) => void;
  onPlanFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
}) {
  return (
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
        <option value="payg">Single CV Pass</option>
        <option value="monthly">Monthly Pro</option>
        <option value="quarterly">Pro Quarterly</option>
      </select>
      <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400">
        <option value="all">All statuses</option>
        <option value="processed">Processed</option>
        <option value="unprocessed">Unprocessed</option>
        <option value="review">Needs Review</option>
      </select>
    </div>
  );
}
