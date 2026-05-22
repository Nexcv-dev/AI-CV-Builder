import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Save, XCircle } from 'lucide-react';
import type { AdminSettingsSummary, AdminTemplateItem } from './adminTypes';

export default function SettingsManagementSection({
  settings,
  loading,
  saving,
  sendingTestEmail,
  canUpdateSettings,
  templates,
  onSave,
  onSendTestEmail,
}: {
  settings: AdminSettingsSummary | null;
  loading: boolean;
  saving: boolean;
  sendingTestEmail: boolean;
  canUpdateSettings: boolean;
  templates: AdminTemplateItem[];
  onSave: (settings: AdminSettingsSummary['app']) => void;
  onSendTestEmail: (recipient: string) => void;
}) {
  const [draft, setDraft] = useState<AdminSettingsSummary['app'] | null>(settings?.app || null);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');

  useEffect(() => {
    setDraft(settings?.app || null);
  }, [settings]);

  useEffect(() => {
    if (!settings?.email) return;
    setTestEmailRecipient(settings.email.adminNotificationEmail || settings.email.supportEmail || '');
  }, [settings?.email]);

  const hasChanges = useMemo(() => JSON.stringify(draft) !== JSON.stringify(settings?.app || null), [draft, settings]);

  if (loading) {
    return (
      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm font-bold text-slate-400">
        <Loader2 className="animate-spin text-violet-300" size={18} />
        Loading settings...
      </div>
    );
  }

  if (!settings || !draft) {
    return (
      <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-5 text-sm font-bold text-red-100">
        Settings could not be loaded.
      </div>
    );
  }

  const updateDraft = <K extends keyof AdminSettingsSummary['app']>(key: K, value: AdminSettingsSummary['app'][K]) => {
    setDraft((current) => current ? { ...current, [key]: value } : current);
  };

  return (
    <section className="mt-6 grid gap-4 xl:grid-cols-[1fr_380px]">
      <div className="grid gap-4">
        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-montserrat text-lg font-black">App Controls</h2>
              <p className="mt-1 text-sm font-semibold text-slate-400">Operational settings that change live app behavior.</p>
            </div>
            <button
              type="button"
              onClick={() => onSave(draft)}
              disabled={!canUpdateSettings || !hasChanges || saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
            >
              {saving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
              Save
            </button>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <ToggleRow
              label="Maintenance mode"
              description="Flag the app as temporarily unavailable for launch operations."
              checked={draft.maintenanceMode}
              disabled={!canUpdateSettings}
              onChange={(value) => updateDraft('maintenanceMode', value)}
            />
            <ToggleRow
              label="Email verification"
              description="Require verified email before CV saves and paid checkout."
              checked={draft.emailVerificationRequired}
              disabled={!canUpdateSettings}
              onChange={(value) => updateDraft('emailVerificationRequired', value)}
            />
            <ToggleRow
              label="PayHere checkout"
              description="Enable or pause paid plan checkout without changing code."
              checked={draft.payhereEnabled}
              disabled={!canUpdateSettings}
              onChange={(value) => updateDraft('payhereEnabled', value)}
            />
            <ToggleRow
              label="Site announcement"
              description="Prepare a public banner message for the next CMS pass."
              checked={draft.announcementEnabled}
              disabled={!canUpdateSettings}
              onChange={(value) => updateDraft('announcementEnabled', value)}
            />
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 sm:p-5">
          <h2 className="font-montserrat text-lg font-black">Launch Settings</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <Field label="Free CV save limit">
              <input
                type="number"
                min={0}
                max={100}
                value={draft.freeCvCreationLimit}
                disabled={!canUpdateSettings}
                onChange={(event) => updateDraft('freeCvCreationLimit', Number(event.target.value))}
                className={inputClass}
              />
            </Field>
            <Field label="Free PDF download limit">
              <input
                type="number"
                min={0}
                max={100}
                value={draft.freePdfDownloadLimit}
                disabled={!canUpdateSettings}
                onChange={(event) => updateDraft('freePdfDownloadLimit', Number(event.target.value))}
                className={inputClass}
              />
            </Field>
            <Field label="Support email">
              <input
                type="email"
                value={draft.supportEmail}
                disabled={!canUpdateSettings}
                onChange={(event) => updateDraft('supportEmail', event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="PayHere mode label">
              <select
                value={draft.payhereModeLabel}
                disabled={!canUpdateSettings}
                onChange={(event) => updateDraft('payhereModeLabel', event.target.value as 'sandbox' | 'live')}
                className={inputClass}
              >
                <option value="sandbox">Sandbox</option>
                <option value="live">Live</option>
              </select>
            </Field>
            <Field label="Default template">
              <select
                value={draft.defaultTemplateKey}
                disabled={!canUpdateSettings}
                onChange={(event) => updateDraft('defaultTemplateKey', event.target.value)}
                className={inputClass}
              >
                {templates.length === 0 && <option value={draft.defaultTemplateKey}>{draft.defaultTemplateKey}</option>}
                {templates.map((template) => (
                  <option key={template.key} value={template.key}>{template.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Announcement text">
              <input
                value={draft.announcementText}
                maxLength={180}
                disabled={!canUpdateSettings}
                onChange={(event) => updateDraft('announcementText', event.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 sm:p-5">
          <h2 className="font-montserrat text-lg font-black">Service Readiness</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {settings.services.map((service) => (
              <div key={service.key} className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-3">
                {service.configured ? <CheckCircle2 className="text-emerald-300" size={19} /> : <XCircle className="text-red-300" size={19} />}
                <div>
                  <p className="text-sm font-black text-slate-100">{service.label}</p>
                  <p className={`mt-0.5 text-xs font-bold ${service.configured ? 'text-emerald-300' : 'text-red-300'}`}>
                    {service.configured ? 'Configured' : 'Missing config'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-montserrat text-lg font-black">Email Service</h2>
              <p className="mt-1 text-sm font-semibold text-slate-400">Environment-based email status and delivery test.</p>
            </div>
            <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ring-1 ${
              settings.email.configured
                ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-300/20'
                : 'bg-red-400/10 text-red-300 ring-red-300/20'
            }`}>
              {settings.email.configured ? 'Ready' : 'Not configured'}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <InfoRow label="Provider" value={settings.email.provider} />
            <InfoRow label="From" value={settings.email.from || 'Missing'} />
            <InfoRow label="Support Email" value={settings.email.supportEmail || 'Missing'} />
            <InfoRow label="Admin Notifications" value={settings.email.adminNotificationEmail || 'Missing'} />
            <InfoRow label="SMTP Host" value={settings.email.smtpHost || 'Default'} />
            <InfoRow label="SMTP Port" value={settings.email.smtpPort || 'Default'} />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {settings.email.checks.map((check) => (
              <div key={check.key} className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-3">
                {check.configured ? <CheckCircle2 className="text-emerald-300" size={18} /> : <XCircle className="text-red-300" size={18} />}
                <div>
                  <p className="text-sm font-black text-slate-100">{check.label}</p>
                  <p className={`mt-0.5 text-xs font-bold ${check.configured ? 'text-emerald-300' : 'text-red-300'}`}>
                    {check.configured ? 'Configured' : 'Missing'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-3 sm:grid-cols-[1fr_auto]">
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase text-slate-500">Test recipient</span>
              <input
                type="email"
                value={testEmailRecipient}
                onChange={(event) => setTestEmailRecipient(event.target.value)}
                className={inputClass}
                placeholder="you@example.com"
              />
            </label>
            <button
              type="button"
              onClick={() => onSendTestEmail(testEmailRecipient)}
              disabled={!canUpdateSettings || sendingTestEmail || !settings.email.configured}
              className="inline-flex min-h-11 items-center justify-center gap-2 self-end rounded-xl bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
            >
              {sendingTestEmail ? <Loader2 className="animate-spin" size={17} /> : null}
              Send test
            </button>
          </div>
        </article>
      </div>

      <aside className="grid content-start gap-4">
        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10">
          <h2 className="font-montserrat text-lg font-black">Runtime</h2>
          <div className="mt-4 grid gap-3">
            <InfoRow label="Environment" value={settings.environment} />
            <InfoRow label="API Port" value={settings.port} />
            <InfoRow label="Frontend Origin" value={settings.origins.frontend || 'Default'} />
            <InfoRow label="API Origin" value={settings.origins.api || 'Default'} />
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10">
          <h2 className="font-montserrat text-lg font-black">Security</h2>
          <div className="mt-4 grid gap-3">
            <InfoRow label="Session Secret" value={settings.security.sessionSecretConfigured ? 'Configured' : 'Missing'} />
            <InfoRow label="Allowlisted Admins" value={String(settings.security.superAdminAllowlistCount)} />
            <InfoRow label="Settings Access" value={canUpdateSettings ? 'Editable' : 'Read only'} />
          </div>
        </article>
      </aside>
    </section>
  );
}

const inputClass = 'min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm font-bold text-slate-100 outline-none transition focus:border-violet-400 disabled:cursor-not-allowed disabled:text-slate-500';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black uppercase text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function ToggleRow({ label, description, checked, disabled, onChange }: { label: string; description: string; checked: boolean; disabled: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex min-h-24 items-center justify-between gap-4 rounded-xl border border-white/10 bg-slate-950/40 p-4">
      <span>
        <span className="block text-sm font-black text-slate-100">{label}</span>
        <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 shrink-0 accent-violet-500 disabled:cursor-not-allowed"
      />
    </label>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-slate-100">{value}</p>
    </div>
  );
}
