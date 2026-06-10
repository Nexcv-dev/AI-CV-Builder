import React from 'react';
import {
  Eye,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import type { AdminUserDetail, AdminUserDocument, AdminUserListItem } from './adminTypes';
import { formatDate } from './adminUtils';
import { DetailTile, PlanBadge } from './AdminSharedComponents';
import { ADMIN_ROLE_LABELS, isAdminRole } from './adminPermissions';

export default function UserManagementSection({
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
  canUpdatePlan,
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
  selectedPlan: 'free' | 'payg' | 'monthly' | 'quarterly';
  savingPlan: boolean;
  canUpdatePlan: boolean;
  onSelectedPlanChange: (value: 'free' | 'payg' | 'monthly' | 'quarterly') => void;
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
          <option value="payg">Single CV Pass</option>
          <option value="monthly">Monthly Pro</option>
          <option value="quarterly">Pro Quarterly</option>
        </select>
        <select
          value={roleFilter}
          onChange={(event) => onRoleFilterChange(event.target.value)}
          className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400"
        >
          <option value="all">All roles</option>
          <option value="user">User</option>
          <option value="super_admin">Super Admin</option>
          <option value="admin_manager">Admin Manager</option>
          <option value="billing_manager">Billing Manager</option>
          <option value="template_manager">Template Manager</option>
          <option value="support_agent">Support Agent</option>
          <option value="analyst">Analyst</option>
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
              {roleLabel(item.role)}
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
              <DetailTile label="Role" value={roleLabel(selectedUser.role)} />
              <DetailTile label="Auth" value={selectedUser.authProvider} />
              <DetailTile label="Email" value={selectedUser.emailVerified ? 'Verified' : 'Not verified'} />
              <DetailTile label="Saved CVs" value={String(selectedUser.cvCount)} />
              <DetailTile label="Joined" value={formatDate(selectedUser.createdAt)} />
              <DetailTile label="Last Updated" value={formatDate(selectedUser.updatedAt)} />
            </div>

            {canUpdatePlan && (
              <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <h3 className="font-montserrat text-lg font-black">Change User Plan</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <select
                    value={selectedPlan}
                    onChange={(event) => onSelectedPlanChange(event.target.value as 'free' | 'payg' | 'monthly' | 'quarterly')}
                    className="h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-violet-400"
                  >
                    <option value="free">Free</option>
                    <option value="payg">Single CV Pass</option>
                    <option value="monthly">Monthly Pro</option>
                    <option value="quarterly">Pro Quarterly</option>
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
                  Paid plans receive a fresh expiry window. Single CV Pass keeps at least one save credit.
                </p>
              </section>
            )}

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

function roleLabel(role: AdminUserListItem['role']) {
  return isAdminRole(role) ? ADMIN_ROLE_LABELS[role] : 'User';
}
