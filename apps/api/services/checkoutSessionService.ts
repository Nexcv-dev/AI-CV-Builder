import type { ClientSession } from 'mongoose';
import type CheckoutSessionModel from '../server-models/CheckoutSession';
import type { ICheckoutSession } from '../server-models/CheckoutSession';
import type CouponModel from '../server-models/Coupon';
import type { PaidBillingPlan } from '../server-models/userPlan';

/**
 * Checkout session lifecycle.
 *
 * - `pending`: checkout started, payment still in progress.
 * - `paid`: a verified PayHere IPN or Lemon Squeezy webhook was processed.
 * - `failed`: PayHere sent a non-success status for the order.
 * - `cancelled`: the user came back through the cancel/back flow.
 * - `expired`: the checkout was abandoned past its expiry time.
 *
 * Cancelling or expiring a checkout resolves its billing review, so only
 * `failed` checkouts reach the admin Needs Review queue (see
 * `billingReviewService.ts`). Every move out of `pending` gives a reserved
 * coupon redemption back, except `paid`, which keeps it.
 */
export type CheckoutStatus = ICheckoutSession['status'];

export const PAYHERE_CHECKOUT_EXPIRY_MS = 15 * 60 * 1000;
export const LEMON_SQUEEZY_CHECKOUT_EXPIRY_MS = 30 * 60 * 1000;
export const PAYMENT_PROCESSING_LOCK_TIMEOUT_MS = 10 * 60 * 1000;

export const checkoutExpiryDate = (durationMs: number) => new Date(Date.now() + durationMs);

export const stalePaymentProcessingDate = () => new Date(Date.now() - PAYMENT_PROCESSING_LOCK_TIMEOUT_MS);

export interface CheckoutModels {
    CheckoutSession: typeof CheckoutSessionModel;
    Coupon: typeof CouponModel;
}

/** Takes one redemption from the coupon. Returns false when none are left. */
export const reserveCouponRedemption = async (Coupon: CheckoutModels['Coupon'], couponCode?: string) => {
    if (!couponCode) return false;
    const reserved = await Coupon.findOneAndUpdate(
        {
            code: couponCode,
            $or: [
                { maxRedemptions: { $exists: false } },
                { maxRedemptions: null },
                { $expr: { $lt: ['$redeemedCount', '$maxRedemptions'] } },
            ],
        },
        { $inc: { redeemedCount: 1 } },
        { returnDocument: 'after' }
    );
    return Boolean(reserved);
};

/** Gives one redemption back to the coupon, never going below zero. */
export const returnCouponRedemption = async (
    Coupon: CheckoutModels['Coupon'],
    couponCode: string,
    session?: ClientSession,
) => {
    const filter = { code: couponCode, redeemedCount: { $gt: 0 } };
    const update = { $inc: { redeemedCount: -1 } };
    if (session) {
        await Coupon.updateOne(filter, update, { session });
    } else {
        await Coupon.updateOne(filter, update);
    }
};

/**
 * Gives back the coupon redemption a checkout reserved. The `couponReserved`
 * flag is claimed atomically, so concurrent callers return it only once.
 */
export const releaseCheckoutCoupon = async (
    { CheckoutSession, Coupon }: CheckoutModels,
    checkoutSession: Pick<ICheckoutSession, '_id' | 'couponCode' | 'couponReserved'>,
    session?: ClientSession,
) => {
    if (!checkoutSession?.couponCode || !checkoutSession?.couponReserved) return;
    const claimed = await CheckoutSession.updateOne(
        { _id: checkoutSession._id, couponReserved: true },
        { $set: { couponReserved: false } },
        session ? { session } : undefined
    );
    if (claimed.modifiedCount > 0) {
        checkoutSession.couponReserved = false;
        await returnCouponRedemption(Coupon, checkoutSession.couponCode, session);
    }
};

export const markExpiredPendingCheckouts = async (CheckoutSession: any, Coupon?: any) => {
    if (Coupon) {
        const expiringReservedCheckouts = await CheckoutSession.find({
            status: 'pending',
            expiresAt: { $lt: new Date() },
            couponReserved: true,
            couponCode: { $exists: true, $ne: '' },
        }).select('_id couponCode');

        for (const checkout of expiringReservedCheckouts) {
            const claimed = await CheckoutSession.updateOne(
                { _id: checkout._id, status: 'pending', couponReserved: true },
                { $set: { status: 'expired', billingReviewStatus: 'resolved', expiredAt: new Date(), couponReserved: false } }
            );
            if (claimed.modifiedCount > 0) {
                await returnCouponRedemption(Coupon, checkout.couponCode);
            }
        }
    }

    await CheckoutSession.updateMany(
        { status: 'pending', expiresAt: { $lt: new Date() } },
        { $set: { status: 'expired', billingReviewStatus: 'resolved', expiredAt: new Date() } }
    );
};

export interface CheckoutQuoteAmounts {
    currency: ICheckoutSession['currency'];
    baseAmountCents: number;
    discountCents: number;
    finalAmountCents: number;
    couponCode?: string;
}

export type StartPendingCheckoutResult =
    | { ok: true; couponReserved: boolean }
    | { ok: false; reason: 'coupon_limit_reached' };

/**
 * Expires stale checkouts, reserves the quote's coupon, and saves a new
 * pending checkout. If the save fails, the coupon redemption is given back
 * and the error is rethrown.
 */
export const startPendingCheckout = async (
    models: CheckoutModels,
    input: {
        orderId: string;
        userId: string;
        plan: PaidBillingPlan;
        quote: CheckoutQuoteAmounts;
        expiresInMs: number;
    },
): Promise<StartPendingCheckoutResult> => {
    const { CheckoutSession, Coupon } = models;
    const { orderId, userId, plan, quote, expiresInMs } = input;

    await markExpiredPendingCheckouts(CheckoutSession, Coupon);
    const couponReserved = quote.couponCode ? await reserveCouponRedemption(Coupon, quote.couponCode) : false;
    if (quote.couponCode && !couponReserved) {
        return { ok: false, reason: 'coupon_limit_reached' };
    }

    try {
        await CheckoutSession.create({
            orderId,
            userId,
            plan,
            currency: quote.currency,
            baseAmountCents: quote.baseAmountCents,
            discountCents: quote.discountCents,
            finalAmountCents: quote.finalAmountCents,
            couponCode: quote.couponCode || undefined,
            couponReserved,
            status: 'pending',
            expiresAt: checkoutExpiryDate(expiresInMs),
        });
    } catch (error) {
        if (couponReserved && quote.couponCode) {
            await returnCouponRedemption(Coupon, quote.couponCode);
        }
        throw error;
    }

    return { ok: true, couponReserved };
};

/**
 * Cancels the user's pending checkout. Returns null when there is no pending
 * checkout with that order id for that user.
 */
export const cancelPendingCheckout = async (
    models: CheckoutModels,
    { orderId, userId }: { orderId: string; userId: unknown },
) => {
    const checkoutSession = await models.CheckoutSession.findOne({ orderId, userId, status: 'pending' });
    if (!checkoutSession) return null;

    await releaseCheckoutCoupon(models, checkoutSession);
    checkoutSession.status = 'cancelled';
    checkoutSession.billingReviewStatus = 'resolved';
    checkoutSession.cancelledAt = new Date();
    await checkoutSession.save();
    return checkoutSession;
};

/**
 * Marks a pending checkout failed after a non-success payment notification.
 * Its billing review stays open, so it shows in Needs Review.
 */
export const failPendingCheckout = async (
    models: CheckoutModels,
    checkoutSession: ICheckoutSession | null | undefined,
) => {
    if (!checkoutSession || checkoutSession.status !== 'pending') return;
    await releaseCheckoutCoupon(models, checkoutSession);
    checkoutSession.status = 'failed';
    await checkoutSession.save();
};
