import React from 'react';
import { AlertCircle, Check, Clock3, CreditCard } from 'lucide-react';
import type { AdminPaymentSummary } from '../adminTypes';
import { formatCurrency } from '../adminUtils';
import { AdminStat } from '../AdminSharedComponents';
import { gatewayRevenueRows, needsReviewCount } from './billingDisplay';

export function BillingStatsGrid({
  summary,
  reviewFilterActive,
  onToggleReviewFilter,
}: {
  summary: AdminPaymentSummary | null;
  reviewFilterActive: boolean;
  onToggleReviewFilter: () => void;
}) {
  const [payHere, lemonSqueezy] = gatewayRevenueRows(summary);

  return (
    <div className="grid gap-4 md:grid-cols-5">
      <AdminStat icon={<CreditCard size={19} />} label="PayHere Revenue" value={formatCurrency(payHere.totalCents, payHere.currency)} />
      <AdminStat icon={<CreditCard size={19} />} label="Lemon Squeezy Revenue" value={formatCurrency(lemonSqueezy.totalCents, lemonSqueezy.currency)} />
      <AdminStat icon={<Check size={19} />} label="Processed Payments" value={String(summary?.processedCount || 0)} />
      <AdminStat icon={<Clock3 size={19} />} label="Pending Checkouts" value={String(summary?.pendingCheckoutCount || 0)} />
      <button
        type="button"
        onClick={onToggleReviewFilter}
        className={`rounded-2xl text-left transition active:scale-[0.99] ${reviewFilterActive ? 'ring-2 ring-amber-300/50' : 'hover:ring-1 hover:ring-amber-300/30'}`}
        aria-pressed={reviewFilterActive}
      >
        <AdminStat icon={<AlertCircle size={19} />} label="Needs Review" value={String(needsReviewCount(summary))} />
      </button>
    </div>
  );
}
