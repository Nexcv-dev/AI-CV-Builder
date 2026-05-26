import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Save, XCircle } from 'lucide-react';
import type { AdminSettingsSummary, AdminTemplateItem } from './adminTypes';
import type { CmsContent, CmsFaqItem, CmsLegalPage, CmsPlanCopy } from '../../contentDefaults';

export default function SettingsManagementSection({
  settings,
  loading,
  saving,
  canUpdateSettings,
  templates,
  onSave,
  mode = 'settings',
}: {
  settings: AdminSettingsSummary | null;
  loading: boolean;
  saving: boolean;
  canUpdateSettings: boolean;
  templates: AdminTemplateItem[];
  onSave: (settings: AdminSettingsSummary['app']) => void;
  mode?: 'settings' | 'cms';
}) {
  const [draft, setDraft] = useState<AdminSettingsSummary['app'] | null>(settings?.app || null);

  useEffect(() => {
    setDraft(settings?.app || null);
  }, [settings]);

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

  if (mode === 'cms') {
    return (
      <section className="mt-6">
        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-montserrat text-lg font-black">CMS Content</h2>
              <p className="mt-1 text-sm font-semibold text-slate-400">Landing page sections, FAQs, pricing copy, legal pages, and announcement content.</p>
            </div>
            <button
              type="button"
              onClick={() => onSave(draft)}
              disabled={!canUpdateSettings || !hasChanges || saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
            >
              {saving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
              Save CMS
            </button>
          </div>
          <CmsContentEditor
            content={draft.cmsContent}
            disabled={!canUpdateSettings}
            onChange={(cmsContent) => updateDraft('cmsContent', cmsContent)}
          />
        </article>
      </section>
    );
  }

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
            {settings.services.map((service) => {
              const isOk = service.status === 'ok';
              const isWarn = service.status === 'warn';
              const tone = isOk ? 'text-emerald-300' : isWarn ? 'text-amber-300' : 'text-red-300';
              const label = isOk ? 'Ready' : isWarn ? 'Needs review' : 'Missing or down';
              return (
              <div key={service.key} className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-3">
                {isOk ? <CheckCircle2 className="mt-0.5 text-emerald-300" size={19} /> : isWarn ? <AlertCircle className="mt-0.5 text-amber-300" size={19} /> : <XCircle className="mt-0.5 text-red-300" size={19} />}
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-100">{service.label}</p>
                  <p className={`mt-0.5 text-xs font-bold ${tone}`}>
                    {label}
                  </p>
                  <p className="mt-1 break-words text-xs font-semibold leading-5 text-slate-500">{service.detail}</p>
                </div>
              </div>
            );
            })}
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
            <InfoRow label="Admin IP Allowlist" value={settings.security.adminIpAllowlistConfigured ? 'Configured' : 'Not configured'} />
            <InfoRow label="PayHere Notify URL" value={settings.security.payhereNotifyUrlConfigured ? 'Configured' : 'Missing'} />
            <InfoRow label="PDF Lambda" value={settings.security.pdfLambdaConfigured ? 'Configured' : 'Fallback only'} />
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

function CmsContentEditor({ content, disabled, onChange }: { content: CmsContent; disabled: boolean; onChange: (content: CmsContent) => void }) {
  const updateContent = (patch: Partial<CmsContent>) => onChange({ ...content, ...patch });
  const updateLanding = <K extends keyof CmsContent['landing']>(key: K, value: CmsContent['landing'][K]) => {
    updateContent({ landing: { ...content.landing, [key]: value } });
  };
  const updateAnnouncement = <K extends keyof CmsContent['announcement']>(key: K, value: CmsContent['announcement'][K]) => {
    updateContent({ announcement: { ...content.announcement, [key]: value } });
  };
  const updatePlan = (key: CmsPlanCopy['key'], patch: Partial<CmsPlanCopy>) => {
    updateContent({
      pricingPlans: content.pricingPlans.map((plan) => plan.key === key ? { ...plan, ...patch } : plan),
    });
  };
  const updateFeatureTile = (index: number, patch: Partial<CmsContent['featureTiles'][number]>) => {
    updateContent({
      featureTiles: content.featureTiles.map((tile, tileIndex) => tileIndex === index ? { ...tile, ...patch } : tile),
    });
  };
  const updateFaq = (index: number, patch: Partial<CmsFaqItem>) => {
    updateContent({
      faqs: content.faqs.map((faq, faqIndex) => faqIndex === index ? { ...faq, ...patch } : faq),
    });
  };
  const updateLegalPage = (key: keyof CmsContent['legal'], page: CmsLegalPage) => {
    updateContent({ legal: { ...content.legal, [key]: page } });
  };

  return (
    <div className="mt-5 grid gap-5">
      <div className="grid gap-4 rounded-xl border border-white/10 bg-slate-950/40 p-4">
        <h3 className="font-montserrat text-sm font-black text-slate-100">Announcement</h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <ToggleRow
            label="CMS announcement"
            description="Show the CMS-managed banner on public pages."
            checked={content.announcement.enabled}
            disabled={disabled}
            onChange={(value) => updateAnnouncement('enabled', value)}
          />
          <Field label="Announcement text">
            <input value={content.announcement.text} disabled={disabled} onChange={(event) => updateAnnouncement('text', event.target.value)} className={inputClass} />
          </Field>
          <Field label="Link label">
            <input value={content.announcement.linkLabel} disabled={disabled} onChange={(event) => updateAnnouncement('linkLabel', event.target.value)} className={inputClass} />
          </Field>
          <Field label="Link URL">
            <input value={content.announcement.linkHref} disabled={disabled} onChange={(event) => updateAnnouncement('linkHref', event.target.value)} className={inputClass} />
          </Field>
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border border-white/10 bg-slate-950/40 p-4">
        <h3 className="font-montserrat text-sm font-black text-slate-100">Landing Page Sections</h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Hero eyebrow"><input value={content.landing.heroEyebrow} disabled={disabled} onChange={(event) => updateLanding('heroEyebrow', event.target.value)} className={inputClass} /></Field>
          <Field label="Hero title"><input value={content.landing.heroTitle} disabled={disabled} onChange={(event) => updateLanding('heroTitle', event.target.value)} className={inputClass} /></Field>
          <Field label="Hero accent"><input value={content.landing.heroAccent} disabled={disabled} onChange={(event) => updateLanding('heroAccent', event.target.value)} className={inputClass} /></Field>
          <Field label="Hero description"><textarea value={content.landing.heroDescription} disabled={disabled} onChange={(event) => updateLanding('heroDescription', event.target.value)} className={`${inputClass} min-h-24 py-3`} /></Field>
          <Field label="Primary CTA"><input value={content.landing.primaryCta} disabled={disabled} onChange={(event) => updateLanding('primaryCta', event.target.value)} className={inputClass} /></Field>
          <Field label="Secondary CTA"><input value={content.landing.secondaryCta} disabled={disabled} onChange={(event) => updateLanding('secondaryCta', event.target.value)} className={inputClass} /></Field>
          <Field label="Stats title"><input value={content.landing.statsTitle} disabled={disabled} onChange={(event) => updateLanding('statsTitle', event.target.value)} className={inputClass} /></Field>
          <Field label="Features title"><input value={content.landing.featuresTitle} disabled={disabled} onChange={(event) => updateLanding('featuresTitle', event.target.value)} className={inputClass} /></Field>
          <Field label="Templates title"><input value={content.landing.templatesTitle} disabled={disabled} onChange={(event) => updateLanding('templatesTitle', event.target.value)} className={inputClass} /></Field>
          <Field label="Templates description"><textarea value={content.landing.templatesDescription} disabled={disabled} onChange={(event) => updateLanding('templatesDescription', event.target.value)} className={`${inputClass} min-h-24 py-3`} /></Field>
          <Field label="Pricing title"><input value={content.landing.pricingTitle} disabled={disabled} onChange={(event) => updateLanding('pricingTitle', event.target.value)} className={inputClass} /></Field>
          <Field label="FAQ title"><input value={content.landing.faqTitle} disabled={disabled} onChange={(event) => updateLanding('faqTitle', event.target.value)} className={inputClass} /></Field>
          <Field label="FAQ description"><textarea value={content.landing.faqDescription} disabled={disabled} onChange={(event) => updateLanding('faqDescription', event.target.value)} className={`${inputClass} min-h-24 py-3`} /></Field>
          <Field label="Testimonials title"><input value={content.landing.testimonialsTitle} disabled={disabled} onChange={(event) => updateLanding('testimonialsTitle', event.target.value)} className={inputClass} /></Field>
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border border-white/10 bg-slate-950/40 p-4">
        <h3 className="font-montserrat text-sm font-black text-slate-100">Feature Tiles</h3>
        <div className="grid gap-3 lg:grid-cols-2">
          {content.featureTiles.map((tile, index) => (
            <div key={index} className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-3">
              <Field label={`Tile ${index + 1} title`}>
                <input value={tile.title} disabled={disabled} onChange={(event) => updateFeatureTile(index, { title: event.target.value })} className={inputClass} />
              </Field>
              <Field label="Tile copy">
                <textarea value={tile.text} disabled={disabled} onChange={(event) => updateFeatureTile(index, { text: event.target.value })} className={`${inputClass} min-h-20 py-3`} />
              </Field>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border border-white/10 bg-slate-950/40 p-4">
        <h3 className="font-montserrat text-sm font-black text-slate-100">Pricing Copy</h3>
        <div className="grid gap-4 lg:grid-cols-3">
          {content.pricingPlans.map((plan) => (
            <div key={plan.key} className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-3">
              <h4 className="text-sm font-black text-slate-200">{plan.name}</h4>
              <Field label="Name"><input value={plan.name} disabled={disabled} onChange={(event) => updatePlan(plan.key, { name: event.target.value })} className={inputClass} /></Field>
              <Field label="Fallback price"><input value={plan.price} disabled={disabled} onChange={(event) => updatePlan(plan.key, { price: event.target.value })} className={inputClass} /></Field>
              <Field label="Duration"><input value={plan.duration} disabled={disabled} onChange={(event) => updatePlan(plan.key, { duration: event.target.value })} className={inputClass} /></Field>
              <Field label="Description"><textarea value={plan.description} disabled={disabled} onChange={(event) => updatePlan(plan.key, { description: event.target.value })} className={`${inputClass} min-h-24 py-3`} /></Field>
              <Field label="CTA"><input value={plan.cta} disabled={disabled} onChange={(event) => updatePlan(plan.key, { cta: event.target.value })} className={inputClass} /></Field>
              <Field label="Badge"><input value={plan.badge} disabled={disabled} onChange={(event) => updatePlan(plan.key, { badge: event.target.value })} className={inputClass} /></Field>
              <Field label="Features">
                <textarea value={plan.features.join('\n')} disabled={disabled} onChange={(event) => updatePlan(plan.key, { features: event.target.value.split('\n') })} className={`${inputClass} min-h-36 py-3`} />
              </Field>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border border-white/10 bg-slate-950/40 p-4">
        <h3 className="font-montserrat text-sm font-black text-slate-100">FAQs</h3>
        <div className="grid gap-3">
          {content.faqs.map((faq, index) => (
            <div key={index} className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-3 lg:grid-cols-[1fr_1.4fr]">
              <Field label={`Question ${index + 1}`}><input value={faq.question} disabled={disabled} onChange={(event) => updateFaq(index, { question: event.target.value })} className={inputClass} /></Field>
              <Field label="Answer"><textarea value={faq.answer} disabled={disabled} onChange={(event) => updateFaq(index, { answer: event.target.value })} className={`${inputClass} min-h-24 py-3`} /></Field>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border border-white/10 bg-slate-950/40 p-4">
        <h3 className="font-montserrat text-sm font-black text-slate-100">Legal Pages</h3>
        <div className="grid gap-4">
          {(['privacy', 'terms', 'refund'] as const).map((key) => (
            <LegalPageEditor
              key={key}
              label={key === 'privacy' ? 'Privacy Policy' : key === 'terms' ? 'Terms and Conditions' : 'Refund Policy'}
              page={content.legal[key]}
              disabled={disabled}
              onChange={(page) => updateLegalPage(key, page)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function LegalPageEditor({ label, page, disabled, onChange }: { label: string; page: CmsLegalPage; disabled: boolean; onChange: (page: CmsLegalPage) => void }) {
  const updateSection = (index: number, patch: Partial<CmsLegalPage['sections'][number]>) => {
    onChange({
      ...page,
      sections: page.sections.map((section, sectionIndex) => sectionIndex === index ? { ...section, ...patch } : section),
    });
  };

  return (
    <div className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-3">
      <h4 className="text-sm font-black text-slate-200">{label}</h4>
      <div className="grid gap-3 lg:grid-cols-2">
        <Field label="Page title"><input value={page.title} disabled={disabled} onChange={(event) => onChange({ ...page, title: event.target.value })} className={inputClass} /></Field>
        <Field label="Last updated"><input value={page.lastUpdated} disabled={disabled} onChange={(event) => onChange({ ...page, lastUpdated: event.target.value })} className={inputClass} placeholder="Leave blank to use today's date" /></Field>
      </div>
      {page.sections.map((section, index) => (
        <div key={index} className="grid gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-3">
          <Field label={`Section ${index + 1} heading`}><input value={section.heading} disabled={disabled} onChange={(event) => updateSection(index, { heading: event.target.value })} className={inputClass} /></Field>
          <Field label="Body"><textarea value={section.body} disabled={disabled} onChange={(event) => updateSection(index, { body: event.target.value })} className={`${inputClass} min-h-24 py-3`} /></Field>
          <Field label="Bullets">
            <textarea value={(section.bullets || []).join('\n')} disabled={disabled} onChange={(event) => updateSection(index, { bullets: event.target.value.split('\n') })} className={`${inputClass} min-h-20 py-3`} />
          </Field>
        </div>
      ))}
    </div>
  );
}
