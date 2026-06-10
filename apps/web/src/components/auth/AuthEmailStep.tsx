import type { FormEvent } from 'react';
import { ArrowRight, Mail } from 'lucide-react';

interface AuthEmailStepProps {
  email: string;
  emailSuggestion: string;
  error: string;
  isLogin: boolean;
  isSubmitting: boolean;
  normalizedEmail: string;
  showLoginFromSignupError: boolean;
  onEmailChange: (email: string) => void;
  onEmailSuggestionClick: (email: string) => void;
  onExistingAccountLogin: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function AuthEmailStep({
  email,
  emailSuggestion,
  error,
  isLogin,
  isSubmitting,
  normalizedEmail,
  showLoginFromSignupError,
  onEmailChange,
  onEmailSuggestionClick,
  onExistingAccountLogin,
  onSubmit,
}: AuthEmailStepProps) {
  return (
    <form className="auth-mode-fade space-y-5" onSubmit={onSubmit}>
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
          onChange={(event) => onEmailChange(event.target.value)}
          className="h-13 w-full rounded-xl border border-white/12 bg-slate-900 px-4 text-[16px] font-semibold text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/15"
          autoComplete="email"
          required
        />
      </label>
      {emailSuggestion && emailSuggestion !== normalizedEmail && (
        <button
          type="button"
          onClick={() => onEmailSuggestionClick(emailSuggestion)}
          className="flex w-full items-center gap-3 rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2.5 text-left text-sm font-bold text-emerald-100 transition hover:border-emerald-300/35 hover:bg-emerald-400/15"
        >
          <Mail size={16} className="shrink-0 text-emerald-200" />
          <span>
            Did you mean <span className="font-black text-white">{emailSuggestion}</span>?
          </span>
        </button>
      )}
      {error && (
        <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-200">
          <p>{error}</p>
          {showLoginFromSignupError && (
            <button
              type="button"
              className="mt-2 font-black text-emerald-200 underline underline-offset-4 hover:text-emerald-100"
              onClick={onExistingAccountLogin}
            >
              Log in with this email
            </button>
          )}
        </div>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-black text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? 'Checking...' : 'Continue'}
        {!isSubmitting && <ArrowRight size={17} />}
      </button>
    </form>
  );
}
