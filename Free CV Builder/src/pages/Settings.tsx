import React, { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, KeyRound, Loader2, LogOut, Save, ShieldAlert } from 'lucide-react';
import { AppShellHeader } from '../components/AppShellHeader';
import { AuthUser, apiFetch, getCurrentUser } from '../utils/api';

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const passwordPolicyHint = '8+ characters with uppercase, lowercase, number, and symbol.';

  useEffect(() => {
    let ignore = false;

    getCurrentUser()
      .then((currentUser) => {
        if (!ignore) setUser(currentUser);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Could not load settings.';
        toast.error(message);
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const savePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      const message = 'New passwords do not match.';
      toast.error(message);
      return;
    }

    setIsSavingPassword(true);
    try {
      await apiFetch('/api/auth/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update password.';
      toast.error(message);
    } finally {
      setIsSavingPassword(false);
    }
  };

  const logout = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    navigate('/');
  };

  const deleteAccount = async () => {
    const confirmed = window.confirm('Delete your account and all saved CVs? This cannot be undone.');
    if (!confirmed) return;

    await apiFetch('/api/auth/account', { method: 'DELETE' });
    navigate('/');
  };

  return (
    <div className="account-page min-h-screen bg-slate-950 text-white">
      <AppShellHeader />
      <main className="mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6 sm:pt-12 lg:px-8 lg:pt-14">
        <div className="flex flex-row items-start justify-between gap-3 border-b border-white/10 pb-6 sm:gap-5 sm:pb-8">
          <Link
            to="/builder"
            className="order-last inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-2 text-[10px] font-black uppercase tracking-wider text-slate-100 shadow-lg shadow-black/20 transition hover:bg-white/15 hover:text-white active:scale-[0.98] sm:px-3.5 sm:py-2.5 sm:text-sm sm:normal-case sm:tracking-normal"
          >
            <ArrowLeft size={14} />
            Back to builder
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black uppercase text-emerald-300">Settings</p>
            <h1 className="mt-2 break-words font-montserrat text-2xl font-black leading-tight min-[390px]:text-3xl sm:text-5xl">Security & account</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-400">
              Manage password, sessions, and permanent account actions.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-12 flex items-center gap-3 text-sm font-bold text-slate-400">
            <Loader2 className="animate-spin" size={18} />
            Loading settings...
          </div>
        ) : (
          <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-6">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/20 sm:h-11 sm:w-11">
                  <KeyRound size={20} />
                </span>
                <div>
                  <h2 className="font-montserrat text-xl font-black">Password</h2>
                  <p className="text-sm font-semibold text-slate-400">Use {passwordPolicyHint}</p>
                </div>
              </div>

              <form className="space-y-3" onSubmit={savePassword}>
                {user?.authProvider === 'email' && (
                  <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-base font-semibold text-white outline-none transition hover:border-white/20 focus:border-violet-400 sm:text-sm" placeholder="Current password" autoComplete="current-password" />
                )}
                <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-base font-semibold text-white outline-none transition hover:border-white/20 focus:border-violet-400 sm:text-sm" placeholder="New password" autoComplete="new-password" minLength={8} />
                <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-base font-semibold text-white outline-none transition hover:border-white/20 focus:border-violet-400 sm:text-sm" placeholder="Confirm new password" autoComplete="new-password" minLength={8} />
                <button type="submit" disabled={isSavingPassword} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-violet-500 active:scale-[0.98] disabled:opacity-60 sm:w-auto">
                  {isSavingPassword ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  Change Password
                </button>
              </form>
            </section>

            <div className="space-y-5">
              <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-6">
                <h2 className="font-montserrat text-xl font-black">Session</h2>
                <p className="mt-1 text-sm font-semibold text-slate-400">Sign out from this browser.</p>
                <button type="button" onClick={logout} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-white/10 active:scale-[0.98]">
                  <LogOut size={16} />
                  Logout
                </button>
              </section>

              <section className="rounded-2xl border border-red-400/20 bg-red-500/[0.06] p-4 sm:p-6">
                <h2 className="font-montserrat text-xl font-black">Danger zone</h2>
                <p className="mt-1 text-sm font-semibold text-red-100/70">Delete your account and all saved CVs permanently.</p>
                <button type="button" onClick={deleteAccount} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-extrabold text-red-100 transition hover:bg-red-500/20 active:scale-[0.98]">
                  <ShieldAlert size={16} />
                  Delete Account
                </button>
              </section>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
