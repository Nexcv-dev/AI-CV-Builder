import { describe, expect, it } from 'vitest';
import type { BillingPlansResponse, CheckoutQuoteResponse } from './billing';

describe('billing contracts', () => {
  it('allows public billing plan and quote responses', () => {
    const plans = {
      country: 'LK',
      market: 'local',
      provider: 'payhere',
      plans: [
        {
          plan: 'monthly',
          amount: '1200.00',
          cents: 120000,
          baseAmountCents: 120000,
          promotionDiscountCents: 0,
          promotionActive: false,
          currency: 'LKR',
          provider: 'payhere',
          market: 'local',
        },
      ],
    } satisfies BillingPlansResponse;

    const quote = {
      quote: {
        plan: 'monthly',
        currency: 'LKR',
        market: 'local',
        provider: 'payhere',
        baseAmountCents: 120000,
        discountCents: 0,
        finalAmountCents: 120000,
        amount: '1200.00',
      },
    } satisfies CheckoutQuoteResponse;

    expect(plans.plans[0].plan).toBe(quote.quote.plan);
  });
});
