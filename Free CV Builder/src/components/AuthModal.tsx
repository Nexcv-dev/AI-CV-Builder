import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, X, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthUser, apiFetch, notifyAuthUserChanged } from '../utils/api';
import { AuthChoiceStep } from './auth/AuthChoiceStep';
import { AuthEmailStep } from './auth/AuthEmailStep';
import { AuthNameStep } from './auth/AuthNameStep';
import { AuthOtpStep } from './auth/AuthOtpStep';
import { AuthPasswordStep } from './auth/AuthPasswordStep';
import { AuthSignupPasswordStep } from './auth/AuthSignupPasswordStep';
import { AuthVisualPanel } from './auth/AuthVisualPanel';
import { prefetchBuilderRoute } from './auth/authHelpers';
import type { AuthMode, AuthModalProps, WizardStep } from './auth/authTypes';
import { getAuthEmailError, getPasswordChecks, getPasswordError, getSuggestedEmail } from './auth/authValidation';
import { useModalScrollLock } from './auth/useModalScrollLock';

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
  const [isResendingOtp, setIsResendingOtp] = useState(false);

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
  const showLoginFromSignupError = mode === 'signup' && error.toLowerCase().includes('already exists');

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
    setIsResendingOtp(false);
  }, [initialMode, isOpen]);

  useModalScrollLock(isOpen, onClose);

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
    setIsResendingOtp(false);
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
        await apiFetch<{ exists: boolean }>('/api/auth/email/check', {
          method: 'POST',
          body: JSON.stringify({ email: normalizedEmail, intent: 'signup' }),
        });
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
      if (redirectTo.startsWith('/builder')) {
        prefetchBuilderRoute();
      }
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
    if (isSubmitting || isResendingOtp) return;
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
    if (isSubmitting || isResendingOtp) return;
    setError('');
    setIsResendingOtp(true);
    try {
      await startEmailOtp(displayName, acceptedTerms, mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend OTP.');
    } finally {
      setIsResendingOtp(false);
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
            <AuthChoiceStep
              isLogin={isLogin}
              redirectTo={redirectTo}
              onEmailClick={() => setStep('email')}
              onSwitchMode={switchMode}
            />
          )}

          {step === 'email' && (
            <AuthEmailStep
              email={email}
              emailSuggestion={emailSuggestion}
              error={error}
              isLogin={isLogin}
              isSubmitting={isSubmitting}
              normalizedEmail={normalizedEmail}
              showLoginFromSignupError={showLoginFromSignupError}
              onEmailChange={(nextEmail) => {
                setEmail(nextEmail);
                setError('');
              }}
              onEmailSuggestionClick={(nextEmail) => {
                setEmail(nextEmail);
                setError('');
              }}
              onExistingAccountLogin={() => {
                setMode('login');
                setStep('password');
                setPassword('');
                setError('');
                window.setTimeout(() => document.getElementById('auth-password')?.focus(), 0);
              }}
              onSubmit={handleEmailSubmit}
            />
          )}

          {step === 'password' && (
            <AuthPasswordStep
              error={error}
              isSubmitting={isSubmitting}
              normalizedEmail={normalizedEmail}
              password={password}
              showPassword={showPassword}
              onForgotPassword={() => {
                navigate('/forgot-password');
                onClose();
              }}
              onPasswordChange={setPassword}
              onShowPasswordChange={setShowPassword}
              onSubmit={handlePasswordSubmit}
            />
          )}

          {step === 'name' && (
            <AuthNameStep
              acceptedTerms={acceptedTerms}
              displayName={displayName}
              error={error}
              isSubmitting={isSubmitting}
              normalizedEmail={normalizedEmail}
              onAcceptedTermsChange={setAcceptedTerms}
              onClose={onClose}
              onDisplayNameChange={setDisplayName}
              onSubmit={handleNameSubmit}
            />
          )}

          {step === 'signup-password' && (
            <AuthSignupPasswordStep
              confirmPassword={confirmPassword}
              error={error}
              isSubmitting={isSubmitting}
              normalizedEmail={normalizedEmail}
              password={password}
              passwordChecks={passwordChecks}
              passwordStrengthClass={passwordStrengthClass}
              passwordStrengthLabel={passwordStrengthLabel}
              passwordStrengthSegments={passwordStrengthSegments}
              passwordStrengthTextClass={passwordStrengthTextClass}
              showPassword={showPassword}
              onConfirmPasswordChange={setConfirmPassword}
              onErrorClear={() => setError('')}
              onPasswordChange={setPassword}
              onShowPasswordChange={setShowPassword}
              onSubmit={handleSignupPasswordSubmit}
            />
          )}

          {step === 'otp' && (
            <AuthOtpStep
              error={error}
              isResendingOtp={isResendingOtp}
              isSubmitting={isSubmitting}
              normalizedEmail={normalizedEmail}
              verificationCode={verificationCode}
              onOtpChange={handleOtpChange}
              onOtpKeyDown={handleOtpKeyDown}
              onOtpPaste={handleOtpPaste}
              onResendOtp={handleResendOtp}
              onSubmit={handleVerifyOtp}
            />
          )}
        </section>

        <AuthVisualPanel />

      </div>
    </div>
  );
}
