import React, { useLayoutEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Footer } from '../components/Footer';

const FOOTERLESS_ROUTES = [
  '/dashboard',
  '/my-cvs',
  '/profile',
  '/tips',
  '/forgot-password',
  '/reset-password',
  '/checkout',
];

export function Layout() {
  const location = useLocation();
  const previousPathname = useRef(location.pathname);
  const isBuilder = location.pathname === '/builder';
  const hidesFooter = isBuilder || location.pathname.startsWith('/admin') || FOOTERLESS_ROUTES.includes(location.pathname);

  useLayoutEffect(() => {
    const previous = previousPathname.current;
    previousPathname.current = location.pathname;

    if (location.hash) {
      const targetId = decodeURIComponent(location.hash.slice(1));
      const target = document.getElementById(targetId);
      if (target && previous === '/builder') {
        target.scrollIntoView({ behavior: 'auto', block: 'start' });
      }

      const frame = window.requestAnimationFrame(() => {
        const targetAfterPaint = document.getElementById(targetId);
        if (targetAfterPaint) {
          targetAfterPaint.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
      return () => window.cancelAnimationFrame(frame);
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.hash]);

  return (
    <div className={`flex flex-col ${isBuilder ? 'h-dvh min-h-dvh overflow-hidden bg-slate-950' : 'min-h-screen bg-slate-950'}`}>
      <div className="flex-1 flex flex-col min-h-0">
        <Outlet />
      </div>
      {!hidesFooter && <Footer />}
    </div>
  );
}
