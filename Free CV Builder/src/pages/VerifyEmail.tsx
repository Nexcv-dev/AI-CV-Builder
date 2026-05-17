import React, { FormEvent, useState } from 'react';
import { ArrowRight, CheckCircle2, MailCheck, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PasswordResetFooter } from '../components/PasswordResetFooter';
import { AuthUser, apiFetch, notifyAuthUserChanged } from '../utils/api';

export default function VerifyEmail() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('Enter the 6-digit OTP sent to your email.');

  const verifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('submitting');
    setMessage('Checking your verification code...');

    try {
      const data = await apiFetch<{ user: AuthUser; message: string }>('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      notifyAuthUserChanged(data.user);
      setStatus('success');
      setMessage(data.message || 'Email verified successfully.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Could not verify email.');
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    const newVal = val.replace(/\D/g, '').slice(0, 1);
    const updatedCode = code.split('');
    updatedCode[index] = newVal;
    const finalCode = updatedCode.join('').slice(0, 6);
    setCode(finalCode);

    if (newVal && index < 5) {
      document.getElementById(`verify-otp-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!code[index] && index > 0) {
        const updatedCode = code.split('');
        updatedCode[index - 1] = '';
        setCode(updatedCode.join(''));
        document.getElementById(`verify-otp-${index - 1}`)?.focus();
      } else {
        const updatedCode = code.split('');
        updatedCode[index] = '';
        setCode(updatedCode.join(''));
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    setCode(pastedData);
    const focusIndex = Math.min(pastedData.length, 5);
    setTimeout(() => {
      document.getElementById(`verify-otp-${focusIndex}`)?.focus();
    }, 0);
  };

  const icon =
    status === 'success' ? (
      <CheckCircle2 size={30} className="text-emerald-300" />
    ) : status === 'error' ? (
      <XCircle size={30} className="text-rose-300" />
    ) : (
      <MailCheck size={30} className="text-violet-300" />
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
              {status === 'success' ? 'Email verified' : status === 'error' ? 'Verification failed' : 'Enter OTP'}
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">{message}</p>
          </div>

          {status !== 'success' && (
            <form className="mb-3 space-y-4" onSubmit={verifyCode}>
              <div className="flex justify-center gap-2 sm:gap-3 py-2" onPaste={handlePaste}>
                {Array.from({ length: 6 }).map((_, index) => {
                  const val = code[index] || '';
                  return (
                    <input
                      key={index}
                      id={`verify-otp-${index}`}
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
              <button
                type="submit"
                disabled={status === 'submitting' || code.length !== 6}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {status === 'submitting' ? 'Verifying...' : 'Verify email'}
                {status !== 'submitting' && <ArrowRight size={17} />}
              </button>
            </form>
          )}

          <Link
            to="/builder"
            className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/6 px-4 py-3.5 text-sm font-extrabold text-white transition hover:bg-white/10 active:scale-[0.99]"
          >
            Back to Builder
          </Link>
        </div>
      </div>
      <PasswordResetFooter />
    </div>
  );
}
