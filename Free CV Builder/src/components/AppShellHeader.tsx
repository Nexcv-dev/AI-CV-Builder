import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, LayoutDashboard, User } from 'lucide-react';
import { AccountMenu } from './AccountMenu';

const mobileNavItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/my-cvs', label: 'My CVs', icon: FileText },
  { to: '/profile', label: 'Profile', icon: User },
];

export function AppShellHeader() {
  const location = useLocation();
  const [mobileNavVisible, setMobileNavVisible] = useState(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollYRef.current;

      if (currentScrollY < 80) {
        setMobileNavVisible(false);
      } else if (delta > 8) {
        setMobileNavVisible(true);
      } else if (delta < -8) {
        setMobileNavVisible(false);
      }

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileNavVisible(false);
    lastScrollYRef.current = window.scrollY;
  }, [location.pathname]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/92 text-white shadow-sm shadow-black/20 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
          <Link to="/dashboard" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-lg shadow-black/20 ring-1 ring-white/10 sm:h-10 sm:w-10 sm:rounded-2xl">
              <img src="/brand/faviconblack.svg" alt="" className="h-7 w-7 rounded-lg sm:h-8 sm:w-8 sm:rounded-xl" />
            </span>
            <span className="font-montserrat text-lg font-black sm:text-xl">NexCV</span>
          </Link>

          <AccountMenu isDarkMode size="sm" />
        </div>
      </header>

      <nav
        className={`fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-slate-950/94 px-3 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-2 text-white shadow-2xl shadow-black/40 backdrop-blur-xl transition duration-300 ease-out lg:hidden ${
          mobileNavVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'
        }`}
        aria-label="Mobile dashboard navigation"
      >
        <div className="mx-auto grid max-w-md grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-white/[0.035] p-1">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-black transition ${
                  active
                    ? 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-300/15'
                    : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-100'
                }`}
              >
                <Icon size={16} className={active ? 'text-violet-300' : 'text-slate-500'} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
