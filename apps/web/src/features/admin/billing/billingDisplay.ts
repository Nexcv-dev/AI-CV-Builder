import type { AdminPaymentItem, AdminPaymentSummary } from '../adminTypes';

export function providerLabel(provider: string) {
  return provider === 'lemonsqueezy' ? 'Lemon Squeezy' : 'PayHere';
}

export function providerTone(provider: string) {
  return provider === 'lemonsqueezy'
    ? 'bg-blue-400/10 text-blue-200 ring-blue-300/20'
    : 'bg-emerald-400/10 text-emerald-200 ring-emerald-300/20';
}

export function needsReviewCount(summary: AdminPaymentSummary | null) {
  return (summary?.checkoutReviewCount || 0) + (summary?.failedPaymentCount || 0);
}

export interface GatewayRevenueRow {
  provider: 'payhere' | 'lemonsqueezy';
  currency: 'LKR' | 'USD';
  totalCents: number;
  monthlyCents: number;
  count: number;
}

/**
 * Revenue per gateway: PayHere charges in LKR, Lemon Squeezy in USD.
 * Older API responses only had per-currency or single-currency totals, so each
 * value falls back to those.
 */
export function gatewayRevenueRows(summary: AdminPaymentSummary | null): GatewayRevenueRow[] {
  return [
    {
      provider: 'payhere',
      currency: 'LKR',
      totalCents: summary?.revenueByProvider?.payhere?.byCurrency?.LKR?.cents
        ?? summary?.revenueByCurrency?.LKR?.cents
        ?? summary?.totalRevenueCents
        ?? 0,
      monthlyCents: summary?.revenueByPlanCurrency?.monthly?.LKR ?? summary?.revenueByPlan.monthly ?? 0,
      count: summary?.revenueByProvider?.payhere?.byCurrency?.LKR?.count
        ?? summary?.revenueByCurrency?.LKR?.count
        ?? 0,
    },
    {
      provider: 'lemonsqueezy',
      currency: 'USD',
      totalCents: summary?.revenueByProvider?.lemonsqueezy?.byCurrency?.USD?.cents
        ?? summary?.revenueByCurrency?.USD?.cents
        ?? 0,
      monthlyCents: summary?.revenueByPlanCurrency?.monthly?.USD ?? 0,
      count: summary?.revenueByProvider?.lemonsqueezy?.byCurrency?.USD?.count
        ?? summary?.revenueByCurrency?.USD?.count
        ?? 0,
    },
  ];
}

/** Daily revenue keyed by currency, built from the single-currency list when the API sends no per-currency data. */
export function dailyRevenueByCurrency(summary: AdminPaymentSummary) {
  return summary.dailyRevenueByCurrency
    || summary.dailyRevenue.map((item) => ({ day: item.day, currencies: { [summary.currency]: item.cents } }));
}

export function paymentStatusLabel(payment: AdminPaymentItem) {
  if (payment.reviewStatus === 'expired') return 'Expired checkout';
  if (payment.reviewStatus === 'failed') return 'Failed checkout';
  return payment.processed ? 'Processed' : `Code ${payment.statusCode}`;
}
