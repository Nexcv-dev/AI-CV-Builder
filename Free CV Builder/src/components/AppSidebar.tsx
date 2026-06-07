import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Code2, FileText, LayoutDashboard, LogOut, Plus, Shield, User } from 'lucide-react';
import { apiFetch, AuthUser, DASHBOARD_NOTIFICATION_EVENT, getCurrentUser, hasDashboardNotification, notifyAuthUserChanged } from '../utils/api';
import { isAdminUser } from '../adminPermissions';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/my-cvs', label: 'My CVs', icon: FileText },
  { to: '/html-to-pdf', label: 'HTML to PDF', icon: Code2 },
  { to: '/tips', label: 'Tips', icon: BookOpen },
  { to: '/profile', label: 'Profile', icon: User },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [dashboardNotification, setDashboardNotificationState] = useState(() => hasDashboardNotification());

  useEffect(() => {
    let ignore = false;
    getCurrentUser()
      .then((currentUser) => {
        if (!ignore) setUser(currentUser);
      })
      .catch(() => undefined);

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const handleAuthUserChanged = (event: Event) => {
      setUser((event as CustomEvent<AuthUser | undefined>).detail || null);
    };
    const handleDashboardNotificationChanged = (event: Event) => {
      setDashboardNotificationState((event as CustomEvent<boolean>).detail);
    };

    window.addEventListener('auth-user-changed', handleAuthUserChanged);
    window.addEventListener(DASHBOARD_NOTIFICATION_EVENT, handleDashboardNotificationChanged);
    return () => {
      window.removeEventListener('auth-user-changed', handleAuthUserChanged);
      window.removeEventListener(DASHBOARD_NOTIFICATION_EVENT, handleDashboardNotificationChanged);
    };
  }, []);

  const signOut = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    setUser(null);
    notifyAuthUserChanged();
    navigate('/');
  };

  const visibleName = user?.displayName?.trim() || 'Account';
  const initial = visibleName.charAt(0).toUpperCase() || 'U';
  const visibleNavItems = isAdminUser(user)
    ? [...navItems, { to: '/admin', label: 'Admin', icon: Shield }]
    : user
      ? navItems
      : navItems.filter((item) => item.to === '/tips');

  return (
    <aside className="hidden h-dvh w-72 shrink-0 border-r border-white/10 bg-slate-950/95 px-4 py-5 text-white shadow-2xl shadow-black/20 lg:sticky lg:top-0 lg:flex lg:flex-col">
      <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-3 px-2">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-lg shadow-black/20 ring-1 ring-white/10">
          <img src="/brand/faviconblack.svg" alt="" className="h-9 w-9 rounded-xl" />
        </span>
        <span className="font-montserrat text-2xl font-black">NexCV</span>
      </Link>

      <Link
        to="/builder?import=1"
        className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-500 active:scale-[0.98]"
      >
        <Plus size={17} />
        Create New CV
      </Link>

      <nav className="mt-7 grid gap-1">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.to;
          const hasNotification = item.to === '/dashboard' && dashboardNotification && !active;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-extrabold transition ${
                active
                  ? 'bg-violet-500/15 text-violet-200 ring-1 ring-violet-300/15'
                  : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-100'
              }`}
            >
              <Icon size={18} className={active ? 'text-violet-300' : 'text-slate-500'} />
              {item.label}
              {hasNotification && (
                <span className="ml-auto h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.16)]" aria-label="Dashboard has new saved CV activity" />
              )}
            </Link>
          );
        })}
      </nav>

      {user && <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.035] p-3">
        <div className="flex min-w-0 items-center gap-3">
          {user?.profileImage ? (
            <img src={user.profileImage} alt="" className="h-10 w-10 rounded-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-sm font-black text-violet-200">
              {initial}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-slate-100">{visibleName}</p>
            <p className="truncate text-xs font-semibold text-slate-500">{user?.email || 'Signed in'}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2.5 text-sm font-extrabold text-red-200 transition hover:bg-red-500/20 active:scale-[0.98]"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>}
    </aside>
  );
}
