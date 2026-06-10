import { Mail } from 'lucide-react';
import { authNextParam } from './authHelpers';
import type { AuthMode } from './authTypes';
import { GitHubLogo, GoogleLogo, LinkedInLogo } from './SocialLogos';

interface AuthChoiceStepProps {
  isLogin: boolean;
  redirectTo: string;
  onEmailClick: () => void;
  onSwitchMode: (mode: AuthMode) => void;
}

export function AuthChoiceStep({ isLogin, redirectTo, onEmailClick, onSwitchMode }: AuthChoiceStepProps) {
  return (
    <div className="auth-mode-fade space-y-4">
      <p className="max-w-md text-base font-semibold leading-7 text-slate-300">
        {isLogin
          ? 'Login to continue editing, saving, and downloading your CVs.'
          : 'Create your NexCV account and verify your email with a one-time password.'}
      </p>
      <a
        href={`/api/auth/google${authNextParam(redirectTo)}`}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white px-4 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-white/10 transition hover:bg-slate-100 active:scale-[0.99]"
      >
        <GoogleLogo />
        Continue with Google
      </a>
      <a
        href={`/api/auth/linkedin${authNextParam(redirectTo)}`}
        className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#0A66C2] px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-sky-950/35 transition hover:bg-[#0959AA] active:scale-[0.99]"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded bg-white">
          <LinkedInLogo />
        </span>
        Continue with LinkedIn
      </a>
      <a
        href={`/api/auth/github${authNextParam(redirectTo)}`}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-slate-900 px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-black/25 transition hover:bg-slate-800 active:scale-[0.99]"
      >
        <GitHubLogo />
        Continue with GitHub
      </a>
      <button
        type="button"
        className="flex w-full items-center justify-center gap-3 rounded-xl bg-violet-600 px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500 active:scale-[0.99]"
        onClick={onEmailClick}
      >
        <Mail size={18} />
        Continue with email
      </button>
      <p className="pt-2 text-center text-sm font-semibold text-slate-400">
        {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
        <button type="button" className="font-black text-emerald-300 hover:text-emerald-200" onClick={() => onSwitchMode(isLogin ? 'signup' : 'login')}>
          {isLogin ? 'Sign up' : 'Login'}
        </button>
      </p>
    </div>
  );
}
