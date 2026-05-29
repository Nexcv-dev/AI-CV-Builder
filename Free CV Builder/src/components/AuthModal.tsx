import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, FileText, LayoutTemplate, Lock, Mail, Palette, RotateCcw, ShieldCheck, Sparkles, User, Wand2, X, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthUser, apiFetch, notifyAuthUserChanged } from '../utils/api';

type AuthMode = 'login' | 'signup';
type WizardStep = 'choice' | 'email' | 'password' | 'name' | 'signup-password' | 'otp';

interface AuthModalProps {
  isOpen: boolean;
  initialMode: AuthMode;
  onClose: () => void;
  redirectTo?: string;
  onAuthenticated?: (user: AuthUser) => void;
}

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

function googleNextParam(redirectTo: string) {
  if (redirectTo.includes('download=1')) return '?next=download';
  if (redirectTo.includes('import=1')) return '?next=import';
  return '?next=builder';
}

const allowedAuthEmailDomains = [
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'proton.me',
  'protonmail.com',
  'aol.com',
];

const blockedAuthEmailDomains = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'yopmail.com',
  'tempmail.com',
  'temp-mail.org',
  '10minutemail.com',
  'throwawaymail.com',
  'trashmail.com',
  'sharklasers.com',
  'getairmail.com',
]);

const commonDomainTypos: Record<string, string> = {
  'gmai.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.om': 'gmail.com',
  'gmail.comm': 'gmail.com',
  'yaho.com': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'yhoo.com': 'yahoo.com',
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outlook.con': 'outlook.com',
  'iclod.com': 'icloud.com',
  'icloud.con': 'icloud.com',
  'protonmail.con': 'protonmail.com',
};

const levenshteinDistance = (left: string, right: string) => {
  const rows = Array.from({ length: left.length + 1 }, (_, index) => [index]);
  for (let index = 1; index <= right.length; index += 1) rows[0][index] = index;

  for (let row = 1; row <= left.length; row += 1) {
    for (let col = 1; col <= right.length; col += 1) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1;
      rows[row][col] = Math.min(
        rows[row - 1][col] + 1,
        rows[row][col - 1] + 1,
        rows[row - 1][col - 1] + cost
      );
    }
  }

  return rows[left.length][right.length];
};

const getEmailParts = (value: string) => {
  const trimmed = value.trim().toLowerCase();
  const [localPart, domain, ...rest] = trimmed.split('@');
  if (!localPart || !domain || rest.length) return null;
  return { localPart, domain, email: `${localPart}@${domain}` };
};

const getSuggestedEmail = (value: string) => {
  const parts = getEmailParts(value);
  if (!parts) return '';

  const directSuggestion = commonDomainTypos[parts.domain];
  if (directSuggestion) return `${parts.localPart}@${directSuggestion}`;

  const nearest = allowedAuthEmailDomains
    .map((domain) => ({ domain, distance: levenshteinDistance(parts.domain, domain) }))
    .filter(({ distance }) => distance > 0 && distance <= 2)
    .sort((a, b) => a.distance - b.distance)[0];

  return nearest ? `${parts.localPart}@${nearest.domain}` : '';
};

const getAuthEmailError = (value: string) => {
  const parts = getEmailParts(value);
  if (!parts) return 'Enter a valid email address.';
  if (blockedAuthEmailDomains.has(parts.domain)) return 'Enter a valid email address.';
  if (!allowedAuthEmailDomains.includes(parts.domain)) {
    return 'Enter a valid email address.';
  }
  return '';
};

const passwordPolicyMessage = 'Use 8+ characters with uppercase, lowercase, number, and symbol.';

const getPasswordError = (value: string) => {
  if (
    value.length >= 8 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  ) {
    return '';
  }
  return passwordPolicyMessage;
};

const getPasswordChecks = (value: string) => [
  { label: '8+ characters', passed: value.length >= 8 },
  { label: 'Uppercase', passed: /[A-Z]/.test(value) },
  { label: 'Lowercase', passed: /[a-z]/.test(value) },
  { label: 'Number', passed: /\d/.test(value) },
  { label: 'Symbol', passed: /[^A-Za-z0-9]/.test(value) },
];

const visualItems = [
  { icon: FileText, className: 'left-[12%] top-[41%] border-sky-300/25 bg-sky-400/18 text-sky-100' },
  { icon: LayoutTemplate, className: 'left-[23%] top-[26%] border-emerald-300/25 bg-emerald-400/18 text-emerald-100' },
  { icon: Sparkles, className: 'left-[42%] top-[18%] border-violet-300/25 bg-violet-400/20 text-violet-100' },
  { icon: Wand2, className: 'right-[27%] top-[23%] border-fuchsia-300/25 bg-fuchsia-400/18 text-fuchsia-100' },
  { icon: Palette, className: 'right-[13%] top-[39%] border-amber-300/25 bg-amber-300/18 text-amber-100' },
  { icon: Mail, className: 'right-[19%] top-[57%] border-indigo-300/25 bg-indigo-400/18 text-indigo-100' },
];

export function AuthModal({ isOpen, initialMode, onClose, redirectTo = '/builder?import=1', onAuthenticated }: AuthModalProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [step, setStep] = useState<WizardStep>('choice');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();
  const emailSuggestion = useMemo(() => getSuggestedEmail(email), [email]);
  const passwordChecks = useMemo(() => getPasswordChecks(password), [password]);
  const passedPasswordChecks = passwordChecks.filter((item) => item.passed).length;
  const isPasswordStrong = passedPasswordChecks === passwordChecks.length;
  const isPasswordIntermediate = !isPasswordStrong && password.length >= 5 && /[A-Z]/.test(password);
  const passwordStrengthLabel = isPasswordStrong ? 'Strong' : isPasswordIntermediate ? 'Intermediate' : 'Weak';
  const passwordStrengthClass = isPasswordStrong ? 'bg-emerald-300' : isPasswordIntermediate ? 'bg-amber-300' : 'bg-red-400';
  const passwordStrengthTextClass = isPasswordStrong ? 'text-emerald-200' : isPasswordIntermediate ? 'text-amber-200' : 'text-red-200';
  const passwordStrengthSegments = isPasswordStrong ? 5 : isPasswordIntermediate ? 3 : password ? 1 : 0;
  const isLogin = mode === 'login';

  const title = useMemo(() => {
    if (step === 'email') return isLogin ? 'Login with email' : 'Sign up with email';
    if (step === 'password') return 'Enter your password';
    if (step === 'name') return 'Create your profile';
    if (step === 'signup-password') return 'Create a password';
    if (step === 'otp') return 'Enter OTP';
    return isLogin ? 'Welcome back' : 'Create your account';
  }, [isLogin, step]);

  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode);
    setStep('choice');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setDisplayName('');
    setAcceptedTerms(false);
    setVerificationCode('');
    setError('');
    setIsSubmitting(false);
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
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

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

  const completeAuthRedirect = (user: AuthUser) => {
    onAuthenticated?.(user);
    notifyAuthUserChanged(user);
    navigate(redirectTo);
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setStep('choice');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
    setAcceptedTerms(false);
    setVerificationCode('');
    setError('');
  };

  const startEmailOtp = async (name: string, termsAccepted: boolean, intent: AuthMode) => {
    const data = await apiFetch<{ needsName: boolean; message?: string }>('/api/auth/email/start', {
      method: 'POST',
      body: JSON.stringify({ email: normalizedEmail, displayName: name, acceptedTerms: termsAccepted, intent, password: intent === 'signup' ? password : undefined }),
    });
    if (data.needsName) {
      setStep('name');
      return;
    }
    if (data.message) toast.success(data.message);
    setVerificationCode('');
    setStep('otp');
    window.setTimeout(() => document.getElementById('auth-otp-0')?.focus(), 0);
  };

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setError('');
    const emailError = getAuthEmailError(email);
    if (emailError) {
      setError(emailError);
      return;
    }
    setIsSubmitting(true);
    try {
      if (isLogin) {
        setPassword('');
        setStep('password');
        window.setTimeout(() => document.getElementById('auth-password')?.focus(), 0);
      } else {
        setDisplayName('');
        setAcceptedTerms(false);
        setStep('name');
        window.setTimeout(() => document.getElementById('auth-display-name')?.focus(), 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not continue with email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      const data = await apiFetch<{ user: AuthUser }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail, password }),
      });
      completeAuthRedirect(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign you in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNameSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setError('');
    if (!acceptedTerms) {
      setError('Please accept the Terms and Privacy Policy to continue.');
      return;
    }
    setIsSubmitting(true);
    try {
      setPassword('');
      setConfirmPassword('');
      setStep('signup-password');
      window.setTimeout(() => document.getElementById('auth-signup-password')?.focus(), 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not continue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupPasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setError('');
    const passwordError = getPasswordError(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    try {
      await startEmailOtp(displayName, acceptedTerms, 'signup');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send OTP.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      const data = await apiFetch<{ user: AuthUser; message: string }>('/api/auth/email/verify', {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail, code: verificationCode }),
      });
      toast.success(data.message || 'Logged in successfully.');
      completeAuthRedirect(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify OTP.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      await startEmailOtp(displayName, acceptedTerms, mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend OTP.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const nextValue = value.replace(/\D/g, '').slice(0, 1);
    const code = verificationCode.padEnd(6, ' ').split('');
    code[index] = nextValue || ' ';
    const nextCode = code.join('').replace(/\s/g, '').slice(0, 6);
    setVerificationCode(nextCode);
    if (nextValue && index < 5) document.getElementById(`auth-otp-${index + 1}`)?.focus();
  };

  const handleOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Backspace' || verificationCode[index] || index === 0) return;
    document.getElementById(`auth-otp-${index - 1}`)?.focus();
  };

  const handleOtpPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pastedCode = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    setVerificationCode(pastedCode);
    window.setTimeout(() => document.getElementById(`auth-otp-${Math.min(pastedCode.length, 5)}`)?.focus(), 0);
  };

  const goBack = () => {
    setError('');
    if (step === 'choice') return;
    if (step === 'password') {
      setStep('email');
      return;
    }
    if (step === 'email') {
      setStep('choice');
      return;
    }
    if (step === 'name') {
      setStep('email');
      return;
    }
    if (step === 'signup-password') {
      setStep('name');
      return;
    }
    setStep(isLogin ? 'email' : 'name');
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center overflow-y-auto px-4 py-5" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-950/78 backdrop-blur-md" aria-hidden="true" />

      <div className="relative grid max-h-[calc(100dvh-2.5rem)] w-full max-w-5xl overflow-y-auto rounded-[24px] border border-white/10 bg-slate-950 text-white shadow-2xl shadow-black/50 lg:grid-cols-[1fr_1.05fr]">
        <button
          type="button"
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-slate-900/95 text-white shadow-lg shadow-black/30 transition hover:bg-slate-800 sm:right-4 sm:top-4 sm:h-12 sm:w-12"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-4.5 w-4.5 sm:h-6 sm:w-6" />
        </button>

        <section className="min-h-[540px] px-6 py-7 sm:px-9 lg:px-12">
          <div className="mb-7 flex items-center gap-2">
            {step !== 'choice' && (
              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/8 hover:text-white"
                onClick={goBack}
                aria-label="Back"
              >
                <ArrowLeft size={22} />
              </button>
            )}
            <h2 className="font-montserrat text-2xl font-black tracking-normal sm:text-3xl">{title}</h2>
          </div>

          {step === 'choice' && (
            <div className="auth-mode-fade space-y-4">
              <p className="max-w-md text-base font-semibold leading-7 text-slate-300">
                {isLogin
                  ? 'Login to continue editing, saving, and downloading your CVs.'
                  : 'Create your NexCV account and verify your email with a one-time password.'}
              </p>
              <a
                href={`/api/auth/google${googleNextParam(redirectTo)}`}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white px-4 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-white/10 transition hover:bg-slate-100 active:scale-[0.99]"
              >
                <GoogleLogo />
                Continue with Google
              </a>
              <button
                type="button"
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-violet-600 px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500 active:scale-[0.99]"
                onClick={() => setStep('email')}
              >
                <Mail size={18} />
                Continue with email
              </button>
              <p className="pt-2 text-center text-sm font-semibold text-slate-400">
                {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button type="button" className="font-black text-emerald-300 hover:text-emerald-200" onClick={() => switchMode(isLogin ? 'signup' : 'login')}>
                  {isLogin ? 'Sign up' : 'Login'}
                </button>
              </p>
            </div>
          )}

          {step === 'email' && (
            <form className="auth-mode-fade space-y-5" onSubmit={handleEmailSubmit}>
              <p className="max-w-md text-base font-semibold leading-7 text-slate-300">
                {isLogin
                  ? 'Enter your email to continue to password sign-in.'
                  : 'Enter your email to continue account creation.'}
              </p>
              <label className="block">
                <span className="mb-3 block text-sm font-black text-slate-200">Email address</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError('');
                  }}
                  className="h-13 w-full rounded-xl border border-white/12 bg-slate-900 px-4 text-[16px] font-semibold text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/15"
                  autoComplete="email"
                  required
                />
              </label>
              {emailSuggestion && emailSuggestion !== normalizedEmail && (
                <button
                  type="button"
                  onClick={() => {
                    setEmail(emailSuggestion);
                    setError('');
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2.5 text-left text-sm font-bold text-emerald-100 transition hover:border-emerald-300/35 hover:bg-emerald-400/15"
                >
                  <Mail size={16} className="shrink-0 text-emerald-200" />
                  <span>
                    Did you mean <span className="font-black text-white">{emailSuggestion}</span>?
                  </span>
                </button>
              )}
              {error && <p className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-200">{error}</p>}
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-black text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Checking...' : 'Continue'}
                {!isSubmitting && <ArrowRight size={17} />}
              </button>
            </form>
          )}

          {step === 'password' && (
            <form className="auth-mode-fade space-y-5" onSubmit={handlePasswordSubmit}>
              <p className="max-w-md text-base font-semibold leading-7 text-slate-300">
                Logging in as <span className="font-black text-white">{normalizedEmail}</span>.
              </p>
              <div className="block">
                <span className="mb-3 flex items-center justify-between text-sm font-black text-slate-200">
                  <span>Password</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/forgot-password');
                      onClose();
                    }}
                    className="text-xs font-black text-emerald-300 transition hover:text-emerald-200"
                  >
                    Forgot password?
                  </button>
                </span>
                <span className="flex h-13 items-center gap-3 rounded-xl border border-white/12 bg-slate-900 px-4 transition focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/15">
                  <Lock size={18} className="text-slate-500" />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full bg-transparent text-[16px] font-semibold text-white outline-none"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/8 hover:text-slate-200"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </div>
              {error && <p className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-200">{error}</p>}
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-black text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Signing in...' : 'Login'}
              </button>
            </form>
          )}

          {step === 'name' && (
            <form className="auth-mode-fade space-y-5" onSubmit={handleNameSubmit}>
              <p className="max-w-md text-base font-semibold leading-7 text-slate-300">
                Add your name, then create a password before we send an OTP to <span className="font-black text-white">{normalizedEmail}</span>.
              </p>
              <label className="block">
                <span className="mb-3 block text-sm font-black text-slate-200">Full name</span>
                <span className="flex h-13 items-center gap-3 rounded-xl border border-white/12 bg-slate-900 px-4 transition focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/15">
                  <User size={18} className="text-slate-500" />
                  <input
                    id="auth-display-name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="w-full bg-transparent text-[16px] font-semibold text-white outline-none"
                    autoComplete="name"
                    required
                  />
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950 text-violet-600 focus:ring-violet-500"
                  required
                />
                <span className="text-xs font-semibold leading-5 text-slate-300">
                  I agree to the{' '}
                  <Link to="/terms" className="font-black text-emerald-300 hover:text-emerald-200" onClick={onClose}>
                    Terms and Conditions
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy-policy" className="font-black text-emerald-300 hover:text-emerald-200" onClick={onClose}>
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
              {error && <p className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-200">{error}</p>}
              <button
                type="submit"
                disabled={isSubmitting || !acceptedTerms}
                className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-black text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Please wait...' : 'Continue'}
                {!isSubmitting && <ArrowRight size={17} />}
              </button>
            </form>
          )}

          {step === 'signup-password' && (
            <form className="auth-mode-fade space-y-5" onSubmit={handleSignupPasswordSubmit}>
              <p className="max-w-md text-base font-semibold leading-7 text-slate-300">
                This password will be used next time you login as <span className="font-black text-white">{normalizedEmail}</span>.
              </p>
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-3 block text-sm font-black text-slate-200">Password</span>
                  <span className="flex h-13 items-center gap-3 rounded-xl border border-white/12 bg-slate-900 px-4 transition focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/15">
                    <Lock size={18} className="text-slate-500" />
                    <input
                      id="auth-signup-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setError('');
                      }}
                      className="w-full bg-transparent text-[16px] font-semibold text-white outline-none"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/8 hover:text-slate-200"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </span>
                </label>
                <label className="block">
                  <span className="mb-3 block text-sm font-black text-slate-200">Confirm password</span>
                  <span className="flex h-13 items-center gap-3 rounded-xl border border-white/12 bg-slate-900 px-4 transition focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/15">
                    <Lock size={18} className="text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(event) => {
                        setConfirmPassword(event.target.value);
                        setError('');
                      }}
                      className="w-full bg-transparent text-[16px] font-semibold text-white outline-none"
                      autoComplete="new-password"
                      required
                    />
                  </span>
                </label>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <div className="mb-3 flex justify-end">
                  <span className={`text-xs font-black ${passwordStrengthTextClass}`}>
                    {password ? passwordStrengthLabel : ''}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {passwordChecks.map((item, index) => (
                    <span
                      key={item.label}
                      className={`h-1.5 rounded-full transition ${index < passwordStrengthSegments ? passwordStrengthClass : 'bg-slate-700'}`}
                    />
                  ))}
                </div>
              </div>
              {error && <p className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-200">{error}</p>}
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-black text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Sending OTP...' : 'Confirm password'}
                {!isSubmitting && <ArrowRight size={17} />}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form className="auth-mode-fade space-y-5" onSubmit={handleVerifyOtp}>
              <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4">
                <p className="flex items-center gap-2 text-xs font-black uppercase text-emerald-200">
                  <ShieldCheck size={15} />
                  OTP Verification
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-emerald-50/85">
                  Enter the 6-digit code sent to {normalizedEmail}.
                </p>
              </div>
              <div className="flex justify-center gap-2 py-2 sm:gap-3" onPaste={handleOtpPaste}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <input
                    key={index}
                    id={`auth-otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]"
                    maxLength={1}
                    value={verificationCode[index] || ''}
                    onChange={(event) => handleOtpChange(index, event.target.value)}
                    onKeyDown={(event) => handleOtpKeyDown(index, event)}
                    className="h-12 w-10 rounded-xl border border-white/12 bg-slate-900 text-center font-montserrat text-xl font-black text-white outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/15 sm:w-12"
                    autoComplete="one-time-code"
                    required
                  />
                ))}
              </div>
              {error && <p className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-200">{error}</p>}
              <button
                type="submit"
                disabled={isSubmitting || verificationCode.length !== 6}
                className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-black text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Verifying...' : 'Confirm OTP'}
                {!isSubmitting && <Check size={17} />}
              </button>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isSubmitting}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/6 px-4 text-sm font-black text-slate-200 transition hover:bg-white/10 active:scale-[0.99] disabled:opacity-70"
              >
                <RotateCcw size={16} />
                Resend OTP
              </button>
            </form>
          )}
        </section>

        <section className="relative hidden min-h-[540px] overflow-hidden bg-slate-900 lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(20,184,166,0.34),transparent_30%),radial-gradient(circle_at_58%_36%,rgba(168,85,247,0.38),transparent_32%),linear-gradient(145deg,rgba(15,23,42,1),rgba(17,24,39,1)_42%,rgba(88,28,135,0.55))]" />
          <div className="absolute inset-x-0 top-16 mx-auto h-64 w-64 rounded-full bg-cyan-400/18 blur-3xl" />
          <div className="absolute bottom-10 right-4 h-64 w-64 rounded-full bg-violet-500/18 blur-3xl" />
          <div className="absolute left-1/2 top-[45%] flex h-32 w-32 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/18 bg-white/10 text-white shadow-2xl shadow-violet-950/40 backdrop-blur">
            <img src="/brand/faviconblack.svg" alt="" className="h-18 w-18 rounded-3xl" />
          </div>
          {visualItems.map(({ icon: Icon, className }, index) => (
            <div
              key={index}
              className={`absolute flex h-14 w-14 items-center justify-center rounded-2xl border shadow-xl shadow-black/20 backdrop-blur ${className}`}
            >
              <Icon size={25} strokeWidth={2.6} />
            </div>
          ))}
          <div className="absolute bottom-8 left-8 right-8 rounded-2xl border border-white/10 bg-slate-950/35 p-4 backdrop-blur">
            <p className="text-xs font-black uppercase tracking-widest text-emerald-200">NexCV workspace</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-200">
              Secure access for templates, AI tools, saved CVs, and launch-ready downloads.
            </p>
          </div>
          <Sparkles className="absolute left-[20%] top-[28%] text-white/80" size={22} />
          <Sparkles className="absolute right-[17%] top-[24%] text-white/80" size={24} />
          <Sparkles className="absolute bottom-[36%] left-[20%] text-white/70" size={18} />
          <Sparkles className="absolute bottom-[31%] right-[9%] text-white/70" size={18} />
        </section>

      </div>
    </div>
  );
}
