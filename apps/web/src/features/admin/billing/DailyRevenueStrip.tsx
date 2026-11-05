import React from 'react';
import type { AdminPaymentSummary } from '../adminTypes';
import { formatCurrency } from '../adminUtils';
import { MiniRow } from '../AdminSharedComponents';
import { dailyRevenueByCurrency } from './billingDisplay';

export function DailyRevenueStrip({ summary }: { summary: AdminPaymentSummary }) {
  return (
    <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10">
      <h2 className="font-montserrat text-lg font-black">Daily Revenue</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-7">
        {dailyRevenueByCurrency(summary).map((item) => (
          <MiniRow
            key={item.day}
            label={item.day.slice(5)}
            value={[
              item.currencies.LKR ? formatCurrency(item.currencies.LKR, 'LKR') : '',
              item.currencies.USD ? formatCurrency(item.currencies.USD, 'USD') : '',
            ].filter(Boolean).join(' / ') || '0'}
          />
        ))}
      </div>
    </section>
  );
}
