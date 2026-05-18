import React, { FormEvent, useEffect, useState } from 'react';
import { ArrowRight, RotateCcw, ShieldCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthUser, apiFetch, notifyAuthUserChanged } from '../utils/api';

interface EmailVerificationModalProps {
  isOpen: boolean;
  user: AuthUser | null;
  onClose: () => void;
  onVerified: (user: AuthUser) => void;
}

export function EmailVerificationModal({ isOpen, user, onClose, onVerified }: EmailVerificationModalProps) {
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setVerificationCode('');
    setError('');

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

    window.setTimeout(() => document.getElementById('email-verification-otp-0')?.focus(), 0);

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

  if (!isOpen || !user) return null;

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsVerifying(true);

    try {
      const data = await apiFetch<{ user: AuthUser; message: string }>('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ code: verificationCode }),
      });
      notifyAuthUserChanged(data.user);
      onVerified(data.user);
      toast.success(data.message || 'Email verified successfully.');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify email.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (isResending) return;

    setError('');
    setIsResending(true);
    try {
      const data = await apiFetch<{ user: AuthUser; message: string }>('/api/auth/resend-verification', {
        method: 'POST',
      });
      notifyAuthUserChanged(data.user);
      onVerified(data.user);
      toast.success(data.message || 'Verification OTP sent.');
      if (data.user.emailVerified) {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend verification OTP.');
    } finally {
      setIsResending(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    const newVal = val.replace(/\D/g, '').slice(0, 1);
    const updatedCode = verificationCode.split('');
    updatedCode[index] = newVal;
    const finalCode = updatedCode.join('').slice(0, 6);
    setVerificationCode(finalCode);

    if (newVal && index < 5) {
      document.getElementById(`email-verification-otp-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Backspace') return;

    if (!verificationCode[index] && index > 0) {
      const updatedCode = verificationCode.split('');
      updatedCode[index - 1] = '';
      setVerificationCode(updatedCode.join(''));
      document.getElementById(`email-verification-otp-${index - 1}`)?.focus();
      return;
    }

    const updatedCode = verificationCode.split('');
    updatedCode[index] = '';
    setVerificationCode(updatedCode.join(''));
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pastedData = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    setVerificationCode(pastedData);
    const focusIndex = Math.min(pastedData.length, 5);
    window.setTimeout(() => document.getElementById(`email-verification-otp-${focusIndex}`)?.focus(), 0);
  };

  return (
    <div className="fixed inset-0 z-120 flex items-center justify-center overflow-y-auto px-4 py-5" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/78 backdrop-blur-md"
        aria-label="Close email verification dialog"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-900 text-white shadow-2xl shadow-black/40">
        <div className="h-1 w-full bg-linear-to-r from-amber-300 via-violet-500 to-emerald-400" />
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-xs font-extrabold uppercase text-amber-200">
                <ShieldCheck size={15} />
                Email verification
              </p>
              <h2 className="mt-2 font-montserrat text-2xl font-black">Enter OTP</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
                Enter the 6-digit code sent to {user.email}.
              </p>
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

          <form className="mt-6 space-y-4" onSubmit={handleVerify}>
            <div className="block">
              <span className="mb-2 block text-center text-xs font-extrabold uppercase text-slate-400">Verification code</span>
              <div className="flex justify-center gap-2 py-2 sm:gap-3" onPaste={handlePaste}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <input
                    key={index}
                    id={`email-verification-otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]"
                    maxLength={1}
                    value={verificationCode[index] || ''}
                    onChange={(event) => handleOtpChange(index, event.target.value)}
                    onKeyDown={(event) => handleKeyDown(index, event)}
                    className="h-12 w-12 rounded-xl border border-white/10 bg-slate-950 text-center font-montserrat text-xl font-bold text-white outline-none transition-all duration-200 focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
                    autoComplete="off"
                    required
                  />
                ))}
              </div>
            </div>

            {error && (
              <p className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isVerifying || verificationCode.length !== 6}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isVerifying ? 'Verifying...' : 'Verify'}
              {!isVerifying && <ArrowRight size={17} />}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-extrabold text-slate-200 transition hover:bg-white/10 active:scale-[0.99] disabled:opacity-70"
            >
              <RotateCcw size={16} />
              {isResending ? 'Sending...' : 'Resend OTP'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
