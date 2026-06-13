import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { isAdminUser } from '../features/admin/adminPermissions';
import { useCurrentUserQuery, useSetCurrentUserCache } from '../hooks/useCurrentUserQuery';

const AuthModal = lazy(() => import('../components/AuthModal').then((module) => ({ default: module.AuthModal })));

export function AdminProtectedRoute({ children }: { children: React.ReactElement }) {
  const location = useLocation();
  const [loginOpen, setLoginOpen] = useState(false);
  const { data: user = null, isPending, isError } = useCurrentUserQuery();
  const setCurrentUserCache = useSetCurrentUserCache();
  const status = isPending ? 'loading' : isError || !user ? 'guest' : isAdminUser(user) ? 'authed' : 'forbidden';

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm font-bold text-slate-400">
        Loading admin...
      </div>
    );
  }

  if (status === 'guest') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-center text-white">
        <img src="/brand/faviconblack.svg" alt="NexCV" className="h-14 w-14 rounded-2xl shadow-2xl shadow-violet-950/40" />
        <h1 className="mt-6 font-montserrat text-3xl font-black">Admin sign in required</h1>
        <p className="mt-3 max-w-md text-sm font-semibold leading-6 text-slate-400">
          Use an authorized admin account to continue.
        </p>
        <button
          type="button"
          onClick={() => setLoginOpen(true)}
          className="mt-6 rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white transition hover:bg-violet-500"
        >
          Sign in
        </button>
        <Suspense fallback={null}>
          <AuthModal
            isOpen={loginOpen}
            initialMode="login"
            redirectTo={location.pathname}
            onClose={() => setLoginOpen(false)}
            onAuthenticated={(user) => {
              setCurrentUserCache(user);
              setLoginOpen(false);
            }}
          />
        </Suspense>
      </div>
    );
  }

  if (status === 'forbidden') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-center text-white">
        <h1 className="font-montserrat text-3xl font-black">Admin access required</h1>
        <p className="mt-3 max-w-md text-sm font-semibold leading-6 text-slate-400">
          This area is available only for super admin accounts.
        </p>
        <Link to="/dashboard" className="mt-6 rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white transition hover:bg-violet-500">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return children;
}

export function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const location = useLocation();
  const [loginOpen, setLoginOpen] = useState(false);
  const redirectTo = `${location.pathname}${location.search}${location.hash}`;
  const { data: user = null, isPending, isError } = useCurrentUserQuery();
  const setCurrentUserCache = useSetCurrentUserCache();
  const status = isPending ? 'loading' : isError || !user ? 'guest' : 'authed';

  useEffect(() => {
    if (status === 'guest') setLoginOpen(true);
  }, [status]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm font-bold text-slate-400">
        Loading...
      </div>
    );
  }

  if (status === 'guest') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-center text-white">
        <img src="/brand/faviconblack.svg" alt="NexCV" className="h-14 w-14 rounded-2xl shadow-2xl shadow-violet-950/40" />
        <h1 className="mt-6 font-montserrat text-3xl font-black">Sign in required</h1>
        <p className="mt-3 max-w-md text-sm font-semibold leading-6 text-slate-400">
          Please log in to access your dashboard, saved CVs, and profile.
        </p>
        <button
          type="button"
          onClick={() => setLoginOpen(true)}
          className="mt-6 rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white transition hover:bg-violet-500"
        >
          Login
        </button>
        <Link to="/" className="mt-3 text-sm font-bold text-slate-400 transition hover:text-white">
          Back to home
        </Link>
        <Suspense fallback={null}>
          <AuthModal
            isOpen={loginOpen}
            initialMode="login"
            redirectTo={redirectTo}
            onClose={() => setLoginOpen(false)}
            onAuthenticated={(user) => {
              setCurrentUserCache(user);
              setLoginOpen(false);
            }}
          />
        </Suspense>
      </div>
    );
  }

  return children;
}
