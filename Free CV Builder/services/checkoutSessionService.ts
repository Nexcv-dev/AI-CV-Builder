export const PAYHERE_CHECKOUT_EXPIRY_MS = 15 * 60 * 1000;
export const LEMON_SQUEEZY_CHECKOUT_EXPIRY_MS = 30 * 60 * 1000;
export const PAYMENT_PROCESSING_LOCK_TIMEOUT_MS = 10 * 60 * 1000;

export const checkoutExpiryDate = (durationMs: number) => new Date(Date.now() + durationMs);

export const stalePaymentProcessingDate = () => new Date(Date.now() - PAYMENT_PROCESSING_LOCK_TIMEOUT_MS);

export const markExpiredPendingCheckouts = async (CheckoutSession: any) => {
    await CheckoutSession.updateMany(
        { status: 'pending', expiresAt: { $lt: new Date() } },
        { $set: { status: 'expired', billingReviewStatus: 'resolved', expiredAt: new Date() } }
    );
};
