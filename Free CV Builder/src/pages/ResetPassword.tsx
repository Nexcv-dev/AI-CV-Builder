import React, { FormEvent, useState } from 'react';
import { ArrowRight, Lock, Eye, EyeOff } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PasswordResetFooter } from '../components/PasswordResetFooter';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Source': 'cv-builder-app',
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

  if (!token) {
    return (
      <div className="password-reset-page flex min-h-[calc(100vh-64px)] flex-col items-center justify-center px-4 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Invalid Link</h2>
          <p className="text-slate-400">The password reset link is invalid or missing the token.</p>
        </div>
        <PasswordResetFooter />
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
                  className="w-full bg-transparent text-base font-semibold text-white outline-none sm:text-sm"
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
                  className="w-full bg-transparent text-base font-semibold text-white outline-none sm:text-sm"
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
      <PasswordResetFooter />
    </div>
  );
}
