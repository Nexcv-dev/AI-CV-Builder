import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, User } from 'lucide-react';

interface AuthNameStepProps {
  acceptedTerms: boolean;
  displayName: string;
  error: string;
  isSubmitting: boolean;
  normalizedEmail: string;
  onAcceptedTermsChange: (accepted: boolean) => void;
  onClose: () => void;
  onDisplayNameChange: (name: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function AuthNameStep({
  acceptedTerms,
  displayName,
  error,
  isSubmitting,
  normalizedEmail,
  onAcceptedTermsChange,
  onClose,
  onDisplayNameChange,
  onSubmit,
}: AuthNameStepProps) {
  return (
    <form className="auth-mode-fade space-y-5" onSubmit={onSubmit}>
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
            onChange={(event) => onDisplayNameChange(event.target.value)}
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
          onChange={(event) => onAcceptedTermsChange(event.target.checked)}
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
  );
}
