import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { isAdminUser } from '../features/admin/adminPermissions';
import { useCurrentUserQuery, useSetCurrentUserCache } from '../hooks/useCurrentUserQuery';
import { isAuthRequiredError, type AuthUser } from '../utils/api';
import { RouteLoadingFallback } from './loading';

const AuthModal = lazy(() => import('../components/AuthModal').then((module) => ({ default: module.AuthModal })));

export type RouteAuthStatus = 'loading' | 'guest' | 'authed' | 'error';

export function getRouteAuthStatus(
  user: AuthUser | null | undefined,
  isPending: boolean,
  error: unknown,
): RouteAuthStatus {
  if (user) return 'authed';
  if (isPending) return 'loading';
  if (isAuthRequiredError(error)) return 'guest';
  return error ? 'error' : 'guest';
}

function AuthCheckError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-center text-white">
      <h1 className="font-montserrat text-3xl font-black">Could not verify your session</h1>
      <p className="mt-3 max-w-md text-sm font-semibold leading-6 text-slate-400">
        Your account may still be signed in. Check your connection and try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white transition hover:bg-violet-500"
      >
        Try again
      </button>
    </div>
  );
}

export function AdminProtectedRoute({ children }: { children: React.ReactElement }) {
  const location = useLocation();
  const [loginOpen, setLoginOpen] = useState(false);
  const { data: user = null, isPending, error, refetch } = useCurrentUserQuery();
  const setCurrentUserCache = useSetCurrentUserCache();
  const authStatus = getRouteAuthStatus(user, isPending, error);
  const status = authStatus === 'authed' && !isAdminUser(user) ? 'forbidden' : authStatus;

  if (status === 'loading') {
    return <RouteLoadingFallback />;
  }

  if (status === 'error') {
    return <AuthCheckError onRetry={() => { void refetch(); }} />;
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
  const { data: user = null, isPending, error, refetch } = useCurrentUserQuery();
  const setCurrentUserCache = useSetCurrentUserCache();
  const status = getRouteAuthStatus(user, isPending, error);

  useEffect(() => {
    if (status === 'guest') setLoginOpen(true);
  }, [status]);

  if (status === 'loading') {
    return <RouteLoadingFallback />;
  }

  if (status === 'error') {
    return <AuthCheckError onRetry={() => { void refetch(); }} />;
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
