import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import mongoose from 'mongoose';
import BillingPlanSetting from '../server-models/BillingPlanSetting';
import Coupon from '../server-models/Coupon';
import type { BillingPlan } from '../server-models/userPlan';

const md5Upper = (value: string) => createHash('md5').update(value, 'utf8').digest('hex').toUpperCase();

const isValidDocumentId = (id: unknown) => (
    typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)
);

export const PAYHERE_PLAN_PRICES: Record<Exclude<BillingPlan, 'free'>, { amount: string; cents: number; currency: 'LKR' }> = {
    payg: { amount: '499.00', cents: 49900, currency: 'LKR' },
    monthly: { amount: '2199.00', cents: 219900, currency: 'LKR' },
};

const centsToPayHereAmount = (cents: number) => (Math.max(0, cents) / 100).toFixed(2);

const calculateDiscountCents = (amountCents: number, discountType?: string, discountValue?: number) => {
    if (!discountType || !discountValue) return 0;
    const rawDiscount = discountType === 'percent'
        ? Math.floor(amountCents * Math.min(Math.max(discountValue, 0), 100) / 100)
        : Math.round(discountValue);
    return Math.min(Math.max(rawDiscount, 0), Math.max(amountCents - 100, 0));
};

export const normalizeCouponCode = (value: unknown) => (
    typeof value === 'string'
        ? value.replace(/[^a-z0-9_-]/gi, '').trim().toUpperCase().slice(0, 32)
        : ''
);

export const planDisplayName = (plan: BillingPlan) => (
    plan === 'monthly' ? 'Monthly' :
        plan === 'payg' ? 'Pay As You Go' :
            'Free'
);

export const getPlanPrice = async (plan: Exclude<BillingPlan, 'free'>) => {
    const setting = await BillingPlanSetting.findOne({ plan, active: true });
    const fallback = PAYHERE_PLAN_PRICES[plan];
    const baseAmountCents = setting?.amountCents ?? fallback.cents;
    const promotionDiscountCents = setting?.promotionActive
        ? calculateDiscountCents(baseAmountCents, setting.promotionDiscountType, setting.promotionDiscountValue)
        : 0;
    const finalAmountCents = Math.max(baseAmountCents - promotionDiscountCents, 100);
    return {
        plan,
        label: setting?.label || planDisplayName(plan),
        amount: centsToPayHereAmount(finalAmountCents),
        cents: finalAmountCents,
        baseAmountCents,
        promotionDiscountCents,
        promotionActive: promotionDiscountCents > 0,
        promotionLabel: promotionDiscountCents > 0 ? (setting?.promotionLabel || 'Limited offer') : '',
        promotionDiscountType: setting?.promotionDiscountType || 'fixed',
        promotionDiscountValue: setting?.promotionDiscountValue || 0,
        discountBadge: promotionDiscountCents > 0
            ? (setting?.promotionDiscountType === 'percent'
                ? `${setting.promotionDiscountValue}% OFF`
                : `${setting?.currency || fallback.currency} ${Math.round(promotionDiscountCents / 100)} OFF`)
            : '',
        currency: (setting?.currency || fallback.currency) as 'LKR',
        source: setting ? 'admin' : 'default',
        updatedAt: setting?.updatedAt,
    };
};

export const getPublicBillingPlans = async () => {
    const [payg, monthly] = await Promise.all([getPlanPrice('payg'), getPlanPrice('monthly')]);
    return [payg, monthly];
};

export const quoteCheckout = async (plan: Exclude<BillingPlan, 'free'>, couponCode?: string) => {
    const price = await getPlanPrice(plan);
    let coupon: any = null;
    let discountCents = 0;
    const code = normalizeCouponCode(couponCode);
    const now = new Date();
    if (code) {
        coupon = await Coupon.findOne({ code, active: true });
        const planAllowed = coupon && (!coupon.appliesTo?.length || coupon.appliesTo.includes(plan));
        const started = !coupon?.startsAt || coupon.startsAt <= now;
        const notExpired = !coupon?.expiresAt || coupon.expiresAt >= now;
        const underLimit = !coupon?.maxRedemptions || coupon.redeemedCount < coupon.maxRedemptions;
        if (!coupon || !planAllowed || !started || !notExpired || !underLimit) {
            return { error: 'Coupon is not valid for this plan.' };
        }
        discountCents = calculateDiscountCents(price.cents, coupon.discountType, coupon.discountValue);
    }
    const finalAmountCents = Math.max(price.cents - discountCents, 100);
    return {
        plan,
        currency: price.currency,
        baseAmountCents: price.baseAmountCents,
        promotionDiscountCents: price.promotionDiscountCents,
        discountCents: price.promotionDiscountCents + discountCents,
        couponDiscountCents: discountCents,
        finalAmountCents,
        amount: centsToPayHereAmount(finalAmountCents),
        couponCode: coupon?.code || '',
        couponLabel: coupon?.label || '',
        promotionLabel: price.promotionLabel,
        discountBadge: price.discountBadge,
    };
};

export const getPayHereMerchantConfig = () => ({
    merchantId: (process.env.PAYHERE_MERCHANT_ID || process.env.PAYHERE_SANDBOX_MERCHANT_ID || '').trim(),
    merchantSecret: (process.env.PAYHERE_MERCHANT_SECRET || process.env.PAYHERE_SANDBOX_MERCHANT_SECRET || '').trim(),
});

export const getPayHereCheckoutUrl = () => (
    process.env.PAYHERE_CHECKOUT_URL?.trim() ||
    (process.env.PAYHERE_MERCHANT_ID ? 'https://www.payhere.lk/pay/checkout' : 'https://sandbox.payhere.lk/pay/checkout')
);

export const buildPayHereCheckoutHash = (payload: {
    merchant_id: string;
    order_id: string;
    amount: string;
    currency: string;
}, merchantSecret: string) => md5Upper(
    `${payload.merchant_id}${payload.order_id}${payload.amount}${payload.currency}${md5Upper(merchantSecret)}`
);

export const buildPayHereMd5Signature = (payload: {
    merchant_id: string;
    order_id: string;
    payhere_amount: string;
    payhere_currency: string;
    status_code: string;
}, merchantSecret: string) => md5Upper(
    `${payload.merchant_id}${payload.order_id}${payload.payhere_amount}${payload.payhere_currency}${payload.status_code}${md5Upper(merchantSecret)}`
);

export const verifyPayHereMd5Signature = (payload: {
    merchant_id: string;
    order_id: string;
    payhere_amount: string;
    payhere_currency: string;
    status_code: string;
    md5sig: string;
}, merchantSecret: string) => {
    const received = String(payload.md5sig || '').trim().toUpperCase();
    const expected = buildPayHereMd5Signature(payload, merchantSecret);
    const receivedBuffer = Buffer.from(received, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
};

export const payHereAmountToCents = (value: unknown) => {
    if (typeof value !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return null;
    return Math.round(Number(value.trim()) * 100);
};

export const isPaidBillingPlan = (value: unknown): value is Exclude<BillingPlan, 'free'> => (
    value === 'payg' || value === 'monthly'
);

export const resolvePayHerePaymentContext = (payload: Record<string, unknown>) => {
    const customUserId = typeof payload.custom_1 === 'string' ? payload.custom_1.trim() : '';
    const customPlan = typeof payload.custom_2 === 'string' ? payload.custom_2.trim().toLowerCase() : '';
    const orderId = typeof payload.order_id === 'string' ? payload.order_id.trim() : '';
    const orderMatch = orderId.match(/([a-f\d]{24})[^a-z\d]+(payg|monthly)|(payg|monthly)[^a-z\d]+([a-f\d]{24})/i);

    const userId = isValidDocumentId(customUserId)
        ? customUserId
        : orderMatch?.[1] || orderMatch?.[4] || '';
    const plan = isPaidBillingPlan(customPlan)
        ? customPlan
        : orderMatch?.[2]?.toLowerCase() || orderMatch?.[3]?.toLowerCase() || '';

    return {
        userId: isValidDocumentId(userId) ? userId : '',
        plan: isPaidBillingPlan(plan) ? plan : null,
    };
};

export const generateTransactionId = () => {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `NX-${datePart}-${randomBytes(4).toString('hex').toUpperCase()}`;
};
