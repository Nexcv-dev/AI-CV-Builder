import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Save, Send, XCircle } from 'lucide-react';
import type { EmailTemplateKey, EmailTemplateMap } from '../../emailTemplateDefaults';
import type { AdminSettingsSummary } from './adminTypes';

const templateOrder: EmailTemplateKey[] = ['verification', 'passwordReset', 'supportReply', 'paymentReceipt', 'maintenanceNotice'];

export default function EmailManagementSection({
  settings,
  loading,
  saving,
  sendingTestEmail,
  canUpdateEmail,
  onSave,
  onSendTestEmail,
}: {
  settings: AdminSettingsSummary | null;
  loading: boolean;
  saving: boolean;
  sendingTestEmail: boolean;
  canUpdateEmail: boolean;
  onSave: (settings: AdminSettingsSummary['app']) => void;
  onSendTestEmail: (recipient: string) => void;
}) {
  const [draft, setDraft] = useState<EmailTemplateMap | null>(settings?.app.emailTemplates || null);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');

  useEffect(() => {
    setDraft(settings?.app.emailTemplates || null);
  }, [settings?.app.emailTemplates]);

  useEffect(() => {
    if (!settings?.email) return;
    setTestEmailRecipient(settings.email.adminNotificationEmail || settings.email.supportEmail || '');
  }, [settings?.email]);

  const hasChanges = useMemo(() => JSON.stringify(draft) !== JSON.stringify(settings?.app.emailTemplates || null), [draft, settings?.app.emailTemplates]);

  if (loading) {
    return (
      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm font-bold text-slate-400">
        <Loader2 className="animate-spin text-violet-300" size={18} />
        Loading email settings...
      </div>
    );
  }

  if (!settings || !draft) {
    return (
      <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-5 text-sm font-bold text-red-100">
        Email settings could not be loaded.
      </div>
    );
  }

  const updateTemplate = (key: EmailTemplateKey, patch: Partial<EmailTemplateMap[EmailTemplateKey]>) => {
    setDraft((current) => current ? { ...current, [key]: { ...current[key], ...patch } } : current);
  };

  const saveTemplates = () => {
    onSave({ ...settings.app, emailTemplates: draft });
  };

  return (
    <section className="mt-6 grid gap-4">
      <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-montserrat text-lg font-black">Email Service</h2>
            <p className="mt-1 text-sm font-semibold text-slate-400">Environment-based provider status and delivery test.</p>
          </div>
          <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ring-1 ${
            settings.email.configured
              ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-300/20'
              : 'bg-red-400/10 text-red-300 ring-red-300/20'
          }`}>
            {settings.email.configured ? 'Ready' : 'Not configured'}
          </span>
        </div>

        <div className="mt-5 grid gap-4">
          <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <InfoRow label="Provider" value={settings.email.provider} />
            <InfoRow label="From" value={settings.email.from || 'Missing'} />
            <InfoRow label="Support Email" value={settings.email.supportEmail || 'Missing'} />
            <InfoRow label="Admin Notifications" value={settings.email.adminNotificationEmail || 'Missing'} />
            <InfoRow label="SMTP Host" value={settings.email.smtpHost || 'Default'} />
            <InfoRow label="SMTP Port" value={settings.email.smtpPort || 'Default'} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {settings.email.checks.map((check) => (
              <div key={check.key} className="flex min-h-20 items-center gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-3">
                {check.configured ? <CheckCircle2 className="shrink-0 text-emerald-300" size={18} /> : <XCircle className="shrink-0 text-red-300" size={18} />}
                <div className="min-w-0">
                  <p className="break-words text-sm font-black leading-5 text-slate-100">{check.label}</p>
                  <p className={`mt-0.5 text-xs font-bold ${check.configured ? 'text-emerald-300' : 'text-red-300'}`}>
                    {check.configured ? 'Configured' : 'Missing'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-3 sm:grid-cols-[1fr_auto]">
            <Field label="Test recipient">
              <input
                type="email"
                value={testEmailRecipient}
                onChange={(event) => setTestEmailRecipient(event.target.value)}
                className={inputClass}
                placeholder="you@example.com"
              />
            </Field>
            <button
              type="button"
              onClick={() => onSendTestEmail(testEmailRecipient)}
              disabled={!canUpdateEmail || sendingTestEmail || !settings.email.configured}
              className="inline-flex min-h-11 items-center justify-center gap-2 self-end rounded-xl bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 sm:min-w-44"
            >
              {sendingTestEmail ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
              Send test
            </button>
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-montserrat text-lg font-black">Email Templates</h2>
            <p className="mt-1 text-sm font-semibold text-slate-400">Manage transactional copy for verification, reset links, support, receipts, and maintenance notices.</p>
          </div>
          <button
            type="button"
            onClick={saveTemplates}
            disabled={!canUpdateEmail || !hasChanges || saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
          >
            {saving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
            Save templates
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          {templateOrder.map((key) => {
            const template = draft[key];
            return (
              <div key={key} className="grid gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-montserrat text-base font-black text-slate-100">{template.label}</h3>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{template.description}</p>
                  </div>
                  <span className="w-fit rounded-full bg-white/[0.06] px-3 py-1 text-[11px] font-black uppercase text-slate-400 ring-1 ring-white/10">
                    {template.variables.map((item) => `{{${item}}}`).join(' ')}
                  </span>
                </div>
                <Field label="Subject">
                  <input
                    value={template.subject}
                    disabled={!canUpdateEmail}
                    onChange={(event) => updateTemplate(key, { subject: event.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Body">
                  <textarea
                    value={template.body}
                    disabled={!canUpdateEmail}
                    onChange={(event) => updateTemplate(key, { body: event.target.value })}
                    className={`${inputClass} min-h-56 py-3 font-mono text-xs leading-5`}
                  />
                </Field>
              </div>
            );
          })}
        </div>
      </article>
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-20 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-3">
      <p className="text-[11px] font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-extrabold leading-5 text-slate-100">{value}</p>
    </div>
  );
}
