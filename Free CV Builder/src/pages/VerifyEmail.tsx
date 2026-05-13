import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, MailCheck, XCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { PasswordResetFooter } from '../components/PasswordResetFooter';
import { AuthUser, apiFetch, notifyAuthUserChanged } from '../utils/api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    let ignore = false;
    const token = searchParams.get('token') || '';

    if (!token) {
      setStatus('error');
      setMessage('Verification token is missing.');
      return;
    }

    apiFetch<{ user: AuthUser; message: string }>('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
      .then((data) => {
        if (ignore) return;
        notifyAuthUserChanged(data.user);
        setStatus('success');
        setMessage(data.message || 'Email verified successfully.');
      })
      .catch((error) => {
        if (ignore) return;
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Could not verify email.');
      });

    return () => {
      ignore = true;
    };
  }, [searchParams]);

  const icon =
    status === 'loading' ? (
      <Loader2 size={30} className="animate-spin text-violet-300" />
    ) : status === 'success' ? (
      <CheckCircle2 size={30} className="text-emerald-300" />
    ) : (
      <XCircle size={30} className="text-rose-300" />
    );

  return (
    <div className="password-reset-page flex min-h-[calc(100vh-64px)] flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/40">
        <div className="h-1 w-full bg-linear-to-r from-violet-600 to-emerald-500" />

        <div className="p-6 text-center sm:p-8">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-slate-950">
            {icon}
          </div>

          <div className="mb-7">
            <p className="mb-2 flex items-center justify-center gap-2 text-xs font-extrabold uppercase text-violet-300">
              <MailCheck size={15} />
              Email Verification
            </p>
            <h2 className="font-montserrat text-2xl font-black text-white">
              {status === 'success' ? 'Email verified' : status === 'error' ? 'Verification failed' : 'Checking link'}
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">{message}</p>
          </div>

          <Link
            to="/builder"
            className="inline-flex w-full items-center justify-center rounded-xl bg-violet-600 px-4 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500 active:scale-[0.99]"
          >
            Back to Builder
          </Link>
        </div>
      </div>
      <PasswordResetFooter />
    </div>
  );
}
