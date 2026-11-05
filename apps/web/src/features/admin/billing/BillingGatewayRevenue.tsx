import React from 'react';
import type { AdminPaymentSummary } from '../adminTypes';
import { formatCurrency } from '../adminUtils';
import { gatewayRevenueRows, providerLabel, providerTone } from './billingDisplay';

export function BillingGatewayRevenue({ summary }: { summary: AdminPaymentSummary | null }) {
  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] shadow-xl shadow-black/10">
      <div className="grid grid-cols-[1fr_110px_130px_130px_120px] gap-3 border-b border-white/10 px-5 py-3 text-xs font-black uppercase text-slate-500 max-md:hidden">
        <span>Gateway</span>
        <span>Currency</span>
        <span>Total</span>
        <span>Monthly</span>
        <span>Payments</span>
      </div>
      {gatewayRevenueRows(summary).map((item) => (
        <div key={item.provider} className="grid gap-3 border-b border-white/10 px-4 py-4 last:border-b-0 md:grid-cols-[1fr_110px_130px_130px_120px] md:items-center md:px-5">
          <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ring-1 ${providerTone(item.provider)}`}>
            {providerLabel(item.provider)}
          </span>
          <span className="text-sm font-black text-slate-100">{item.currency}</span>
          <span className="text-sm font-black text-slate-100">{formatCurrency(item.totalCents, item.currency)}</span>
          <span className="text-sm font-black text-slate-100">{formatCurrency(item.monthlyCents, item.currency)}</span>
          <span className="text-sm font-bold text-slate-300">{item.count}</span>
        </div>
      ))}
    </section>
  );
}
