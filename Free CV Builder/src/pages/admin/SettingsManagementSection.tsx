import React from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import type { AdminSettingsSummary } from './adminTypes';

export default function SettingsManagementSection({
  settings,
  loading,
}: {
  settings: AdminSettingsSummary | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm font-bold text-slate-400">
        <Loader2 className="animate-spin text-violet-300" size={18} />
        Loading settings...
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-5 text-sm font-bold text-red-100">
        Settings could not be loaded.
      </div>
    );
  }

  return (
    <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
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

      <aside className="grid gap-4">
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
          </div>
        </article>
      </aside>
    </section>
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
