import React, { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Camera, Loader2, Mail, MapPin, Phone, Save, User, X } from 'lucide-react';
import { AppShellHeader } from '../components/AppShellHeader';
import { AuthUser, apiFetch, getCurrentUser, notifyAuthUserChanged } from '../utils/api';
import { clearPageScrollLock } from '../utils/scrollLock';
import { compressAndResizeImage } from '../utils/imageUtils';

export default function Profile() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    displayName: '',
    profileImage: '',
    phone: '',
    address: '',
    dob: '',
    gender: '',
    nationality: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    clearPageScrollLock();
    let ignore = false;

    getCurrentUser()
      .then((currentUser) => {
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
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Could not load profile.';
        toast.error(message);
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const avatarInitial = (form.displayName || user?.displayName || 'U').trim().charAt(0).toUpperCase() || 'U';

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

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const data = await apiFetch<{ user: AuthUser }>('/api/auth/profile', {
          method: 'PATCH',
          body: JSON.stringify(form),
      });
      setUser(data.user);
      setForm((current) => ({ ...current, profileImage: data.user.profileImage || '' }));
      notifyAuthUserChanged(data.user);
      toast.success('Profile details updated.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update profile.';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="account-page min-h-screen bg-slate-950 text-white">
      <AppShellHeader />
      <main className="mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6 sm:pt-12 lg:px-8 lg:pt-14">
        <div className="flex flex-row items-start justify-between gap-3 border-b border-white/10 pb-6 sm:gap-5 sm:pb-8">
          <Link
            to="/builder"
            className="order-last -mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-2 text-[10px] font-black uppercase tracking-wider text-slate-100 shadow-lg shadow-black/20 transition hover:bg-white/15 hover:text-white active:scale-[0.98] sm:mt-0 sm:px-3.5 sm:py-2.5 sm:text-sm sm:normal-case sm:tracking-normal"
          >
            <ArrowLeft size={14} />
            Back to builder
          </Link>
          <div className="min-w-0 flex-1 pt-3 sm:pt-0">
            <p className="text-sm font-black uppercase text-emerald-300">Profile</p>
            <h1 className="mt-2 break-words font-montserrat text-2xl font-black leading-tight min-[390px]:text-3xl sm:text-5xl">Personal details</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-400">
              Keep your account profile details ready for saved CVs and future workspace features.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-12 flex items-center gap-3 text-sm font-bold text-slate-400">
            <Loader2 className="animate-spin" size={18} />
            Loading profile...
          </div>
        ) : (
          <div className="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <aside className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300 ring-1 ring-violet-400/20 sm:h-16 sm:w-16">
                  {form.profileImage ? (
                    <img src={form.profileImage} alt="" className="h-full w-full rounded-2xl object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="font-montserrat text-2xl font-black text-violet-200">{avatarInitial}</span>
                  )}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate font-montserrat text-2xl font-black">{user?.displayName}</h2>
                  <p className="truncate text-sm font-semibold text-slate-400">{user?.email}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-2.5 sm:mt-6 sm:gap-3">
                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-violet-500/10 text-violet-200 ring-1 ring-violet-400/20">
                      {form.profileImage ? (
                        <img src={form.profileImage} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="font-montserrat text-lg font-black">{avatarInitial}</span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black uppercase text-slate-500">Profile picture</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-extrabold text-white transition hover:bg-violet-500"
                        >
                          <Camera size={14} />
                          Change
                        </button>
                        {form.profileImage && (
                          <button
                            type="button"
                            onClick={() => updateField('profileImage', '')}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-extrabold text-red-200 transition hover:bg-red-500/20"
                          >
                            <X size={14} />
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={uploadProfileImage} />
                </div>
                <div className="flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2.5 text-sm font-semibold text-slate-300 sm:px-4 sm:py-3">
                  <Mail size={16} className="text-emerald-300" />
                  <span className="truncate">{user?.email}</span>
                </div>
                <div className="flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2.5 text-sm font-semibold text-slate-300 sm:px-4 sm:py-3">
                  <Phone size={16} className="text-emerald-300" />
                  <span className="truncate">{form.phone || 'No phone added'}</span>
                </div>
                <div className="flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2.5 text-sm font-semibold text-slate-300 sm:px-4 sm:py-3">
                  <MapPin size={16} className="text-emerald-300" />
                  <span className="truncate">{form.address || 'No address added'}</span>
                </div>
              </div>
            </aside>

            <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-6">
              <div className="mb-6">
                <h2 className="font-montserrat text-xl font-black">Edit details</h2>
                <p className="mt-1 text-sm font-semibold text-slate-400">These details are private to your account.</p>
              </div>

              <form className="grid gap-4 sm:grid-cols-2" onSubmit={saveProfile}>
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-extrabold uppercase text-slate-400">Full name</span>
                  <input value={form.displayName} onChange={(event) => updateField('displayName', event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-base font-semibold text-white outline-none transition hover:border-white/20 focus:border-violet-400 sm:text-sm" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-extrabold uppercase text-slate-400">Phone</span>
                  <input value={form.phone} onChange={(event) => updateField('phone', event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-base font-semibold text-white outline-none transition hover:border-white/20 focus:border-violet-400 sm:text-sm" placeholder="+94 77 123 4567" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-extrabold uppercase text-slate-400">Date of birth</span>
                  <input value={form.dob} onChange={(event) => updateField('dob', event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-base font-semibold text-white outline-none transition hover:border-white/20 focus:border-violet-400 sm:text-sm" placeholder="1998-01-01" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-extrabold uppercase text-slate-400">Gender</span>
                  <input value={form.gender} onChange={(event) => updateField('gender', event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-base font-semibold text-white outline-none transition hover:border-white/20 focus:border-violet-400 sm:text-sm" placeholder="Optional" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-extrabold uppercase text-slate-400">Nationality</span>
                  <input value={form.nationality} onChange={(event) => updateField('nationality', event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-base font-semibold text-white outline-none transition hover:border-white/20 focus:border-violet-400 sm:text-sm" placeholder="Sri Lankan" />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-extrabold uppercase text-slate-400">Address</span>
                  <textarea value={form.address} onChange={(event) => updateField('address', event.target.value)} rows={3} className="w-full resize-none rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-base font-semibold text-white outline-none transition hover:border-white/20 focus:border-violet-400 sm:text-sm" placeholder="City, country" />
                </label>

                <div className="sm:col-span-2">
                  <button type="submit" disabled={isSaving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-violet-500 active:scale-[0.98] disabled:opacity-60 sm:w-auto">
                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    Save Details
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

      </main>
    </div>
  );
}
