export const PAYHERE_CHECKOUT_EXPIRY_MS = 15 * 60 * 1000;
export const LEMON_SQUEEZY_CHECKOUT_EXPIRY_MS = 30 * 60 * 1000;
export const PAYMENT_PROCESSING_LOCK_TIMEOUT_MS = 10 * 60 * 1000;

export const checkoutExpiryDate = (durationMs: number) => new Date(Date.now() + durationMs);

export const stalePaymentProcessingDate = () => new Date(Date.now() - PAYMENT_PROCESSING_LOCK_TIMEOUT_MS);

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
                await Coupon.updateOne(
                    { code: checkout.couponCode, redeemedCount: { $gt: 0 } },
                    { $inc: { redeemedCount: -1 } }
                );
            }
        }
    }

    await CheckoutSession.updateMany(
        { status: 'pending', expiresAt: { $lt: new Date() } },
        { $set: { status: 'expired', billingReviewStatus: 'resolved', expiredAt: new Date() } }
    );
};
