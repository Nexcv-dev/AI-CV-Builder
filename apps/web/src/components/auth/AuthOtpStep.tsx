import type { ClipboardEvent, FormEvent, KeyboardEvent } from 'react';
import { Check, RotateCcw, ShieldCheck } from 'lucide-react';

interface AuthOtpStepProps {
  error: string;
  isResendingOtp: boolean;
  isSubmitting: boolean;
  normalizedEmail: string;
  verificationCode: string;
  onOtpChange: (index: number, value: string) => void;
  onOtpKeyDown: (index: number, event: KeyboardEvent<HTMLInputElement>) => void;
  onOtpPaste: (event: ClipboardEvent<HTMLInputElement>) => void;
  onResendOtp: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function AuthOtpStep({
  error,
  isResendingOtp,
  isSubmitting,
  normalizedEmail,
  verificationCode,
  onOtpChange,
  onOtpKeyDown,
  onOtpPaste,
  onResendOtp,
  onSubmit,
}: AuthOtpStepProps) {
  return (
    <form className="auth-mode-fade space-y-5" onSubmit={onSubmit}>
      <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4">
        <p className="flex items-center gap-2 text-xs font-black uppercase text-emerald-200">
          <ShieldCheck size={15} />
          OTP Verification
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-emerald-50/85">
          Enter the 6-digit code sent to {normalizedEmail}.
        </p>
      </div>
      <div className="flex justify-center gap-2 py-2 sm:gap-3" onPaste={onOtpPaste}>
        {Array.from({ length: 6 }).map((_, index) => (
          <input
            key={index}
            id={`auth-otp-${index}`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]"
            maxLength={1}
            value={verificationCode[index] || ''}
            onChange={(event) => onOtpChange(index, event.target.value)}
            onKeyDown={(event) => onOtpKeyDown(index, event)}
            className="h-12 w-10 rounded-xl border border-white/12 bg-slate-900 text-center font-montserrat text-xl font-black text-white outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/15 sm:w-12"
            autoComplete="one-time-code"
            required
          />
        ))}
      </div>
      {error && <p className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-200">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting || isResendingOtp || verificationCode.length !== 6}
        className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-black text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? 'Verifying...' : 'Confirm OTP'}
        {!isSubmitting && <Check size={17} />}
      </button>
      <button
        type="button"
        onClick={onResendOtp}
        disabled={isSubmitting || isResendingOtp}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/6 px-4 text-sm font-black text-slate-200 transition hover:bg-white/10 active:scale-[0.99] disabled:opacity-70"
      >
        <RotateCcw size={16} />
        {isResendingOtp ? 'Sending OTP...' : 'Resend OTP'}
      </button>
    </form>
  );
}
