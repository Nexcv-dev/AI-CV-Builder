import { beforeEach, describe, expect, it, vi } from 'vitest';

const billingPlanFindOne = vi.fn();
const couponFindOne = vi.fn();

vi.mock('../server-models/BillingPlanSetting', () => ({
  default: {
    findOne: billingPlanFindOne,
  },
}));

vi.mock('../server-models/Coupon', () => ({
  default: {
    findOne: couponFindOne,
  },
}));

describe('PayHere and billing helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    billingPlanFindOne.mockResolvedValue(null);
    couponFindOne.mockResolvedValue(null);
  });

  it('verifies PayHere signatures and rejects malformed signatures without throwing', async () => {
    const {
      buildPayHereMd5Signature,
      verifyPayHereMd5Signature,
    } = await import('./payHere');
    const payload = {
      merchant_id: '1232679',
      order_id: 'NXCV-507f1f77bcf86cd799439011-payg-001',
      payhere_amount: '499.00',
      payhere_currency: 'LKR',
      status_code: '2',
    };
    const merchantSecret = 'sandbox-secret';
    const md5sig = buildPayHereMd5Signature(payload, merchantSecret);

    expect(verifyPayHereMd5Signature({ ...payload, md5sig }, merchantSecret)).toBe(true);
    expect(verifyPayHereMd5Signature({ ...payload, payhere_amount: '500.00', md5sig }, merchantSecret)).toBe(false);
    expect(verifyPayHereMd5Signature({ ...payload, md5sig: 'not-a-hex-signature' }, merchantSecret)).toBe(false);
    expect(verifyPayHereMd5Signature({ ...payload, md5sig: '' }, merchantSecret)).toBe(false);
  });

  it('resolves local billing only when selected or detected country is Sri Lanka', async () => {
    const { resolveBillingMarket } = await import('./payHere');

    expect(resolveBillingMarket('LK', { headers: { host: 'localhost:3000' }, ip: '127.0.0.1' })).toMatchObject({
      country: 'LK',
      market: 'local',
      provider: 'payhere',
      currency: 'LKR',
    });
    expect(resolveBillingMarket('US', { headers: { host: 'localhost:3000' }, ip: '127.0.0.1' })).toMatchObject({
      country: 'US',
      market: 'global',
      provider: 'lemonsqueezy',
      currency: 'USD',
    });
    expect(resolveBillingMarket(undefined, { headers: { 'cf-ipcountry': 'US' }, ip: '203.0.113.10' })).toMatchObject({
      country: 'US',
      market: 'global',
      provider: 'lemonsqueezy',
    });
  });

  it('uses the larger coupon discount instead of stacking it with a promotion', async () => {
    const { quoteCheckout } = await import('./payHere');
    billingPlanFindOne.mockResolvedValue({
      plan: 'monthly',
      prices: [{
        market: 'local',
        amountCents: 220000,
        currency: 'LKR',
        promotionActive: true,
        promotionDiscountType: 'fixed',
        promotionDiscountValue: 20000,
        promotionLabel: 'Launch offer',
      }],
    });
    couponFindOne.mockResolvedValue({
      code: 'SAVE50',
      label: 'Half off',
      discountType: 'percent',
      discountValue: 50,
      appliesTo: ['monthly'],
      redeemedCount: 0,
      maxRedemptions: 10,
    });

    await expect(quoteCheckout('monthly', 'save50', 'local')).resolves.toMatchObject({
      plan: 'monthly',
      currency: 'LKR',
      baseAmountCents: 220000,
      promotionDiscountCents: 0,
      couponDiscountCents: 110000,
      discountCents: 110000,
      finalAmountCents: 110000,
      amount: '1100.00',
      couponCode: 'SAVE50',
      couponLabel: 'Half off',
    });
  });

  it('keeps the promotion when it beats the coupon discount', async () => {
    const { quoteCheckout } = await import('./payHere');
    billingPlanFindOne.mockResolvedValue({
      plan: 'quarterly',
      prices: [{
        market: 'local',
        amountCents: 500000,
        currency: 'LKR',
        promotionActive: true,
        promotionDiscountType: 'fixed',
        promotionDiscountValue: 100000,
        promotionLabel: 'Seasonal offer',
      }],
    });
    couponFindOne.mockResolvedValue({
      code: 'SAVE5',
      label: 'Small coupon',
      discountType: 'percent',
      discountValue: 5,
      appliesTo: ['quarterly'],
      redeemedCount: 0,
      maxRedemptions: 10,
    });

    await expect(quoteCheckout('quarterly', 'save5', 'local')).resolves.toMatchObject({
      promotionDiscountCents: 100000,
      couponDiscountCents: 0,
      discountCents: 100000,
      finalAmountCents: 400000,
      amount: '4000.00',
      couponCode: '',
      promotionLabel: 'Seasonal offer',
    });
  });

  it('rejects expired, over-redeemed, or wrong-plan coupons', async () => {
    const { quoteCheckout } = await import('./payHere');
    billingPlanFindOne.mockResolvedValue(null);
    couponFindOne.mockResolvedValue({
      code: 'OLDMONTHLY',
      active: true,
      appliesTo: ['monthly'],
      expiresAt: new Date('2020-01-01T00:00:00.000Z'),
      redeemedCount: 0,
      maxRedemptions: 10,
    });

    await expect(quoteCheckout('monthly', 'oldmonthly', 'local')).resolves.toEqual({
      error: 'Coupon is not valid for this plan.',
    });

    couponFindOne.mockResolvedValue({
      code: 'PAYGONLY',
      active: true,
      appliesTo: ['payg'],
      redeemedCount: 10,
      maxRedemptions: 10,
    });

    await expect(quoteCheckout('quarterly', 'paygonly', 'local')).resolves.toEqual({
      error: 'Coupon is not valid for this plan.',
    });
  });
});
