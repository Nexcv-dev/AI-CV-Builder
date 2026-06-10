import type { FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, Lock } from 'lucide-react';

interface PasswordCheck {
  label: string;
  passed: boolean;
}

interface AuthSignupPasswordStepProps {
  confirmPassword: string;
  error: string;
  isSubmitting: boolean;
  normalizedEmail: string;
  password: string;
  passwordChecks: PasswordCheck[];
  passwordStrengthClass: string;
  passwordStrengthLabel: string;
  passwordStrengthSegments: number;
  passwordStrengthTextClass: string;
  showPassword: boolean;
  onConfirmPasswordChange: (password: string) => void;
  onErrorClear: () => void;
  onPasswordChange: (password: string) => void;
  onShowPasswordChange: (visible: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function AuthSignupPasswordStep({
  confirmPassword,
  error,
  isSubmitting,
  normalizedEmail,
  password,
  passwordChecks,
  passwordStrengthClass,
  passwordStrengthLabel,
  passwordStrengthSegments,
  passwordStrengthTextClass,
  showPassword,
  onConfirmPasswordChange,
  onErrorClear,
  onPasswordChange,
  onShowPasswordChange,
  onSubmit,
}: AuthSignupPasswordStepProps) {
  return (
    <form className="auth-mode-fade space-y-5" onSubmit={onSubmit}>
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
                onPasswordChange(event.target.value);
                onErrorClear();
              }}
              className="w-full bg-transparent text-[16px] font-semibold text-white outline-none"
              autoComplete="new-password"
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
        </label>
        <label className="block">
          <span className="mb-3 block text-sm font-black text-slate-200">Confirm password</span>
          <span className="flex h-13 items-center gap-3 rounded-xl border border-white/12 bg-slate-900 px-4 transition focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/15">
            <Lock size={18} className="text-slate-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => {
                onConfirmPasswordChange(event.target.value);
                onErrorClear();
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
  );
}
