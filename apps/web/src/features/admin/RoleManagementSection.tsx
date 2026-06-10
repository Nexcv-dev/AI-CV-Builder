import React from 'react';
import { Loader2, Shield, UserCog } from 'lucide-react';
import type { AdminRoleConfig, AdminUserListItem } from './adminTypes';
import { formatDate } from './adminUtils';
import { ADMIN_ROLE_LABELS, isAdminRole, type UserRole } from './adminPermissions';

export default function RoleManagementSection({
  roles,
  admins,
  users,
  loading,
  savingUserId,
  canUpdateRoles,
  onChangeRole,
}: {
  roles: AdminRoleConfig[];
  admins: AdminUserListItem[];
  users: AdminUserListItem[];
  loading: boolean;
  savingUserId: string | null;
  canUpdateRoles: boolean;
  onChangeRole: (userId: string, role: UserRole) => void;
}) {
  const candidates = users.filter((user) => user.role === 'user').slice(0, 8);
  const roleOptions = roles.map((role) => role.role);

  return (
    <section className="mt-6 grid gap-4 xl:grid-cols-[360px_1fr]">
      <aside className="grid gap-4">
        {roles.map((role) => (
          <article key={role.role} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300 ring-1 ring-violet-300/20">
                {role.role === 'super_admin' ? <Shield size={18} /> : <UserCog size={18} />}
              </span>
              <div>
                <h2 className="font-montserrat text-lg font-black">{role.label}</h2>
                <p className="text-xs font-bold uppercase text-slate-500">{role.access.length || 1} access areas</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(role.access.length ? role.access : ['app user']).map((item) => (
                <span key={item} className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-slate-300 ring-1 ring-white/10">
                  {item}
                </span>
              ))}
            </div>
          </article>
        ))}
      </aside>

      <div className="grid gap-4">
        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-montserrat text-lg font-black">Admin Accounts</h2>
              <p className="mt-1 text-sm font-semibold text-slate-400">Accounts with operational admin access</p>
            </div>
            {loading && <Loader2 className="animate-spin text-violet-300" size={18} />}
          </div>
          <div className="mt-4 grid gap-3">
            {!loading && admins.length === 0 && <p className="text-sm font-semibold text-slate-500">No admin accounts found.</p>}
            {admins.map((user) => (
              <div key={user.id} className="grid gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-3 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-100">{user.displayName || user.email}</p>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-500">{user.email}</p>
                  <p className="mt-1 text-xs font-bold text-violet-300">Joined {formatDate(user.createdAt)}</p>
                </div>
                <RoleSelect
                  value={user.role}
                  roles={roleOptions}
                  disabled={!canUpdateRoles || savingUserId === user.id}
                  loading={savingUserId === user.id}
                  onChange={(role) => onChangeRole(user.id, role)}
                />
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 sm:p-5">
          <h2 className="font-montserrat text-lg font-black">Assign Recent Users</h2>
          <p className="mt-1 text-sm font-semibold text-slate-400">Use the Users page search when the account is not listed here.</p>
          <div className="mt-4 grid gap-3">
            {!loading && candidates.length === 0 && <p className="text-sm font-semibold text-slate-500">No regular users loaded yet.</p>}
            {candidates.map((user) => (
              <div key={user.id} className="grid gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-3 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-100">{user.displayName || user.email}</p>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-500">{user.email}</p>
                </div>
                <RoleSelect
                  value={user.role}
                  roles={roleOptions.filter((role) => role !== 'user')}
                  disabled={!canUpdateRoles || savingUserId === user.id}
                  loading={savingUserId === user.id}
                  onChange={(role) => onChangeRole(user.id, role)}
                />
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

function RoleSelect({
  value,
  roles,
  disabled,
  loading,
  onChange,
}: {
  value: UserRole;
  roles: UserRole[];
  disabled: boolean;
  loading: boolean;
  onChange: (role: UserRole) => void;
}) {
  if (loading) {
    return (
      <span className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/6 px-3 text-xs font-black text-slate-200">
        <Loader2 className="animate-spin" size={15} />
      </span>
    );
  }

  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as UserRole)}
      className="h-10 rounded-xl border border-white/10 bg-slate-950 px-3 text-xs font-black text-white outline-none transition focus:border-violet-400 disabled:opacity-60"
    >
      {roles.map((role) => (
        <option key={role} value={role}>
          {role === 'user' ? 'User' : isAdminRole(role) ? ADMIN_ROLE_LABELS[role] : role}
        </option>
      ))}
    </select>
  );
}
