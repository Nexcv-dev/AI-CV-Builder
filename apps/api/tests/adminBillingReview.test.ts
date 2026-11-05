import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerAdminBillingRoutes, type AdminBillingRouteDeps } from '../routes/admin/billing';
import { formatUtcDay, startOfUtcDay } from '../server-utils/dates';
import { adminPaymentSummary, parsePaymentAmountCents } from '../server-utils/dto/admin';
import { isPaidBillingPlan } from '../server-utils/payHere';
import { escapeRegex, isValidDocumentId } from '../server-utils/requestValidation';
import { createFakeModel, createResponse, createRouteCapture, type FakeDoc } from './helpers/fakeModels';
import { stubRouteDeps } from './helpers/routeDeps';

const NOW = new Date('2026-11-05T10:00:00.000Z');
const MINUTE_MS = 60 * 1000;
const ADMIN_ID = '64b0000000000000000000ad';
const USER_ID = '64b0000000000000000000a1';

const id = (suffix: number) => `64b00000000000000000${suffix.toString(16).padStart(4, '0')}`;

const checkout = (overrides: FakeDoc): FakeDoc => ({
    userId: USER_ID,
    plan: 'monthly',
    currency: 'LKR',
    baseAmountCents: 219900,
    discountCents: 0,
    finalAmountCents: 219900,
    couponReserved: false,
    expiresAt: new Date(NOW.getTime() + 15 * MINUTE_MS),
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
});

const transaction = (overrides: FakeDoc): FakeDoc => ({
    provider: 'payhere',
    userId: USER_ID,
    plan: 'monthly',
    amount: '2199.00',
    currency: 'LKR',
    statusCode: '2',
    processed: true,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
});

const createHarness = (seed: { checkouts?: FakeDoc[]; transactions?: FakeDoc[] } = {}) => {
    const models = {
        CheckoutSession: createFakeModel(seed.checkouts),
        PaymentTransaction: createFakeModel(seed.transactions),
        User: createFakeModel([{ _id: USER_ID, email: 'buyer@example.com', displayName: 'Buyer' }]),
        Coupon: createFakeModel(),
    };
    const deps = {
        ...models,
        requireAdminPermission: vi.fn(() => vi.fn()),
        currentUserId: vi.fn(() => ADMIN_ID),
        sanitizeProfileField: vi.fn((value: unknown, maxLength = 160) => String(value ?? '').trim().slice(0, maxLength)),
        isValidDocumentId,
        isPaidBillingPlan,
        escapeRegex,
        parsePaymentAmountCents,
        adminPaymentSummary,
        startOfUtcDay,
        formatUtcDay,
        recordAdminAuditLog: vi.fn(async () => undefined),
        sendError: vi.fn((res: any, status: number, message: string) => res.status(status).json({ error: message })),
    };
    const { router, handler } = createRouteCapture();
    registerAdminBillingRoutes(router, stubRouteDeps<AdminBillingRouteDeps>(deps));
    return { models, deps, handler };
};

const listPayments = async (harness: ReturnType<typeof createHarness>, query: Record<string, string> = {}) => {
    const res = createResponse();
    await harness.handler('get', '/api/admin/payments')({ query }, res);
    expect(res.status).not.toHaveBeenCalled();
    return res.json.mock.calls[0][0];
};

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
});

afterEach(() => {
    vi.useRealTimers();
});

describe('admin billing Needs Review queue', () => {
    const seed = () => ({
        checkouts: [
            checkout({ _id: id(1), orderId: 'failed-open', status: 'failed' }),
            checkout({ _id: id(2), orderId: 'failed-resolved', status: 'failed', billingReviewStatus: 'resolved' }),
            checkout({ _id: id(3), orderId: 'cancelled', status: 'cancelled', billingReviewStatus: 'resolved' }),
            checkout({ _id: id(4), orderId: 'expired', status: 'expired', billingReviewStatus: 'resolved' }),
            // Rows written before cancel/expiry started resolving the review still say 'open'.
            checkout({ _id: id(8), orderId: 'cancelled-legacy', status: 'cancelled', billingReviewStatus: 'open' }),
            checkout({ _id: id(9), orderId: 'expired-legacy', status: 'expired' }),
            checkout({ _id: id(5), orderId: 'paid', status: 'paid' }),
            checkout({ _id: id(6), orderId: 'pending', status: 'pending' }),
            checkout({ _id: id(7), orderId: 'abandoned', status: 'pending', expiresAt: new Date(NOW.getTime() - MINUTE_MS) }),
        ],
        transactions: [
            transaction({ _id: id(11), paymentId: 'PH-failed', orderId: 'failed-open', statusCode: '-2', processed: false }),
            transaction({ _id: id(12), paymentId: 'PH-failed-resolved', orderId: 'failed-resolved', statusCode: '-2', processed: false, billingReviewStatus: 'resolved' }),
            transaction({ _id: id(13), paymentId: 'PH-paid', orderId: 'paid' }),
        ],
    });

    it('lists failed checkouts and unprocessed payments, but not cancelled or expired checkouts', async () => {
        const harness = createHarness(seed());

        const body = await listPayments(harness, { status: 'review' });

        const items = body.payments.map((item: any) => `${item.reviewType}:${item.orderId}`).sort();
        expect(items).toEqual(['checkout:failed-open', 'payment:failed-open']);
        expect(body.summary).toMatchObject({
            checkoutReviewCount: 1,
            failedPaymentCount: 1,
            pendingCheckoutCount: 1,
        });
    });

    it('expires abandoned checkouts before counting, so they never reach the queue', async () => {
        const harness = createHarness(seed());

        await listPayments(harness, { status: 'review' });

        expect(harness.models.CheckoutSession.docs.find((doc) => doc.orderId === 'abandoned')).toMatchObject({
            status: 'expired',
            billingReviewStatus: 'resolved',
            expiredAt: NOW,
        });
    });

    it('maps a failed checkout to a checkout review item', async () => {
        const harness = createHarness(seed());

        const body = await listPayments(harness, { status: 'review' });

        const item = body.payments.find((entry: any) => entry.reviewType === 'checkout');
        expect(item).toMatchObject({
            id: id(1),
            provider: 'payhere',
            paymentId: 'Failed checkout',
            orderId: 'failed-open',
            reviewStatus: 'failed',
            billingReviewStatus: 'open',
            amount: '2199.00',
            amountCents: 219900,
            currency: 'LKR',
            processed: false,
        });
    });

    it('lists processed and unprocessed payments without checkout items outside the review filter', async () => {
        const harness = createHarness(seed());

        const body = await listPayments(harness);

        expect(body.payments.map((item: any) => item.paymentId).sort()).toEqual(['PH-failed', 'PH-failed-resolved', 'PH-paid']);
        expect(body.payments.find((item: any) => item.paymentId === 'PH-paid').reviewStatus).toBe('processed');
        expect(body.payments.find((item: any) => item.paymentId === 'PH-failed').reviewStatus).toBe('unprocessed');
    });
});

describe('admin billing revenue summary', () => {
    it('counts each processed payment once, split by currency, provider, plan, and day', async () => {
        const yesterday = new Date(NOW.getTime() - 24 * 60 * MINUTE_MS);
        const harness = createHarness({
            transactions: [
                transaction({ paymentId: 'PH-1', orderId: 'o1', amount: '2199.00', plan: 'monthly' }),
                transaction({ paymentId: 'PH-2', orderId: 'o2', amount: '499.00', plan: 'payg', createdAt: yesterday }),
                transaction({ paymentId: 'LS-1', orderId: 'o3', provider: 'lemonsqueezy', amount: '9.99', currency: 'USD', plan: 'monthly' }),
                transaction({ paymentId: 'PH-3', orderId: 'o4', amount: '2199.00', processed: false, statusCode: '-2' }),
            ],
        });

        const { summary } = await listPayments(harness);

        expect(summary.totalRevenueCents).toBe(269800);
        expect(summary.currency).toBe('LKR');
        expect(summary.processedCount).toBe(3);
        expect(summary.revenueByCurrency).toEqual({
            LKR: { cents: 269800, count: 2 },
            USD: { cents: 999, count: 1 },
        });
        expect(summary.revenueByProvider).toEqual({
            payhere: { count: 2, byCurrency: { LKR: { cents: 269800, count: 2 } } },
            lemonsqueezy: { count: 1, byCurrency: { USD: { cents: 999, count: 1 } } },
        });
        expect(summary.revenueByPlan).toEqual({ monthly: 219900, payg: 49900 });
        expect(summary.revenueByPlanCurrency).toEqual({ monthly: { LKR: 219900, USD: 999 }, payg: { LKR: 49900 } });
        expect(summary.dailyRevenue).toHaveLength(7);
        expect(summary.dailyRevenue.at(-1)).toEqual({ day: '2026-11-05', cents: 219900 });
        expect(summary.dailyRevenue.at(-2)).toEqual({ day: '2026-11-04', cents: 49900 });
        expect(summary.dailyRevenueByCurrency.at(-1)).toEqual({ day: '2026-11-05', currencies: { LKR: 219900, USD: 999 } });
    });
});

describe('admin billing review resolution', () => {
    it('marks a checkout review resolved with the admin note and records an audit log', async () => {
        const harness = createHarness({ checkouts: [checkout({ _id: id(1), orderId: 'failed-open', status: 'failed' })] });
        const res = createResponse();

        await harness.handler('patch', '/api/admin/billing/review/:type/:id')({
            params: { type: 'checkout', id: id(1) },
            body: { note: '  Customer paid by bank transfer.  ' },
            ip: '127.0.0.1',
            get: vi.fn(() => 'vitest'),
        }, res);

        expect(harness.models.CheckoutSession.docs[0]).toMatchObject({
            billingReviewStatus: 'resolved',
            reviewNote: 'Customer paid by bank transfer.',
            reviewedBy: ADMIN_ID,
            reviewedAt: NOW,
        });
        expect(res.json.mock.calls[0][0].payment).toMatchObject({
            id: id(1),
            reviewType: 'checkout',
            billingReviewStatus: 'resolved',
            reviewNote: 'Customer paid by bank transfer.',
        });
        expect(harness.deps.recordAdminAuditLog).toHaveBeenCalledWith(expect.objectContaining({
            actorId: ADMIN_ID,
            action: 'billing.review.resolved',
            targetType: 'checkout_session',
            targetId: id(1),
            targetLabel: 'failed-open',
            metadata: { reviewType: 'checkout', orderId: 'failed-open', noteProvided: true },
        }));
    });

    it('marks a payment review resolved and returns the payment summary', async () => {
        const harness = createHarness({
            transactions: [transaction({ _id: id(11), paymentId: 'PH-failed', orderId: 'o1', statusCode: '-2', processed: false })],
        });
        const res = createResponse();

        await harness.handler('patch', '/api/admin/billing/review/:type/:id')({
            params: { type: 'payment', id: id(11) },
            body: {},
            get: vi.fn(),
        }, res);

        expect(harness.models.PaymentTransaction.docs[0]).toMatchObject({ billingReviewStatus: 'resolved', reviewNote: '' });
        expect(res.json.mock.calls[0][0].payment).toMatchObject({
            paymentId: 'PH-failed',
            reviewType: 'payment',
            reviewStatus: 'unprocessed',
            billingReviewStatus: 'resolved',
        });
        expect(harness.deps.recordAdminAuditLog).toHaveBeenCalledWith(expect.objectContaining({
            targetType: 'payment_transaction',
            targetLabel: 'PH-failed',
            metadata: { reviewType: 'payment', orderId: 'o1', noteProvided: false },
        }));
    });

    it('drops a resolved item out of the Needs Review queue', async () => {
        const harness = createHarness({ checkouts: [checkout({ _id: id(1), orderId: 'failed-open', status: 'failed' })] });

        await harness.handler('patch', '/api/admin/billing/review/:type/:id')({
            params: { type: 'checkout', id: id(1) },
            body: {},
            get: vi.fn(),
        }, createResponse());
        const body = await listPayments(harness, { status: 'review' });

        expect(body.payments).toHaveLength(0);
        expect(body.summary.checkoutReviewCount).toBe(0);
    });

    it.each([
        [{ type: 'refund', id: id(1) }, 400],
        [{ type: 'checkout', id: 'not-an-id' }, 400],
        [{ type: 'checkout', id: id(99) }, 404],
    ])('rejects %o with %i', async (params, status) => {
        const harness = createHarness();
        const res = createResponse();

        await harness.handler('patch', '/api/admin/billing/review/:type/:id')({ params, body: {}, get: vi.fn() }, res);

        expect(res.status).toHaveBeenCalledWith(status);
        expect(harness.deps.recordAdminAuditLog).not.toHaveBeenCalled();
    });
});
