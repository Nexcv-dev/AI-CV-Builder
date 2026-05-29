import React, { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  BriefcaseBusiness,
  Calendar,
  Camera,
  CheckCircle2,
  Crown,
  FileText,
  Home,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Save,
  Shield,
  ShieldAlert,
  User,
} from 'lucide-react';
import { AppShellHeader } from '../components/AppShellHeader';
import { AppSidebar } from '../components/AppSidebar';
import { AuthUser, apiFetch, getCurrentUser, notifyAuthUserChanged } from '../utils/api';
import { clearPageScrollLock } from '../utils/scrollLock';
import { compressAndResizeImage } from '../utils/imageUtils';
import { useDocumentsQuery } from '../hooks/useDocumentsQuery';

type ProfileTab = 'personal' | 'security' | 'account';

const passwordPolicyHint = '8+ characters with uppercase, lowercase, number, and symbol.';

function getPlanLabel(plan?: AuthUser['plan']) {
  if (plan === 'payg') return 'Pay As You Go';
  if (plan === 'monthly') return 'Monthly';
  if (plan === 'unlimited') return 'Admin';
  return 'Free';
}

function formatPlanExpiry(value?: string) {
  if (!value) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function formatRelativeTime(value?: string) {
  if (!value) return 'No activity';
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

export default function Profile() {
  const navigate = useNavigate();
  const {
    data: documentsData,
    isPending: documentsLoading,
    error: documentsError,
  } = useDocumentsQuery();
  const [user, setUser] = useState<AuthUser | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');
  const [form, setForm] = useState({
    displayName: '',
    profileImage: '',
    phone: '',
    address: '',
    dob: '',
    gender: '',
    nationality: '',
  });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userLoading, setUserLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const documents = documentsData?.documents ?? [];
  const isLoading = userLoading || documentsLoading;

  useEffect(() => {
    clearPageScrollLock();
    let ignore = false;

    async function loadProfile() {
      try {
        const currentUser = await getCurrentUser();

        if (ignore) return;
        setUser(currentUser);
        setForm({
          displayName: currentUser.displayName || '',
          profileImage: currentUser.profileImage || '',
          phone: currentUser.phone || '',
          address: currentUser.address || '',
          dob: currentUser.dob || '',
          gender: currentUser.gender || '',
          nationality: currentUser.nationality || '',
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not load profile.';
        toast.error(message);
      } finally {
        if (!ignore) setUserLoading(false);
      }
    }

    loadProfile();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!documentsError) return;
    toast.error(documentsError instanceof Error ? documentsError.message : 'Could not load profile.');
  }, [documentsError]);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const avatarInitial = (form.displayName || user?.displayName || 'U').trim().charAt(0).toUpperCase() || 'U';
  const templatesUsed = useMemo(() => new Set(documents.map((document) => document.template)).size, [documents]);
  const latestDocument = documents[0];
  const completedFields = [
    form.displayName,
    form.profileImage,
    form.phone,
    form.address,
    form.dob,
    form.gender,
    form.nationality,
    user?.email,
  ].filter(Boolean).length;
  const completion = Math.round((completedFields / 8) * 100);
  const planLabel = getPlanLabel(user?.plan);
  const planExpiry = user?.plan === 'free' || user?.plan === 'unlimited' ? null : formatPlanExpiry(user?.planExpiresAt);
  const planBadgeClass = user?.plan === 'free'
    ? 'text-slate-200 ring-white/10'
    : user?.plan === 'payg'
      ? 'text-emerald-100 ring-emerald-300/25'
      : 'text-violet-100 ring-violet-300/25';

  const uploadProfileImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Profile image must be smaller than 5 MB.');
      return;
    }

    try {
      const image = await compressAndResizeImage(file, 320, 320);
      updateField('profileImage', image);
      toast.success('Profile picture ready to save.');
    } catch {
      toast.error('Could not process this image.');
    } finally {
      event.target.value = '';
    }
  };

  const saveProfile = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setIsSaving(true);

    try {
      const data = await apiFetch<{ user: AuthUser }>('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      setUser(data.user);
      setForm((current) => ({ ...current, profileImage: data.user.profileImage || '' }));
      notifyAuthUserChanged(data.user);
      toast.success('Profile updated successfully.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update profile.';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const savePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
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
    <div className="account-page min-h-screen scheme-dark bg-slate-950 text-white">
      <AppShellHeader />
      <div className="lg:flex lg:h-dvh lg:overflow-hidden">
      <AppSidebar />
      <main className="scrollbar-hide mx-auto min-w-0 max-w-7xl flex-1 px-3 pb-28 pt-6 sm:px-6 sm:pb-32 sm:pt-8 lg:h-dvh lg:overflow-y-auto lg:px-8 lg:pb-10">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="wrap-break-word font-montserrat text-2xl font-black leading-tight min-[380px]:text-3xl sm:text-4xl">Personal details</h1>
            <p className="mt-2 text-sm font-semibold text-slate-400">
              Manage your profile information that will be used across your CVs.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:flex sm:flex-row">
            <Link
              to="/builder"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-extrabold text-slate-100 shadow-lg shadow-black/10 transition hover:bg-white/10 active:scale-[0.98]"
            >
              <ArrowLeft size={16} />
              Back to builder
            </Link>
            <button
              type="button"
              onClick={() => saveProfile()}
              disabled={isSaving || isLoading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-500 active:scale-[0.98] disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Save Changes
            </button>
          </div>
        </section>

        {isLoading ? (
          <div className="mt-10 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm font-bold text-slate-400">
            <Loader2 className="animate-spin text-violet-300" size={18} />
            Loading profile...
          </div>
        ) : (
          <>
            <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 sm:p-5">
              <div className="flex items-start gap-3 sm:items-center sm:gap-4">
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-xs font-black text-violet-100 ring-4 ring-violet-500/40 sm:h-16 sm:w-16 sm:text-sm">
                  {completion}%
                </div>
                <div className="min-w-0">
                  <h2 className="font-montserrat text-base font-black sm:text-lg">Profile {completion}% Complete</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-400">
                    Add phone number, address, and nationality to complete your profile.
                  </p>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-linear-to-r from-violet-500 via-fuchsia-500 to-emerald-400" style={{ width: `${completion}%` }} />
              </div>
            </section>

            <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
              <aside className="rounded-2xl border border-violet-400/20 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.22),rgba(255,255,255,0.035)_52%)] p-4 shadow-2xl shadow-violet-950/20 sm:p-5">
                <div className="flex flex-col items-center text-center">
                  <div className="relative">
                    <span className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-violet-700 text-4xl font-black text-white shadow-2xl shadow-violet-600/25 sm:h-28 sm:w-28 sm:text-5xl">
                      {form.profileImage ? (
                        <img src={form.profileImage} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        avatarInitial
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-slate-100 shadow-lg ring-4 ring-slate-950 transition hover:bg-violet-600"
                      aria-label="Change profile picture"
                    >
                      <Camera size={15} />
                    </button>
                  </div>
                  {form.profileImage && (
                    <button
                      type="button"
                      onClick={() => updateField('profileImage', '')}
                      className="mt-3 inline-flex items-center justify-center rounded-full bg-violet-500/15 px-3 py-1.5 text-xs font-black text-violet-200 ring-1 ring-violet-300/20 transition hover:bg-violet-500/25 active:scale-95"
                    >
                      Remove
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={uploadProfileImage} />
                  <h2 className="mt-5 max-w-full truncate font-montserrat text-xl font-black sm:text-2xl">{form.displayName || user?.displayName}</h2>
                  <p className="mt-1 max-w-full truncate text-sm font-semibold text-slate-400">{user?.email}</p>
                  <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-950/60 px-3 py-1.5 text-xs font-black ring-1 ${planBadgeClass}`}>
                    <Crown size={13} />
                    {planLabel} Plan
                  </span>
                  {planExpiry && (
                    <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-slate-400">
                      <Calendar size={13} />
                      Expires {planExpiry}
                    </span>
                  )}
                </div>

                <div className="my-6 h-px bg-white/10" />

                <div className="grid grid-cols-3 gap-1 text-center sm:gap-2">
                  <ProfileMiniStat icon={<FileText size={14} />} value={documents.length} label="CVs Created" />
                  <ProfileMiniStat icon={<BriefcaseBusiness size={14} />} value={templatesUsed} label="Templates Used" />
                  <ProfileMiniStat icon={<ClockIcon />} value={latestDocument ? formatRelativeTime(latestDocument.updatedAt) : 'Never'} label="Last Updated" />
                </div>

                <div className="mt-6 border-t border-white/10 pt-5">
                  <h3 className="font-montserrat text-sm font-black">Account Status</h3>
                  <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-300">
                    <StatusRow icon={<Mail size={15} />} label={user?.emailVerified ? 'Email Verified' : 'Email Not Verified'} ok={Boolean(user?.emailVerified)} />
                    <StatusRow icon={<CheckCircle2 size={15} />} label="Profile Saved" ok={completion > 35} />
                    <StatusRow icon={<Lock size={15} />} label="Data Secure" ok />
                  </div>
                </div>
              </aside>

              <section className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.035] p-3 shadow-2xl shadow-black/15 sm:p-5">
                <div className="-mx-1 flex gap-1 overflow-x-auto border-b border-white/10 px-1 pb-3 sm:gap-2">
                  <TabButton active={activeTab === 'personal'} onClick={() => setActiveTab('personal')} icon={<User size={15} />}>Personal Info</TabButton>
                  <TabButton active={activeTab === 'security'} onClick={() => setActiveTab('security')} icon={<Shield size={15} />}>Security</TabButton>
                  <TabButton active={activeTab === 'account'} onClick={() => setActiveTab('account')} icon={<KeyRound size={15} />}>Account</TabButton>
                </div>

                {activeTab === 'personal' && (
                  <form className="mt-5 grid gap-4 sm:mt-6 sm:grid-cols-2" onSubmit={saveProfile}>
                    <ProfileInput label="Full Name" required icon={<User size={16} />} value={form.displayName} onChange={(value) => updateField('displayName', value)} />
                    <ProfileInput label="Email Address" required icon={<Mail size={16} />} value={user?.email || ''} disabled onChange={() => undefined} />
                    <ProfileInput label="Phone Number" icon={<Phone size={16} />} value={form.phone} placeholder="+94 77 123 4567" onChange={(value) => updateField('phone', value)} />
                    <ProfileInput label="Date of Birth" icon={<Calendar size={16} />} value={form.dob} placeholder="1998-01-01" onChange={(value) => updateField('dob', value)} />
                    <ProfileSelect label="Gender" icon={<User size={16} />} value={form.gender} onChange={(value) => updateField('gender', value)} options={['Prefer not to say', 'Female', 'Male', 'Non-binary']} />
                    <ProfileInput label="Nationality" icon={<BriefcaseBusiness size={16} />} value={form.nationality} placeholder="Sri Lankan" onChange={(value) => updateField('nationality', value)} />
                    <label className="block sm:col-span-2">
                      <span className="mb-1.5 block text-xs font-extrabold text-slate-300">Address</span>
                      <span className="flex gap-3 rounded-xl border border-white/10 bg-slate-950 px-3 py-3 transition focus-within:border-violet-400">
                        <Home size={16} className="mt-1 shrink-0 text-slate-400" />
                        <textarea
                          value={form.address}
                          onChange={(event) => updateField('address', event.target.value)}
                          rows={3}
                          className="w-full resize-none bg-transparent text-base font-semibold text-white outline-none sm:text-sm"
                          placeholder="City, country"
                        />
                      </span>
                    </label>
                    <div className="border-t border-white/10 pt-4 sm:col-span-2">
                      <div className="flex items-start gap-2 text-xs font-semibold text-slate-400">
                        <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-300" />
                        <span>Last saved details are used across your account.</span>
                      </div>
                    </div>
                  </form>
                )}

                {activeTab === 'security' && (
                  <form className="mt-5 max-w-2xl space-y-4 sm:mt-6" onSubmit={savePassword}>
                    <div>
                      <h2 className="font-montserrat text-xl font-black">Password</h2>
                      <p className="mt-1 text-sm font-semibold text-slate-400">Use {passwordPolicyHint}</p>
                    </div>
                    {user?.authProvider === 'email' && (
                      <SecurityInput label="Current password" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
                    )}
                    <SecurityInput label="New password" value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
                    <SecurityInput label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
                    <button type="submit" disabled={isSavingPassword} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-violet-500 active:scale-[0.98] disabled:opacity-60 sm:w-auto">
                      {isSavingPassword ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                      Change Password
                    </button>
                  </form>
                )}

                {activeTab === 'account' && (
                  <div className="mt-6 grid gap-4 lg:grid-cols-2">
                    <section className="rounded-2xl border border-white/10 bg-slate-950/35 p-5">
                      <h2 className="font-montserrat text-xl font-black">Session</h2>
                      <p className="mt-1 text-sm font-semibold text-slate-400">Sign out from this browser.</p>
                      <button type="button" onClick={logout} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-white/10 active:scale-[0.98]">
                        <LogOut size={16} />
                        Logout
                      </button>
                    </section>
                    <section className="rounded-2xl border border-red-400/20 bg-red-500/6 p-5">
                      <h2 className="font-montserrat text-xl font-black">Danger zone</h2>
                      <p className="mt-1 text-sm font-semibold text-red-100/70">Delete your account and all saved CVs permanently.</p>
                      <button type="button" onClick={deleteAccount} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-extrabold text-red-100 transition hover:bg-red-500/20 active:scale-[0.98]">
                        <ShieldAlert size={16} />
                        Delete Account
                      </button>
                    </section>
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </main>
      </div>
    </div>
  );
}

function ClockIcon() {
  return <Calendar size={14} />;
}

function ProfileMiniStat({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
  return (
    <div className="min-w-0 border-r border-white/10 px-1 last:border-r-0">
      <div className="flex items-center justify-center gap-1.5 text-sm font-black text-slate-100">{icon}<span className="truncate">{value}</span></div>
      <div className="mt-1 text-[11px] font-semibold leading-4 text-slate-400">{label}</div>
    </div>
  );
}

function StatusRow({ icon, label, ok }: { icon: React.ReactNode; label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-400">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <CheckCircle2 size={15} className={ok ? 'text-emerald-300' : 'text-slate-600'} />
    </div>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-w-max items-center gap-2 border-b-2 px-4 py-2 text-sm font-extrabold transition ${
        active ? 'border-violet-400 text-violet-300' : 'border-transparent text-slate-400 hover:text-slate-200'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function ProfileInput({
  label,
  required,
  icon,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  required?: boolean;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-extrabold text-slate-300">{label} {required && <span className="text-red-300">*</span>}</span>
      <span className={`flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950 px-3 py-3 transition focus-within:border-violet-400 ${disabled ? 'opacity-80' : ''}`}>
        <span className="text-slate-400">{icon}</span>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="w-full bg-transparent text-base font-semibold text-white outline-none disabled:cursor-not-allowed sm:text-sm"
          placeholder={placeholder}
        />
      </span>
    </label>
  );
}

function ProfileSelect({ label, icon, value, onChange, options }: { label: string; icon: React.ReactNode; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-extrabold text-slate-300">{label}</span>
      <span className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950 px-3 py-3 transition focus-within:border-violet-400">
        <span className="text-slate-400">{icon}</span>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full bg-slate-950 text-base font-semibold text-white outline-none scheme-dark sm:text-sm"
        >
          <option value="" className="bg-slate-950 text-slate-400">Select {label}</option>
          {options.map((option) => (
            <option key={option} value={option} className="bg-slate-950 text-white">{option}</option>
          ))}
        </select>
      </span>
    </label>
  );
}

function SecurityInput({ label, value, onChange, autoComplete }: { label: string; value: string; onChange: (value: string) => void; autoComplete: string }) {
  const [showPassword, setShowPassword] = useState(false);
  
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-extrabold text-slate-300">{label}</span>
      <span className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950 px-3 py-3 transition focus-within:border-violet-400">
        <KeyRound size={16} className="text-slate-400" />
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full bg-transparent text-base sm:text-sm font-semibold text-white outline-none [&::-ms-reveal]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
          autoComplete={autoComplete}
          placeholder={label}
          minLength={label === 'Current password' ? undefined : 8}
        />
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/8 hover:text-slate-200"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </span>
    </label>
  );
}
