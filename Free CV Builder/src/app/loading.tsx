import React, { useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useLocation } from 'react-router-dom';

export function PageLoadingOverlay() {
  const location = useLocation();
  const isFirstRender = useRef(true);
  const previousPathname = useRef(location.pathname);
  const [isLoading, setIsLoading] = useState(false);
  const isBuilderRedirect = location.pathname === '/builder';
  const skipsPageLoadingOverlay = [
    '/forgot-password',
    '/reset-password',
  ].includes(location.pathname);
  const isHashOnlyLandingNavigation =
    location.pathname === '/' &&
    Boolean(location.hash) &&
    previousPathname.current !== '/builder';
  const shouldShowImmediately =
    !isFirstRender.current &&
    previousPathname.current !== location.pathname &&
    !isHashOnlyLandingNavigation &&
    !skipsPageLoadingOverlay;

  useLayoutEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    if (isFirstRender.current) {
      isFirstRender.current = false;
      previousPathname.current = location.pathname;
      return;
    }

    const previous = previousPathname.current;
    if (previous === location.pathname || skipsPageLoadingOverlay || (location.pathname === '/' && location.hash && previous !== '/builder')) {
      previousPathname.current = location.pathname;
      return;
    }

    previousPathname.current = location.pathname;
    setIsLoading(true);
    const timer = window.setTimeout(() => setIsLoading(false), 1000);

    return () => window.clearTimeout(timer);
  }, [location.pathname, location.hash, skipsPageLoadingOverlay]);

  return (
    <AnimatePresence>
      {(isLoading || shouldShowImmediately) && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-200 flex flex-col items-center justify-center bg-slate-950"
          role="status"
          aria-live="polite"
        >
          <div className="relative mb-6">
            <div className="h-20 w-20 animate-spin rounded-full border-4 border-violet-900/60 border-t-violet-600"></div>
            <img src="/brand/faviconblack.webp" alt="NexCV" className="absolute inset-0 m-auto h-12 w-12 rounded-2xl" />
          </div>
          <h2 className="bg-linear-to-r from-slate-100 to-violet-400 bg-clip-text text-2xl font-bold text-transparent">
            NexCV
          </h2>
          {isBuilderRedirect && (
            <p className="mt-2 text-sm font-medium text-slate-400">Preparing your workspace...</p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function RouteLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm font-bold text-slate-400">
      Loading NexCV...
    </div>
  );
}
