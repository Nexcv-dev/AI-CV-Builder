import type CheckoutSessionModel from '../server-models/CheckoutSession';
import type PaymentTransactionModel from '../server-models/PaymentTransaction';
import { formatUtcDay, startOfUtcDay } from '../server-utils/dates';
import { adminPaymentSummary, parsePaymentAmountCents } from '../server-utils/dto/admin';

/**
 * Admin billing Needs Review rules.
 *
 * An item needs review until an admin resolves it:
 *
 * - Payments that were never processed: failed PayHere statuses, and
 *   notifications that failed partway through.
 * - Checkouts in `failed` status.
 *
 * Cancelled and expired checkouts never need review. They are abandoned
 * checkouts, not payment problems. Cancelling or expiring a checkout also
 * resolves its review (see `checkoutSessionService.ts`), but the status
 * filter keeps older rows that still say `open` out of the queue as well.
 */
export const paymentNeedsReviewFilter = () => ({
    processed: false,
    billingReviewStatus: { $ne: 'resolved' as const },
});

export const checkoutNeedsReviewFilter = () => ({
    status: 'failed' as const,
    billingReviewStatus: { $ne: 'resolved' as const },
});

export const BILLING_REVIEW_TYPES = ['payment', 'checkout'] as const;
export type BillingReviewType = typeof BILLING_REVIEW_TYPES[number];

export const isBillingReviewType = (value: unknown): value is BillingReviewType => (
    BILLING_REVIEW_TYPES.includes(value as BillingReviewType)
);

export const adminPaymentReviewSummary = (payment: any) => ({
    ...adminPaymentSummary(payment),
    reviewType: 'payment' as const,
    reviewStatus: payment.processed ? 'processed' : 'unprocessed',
});

export const adminCheckoutReviewSummary = (checkout: any) => {
    const user = checkout.userId && typeof checkout.userId === 'object' ? checkout.userId : null;
    const currency = String(checkout.currency || 'LKR').toUpperCase();
    return {
        id: checkout._id?.toString?.() || checkout.id,
        provider: currency === 'USD' ? 'lemonsqueezy' : 'payhere',
        paymentId: checkout.status === 'failed' ? 'Failed checkout' : 'Checkout review',
        orderId: checkout.orderId,
        reviewType: 'checkout' as const,
        reviewStatus: checkout.status,
        billingReviewStatus: checkout.billingReviewStatus || 'open',
        reviewedAt: checkout.reviewedAt,
        reviewNote: checkout.reviewNote || '',
        user: user ? {
            id: user._id?.toString?.() || user.id,
            email: user.email,
            displayName: user.displayName,
        } : null,
        plan: checkout.plan || null,
        amount: (Math.max(0, checkout.finalAmountCents || 0) / 100).toFixed(2),
        amountCents: checkout.finalAmountCents || 0,
        baseAmountCents: checkout.baseAmountCents || 0,
        discountCents: checkout.discountCents || 0,
        finalAmountCents: checkout.finalAmountCents || 0,
        couponCode: checkout.couponCode || '',
        currency,
        statusCode: checkout.status,
        processed: false,
        rawPayload: {
            checkoutStatus: checkout.status,
            expiresAt: checkout.expiresAt,
            couponCode: checkout.couponCode || '',
        },
        createdAt: checkout.createdAt,
        updatedAt: checkout.updatedAt,
    };
};

export interface BillingReviewModels {
    CheckoutSession: typeof CheckoutSessionModel;
    PaymentTransaction: typeof PaymentTransactionModel;
}

/**
 * Marks a payment or checkout review resolved. Returns null when the item
 * does not exist. The returned summary and audit fields are ready for the
 * admin response and audit log.
 */
export const resolveBillingReview = async (
    { CheckoutSession, PaymentTransaction }: BillingReviewModels,
    input: { type: BillingReviewType; id: string; reviewerId: unknown; note: string },
) => {
    const reviewUpdate = {
        $set: {
            billingReviewStatus: 'resolved' as const,
            reviewedAt: new Date(),
            reviewedBy: input.reviewerId,
            reviewNote: input.note,
        },
    };
    const options = { new: true, runValidators: true };

    if (input.type === 'payment') {
        const payment = await PaymentTransaction.findByIdAndUpdate(input.id, reviewUpdate, options)
            .populate('userId', 'email displayName');
        if (!payment) return null;
        return {
            summary: adminPaymentReviewSummary(payment),
            targetType: 'payment_transaction' as const,
            targetId: payment._id?.toString?.() || input.id,
            targetLabel: payment.paymentId,
            orderId: payment.orderId,
        };
    }

    const checkout = await CheckoutSession.findByIdAndUpdate(input.id, reviewUpdate, options)
        .populate('userId', 'email displayName');
    if (!checkout) return null;
    return {
        summary: adminCheckoutReviewSummary(checkout),
        targetType: 'checkout_session' as const,
        targetId: checkout._id?.toString?.() || input.id,
        targetLabel: checkout.orderId,
        orderId: checkout.orderId,
    };
};

type CurrencyRevenue = Record<string, { cents: number; count: number }>;

interface ProcessedPayment {
    amount?: string;
    currency?: string;
    provider?: string;
    plan?: string;
    createdAt?: Date;
}

const resolvePaymentCurrency = (payment: ProcessedPayment) => (
    String(payment.currency || (payment.provider === 'lemonsqueezy' ? 'USD' : 'LKR')).toUpperCase()
);

const addCurrencyRevenue = (bucket: CurrencyRevenue, currency: string, cents: number) => {
    bucket[currency] = bucket[currency] || { cents: 0, count: 0 };
    bucket[currency].cents += cents;
    bucket[currency].count += 1;
};

/**
 * Revenue totals for the admin billing summary. Pass processed payments
 * only. `totalRevenueCents`, `revenueByPlan`, and `dailyRevenue` count LKR
 * only; the `*ByCurrency` fields cover every currency. Days are UTC, and
 * the daily series covers the last 7 days including today.
 */
export const summarizeBillingRevenue = (processedPayments: ProcessedPayment[], now = new Date()) => {
    const revenueByCurrency: CurrencyRevenue = {};
    const revenueByProvider: Record<string, { count: number; byCurrency: CurrencyRevenue }> = {};
    const revenueByPlanCurrency: Record<string, Record<string, number>> = {};

    processedPayments.forEach((payment) => {
        const cents = parsePaymentAmountCents(payment.amount);
        const currency = resolvePaymentCurrency(payment);
        const providerKey = payment.provider || (currency === 'USD' ? 'lemonsqueezy' : 'payhere');
        const planKey = payment.plan || 'unknown';

        addCurrencyRevenue(revenueByCurrency, currency, cents);
        revenueByProvider[providerKey] = revenueByProvider[providerKey] || { count: 0, byCurrency: {} };
        revenueByProvider[providerKey].count += 1;
        addCurrencyRevenue(revenueByProvider[providerKey].byCurrency, currency, cents);
        revenueByPlanCurrency[planKey] = revenueByPlanCurrency[planKey] || {};
        revenueByPlanCurrency[planKey][currency] = (revenueByPlanCurrency[planKey][currency] || 0) + cents;
    });

    const revenueByPlan = processedPayments
        .filter((payment) => resolvePaymentCurrency(payment) === 'LKR')
        .reduce((acc: Record<string, number>, payment) => {
            const key = payment.plan || 'unknown';
            acc[key] = (acc[key] || 0) + parsePaymentAmountCents(payment.amount);
            return acc;
        }, {});

    const firstDay = startOfUtcDay(now);
    firstDay.setUTCDate(firstDay.getUTCDate() - 6);
    const revenueByDayCurrency = new Map<string, Record<string, number>>();
    processedPayments.forEach((payment) => {
        if (!payment.createdAt || payment.createdAt < firstDay) return;
        const day = formatUtcDay(payment.createdAt);
        const currency = resolvePaymentCurrency(payment);
        const dayCurrencies = revenueByDayCurrency.get(day) || {};
        dayCurrencies[currency] = (dayCurrencies[currency] || 0) + parsePaymentAmountCents(payment.amount);
        revenueByDayCurrency.set(day, dayCurrencies);
    });
    const days = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(firstDay);
        date.setUTCDate(firstDay.getUTCDate() + index);
        return formatUtcDay(date);
    });

    return {
        totalRevenueCents: revenueByCurrency.LKR?.cents || 0,
        currency: 'LKR' as const,
        processedCount: processedPayments.length,
        revenueByPlan,
        dailyRevenue: days.map((day) => ({ day, cents: revenueByDayCurrency.get(day)?.LKR || 0 })),
        revenueByCurrency,
        revenueByProvider,
        revenueByPlanCurrency,
        dailyRevenueByCurrency: days.map((day) => ({ day, currencies: revenueByDayCurrency.get(day) || {} })),
    };
};
