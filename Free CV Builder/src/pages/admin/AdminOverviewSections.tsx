import React from 'react';
import { CreditCard, FileText, UserCog, Users } from 'lucide-react';
import type { AdminSummary } from './adminTypes';
import { formatCurrency, formatDate, formatNumber } from './adminUtils';
import { AdminStat, ChartBar, MiniRow } from './AdminSharedComponents';

export function AdminOverviewSection({ summary, maxChartValue }: { summary: AdminSummary; maxChartValue: number }) {
  const revenueByCurrency = summary.widgets.revenueByCurrency || {
    [summary.widgets.revenue.currency]: {
      cents: summary.widgets.revenue.cents,
      count: 0,
    },
  };
  const revenueCurrencies = [
    ...new Set(['LKR', 'USD', ...Object.keys(revenueByCurrency)]),
  ].map((currency) => [currency, revenueByCurrency[currency] || { cents: 0, count: 0 }] as const);
  const dailyRevenueByCurrency = summary.charts.subscriptionRevenueByCurrency || summary.charts.subscriptionRevenue.map((item) => ({
    day: item.day,
    currencies: { [summary.widgets.revenue.currency]: item.cents },
  }));

  return (
    <>
      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStat icon={<Users size={19} />} label="Total Users" value={formatNumber(summary.widgets.totalUsers)} />
        <AdminStat icon={<UserCog size={19} />} label="Active Users Today" value={formatNumber(summary.widgets.activeUsersToday)} />
        <AdminStat icon={<CreditCard size={19} />} label="Premium Subscribers" value={formatNumber(summary.widgets.premiumSubscribers)} />
        <AdminStat icon={<FileText size={19} />} label="Total CVs Created" value={formatNumber(summary.widgets.totalCvsCreated)} />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-montserrat text-lg font-black">User Growth</h2>
              <p className="mt-1 text-sm font-semibold text-slate-400">Last 7 days</p>
            </div>
            <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-black text-emerald-300 ring-1 ring-emerald-300/15">
              Live data
            </span>
          </div>
          <div className="mt-5 grid h-52 grid-cols-7 items-end gap-2">
            {summary.charts.userGrowth.map((item) => (
              <ChartBar key={item.day} label={item.day.slice(5)} value={item.count} max={maxChartValue} />
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 sm:p-5">
          <h2 className="font-montserrat text-lg font-black">Revenue Overview</h2>
          <div className="mt-4 grid gap-2">
            {revenueCurrencies.length ? revenueCurrencies.map(([currency, value]) => (
              <div key={currency} className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2">
                <p className="text-[10px] font-black uppercase text-slate-500">{currency} revenue</p>
                <p className="mt-1 text-2xl font-black text-slate-100">{formatCurrency(value.cents, currency)}</p>
              </div>
            )) : (
              <div className="text-3xl font-black">{formatCurrency(0, summary.widgets.revenue.currency)}</div>
            )}
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-400">Processed payments by currency</p>
          <div className="mt-5 grid gap-2">
            {dailyRevenueByCurrency.map((item) => (
              <MiniRow
                key={item.day}
                label={item.day.slice(5)}
                value={`${formatCurrency(item.currencies.LKR || 0, 'LKR')} / ${formatCurrency(item.currencies.USD || 0, 'USD')}`}
              />
            ))}
          </div>
        </article>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 sm:p-5">
          <h2 className="font-montserrat text-lg font-black">Most Used Templates</h2>
          <div className="mt-4 grid gap-3">
            {summary.templateUsage.length ? summary.templateUsage.map((item) => (
              <MiniRow key={item.template} label={item.template} value={formatNumber(item.count)} />
            )) : <p className="text-sm font-semibold text-slate-500">No template usage yet.</p>}
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 sm:p-5">
          <h2 className="font-montserrat text-lg font-black">Recent Registrations</h2>
          <div className="mt-4 grid gap-3">
            {summary.recentRegistrations.map((item) => (
              <div key={item.id} className="min-w-0 border-b border-white/10 pb-3 last:border-b-0 last:pb-0">
                <p className="truncate text-sm font-black text-slate-100">{item.displayName || item.email}</p>
                <p className="mt-1 truncate text-xs font-semibold text-slate-500">{item.email}</p>
                <p className="mt-1 text-xs font-bold text-violet-300">{item.plan} - {formatDate(item.createdAt)}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 sm:p-5">
          <h2 className="font-montserrat text-lg font-black">Support Tickets</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {Object.entries(summary.widgets.supportTickets).map(([status, count]) => (
              <div key={status} className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                <p className="text-xs font-black uppercase text-slate-500">{status}</p>
                <p className="mt-2 text-2xl font-black">{count}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}

export function AnalyticsDashboardSection({ summary, maxChartValue }: { summary: AdminSummary; maxChartValue: number }) {
  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-montserrat text-lg font-black">Analytics Dashboard</h2>
          <p className="mt-1 text-sm font-semibold text-slate-400">Last 7 days across acquisition, CV activity, downloads, checkout, and templates.</p>
        </div>
        <span className="w-fit rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-300 ring-1 ring-emerald-300/20">
          Live metrics
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AnalyticsTile label="Signups" value={formatNumber(summary.analytics.signups)} />
        <AnalyticsTile label="CV Saves" value={formatNumber(summary.analytics.cvSaves)} />
        <AnalyticsTile label="Downloads" value={formatNumber(summary.analytics.downloads)} />
        <AnalyticsTile label="Checkout Started" value={formatNumber(summary.analytics.checkoutStarted)} />
        <AnalyticsTile label="Conversion" value={`${summary.analytics.checkoutConversionRate}%`} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-montserrat text-sm font-black text-slate-100">Daily Activity</h3>
              <p className="mt-1 text-xs font-semibold text-slate-500">Signups, saves, and downloads</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2 text-[11px] font-black text-slate-400">
              <span className="text-violet-300">Signups</span>
              <span className="text-emerald-300">Saves</span>
              <span className="text-sky-300">Downloads</span>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {summary.charts.userGrowth.map((item, index) => {
              const saves = summary.charts.cvSavesPerDay[index]?.count || 0;
              const downloads = summary.charts.cvDownloadsPerDay[index]?.count || 0;
              return (
                <div key={item.day} className="grid grid-cols-[56px_1fr] items-center gap-3">
                  <span className="text-xs font-black text-slate-500">{item.day.slice(5)}</span>
                  <div className="grid h-8 grid-cols-3 items-end gap-1.5">
                    <ActivityBar value={item.count} max={maxChartValue} className="bg-violet-500" />
                    <ActivityBar value={saves} max={maxChartValue} className="bg-emerald-400" />
                    <ActivityBar value={downloads} max={maxChartValue} className="bg-sky-400" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <h3 className="font-montserrat text-sm font-black text-slate-100">Checkout Conversion</h3>
            <div className="mt-4 grid gap-2">
              {summary.charts.checkoutConversion.map((item) => (
                <div key={item.day} className="grid grid-cols-[56px_1fr_auto] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2">
                  <span className="text-xs font-black text-slate-500">{item.day.slice(5)}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-900">
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{ width: `${item.started > 0 ? Math.max(6, Math.round((item.paid / item.started) * 100)) : 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-black text-slate-200">{item.paid}/{item.started}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <h3 className="font-montserrat text-sm font-black text-slate-100">Template Usage</h3>
            <div className="mt-4 grid gap-2">
              {summary.charts.templateUsage.length ? summary.charts.templateUsage.slice(0, 5).map((item) => (
                <MiniRow key={item.template} label={item.template} value={formatNumber(item.count)} />
              )) : <p className="text-sm font-semibold text-slate-500">No template usage yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AnalyticsTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-100">{value}</p>
    </div>
  );
}

function ActivityBar({ value, max, className }: { value: number; max: number; className: string }) {
  const width = value > 0 ? Math.max(6, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-900">
      <div className={`h-full rounded-full ${className}`} style={{ width: `${width}%` }} />
    </div>
  );
}
