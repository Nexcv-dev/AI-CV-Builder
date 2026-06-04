import type { FormEvent } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

interface AuthPasswordStepProps {
  error: string;
  isSubmitting: boolean;
  normalizedEmail: string;
  password: string;
  showPassword: boolean;
  onForgotPassword: () => void;
  onPasswordChange: (password: string) => void;
  onShowPasswordChange: (visible: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function AuthPasswordStep({
  error,
  isSubmitting,
  normalizedEmail,
  password,
  showPassword,
  onForgotPassword,
  onPasswordChange,
  onShowPasswordChange,
  onSubmit,
}: AuthPasswordStepProps) {
  return (
    <form className="auth-mode-fade space-y-5" onSubmit={onSubmit}>
      <p className="max-w-md text-base font-semibold leading-7 text-slate-300">
        Logging in as <span className="font-black text-white">{normalizedEmail}</span>.
      </p>
      <div className="block">
        <span className="mb-3 flex items-center justify-between text-sm font-black text-slate-200">
          <span>Password</span>
          <button
            type="button"
            onClick={onForgotPassword}
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
            onChange={(event) => onPasswordChange(event.target.value)}
            className="w-full bg-transparent text-[16px] font-semibold text-white outline-none"
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/8 hover:text-slate-200"
            onClick={() => onShowPasswordChange(!showPassword)}
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
  );
}
