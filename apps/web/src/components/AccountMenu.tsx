import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FileText, LayoutDashboard, LogOut, User } from 'lucide-react';
import { apiFetch, AuthUser, DASHBOARD_NOTIFICATION_EVENT, getCurrentUser, hasDashboardNotification, notifyAuthUserChanged } from '../utils/api';

interface AccountMenuProps {
  isDarkMode?: boolean;
  size?: 'sm' | 'md';
  displayName?: string;
  profileImage?: string;
  showName?: boolean;
}

const menuItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/my-cvs', label: 'My CVs', icon: FileText },
  { to: '/profile', label: 'Profile', icon: User },
];

export function AccountMenu({ isDarkMode = true, size = 'md', displayName, profileImage, showName = false }: AccountMenuProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loadedUser, setLoadedUser] = useState<AuthUser | null>(null);
  const [dashboardNotification, setDashboardNotificationState] = useState(() => hasDashboardNotification());
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonSize = size === 'sm' ? 'h-10 w-10' : 'h-12 w-12';
  const iconSize = size === 'sm' ? 17 : 18;
  const visibleName = (displayName || loadedUser?.displayName || '').trim();
  const visibleImage = profileImage || loadedUser?.profileImage || '';
  const initial = visibleName.charAt(0).toUpperCase() || 'U';
  const isSignedIn = Boolean(displayName || profileImage || loadedUser);

  useEffect(() => {
    if (displayName || profileImage) return;
    let ignore = false;
    getCurrentUser()
      .then((user) => {
        if (!ignore) setLoadedUser(user);
      })
      .catch(() => undefined);

    return () => {
      ignore = true;
    };
  }, [displayName, profileImage]);

  useEffect(() => {
    const handleAuthUserChanged = (event: Event) => {
      setLoadedUser((event as CustomEvent<AuthUser | undefined>).detail || null);
    };

    window.addEventListener('auth-user-changed', handleAuthUserChanged);
    return () => window.removeEventListener('auth-user-changed', handleAuthUserChanged);
  }, []);

  useEffect(() => {
    const handleDashboardNotificationChanged = (event: Event) => {
      setDashboardNotificationState((event as CustomEvent<boolean>).detail);
    };

    window.addEventListener(DASHBOARD_NOTIFICATION_EVENT, handleDashboardNotificationChanged);
    return () => window.removeEventListener(DASHBOARD_NOTIFICATION_EVENT, handleDashboardNotificationChanged);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const closeMenu = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, [menuOpen]);

  const signOut = async () => {
    setMenuOpen(false);
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    setLoadedUser(null);
    notifyAuthUserChanged();
    navigate('/');
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        className={`relative flex ${showName && visibleName ? `h-12 max-w-[190px] gap-2 rounded-full px-3` : `${buttonSize} rounded-full`} items-center justify-center border shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:scale-95 ${
          isDarkMode
            ? 'border-slate-700 bg-slate-800 text-slate-200 shadow-black/20 hover:bg-slate-700'
            : 'border-gray-200 bg-white text-slate-700 shadow-slate-900/10 hover:bg-gray-100'
        }`}
        aria-label="Account menu"
        aria-expanded={menuOpen}
      >
        {visibleImage ? (
          <img src={visibleImage} alt="" className={`${size === 'sm' ? 'h-7 w-7' : 'h-8 w-8'} rounded-full object-cover`} referrerPolicy="no-referrer" />
        ) : visibleName ? (
          <span className={`${size === 'sm' ? 'h-7 w-7 text-xs' : 'h-8 w-8 text-sm'} flex items-center justify-center rounded-full font-black ${isDarkMode ? 'bg-violet-500/20 text-violet-200' : 'bg-violet-100 text-violet-700'}`}>
            {initial}
          </span>
        ) : (
          <User size={iconSize} />
        )}
        {showName && visibleName && (
          <span className="min-w-0 truncate text-sm font-extrabold">{visibleName}</span>
        )}
        {dashboardNotification && location.pathname !== '/dashboard' && (
          <span className={`absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ${isDarkMode ? 'ring-slate-900' : 'ring-white'}`} aria-hidden="true" />
        )}
      </button>

      {menuOpen && (
        <div
          className={`absolute right-0 top-full z-80 mt-3 w-52 overflow-hidden rounded-2xl border p-1 shadow-2xl ${
            isDarkMode
              ? 'border-slate-700 bg-slate-900 text-slate-100 shadow-black/30'
              : 'border-slate-200 bg-white text-slate-800 shadow-slate-900/15'
          } max-w-[calc(100vw-2rem)]`}
        >
          {isSignedIn ? menuItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={`relative flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                  active
                    ? isDarkMode
                      ? 'bg-violet-500/15 text-violet-200'
                      : 'bg-violet-500/10 text-violet-700'
                    : isDarkMode
                      ? 'hover:bg-white/8'
                      : 'hover:bg-violet-500/10'
                }`}
              >
                <Icon size={16} className={active ? 'text-violet-300' : 'text-slate-400'} />
                {item.label}
                {item.to === '/dashboard' && dashboardNotification && !active && (
                  <span className="ml-auto h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.16)]" aria-label="Dashboard has new saved CV activity" />
                )}
              </Link>
            );
          }) : (
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                isDarkMode ? 'hover:bg-white/8' : 'hover:bg-violet-500/10'
              }`}
            >
              <User size={16} className="text-slate-400" />
              Sign in
            </Link>
          )}
          {isSignedIn && (
            <>
              <div className={`my-1 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`} />
              <button
                type="button"
                onClick={signOut}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-red-400 transition hover:bg-red-500/10"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
