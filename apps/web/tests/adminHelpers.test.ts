import { describe, expect, it } from 'vitest';
import type { AdminPaymentItem, AdminPaymentSummary } from '../src/features/admin/adminTypes';
import { adminNavItems } from '../src/features/admin/adminUtils';
import { ADMIN_PAGE_META, activeAdminNavItem, adminPageKey } from '../src/features/admin/adminPageMeta';
import {
  dailyRevenueByCurrency,
  gatewayRevenueRows,
  needsReviewCount,
  paymentStatusLabel,
} from '../src/features/admin/billing/billingDisplay';
import { couponPlanKeys } from '../src/features/admin/hooks/useAdminPromotions';

function summary(overrides: Partial<AdminPaymentSummary> = {}): AdminPaymentSummary {
  return {
    totalRevenueCents: 0,
    currency: 'LKR',
    processedCount: 0,
    pendingCheckoutCount: 0,
    checkoutReviewCount: 0,
    failedPaymentCount: 0,
    revenueByPlan: {},
    dailyRevenue: [],
    ...overrides,
  };
}

describe('admin page meta', () => {
  it('has a title for every nav item', () => {
    for (const item of adminNavItems) {
      expect(adminPageKey(item.key)).toBe(item.key);
      expect(ADMIN_PAGE_META[adminPageKey(item.key)].title).toBeTruthy();
    }
  });

  it('matches /admin exactly and other pages by prefix', () => {
    expect(activeAdminNavItem('/admin').key).toBe('dashboard');
    expect(activeAdminNavItem('/admin/billing').key).toBe('billing');
    expect(activeAdminNavItem('/admin/billing/review').key).toBe('billing');
    expect(activeAdminNavItem('/admin/notifications').key).toBe('notifications');
    expect(activeAdminNavItem('/admin/unknown').key).toBe('dashboard');
    expect(activeAdminNavItem('/admin/').key).toBe('dashboard');
  });

  it('shows the header search only on list pages', () => {
    const withSearch = Object.entries(ADMIN_PAGE_META)
      .filter(([, meta]) => meta.searchPlaceholder !== null)
      .map(([key]) => key)
      .sort();
    expect(withSearch).toEqual(['billing', 'dashboard', 'support', 'templates', 'users']);
  });
});

describe('billing display helpers', () => {
  it('reads gateway revenue from the per-provider breakdown', () => {
    const [payHere, lemonSqueezy] = gatewayRevenueRows(summary({
      totalRevenueCents: 1,
      revenueByCurrency: { LKR: { cents: 2, count: 2 }, USD: { cents: 3, count: 3 } },
      revenueByProvider: {
        payhere: { count: 4, byCurrency: { LKR: { cents: 500000, count: 4 } } },
        lemonsqueezy: { count: 2, byCurrency: { USD: { cents: 1998, count: 2 } } },
      },
      revenueByPlanCurrency: { monthly: { LKR: 300000, USD: 999 } },
      revenueByPlan: { monthly: 7 },
    }));
    expect(payHere).toEqual({ provider: 'payhere', currency: 'LKR', totalCents: 500000, monthlyCents: 300000, count: 4 });
    expect(lemonSqueezy).toEqual({ provider: 'lemonsqueezy', currency: 'USD', totalCents: 1998, monthlyCents: 999, count: 2 });
  });

  it('falls back to per-currency totals, then to the legacy single-currency totals', () => {
    const [payHere, lemonSqueezy] = gatewayRevenueRows(summary({
      revenueByCurrency: { LKR: { cents: 200000, count: 2 }, USD: { cents: 500, count: 1 } },
    }));
    expect(payHere).toMatchObject({ totalCents: 200000, count: 2 });
    expect(lemonSqueezy).toMatchObject({ totalCents: 500, count: 1 });

    const [legacyPayHere, legacyLemonSqueezy] = gatewayRevenueRows(summary({ totalRevenueCents: 90000, revenueByPlan: { monthly: 45000 } }));
    expect(legacyPayHere).toMatchObject({ totalCents: 90000, monthlyCents: 45000, count: 0 });
    expect(legacyLemonSqueezy).toMatchObject({ totalCents: 0, monthlyCents: 0, count: 0 });
  });

  it('shows zeros before the summary loads', () => {
    expect(gatewayRevenueRows(null).map((row) => [row.totalCents, row.monthlyCents, row.count])).toEqual([[0, 0, 0], [0, 0, 0]]);
    expect(needsReviewCount(null)).toBe(0);
  });

  it('counts failed checkouts and failed payments as needing review', () => {
    expect(needsReviewCount(summary({ checkoutReviewCount: 2, failedPaymentCount: 3 }))).toBe(5);
  });

  it('builds daily revenue per currency from the legacy list', () => {
    expect(dailyRevenueByCurrency(summary({ dailyRevenue: [{ day: '2026-11-01', cents: 100 }] })))
      .toEqual([{ day: '2026-11-01', currencies: { LKR: 100 } }]);
    const byCurrency = [{ day: '2026-11-01', currencies: { LKR: 100, USD: 5 } }];
    expect(dailyRevenueByCurrency(summary({ dailyRevenueByCurrency: byCurrency }))).toBe(byCurrency);
  });

  it('labels payment status for the review drawer', () => {
    const base = { processed: false, statusCode: '-2' } as AdminPaymentItem;
    expect(paymentStatusLabel({ ...base, reviewStatus: 'expired' })).toBe('Expired checkout');
    expect(paymentStatusLabel({ ...base, reviewStatus: 'failed' })).toBe('Failed checkout');
    expect(paymentStatusLabel({ ...base, processed: true })).toBe('Processed');
    expect(paymentStatusLabel(base)).toBe('Code -2');
  });
});

describe('coupon plan keys', () => {
  it('expands the plan groups', () => {
    expect(couponPlanKeys('both')).toEqual(['payg', 'monthly', 'quarterly']);
    expect(couponPlanKeys('pro')).toEqual(['monthly', 'quarterly']);
    expect(couponPlanKeys('payg')).toEqual(['payg']);
  });
});
