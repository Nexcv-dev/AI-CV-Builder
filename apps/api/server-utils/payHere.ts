import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import mongoose from 'mongoose';
import BillingPlanSetting from '../server-models/BillingPlanSetting';
import Coupon from '../server-models/Coupon';
import { PAID_BILLING_PLANS, type BillingPlan } from '../server-models/userPlan';

const md5Upper = (value: string) => createHash('md5').update(value, 'utf8').digest('hex').toUpperCase();

const isValidDocumentId = (id: unknown) => (
    typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)
);

export const PAYHERE_PLAN_PRICES: Record<Exclude<BillingPlan, 'free'>, { amount: string; cents: number; currency: 'LKR' }> = {
    payg: { amount: '499.00', cents: 49900, currency: 'LKR' },
    monthly: { amount: '2199.00', cents: 219900, currency: 'LKR' },
    quarterly: { amount: '4999.00', cents: 499900, currency: 'LKR' },
};

export const GLOBAL_PLAN_PRICES: Record<Exclude<BillingPlan, 'free'>, { amount: string; cents: number; currency: 'USD' }> = {
    payg: { amount: '4.99', cents: 499, currency: 'USD' },
    monthly: { amount: '9.99', cents: 999, currency: 'USD' },
    quarterly: { amount: '24.99', cents: 2499, currency: 'USD' },
};

export type BillingMarket = 'local' | 'global';
export type BillingProvider = 'payhere' | 'lemonsqueezy';

const normalizeCountryCode = (value: unknown) => (
    typeof value === 'string'
        ? (() => {
            const normalized = value.trim().toUpperCase().replace(/[^A-Z]/g, '');
            return normalized === 'GLOBAL' || normalized === 'OTHER' ? '' : normalized.slice(0, 2);
        })()
        : ''
);

const isLocalDevelopmentRequest = (request?: { headers?: any; ip?: string }) => {
    if (process.env.NODE_ENV === 'production') return false;
    const host = String(
        request?.headers?.host ||
        request?.headers?.['x-forwarded-host'] ||
        ''
    ).toLowerCase();
    if (host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('[::1]')) return true;

    const ip = String(
        request?.headers?.['x-forwarded-for'] ||
        request?.headers?.['x-real-ip'] ||
        request?.ip ||
        ''
    ).split(',')[0].trim();
    return !ip || ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.');
};

export const resolveBillingCountry = (country?: unknown, request?: { headers?: any; ip?: string }) => {
    const selectedCountry = normalizeCountryCode(country);
    const headerCountry = normalizeCountryCode(
        request?.headers?.['cf-ipcountry'] ||
        request?.headers?.['x-vercel-ip-country'] ||
        request?.headers?.['x-country-code'] ||
        request?.headers?.['x-appengine-country']
    );
    const detectedCountry = headerCountry && headerCountry !== 'XX'
        ? headerCountry
        : isLocalDevelopmentRequest(request) ? 'LK' : '';

    if (selectedCountry) {
        return {
            country: selectedCountry,
            detectedCountry: detectedCountry || 'GLOBAL',
            source: 'selected' as const,
        };
    }

    if (detectedCountry) {
        return {
            country: detectedCountry,
            detectedCountry,
            source: detectedCountry === 'LK' && isLocalDevelopmentRequest(request) ? 'dev' as const : 'ip' as const,
        };
    }

    return { country: 'GLOBAL', detectedCountry: 'GLOBAL', source: 'fallback' as const };
};

export const resolveBillingMarket = (country?: unknown, request?: { headers?: any; ip?: string }) => {
    const resolved = resolveBillingCountry(country, request);
    const market: BillingMarket = resolved.country === 'LK' && resolved.detectedCountry === 'LK' ? 'local' : 'global';
    const provider: BillingProvider = market === 'local' ? 'payhere' : 'lemonsqueezy';
    const currency = market === 'local' ? 'LKR' as const : 'USD' as const;
    return { ...resolved, market, provider, currency };
};

const roundCheckoutAmountCents = (cents: number, currency: 'LKR' | 'USD') => {
    const safeCents = Math.max(cents, 100);
    return currency === 'LKR'
        ? Math.max(Math.round(safeCents / 100) * 100, 100)
        : safeCents;
};

const centsToGatewayAmount = (cents: number, currency: 'LKR' | 'USD') => {
    const safeCents = Math.max(0, cents);
    return (currency === 'LKR' ? Math.round(safeCents / 100) : safeCents / 100).toFixed(2);
};

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
    plan === 'quarterly' ? 'Pro Quarterly' :
        plan === 'monthly' ? 'Monthly Pro' :
        plan === 'payg' ? 'Single CV Pass' :
            'Free'
);

const normalizePlanLabel = (plan: BillingPlan, label?: string) => {
    if (plan === 'payg' && label === 'Pay As You Go') return 'Single CV Pass';
    if (plan === 'monthly' && label === 'Monthly') return 'Monthly Pro';
    return label || planDisplayName(plan);
};

export const getPlanPrice = async (plan: Exclude<BillingPlan, 'free'>, market: BillingMarket = 'local') => {
    const setting = await BillingPlanSetting.findOne({ plan, active: true });
    const fallback = market === 'global' ? GLOBAL_PLAN_PRICES[plan] : PAYHERE_PLAN_PRICES[plan];
    const marketPrice = setting?.prices?.find((price) => price.market === market && price.active !== false);
    const baseAmountCents = marketPrice?.amountCents ?? (market === 'local' ? setting?.amountCents : undefined) ?? fallback.cents;
    const currency = marketPrice?.currency || fallback.currency;
    const provider: BillingProvider = market === 'local' ? 'payhere' : 'lemonsqueezy';
    const promotionActive = Boolean(marketPrice?.promotionActive ?? (market === 'local' ? setting?.promotionActive : false));
    const promotionLabel = marketPrice?.promotionLabel ?? (market === 'local' ? setting?.promotionLabel : '');
    const promotionDiscountType = marketPrice?.promotionDiscountType ?? (market === 'local' ? setting?.promotionDiscountType : undefined);
    const promotionDiscountValue = marketPrice?.promotionDiscountValue ?? (market === 'local' ? setting?.promotionDiscountValue : undefined);
    const promotionDiscountCents = promotionActive
        ? calculateDiscountCents(baseAmountCents, promotionDiscountType, promotionDiscountValue)
        : 0;
    const finalAmountCents = roundCheckoutAmountCents(baseAmountCents - promotionDiscountCents, currency);
    return {
        plan,
        label: normalizePlanLabel(plan, setting?.label),
        amount: centsToGatewayAmount(finalAmountCents, currency),
        cents: finalAmountCents,
        baseAmountCents,
        promotionDiscountCents,
        promotionActive: promotionDiscountCents > 0,
        promotionLabel: promotionDiscountCents > 0 ? (promotionLabel || 'Limited offer') : '',
        promotionDiscountType: promotionDiscountType || 'fixed',
        promotionDiscountValue: promotionDiscountValue || 0,
        discountBadge: promotionDiscountCents > 0
            ? (promotionDiscountType === 'percent'
                ? `${promotionDiscountValue}% OFF`
                : `${currency} ${Math.round(promotionDiscountCents / 100)} OFF`)
            : '',
        currency,
        market,
        provider,
        source: marketPrice ? 'admin' : (setting && market === 'local') ? 'admin' : 'default',
        updatedAt: setting?.updatedAt,
    };
};

export const getPublicBillingPlans = async (market: BillingMarket = 'local') => {
    const [payg, monthly, quarterly] = await Promise.all([
        getPlanPrice('payg', market),
        getPlanPrice('monthly', market),
        getPlanPrice('quarterly', market),
    ]);
    return [payg, monthly, quarterly];
};

export const getAdminBillingPlans = async () => {
    const [localPayg, localMonthly, localQuarterly, globalPayg, globalMonthly, globalQuarterly] = await Promise.all([
        getPlanPrice('payg', 'local'),
        getPlanPrice('monthly', 'local'),
        getPlanPrice('quarterly', 'local'),
        getPlanPrice('payg', 'global'),
        getPlanPrice('monthly', 'global'),
        getPlanPrice('quarterly', 'global'),
    ]);
    return [localPayg, localMonthly, localQuarterly, globalPayg, globalMonthly, globalQuarterly];
};

export const quoteCheckout = async (plan: Exclude<BillingPlan, 'free'>, couponCode?: string, market: BillingMarket = 'local') => {
    const price = await getPlanPrice(plan, market);
    let coupon: any = null;
    let couponDiscountCents = 0;
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
        couponDiscountCents = calculateDiscountCents(price.baseAmountCents, coupon.discountType, coupon.discountValue);
    }
    const promotionDiscountCents = price.promotionDiscountCents || 0;
    const couponWins = couponDiscountCents > promotionDiscountCents;
    const effectivePromotionDiscountCents = couponWins ? 0 : promotionDiscountCents;
    const effectiveCouponDiscountCents = couponWins ? couponDiscountCents : 0;
    const rawDiscountCents = effectivePromotionDiscountCents + effectiveCouponDiscountCents;
    const finalAmountCents = roundCheckoutAmountCents(price.baseAmountCents - rawDiscountCents, price.currency);
    const discountCents = Math.max(price.baseAmountCents - finalAmountCents, 0);
    return {
        plan,
        currency: price.currency,
        market: price.market,
        provider: price.provider,
        baseAmountCents: price.baseAmountCents,
        promotionDiscountCents: effectivePromotionDiscountCents,
        discountCents,
        couponDiscountCents: effectiveCouponDiscountCents,
        finalAmountCents,
        amount: centsToGatewayAmount(finalAmountCents, price.currency),
        couponCode: effectiveCouponDiscountCents > 0 ? coupon?.code || '' : '',
        couponLabel: effectiveCouponDiscountCents > 0 ? coupon?.label || '' : '',
        promotionLabel: effectivePromotionDiscountCents > 0 ? price.promotionLabel : '',
        discountBadge: effectivePromotionDiscountCents > 0 ? price.discountBadge : '',
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
    typeof value === 'string' && PAID_BILLING_PLANS.includes(value as Exclude<BillingPlan, 'free'>)
);

export const resolvePayHerePaymentContext = (payload: Record<string, unknown>) => {
    const customUserId = typeof payload.custom_1 === 'string' ? payload.custom_1.trim() : '';
    const customPlan = typeof payload.custom_2 === 'string' ? payload.custom_2.trim().toLowerCase() : '';
    const orderId = typeof payload.order_id === 'string' ? payload.order_id.trim() : '';
    const paidPlanPattern = PAID_BILLING_PLANS.join('|');
    const orderMatch = orderId.match(new RegExp(`([a-f\\d]{24})[^a-z\\d]+(${paidPlanPattern})|(${paidPlanPattern})[^a-z\\d]+([a-f\\d]{24})`, 'i'));

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
