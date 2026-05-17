import React, { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Lock, Mail, RotateCcw, ShieldCheck, User, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthUser, apiFetch, notifyAuthUserChanged } from '../utils/api';

type AuthMode = 'login' | 'signup';

interface AuthModalProps {
  isOpen: boolean;
  initialMode: AuthMode;
  onClose: () => void;
  redirectTo?: string;
  onAuthenticated?: (user: AuthUser) => void;
}

const authCopy = {
  login: {
    title: 'Welcome back',
    subtitle: 'Sign in and continue building your CV.',
    action: 'Login',
    endpoint: '/api/auth/login',
  },
  signup: {
    title: 'Create your account',
    subtitle: 'Save your workspace and start your CV faster.',
    action: 'Sign up',
    endpoint: '/api/auth/signup',
  },
};

function GoogleLogo() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

async function authRequest(mode: AuthMode, payload: Record<string, string>) {
  const response = await fetch(authCopy[mode].endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-App-Source': 'cv-builder-app',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Authentication failed. Please try again.');
  }
  return data;
}

function googleNextParam(redirectTo: string) {
  if (redirectTo.includes('download=1')) return '?next=download';
  if (redirectTo.includes('import=1')) return '?next=import';
  return '?next=builder';
}

export function AuthModal({ isOpen, initialMode, onClose, redirectTo = '/builder?import=1', onAuthenticated }: AuthModalProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode);
    setError('');
    setIsRedirecting(false);
    setShowOtpStep(false);
    setVerificationCode('');
  }, [initialMode, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const scrollY = window.scrollY;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyWidth = document.body.style.width;
    const previousBodyPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.width = previousBodyWidth;
      document.body.style.paddingRight = previousBodyPaddingRight;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const copy = authCopy[mode];

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setDisplayName('');
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setShowOtpStep(false);
    setVerificationCode('');
    setError('');
  };

  const completeAuthRedirect = (user?: AuthUser) => {
    if (user) {
      onAuthenticated?.(user);
      notifyAuthUserChanged(user);
    }
    setIsRedirecting(true);
    navigate(redirectTo);
    if (redirectTo === '/builder') {
      onClose();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const data = await authRequest(mode, {
        displayName,
        email,
        password,
      });
      if (mode === 'signup') {
        if (data.user) {
          onAuthenticated?.(data.user);
          notifyAuthUserChanged(data.user);
        }
        if (data.message) toast.success(data.message);
        setShowOtpStep(true);
        setVerificationCode('');
      } else {
        completeAuthRedirect(data.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsVerifyingOtp(true);

    try {
      const data = await apiFetch<{ user: AuthUser; message: string }>('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ code: verificationCode }),
      });
      toast.success(data.message || 'Email verified successfully.');
      completeAuthRedirect(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify email.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (isResendingOtp) return;

    setError('');
    setIsResendingOtp(true);
    try {
      const data = await apiFetch<{ user: AuthUser; message: string }>('/api/auth/resend-verification', {
        method: 'POST',
      });
      if (data.user) {
        onAuthenticated?.(data.user);
        notifyAuthUserChanged(data.user);
      }
      toast.success(data.message || 'Verification OTP sent.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend verification OTP.');
    } finally {
      setIsResendingOtp(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    const newVal = val.replace(/\D/g, '').slice(0, 1);
    const updatedCode = verificationCode.split('');
    updatedCode[index] = newVal;
    const finalCode = updatedCode.join('').slice(0, 6);
    setVerificationCode(finalCode);

    if (newVal && index < 5) {
      document.getElementById(`auth-otp-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!verificationCode[index] && index > 0) {
        const updatedCode = verificationCode.split('');
        updatedCode[index - 1] = '';
        setVerificationCode(updatedCode.join(''));
        document.getElementById(`auth-otp-${index - 1}`)?.focus();
      } else {
        const updatedCode = verificationCode.split('');
        updatedCode[index] = '';
        setVerificationCode(updatedCode.join(''));
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    setVerificationCode(pastedData);
    const focusIndex = Math.min(pastedData.length, 5);
    setTimeout(() => {
      document.getElementById(`auth-otp-${focusIndex}`)?.focus();
    }, 0);
  };

  return (
    <div className="auth-modal-shell fixed inset-0 z-100 flex items-center justify-center overflow-y-auto px-4 py-4 sm:py-6" role="dialog" aria-modal="true">
      <button
        type="button"
        className="auth-modal-backdrop absolute inset-0 bg-slate-950/78 backdrop-blur-md"
        aria-label="Close auth dialog"
        onClick={onClose}
      />

      <div className="auth-modal relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 text-white shadow-2xl shadow-black/40">
        <div className="h-1 w-full bg-linear-to-r from-violet-600 to-emerald-500" />

        <div className="p-5 sm:p-6">
          <div key={`heading-${mode}`} className="auth-mode-fade flex items-start justify-between gap-4">
            <div>
              <h2 className="font-montserrat text-2xl font-black">{copy.title}</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-400">{copy.subtitle}</p>
            </div>
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/6 text-slate-300 transition hover:bg-white/10 hover:text-white"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {showOtpStep ? (
            <form className="auth-mode-fade mt-6 space-y-4" onSubmit={handleVerifyOtp}>
              <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4">
                <p className="flex items-center gap-2 text-xs font-extrabold uppercase text-emerald-200">
                  <ShieldCheck size={15} />
                  OTP Verification
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-emerald-50/80">
                  We sent a 6-digit code to {email}. Enter it here to activate your account.
                </p>
              </div>

              <div className="block">
                <span className="mb-2 block text-xs font-extrabold uppercase text-slate-400 text-center">Verification code</span>
                <div className="flex justify-center gap-2 sm:gap-3 py-2" onPaste={handlePaste}>
                  {Array.from({ length: 6 }).map((_, index) => {
                    const val = verificationCode[index] || '';
                    return (
                      <input
                        key={index}
                        id={`auth-otp-${index}`}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]"
                        maxLength={1}
                        value={val}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        className="w-12 h-12 text-center font-montserrat text-xl font-bold rounded-xl border border-white/10 bg-slate-950 text-white focus:border-violet-400 focus:ring-1 focus:ring-violet-400 outline-none transition-all duration-200"
                        autoComplete="off"
                        required
                      />
                    );
                  })}
                </div>
              </div>

              {error && (
                <p className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isVerifyingOtp || verificationCode.length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isVerifyingOtp ? 'Verifying...' : 'Verify account'}
                {!isVerifyingOtp && <ArrowRight size={17} />}
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isResendingOtp}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-extrabold text-slate-200 transition hover:bg-white/10 active:scale-[0.99] disabled:opacity-70"
              >
                <RotateCcw size={16} />
                {isResendingOtp ? 'Sending...' : 'Resend OTP'}
              </button>
            </form>
          ) : (
            <>
              <a
                href={`/api/auth/google${googleNextParam(redirectTo)}`}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white px-4 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-white/10 transition hover:bg-slate-100 active:scale-[0.99]"
              >
                <GoogleLogo />
                Continue with Google
              </a>

              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-white/10" />
                <span className="text-xs font-bold uppercase text-slate-500">or</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <form key={mode} className="auth-mode-fade space-y-3" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-extrabold uppercase text-slate-400">Name</span>
                <span className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950 px-3 py-3 focus-within:border-violet-400">
                  <User size={17} className="text-slate-500" />
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="w-full bg-transparent text-base font-semibold text-white outline-none sm:text-sm"
                    placeholder="Your name"
                    autoComplete="name"
                  />
                </span>
              </label>
            )}

            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold uppercase text-slate-400">Email</span>
              <span className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950 px-3 py-3 focus-within:border-violet-400">
                <Mail size={17} className="text-slate-500" />
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

            <div className="block">
              <span className="mb-1.5 flex items-center justify-between text-xs font-extrabold uppercase text-slate-400">
                <span>Password</span>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onClose();
                      navigate('/forgot-password');
                    }}
                    className="font-bold normal-case text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    forgot password?
                  </button>
                )}
              </span>
              <span className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950 px-3 py-3 focus-within:border-violet-400">
                <Lock size={17} className="text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full bg-transparent text-base font-semibold text-white outline-none sm:text-sm"
                  placeholder={mode === 'signup' ? 'Enter new password' : 'Your password'}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  minLength={mode === 'signup' ? 8 : undefined}
                  required
                />
                <button
                  type="button"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/8 hover:text-slate-200"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </div>

            {error && (
              <p className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Please wait...' : copy.action}
              {!isSubmitting && <ArrowRight size={17} />}
            </button>
              </form>

              <p className="mt-5 text-center text-sm font-semibold text-slate-400">
                {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button
                  type="button"
                  className="font-extrabold text-violet-300 transition hover:text-violet-200"
                  onClick={() => {
                    switchMode(mode === 'login' ? 'signup' : 'login');
                  }}
                >
                  {mode === 'login' ? 'Sign up' : 'Login'}
                </button>
              </p>
            </>
          )}
        </div>

        {isRedirecting && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/92 backdrop-blur-md">
            <div className="relative mb-5">
              <div className="h-14 w-14 animate-spin rounded-full border-4 border-violet-900/70 border-t-violet-500" />
              <img src="/brand/faviconblack.png" alt="" className="absolute inset-0 m-auto h-8 w-8 rounded-xl" />
            </div>
            <p className="text-sm font-extrabold text-slate-200">Preparing your workspace...</p>
          </div>
        )}
      </div>
    </div>
  );
}
