import React from 'react';
import { Link } from 'react-router-dom';
import { AccountMenu } from './AccountMenu';

export function AppShellHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/92 text-white shadow-sm shadow-black/20 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
        <Link to="/dashboard" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-lg shadow-black/20 ring-1 ring-white/10 sm:h-10 sm:w-10 sm:rounded-2xl">
            <img src="/brand/faviconblack.png" alt="" className="h-7 w-7 rounded-lg sm:h-8 sm:w-8 sm:rounded-xl" />
          </span>
          <span className="font-montserrat text-lg font-black sm:text-xl">NexCV</span>
        </Link>

        <AccountMenu isDarkMode size="sm" />
      </div>
    </header>
  );
}
