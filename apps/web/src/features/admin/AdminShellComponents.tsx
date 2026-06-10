import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Search, Shield } from 'lucide-react';
import type { AuthUser } from '../../utils/api';
import type { adminNavItems } from './adminUtils';

type AdminNavItem = (typeof adminNavItems)[number];

interface AdminNavProps {
  items: AdminNavItem[];
  activeKey: string;
  navAccess: string[];
}

export function AdminSidebar({
  items,
  activeKey,
  navAccess,
  user,
  onSignOut,
}: AdminNavProps & {
  user: AuthUser | null;
  onSignOut: () => void;
}) {
  return (
    <aside className="hidden h-dvh w-72 shrink-0 overflow-hidden border-r border-white/10 bg-slate-950 px-4 py-5 lg:flex lg:flex-col">
      <Link to="/admin" className="flex items-center gap-3 px-2">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-lg shadow-black/20">
          <img src="/brand/faviconblack.svg" alt="" className="h-9 w-9 rounded-xl" />
        </span>
        <span className="font-montserrat text-2xl font-black">NexCV Admin</span>
      </Link>

      <nav className="scrollbar-hide mt-7 grid min-h-0 flex-1 gap-1 overflow-y-auto pr-1">
        {items.filter((item) => navAccess.includes(item.key)).map((item) => {
          const Icon = item.icon;
          const active = activeKey === item.key;
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
          onClick={onSignOut}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2.5 text-sm font-extrabold text-red-200 transition hover:bg-red-500/20 active:scale-[0.98]"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}

export function AdminMobileNav({ items, activeKey, navAccess }: AdminNavProps) {
  return (
    <nav className="mb-5 flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.035] p-2 lg:hidden" aria-label="Admin navigation">
      {items.filter((item) => navAccess.includes(item.key)).map((item) => {
        const Icon = item.icon;
        const active = activeKey === item.key;
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
  );
}

export function AdminPageHeader({
  title,
  description,
  userRoleLabel,
  showSearch,
  searchPlaceholder,
}: {
  title: string;
  description: string;
  userRoleLabel: string;
  showSearch: boolean;
  searchPlaceholder: string;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-violet-300">
          <Shield size={14} />
          {userRoleLabel}
        </div>
        <h1 className="mt-2 font-montserrat text-2xl font-black leading-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm font-semibold text-slate-400">{description}</p>
      </div>
      {showSearch && (
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.035] pl-10 pr-3 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400"
            placeholder={searchPlaceholder}
          />
        </div>
      )}
    </header>
  );
}
