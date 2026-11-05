import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerPaymentRoutes, type PaymentRouteDeps } from '../routes/payment';
import { createRenewedPlanExpiry } from '../server-models/userPlan';
import { API_ERROR_CODES } from '../server-utils/apiErrors';
import {
    buildPayHereCheckoutHash,
    buildPayHereMd5Signature,
    isPaidBillingPlan,
    PAYHERE_PLAN_PRICES,
    payHereAmountToCents,
    planDisplayName,
    resolvePayHerePaymentContext,
    verifyPayHereMd5Signature,
} from '../server-utils/payHere';
import { markExpiredPendingCheckouts } from '../services/checkoutSessionService';
import {
    createFakeModel,
    createFakeMongoose,
    createResponse,
    createRouteCapture,
    type FakeDoc,
} from './helpers/fakeModels';
import { stubRouteDeps } from './helpers/routeDeps';

const NOW = new Date('2026-11-05T10:00:00.000Z');
const MINUTE_MS = 60 * 1000;
const USER_ID = '64b0000000000000000000a1';
const ORDER_ID = `NX-20261105-ABCD1234-${USER_ID}-monthly`;
const MERCHANT = { merchantId: 'M-1', merchantSecret: 'merchant-secret' };

const pendingCheckout = (overrides: FakeDoc = {}): FakeDoc => ({
    orderId: ORDER_ID,
    userId: USER_ID,
    plan: 'monthly',
    currency: 'LKR',
    baseAmountCents: 219900,
    discountCents: 0,
    finalAmountCents: 219900,
    couponReserved: false,
    status: 'pending',
    expiresAt: new Date(NOW.getTime() + 15 * MINUTE_MS),
    ...overrides,
});

const payHereNotification = (overrides: Record<string, string> = {}) => {
    const payload: Record<string, string> = {
        merchant_id: MERCHANT.merchantId,
        order_id: ORDER_ID,
        payment_id: 'PH-320001',
        payhere_amount: '2199.00',
        payhere_currency: 'LKR',
        status_code: '2',
        custom_1: USER_ID,
        custom_2: 'monthly',
        ...overrides,
    };
    return {
        ...payload,
        md5sig: overrides.md5sig ?? buildPayHereMd5Signature({
            merchant_id: payload.merchant_id,
            order_id: payload.order_id,
            payhere_amount: payload.payhere_amount,
            payhere_currency: payload.payhere_currency,
            status_code: payload.status_code,
        }, MERCHANT.merchantSecret),
    };
};

const createHarness = (seed: {
    checkouts?: FakeDoc[];
    transactions?: FakeDoc[];
    users?: FakeDoc[];
    coupons?: FakeDoc[];
} = {}) => {
    const models = {
        CheckoutSession: createFakeModel(seed.checkouts),
        PaymentTransaction: createFakeModel(seed.transactions),
        User: createFakeModel(seed.users ?? [{ _id: USER_ID, email: 'buyer@example.com', plan: 'free' }]),
        Coupon: createFakeModel(seed.coupons),
    };
    const deps = {
        ...models,
        mongoose: createFakeMongoose(),
        PAYHERE_PLAN_PRICES,
        billingQuoteLimiter: vi.fn(),
        requireAuth: vi.fn(),
        requireAdminPermission: vi.fn(() => vi.fn()),
        requireVerifiedEmail: vi.fn(() => true),
        currentUserId: vi.fn(() => USER_ID),
        resolveBillingMarket: vi.fn(() => ({ market: 'local', country: 'LK', detectedCountry: 'LK', source: 'request' })),
        quoteCheckout: vi.fn(async (plan: string, couponCode?: string) => ({
            plan,
            currency: 'LKR',
            market: 'local',
            provider: 'payhere',
            baseAmountCents: 219900,
            promotionDiscountCents: 0,
            discountCents: couponCode ? 21990 : 0,
            couponDiscountCents: couponCode ? 21990 : 0,
            finalAmountCents: couponCode ? 197910 : 219900,
            amount: couponCode ? '1979.10' : '2199.00',
            couponCode: couponCode || '',
            couponLabel: '',
            promotionLabel: '',
            discountBadge: '',
        })),
        generateTransactionId: vi.fn(() => 'NX-20261105-ABCD1234'),
        getPayHereMerchantConfig: vi.fn(() => MERCHANT),
        getPayHereCheckoutUrl: vi.fn(() => 'https://sandbox.payhere.lk/pay/checkout'),
        getFrontendOrigin: vi.fn(() => 'https://app.test'),
        getApiOrigin: vi.fn(() => 'https://api.test'),
        buildPayHereCheckoutHash,
        verifyPayHereMd5Signature,
        resolvePayHerePaymentContext,
        payHereAmountToCents,
        planDisplayName,
        isPaidBillingPlan,
        sanitizeProfileField: vi.fn((value: unknown) => String(value ?? '').trim()),
        normalizeEmail: vi.fn((value: unknown) => String(value ?? '').trim().toLowerCase()),
        publicUser: vi.fn((user: FakeDoc) => ({ id: String(user._id), plan: user.plan })),
        verifyLemonSqueezySignature: vi.fn(() => true),
        isLemonSqueezyConfigured: vi.fn(() => true),
        sendBillingSuccessNotifications: vi.fn(async () => undefined),
        sendBillingAlertNotification: vi.fn(async () => undefined),
        sendError: vi.fn((res: any, status: number, message: string) => res.status(status).json({ error: message })),
        logEvent: vi.fn(),
        logError: vi.fn(),
    };
    const { router, handler } = createRouteCapture();
    registerPaymentRoutes(router, stubRouteDeps<PaymentRouteDeps>(deps));
    return { models, deps, handler };
};

const sendIpn = async (harness: ReturnType<typeof createHarness>, payload: Record<string, string>) => {
    const res = createResponse();
    await harness.handler('post', '/api/payhere/ipn')({ body: payload }, res);
    return res;
};

const lemonSqueezyWebhook = (overrides: { eventName?: string; total?: number; id?: string } = {}) => ({
    meta: {
        event_name: overrides.eventName ?? 'order_created',
        custom_data: { order_id: `${ORDER_ID}-ls`, user_id: USER_ID, plan: 'monthly' },
    },
    data: { id: overrides.id ?? 'ls-order-1', attributes: { total: overrides.total ?? 999, currency: 'USD' } },
});

const sendLemonSqueezyWebhook = async (harness: ReturnType<typeof createHarness>, payload: unknown) => {
    const res = createResponse();
    await harness.handler('post', '/api/lemonsqueezy/webhook')({
        body: Buffer.from(JSON.stringify(payload)),
        get: vi.fn((header: string) => (header === 'X-Signature' ? 'signature' : undefined)),
    }, res);
    return res;
};

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
});

afterEach(() => {
    vi.useRealTimers();
});

describe('PayHere checkout start', () => {
    it('creates a pending checkout that expires after 15 minutes', async () => {
        const harness = createHarness();
        const res = createResponse();

        await harness.handler('post', '/api/billing/payhere-checkout')({
            body: {
                plan: 'monthly',
                customer: { firstName: 'Ana', lastName: 'Silva', email: 'Buyer@Example.com', phone: '0771234567', address: '1 Main St', city: 'Colombo' },
            },
        }, res);

        expect(res.status).not.toHaveBeenCalled();
        const [checkout] = harness.models.CheckoutSession.docs;
        expect(checkout).toMatchObject({
            orderId: ORDER_ID,
            userId: USER_ID,
            plan: 'monthly',
            status: 'pending',
            finalAmountCents: 219900,
            couponReserved: false,
        });
        expect(checkout.expiresAt.getTime() - NOW.getTime()).toBe(15 * MINUTE_MS);

        const body = res.json.mock.calls[0][0];
        expect(body.orderId).toBe(ORDER_ID);
        expect(body.fields).toMatchObject({
            merchant_id: MERCHANT.merchantId,
            amount: '2199.00',
            currency: 'LKR',
            notify_url: 'https://api.test/api/payhere/ipn',
            custom_1: USER_ID,
            custom_2: 'monthly',
        });
        expect(body.fields.hash).toBe(buildPayHereCheckoutHash({
            merchant_id: MERCHANT.merchantId,
            order_id: ORDER_ID,
            amount: '2199.00',
            currency: 'LKR',
        }, MERCHANT.merchantSecret));
        expect(JSON.stringify(body)).not.toContain(MERCHANT.merchantSecret);
    });

    it('reserves a coupon redemption for the checkout', async () => {
        const harness = createHarness({ coupons: [{ code: 'SAVE10', redeemedCount: 2, maxRedemptions: 5 }] });
        const res = createResponse();

        await harness.handler('post', '/api/billing/payhere-checkout')({
            body: {
                plan: 'monthly',
                couponCode: 'SAVE10',
                customer: { firstName: 'Ana', lastName: 'Silva', email: 'a@example.com', phone: '1', address: '1 Main St', city: 'Colombo' },
            },
        }, res);

        expect(harness.models.Coupon.docs[0].redeemedCount).toBe(3);
        expect(harness.models.CheckoutSession.docs[0]).toMatchObject({ couponCode: 'SAVE10', couponReserved: true });
    });

    it('rejects the checkout when the coupon has no redemptions left', async () => {
        const harness = createHarness({ coupons: [{ code: 'SAVE10', redeemedCount: 5, maxRedemptions: 5 }] });
        const res = createResponse();

        await harness.handler('post', '/api/billing/payhere-checkout')({
            body: {
                plan: 'monthly',
                couponCode: 'SAVE10',
                customer: { firstName: 'Ana', lastName: 'Silva', email: 'a@example.com', phone: '1', address: '1 Main St', city: 'Colombo' },
            },
        }, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: API_ERROR_CODES.COUPON_LIMIT_REACHED }));
        expect(harness.models.CheckoutSession.docs).toHaveLength(0);
        expect(harness.models.Coupon.docs[0].redeemedCount).toBe(5);
    });

    it('gives the coupon redemption back when the checkout session cannot be saved', async () => {
        const harness = createHarness({ coupons: [{ code: 'SAVE10', redeemedCount: 2, maxRedemptions: 5 }] });
        harness.models.CheckoutSession.create.mockRejectedValueOnce(new Error('write failed'));
        const res = createResponse();

        await harness.handler('post', '/api/billing/payhere-checkout')({
            body: {
                plan: 'monthly',
                couponCode: 'SAVE10',
                customer: { firstName: 'Ana', lastName: 'Silva', email: 'a@example.com', phone: '1', address: '1 Main St', city: 'Colombo' },
            },
        }, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(harness.models.Coupon.docs[0].redeemedCount).toBe(2);
    });
});

describe('checkout cancel', () => {
    it('marks a pending checkout cancelled, resolves its review, and releases the coupon', async () => {
        const harness = createHarness({
            checkouts: [pendingCheckout({ couponCode: 'SAVE10', couponReserved: true })],
            coupons: [{ code: 'SAVE10', redeemedCount: 3, maxRedemptions: 5 }],
        });
        const res = createResponse();

        await harness.handler('post', '/api/billing/checkout/:orderId/cancel')({ params: { orderId: ORDER_ID } }, res);

        expect(res.json).toHaveBeenCalledWith({ status: 'cancelled' });
        expect(harness.models.CheckoutSession.docs[0]).toMatchObject({
            status: 'cancelled',
            billingReviewStatus: 'resolved',
            couponReserved: false,
            cancelledAt: NOW,
        });
        expect(harness.models.Coupon.docs[0].redeemedCount).toBe(2);
    });

    it('ignores a checkout that is no longer pending', async () => {
        const harness = createHarness({ checkouts: [pendingCheckout({ status: 'paid' })] });
        const res = createResponse();

        await harness.handler('post', '/api/billing/checkout/:orderId/cancel')({ params: { orderId: ORDER_ID } }, res);

        expect(res.json).toHaveBeenCalledWith({ status: 'ignored' });
        expect(harness.models.CheckoutSession.docs[0].status).toBe('paid');
    });

    it("does not cancel another user's checkout", async () => {
        const harness = createHarness({ checkouts: [pendingCheckout({ userId: '64b0000000000000000000ff' })] });
        const res = createResponse();

        await harness.handler('post', '/api/billing/checkout/:orderId/cancel')({ params: { orderId: ORDER_ID } }, res);

        expect(res.json).toHaveBeenCalledWith({ status: 'ignored' });
        expect(harness.models.CheckoutSession.docs[0].status).toBe('pending');
    });
});

describe('abandoned checkout expiry', () => {
    it('expires pending checkouts past their expiry, resolves their review, and releases coupons', async () => {
        const CheckoutSession = createFakeModel([
            pendingCheckout({ orderId: 'abandoned-with-coupon', expiresAt: new Date(NOW.getTime() - MINUTE_MS), couponCode: 'SAVE10', couponReserved: true }),
            pendingCheckout({ orderId: 'abandoned', expiresAt: new Date(NOW.getTime() - MINUTE_MS) }),
            pendingCheckout({ orderId: 'still-open', expiresAt: new Date(NOW.getTime() + MINUTE_MS) }),
        ]);
        const Coupon = createFakeModel([{ code: 'SAVE10', redeemedCount: 1 }]);

        await markExpiredPendingCheckouts(CheckoutSession, Coupon);

        const byOrder = Object.fromEntries(CheckoutSession.docs.map((doc) => [doc.orderId, doc]));
        expect(byOrder['abandoned-with-coupon']).toMatchObject({ status: 'expired', billingReviewStatus: 'resolved', couponReserved: false, expiredAt: NOW });
        expect(byOrder.abandoned).toMatchObject({ status: 'expired', billingReviewStatus: 'resolved', expiredAt: NOW });
        expect(byOrder['still-open'].status).toBe('pending');
        expect(Coupon.docs[0].redeemedCount).toBe(0);
    });

    it('expires a stale checkout before a late PayHere checkout starts', async () => {
        const harness = createHarness({
            checkouts: [pendingCheckout({ orderId: 'old', expiresAt: new Date(NOW.getTime() - 16 * MINUTE_MS) })],
        });

        await harness.handler('post', '/api/billing/payhere-checkout')({
            body: {
                plan: 'monthly',
                customer: { firstName: 'Ana', lastName: 'Silva', email: 'a@example.com', phone: '1', address: '1 Main St', city: 'Colombo' },
            },
        }, createResponse());

        expect(harness.models.CheckoutSession.docs.find((doc) => doc.orderId === 'old')?.status).toBe('expired');
    });
});

describe('PayHere IPN', () => {
    it('upgrades the user, marks the checkout paid, and records a processed transaction', async () => {
        const harness = createHarness({ checkouts: [pendingCheckout()] });

        const res = await sendIpn(harness, payHereNotification());

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith('OK');
        const user = harness.models.User.docs[0];
        expect(user.plan).toBe('monthly');
        expect(user.planStartedAt).toEqual(NOW);
        expect(user.planExpiresAt).toEqual(createRenewedPlanExpiry('monthly', null, NOW));
        expect(harness.models.CheckoutSession.docs[0]).toMatchObject({ status: 'paid', couponReserved: false });
        expect(harness.models.PaymentTransaction.docs).toHaveLength(1);
        expect(harness.models.PaymentTransaction.docs[0]).toMatchObject({
            provider: 'payhere',
            paymentId: 'PH-320001',
            orderId: ORDER_ID,
            plan: 'monthly',
            amount: '2199.00',
            finalAmountCents: 219900,
            statusCode: '2',
            processed: true,
            processedAt: NOW,
        });
        expect(harness.deps.sendBillingSuccessNotifications).toHaveBeenCalledTimes(1);
        expect(harness.deps.sendBillingSuccessNotifications).toHaveBeenCalledWith(expect.objectContaining({
            plan: 'monthly',
            transactionId: 'PH-320001',
        }));
    });

    it('extends an active plan from its current expiry', async () => {
        const currentExpiry = new Date(NOW.getTime() + 10 * 24 * 60 * MINUTE_MS);
        const harness = createHarness({
            checkouts: [pendingCheckout()],
            users: [{ _id: USER_ID, plan: 'monthly', planExpiresAt: currentExpiry }],
        });

        await sendIpn(harness, payHereNotification());

        expect(harness.models.User.docs[0].planExpiresAt).toEqual(createRenewedPlanExpiry('monthly', { planExpiresAt: currentExpiry }, NOW));
    });

    it('adds one CV save credit for a pay-as-you-go purchase', async () => {
        const orderId = `NX-20261105-ABCD1234-${USER_ID}-payg`;
        const harness = createHarness({
            checkouts: [pendingCheckout({ orderId, plan: 'payg', baseAmountCents: 49900, finalAmountCents: 49900 })],
            users: [{ _id: USER_ID, plan: 'free', paygCvSaveCredits: 2 }],
        });

        await sendIpn(harness, payHereNotification({ order_id: orderId, payhere_amount: '499.00', custom_2: 'payg' }));

        expect(harness.models.User.docs[0]).toMatchObject({ plan: 'payg', paygCvSaveCredits: 3 });
    });

    it('does not upgrade twice or record a second transaction for a duplicate IPN', async () => {
        const harness = createHarness({ checkouts: [pendingCheckout()] });

        await sendIpn(harness, payHereNotification());
        const firstExpiry = harness.models.User.docs[0].planExpiresAt;
        const res = await sendIpn(harness, payHereNotification());

        expect(res.status).toHaveBeenCalledWith(200);
        expect(harness.models.User.findByIdAndUpdate).toHaveBeenCalledTimes(1);
        expect(harness.models.User.docs[0].planExpiresAt).toEqual(firstExpiry);
        expect(harness.models.PaymentTransaction.docs).toHaveLength(1);
        expect(harness.deps.sendBillingSuccessNotifications).toHaveBeenCalledTimes(1);
    });

    it('skips an IPN while another delivery of the same payment holds the processing lock', async () => {
        const harness = createHarness({
            checkouts: [pendingCheckout()],
            transactions: [{
                provider: 'payhere',
                paymentId: 'PH-320001',
                orderId: ORDER_ID,
                statusCode: '2',
                processed: false,
                processingStartedAt: new Date(NOW.getTime() - 2 * MINUTE_MS),
            }],
        });

        const res = await sendIpn(harness, payHereNotification());

        expect(res.status).toHaveBeenCalledWith(200);
        expect(harness.models.User.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(harness.models.PaymentTransaction.docs[0].processed).toBe(false);
    });

    it('takes over a processing lock older than 10 minutes', async () => {
        const harness = createHarness({
            checkouts: [pendingCheckout()],
            transactions: [{
                provider: 'payhere',
                paymentId: 'PH-320001',
                orderId: ORDER_ID,
                statusCode: '2',
                processed: false,
                processingStartedAt: new Date(NOW.getTime() - 11 * MINUTE_MS),
            }],
        });

        await sendIpn(harness, payHereNotification());

        expect(harness.models.User.docs[0].plan).toBe('monthly');
        expect(harness.models.PaymentTransaction.docs[0]).toMatchObject({ processed: true, processingStartedAt: NOW });
    });

    it('records a failed IPN as an unprocessed transaction and fails the checkout', async () => {
        const harness = createHarness({
            checkouts: [pendingCheckout({ couponCode: 'SAVE10', couponReserved: true })],
            coupons: [{ code: 'SAVE10', redeemedCount: 1 }],
        });

        const res = await sendIpn(harness, payHereNotification({ status_code: '-2' }));

        expect(res.status).toHaveBeenCalledWith(200);
        expect(harness.models.User.docs[0].plan).toBe('free');
        expect(harness.models.User.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(harness.models.PaymentTransaction.docs).toHaveLength(1);
        expect(harness.models.PaymentTransaction.docs[0]).toMatchObject({
            provider: 'payhere',
            paymentId: 'PH-320001',
            userId: USER_ID,
            plan: 'monthly',
            statusCode: '-2',
            processed: false,
        });
        expect(harness.models.CheckoutSession.docs[0]).toMatchObject({ status: 'failed', couponReserved: false });
        expect(harness.models.CheckoutSession.docs[0].billingReviewStatus).toBeUndefined();
        expect(harness.models.Coupon.docs[0].redeemedCount).toBe(0);
        expect(harness.deps.sendBillingSuccessNotifications).not.toHaveBeenCalled();
    });

    it('rejects an IPN with a bad signature without touching the user', async () => {
        const harness = createHarness({ checkouts: [pendingCheckout()] });

        const res = await sendIpn(harness, payHereNotification({ md5sig: 'A'.repeat(32) }));

        expect(res.status).toHaveBeenCalledWith(400);
        expect(harness.models.User.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(harness.models.PaymentTransaction.docs).toHaveLength(0);
        expect(harness.deps.sendBillingAlertNotification).toHaveBeenCalledWith(expect.objectContaining({
            event: 'payment.payhere_ipn_signature_failed',
        }));
    });

    it('rejects an IPN whose amount does not match the checkout', async () => {
        const harness = createHarness({ checkouts: [pendingCheckout()] });

        const res = await sendIpn(harness, payHereNotification({ payhere_amount: '1.00' }));

        expect(res.status).toHaveBeenCalledWith(400);
        expect(harness.models.User.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(harness.models.PaymentTransaction.docs).toHaveLength(0);
        expect(harness.deps.sendBillingAlertNotification).toHaveBeenCalledWith(expect.objectContaining({
            event: 'payment.payhere_ipn_amount_mismatch',
        }));
    });

    it('falls back to the custom fields and list price when no checkout session exists', async () => {
        const harness = createHarness();

        const res = await sendIpn(harness, payHereNotification());

        expect(res.status).toHaveBeenCalledWith(200);
        expect(harness.models.User.docs[0].plan).toBe('monthly');
        expect(harness.models.PaymentTransaction.docs[0]).toMatchObject({ processed: true, finalAmountCents: 219900 });
    });

    it('returns 404 when the paying user no longer exists', async () => {
        const harness = createHarness({ checkouts: [pendingCheckout()], users: [] });

        const res = await sendIpn(harness, payHereNotification());

        expect(res.status).toHaveBeenCalledWith(404);
        expect(harness.models.PaymentTransaction.docs).toHaveLength(0);
    });
});

describe('Lemon Squeezy webhook', () => {
    const usdCheckout = () => pendingCheckout({
        orderId: `${ORDER_ID}-ls`,
        currency: 'USD',
        baseAmountCents: 999,
        finalAmountCents: 999,
        expiresAt: new Date(NOW.getTime() + 30 * MINUTE_MS),
    });

    it('upgrades the user and records a processed transaction for order_created', async () => {
        const harness = createHarness({ checkouts: [usdCheckout()] });

        const res = await sendLemonSqueezyWebhook(harness, lemonSqueezyWebhook());

        expect(res.status).toHaveBeenCalledWith(200);
        expect(harness.models.User.docs[0].plan).toBe('monthly');
        expect(harness.models.CheckoutSession.docs[0].status).toBe('paid');
        expect(harness.models.PaymentTransaction.docs[0]).toMatchObject({
            provider: 'lemonsqueezy',
            paymentId: 'ls-order-1',
            amount: '9.99',
            currency: 'USD',
            statusCode: 'order_created',
            processed: true,
        });
        expect(harness.deps.sendBillingSuccessNotifications).toHaveBeenCalledTimes(1);
    });

    it('does not upgrade twice for a duplicate webhook', async () => {
        const harness = createHarness({ checkouts: [usdCheckout()] });

        await sendLemonSqueezyWebhook(harness, lemonSqueezyWebhook());
        await sendLemonSqueezyWebhook(harness, lemonSqueezyWebhook());

        expect(harness.models.User.findByIdAndUpdate).toHaveBeenCalledTimes(1);
        expect(harness.models.PaymentTransaction.docs).toHaveLength(1);
        expect(harness.deps.sendBillingSuccessNotifications).toHaveBeenCalledTimes(1);
    });

    it('ignores events other than order_created', async () => {
        const harness = createHarness({ checkouts: [usdCheckout()] });

        const res = await sendLemonSqueezyWebhook(harness, lemonSqueezyWebhook({ eventName: 'order_refunded' }));

        expect(res.status).toHaveBeenCalledWith(200);
        expect(harness.models.User.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(harness.models.PaymentTransaction.docs).toHaveLength(0);
    });

    it('rejects a webhook whose total does not match the checkout', async () => {
        const harness = createHarness({ checkouts: [usdCheckout()] });

        const res = await sendLemonSqueezyWebhook(harness, lemonSqueezyWebhook({ total: 1 }));

        expect(res.status).toHaveBeenCalledWith(400);
        expect(harness.models.User.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(harness.models.PaymentTransaction.docs).toHaveLength(0);
    });

    it('rejects a webhook with a bad signature', async () => {
        const harness = createHarness({ checkouts: [usdCheckout()] });
        harness.deps.verifyLemonSqueezySignature.mockReturnValue(false);

        const res = await sendLemonSqueezyWebhook(harness, lemonSqueezyWebhook());

        expect(res.status).toHaveBeenCalledWith(400);
        expect(harness.models.User.findByIdAndUpdate).not.toHaveBeenCalled();
    });
});

describe('checkout status', () => {
    it('reports an active plan once the IPN has upgraded the user', async () => {
        const harness = createHarness({ checkouts: [pendingCheckout()] });
        await sendIpn(harness, payHereNotification());
        const res = createResponse();

        await harness.handler('get', '/api/billing/checkout/:orderId/status')({ params: { orderId: ORDER_ID } }, res);

        expect(res.json).toHaveBeenCalledWith({
            status: 'paid',
            plan: 'monthly',
            planActive: true,
            user: { id: USER_ID, plan: 'monthly' },
        });
    });
});
