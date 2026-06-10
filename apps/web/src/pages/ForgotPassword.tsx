import React, { FormEvent, useState } from 'react';
import { ArrowRight, CheckCircle2, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { csrfFetch } from '../utils/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentMessage, setSentMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await csrfFetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset link.');
      }

      setSentMessage(data.message || 'Reset link sent to your email.');
      setEmail('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="password-reset-page flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-12 text-white sm:px-6 lg:px-8">
      {sentMessage ? (
        <div className="w-full max-w-md rounded-2xl border border-emerald-300/20 bg-slate-900 p-6 text-center shadow-2xl shadow-black/40 sm:p-8">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300">
            <CheckCircle2 size={30} aria-hidden="true" />
          </span>
          <h2 className="mt-5 font-montserrat text-2xl font-black text-white">Check Your Email</h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">{sentMessage}</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            If it does not arrive soon, check your spam folder or try again in a few minutes.
          </p>
          <Link
            to="/"
            className="mt-7 inline-flex items-center justify-center rounded-xl bg-violet-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500"
          >
            Return to home
          </Link>
        </div>
      ) : (
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/40">
          <div className="h-1 w-full bg-linear-to-r from-violet-600 to-emerald-500" />

          <div className="p-6 sm:p-8">
            <div className="mb-8">
              <h2 className="font-montserrat text-2xl font-black text-white">Reset Password</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-1.5 block text-xs font-extrabold uppercase text-slate-400">Email Address</span>
                <span className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950 px-3 py-3 transition-colors focus-within:border-violet-400">
                  <Mail size={18} className="text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full bg-transparent text-base font-semibold text-white outline-none sm:text-sm"
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </span>
              </label>

              <button
                type="submit"
                disabled={isSubmitting || !email}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Sending link...' : 'Send Reset Link'}
                {!isSubmitting && <ArrowRight size={17} />}
              </button>
            </form>

            <p className="mt-6 text-center text-sm font-semibold text-slate-400">
              Remember your password?{' '}
              <Link to="/" className="font-extrabold text-violet-400 transition hover:text-violet-300">
                Return to home
              </Link>
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
