import React, { FormEvent, useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { csrfFetch } from '../utils/api';

function ResetPasswordStateCard({
  title,
  message,
  isLoading = false,
}: {
  title: string;
  message: string;
  isLoading?: boolean;
}) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 text-center shadow-2xl shadow-black/40 sm:p-8">
      <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${isLoading ? 'bg-violet-400/10 text-violet-300' : 'bg-red-400/10 text-red-300'}`}>
        {isLoading ? <Loader2 size={28} className="animate-spin" aria-hidden="true" /> : <AlertCircle size={30} aria-hidden="true" />}
      </span>
      <h2 className="mt-5 font-montserrat text-2xl font-black text-white">{title}</h2>
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">{message}</p>
      {!isLoading && (
        <Link
          to="/forgot-password"
          className="mt-7 inline-flex items-center justify-center rounded-xl bg-violet-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500"
        >
          Request a new link
        </Link>
      )}
    </div>
  );
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(Boolean(token));
  const [tokenError, setTokenError] = useState('');

  useEffect(() => {
    if (!token) {
      setIsValidatingToken(false);
      setTokenError('The password reset link is invalid or missing the token.');
      return;
    }

    let ignore = false;

    const validateToken = async () => {
      setIsValidatingToken(true);
      setTokenError('');

      try {
        const response = await csrfFetch('/api/auth/validate-reset-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Password reset token is invalid or has expired.');
        }
      } catch (err) {
        if (!ignore) {
          setTokenError(err instanceof Error ? err.message : 'Password reset token is invalid or has expired.');
        }
      } finally {
        if (!ignore) setIsValidatingToken(false);
      }
    };

    validateToken();

    return () => {
      ignore = true;
    };
  }, [token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Passwords don't match.");
      return;
    }
    
    if (!token) {
      toast.error('Invalid or missing reset token.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await csrfFetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password.');
      }

      toast.success('Password successfully reset. You can now login.');
      navigate('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isValidatingToken) {
    return (
      <div className="password-reset-page flex min-h-[calc(100vh-64px)] flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <ResetPasswordStateCard
          title="Checking Link"
          message="Please wait while we validate your password reset link."
          isLoading
        />
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="password-reset-page flex min-h-[calc(100vh-64px)] flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <ResetPasswordStateCard title="Invalid Link" message={tokenError} />
      </div>
    );
  }

  return (
    <div className="password-reset-page flex min-h-[calc(100vh-64px)] flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/40 overflow-hidden">
        <div className="h-1 w-full bg-linear-to-r from-violet-600 to-emerald-500" />
        
        <div className="p-6 sm:p-8">
          <div className="mb-8">
            <h2 className="font-montserrat text-2xl font-black text-white">Create New Password</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
              Please enter your new password below.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold uppercase text-slate-400">New Password</span>
              <span className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950 px-3 py-3 focus-within:border-violet-400 transition-colors">
                <Lock size={18} className="text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full bg-transparent text-base font-semibold text-white outline-none sm:text-sm [&::-ms-reveal]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
                  placeholder="Enter new password"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/8 hover:text-slate-200"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold uppercase text-slate-400">Confirm Password</span>
              <span className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950 px-3 py-3 focus-within:border-violet-400 transition-colors">
                <Lock size={18} className="text-slate-500" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full bg-transparent text-base font-semibold text-white outline-none sm:text-sm [&::-ms-reveal]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
                  placeholder="Confirm new password"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/8 hover:text-slate-200"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting || !password || !confirmPassword}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Updating...' : 'Reset Password'}
              {!isSubmitting && <ArrowRight size={17} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
