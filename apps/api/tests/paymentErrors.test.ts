import { describe, expect, it, vi } from 'vitest';
import { registerPaymentRoutes } from '../routes/payment';
import { API_ERROR_CODES } from '../server-utils/apiErrors';

const createRoutes = (overrides: Record<string, any> = {}) => {
  const routes: Array<{ method: 'get' | 'post'; path: string; handlers: any[] }> = [];
  const router = {
    get: vi.fn((path: string, ...handlers: any[]) => {
      routes.push({ method: 'get', path, handlers });
      return router;
    }),
    post: vi.fn((path: string, ...handlers: any[]) => {
      routes.push({ method: 'post', path, handlers });
      return router;
    }),
  } as any;

  registerPaymentRoutes(router, {
    billingQuoteLimiter: vi.fn(),
    requireAuth: vi.fn(),
    requireAdminPermission: vi.fn(() => vi.fn()),
    requireVerifiedEmail: vi.fn(() => true),
    isPaidBillingPlan: vi.fn(() => true),
    resolveBillingMarket: vi.fn(() => ({ market: 'local', country: 'LK', source: 'request' })),
    quoteCheckout: vi.fn(),
    currentUserId: vi.fn(() => 'user-1'),
    sendError: vi.fn(),
    logEvent: vi.fn(),
    ...overrides,
  });

  const handler = (method: 'get' | 'post', path: string) => (
    routes.find((route) => route.method === method && route.path === path)?.handlers.at(-1)
  );
  return { handler };
};

const response = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
  setHeader: vi.fn(),
});

describe('payment error contracts', () => {
  it('returns a coupon-specific code when a quote rejects a coupon', async () => {
    const { handler } = createRoutes({
      quoteCheckout: vi.fn().mockResolvedValue({ error: 'Coupon is not valid for this plan.' }),
    });
    const res = response();

    await handler('post', '/api/billing/quote')({ body: { plan: 'monthly', couponCode: 'OLD' } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Coupon is not valid for this plan.',
      code: API_ERROR_CODES.COUPON_INVALID,
    });
  });

  it('returns a stable code when checkout is disabled', async () => {
    const { handler } = createRoutes();
    const res = response();

    await handler('post', '/api/billing/payhere-checkout')({
      appSettings: { payhereEnabled: false },
      body: {},
    }, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Online checkout is temporarily disabled.',
      code: API_ERROR_CODES.CHECKOUT_DISABLED,
    });
  });

  it('returns a stable code when a checkout session is missing', async () => {
    const { handler } = createRoutes({
      CheckoutSession: { findOne: vi.fn().mockResolvedValue(null) },
    });
    const res = response();

    await handler('get', '/api/billing/checkout/:orderId/status')({
      params: { orderId: 'order-1' },
    }, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Checkout session not found.',
      code: API_ERROR_CODES.CHECKOUT_SESSION_NOT_FOUND,
    });
  });
});
