import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/emailService', () => ({
  sendNotificationEmail: vi.fn().mockResolvedValue(true),
  sendSystemEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('Billing alerts', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sends PayHere IPN alerts to the configured admin notification email', async () => {
    vi.stubEnv('ADMIN_NOTIFICATION_EMAIL', 'billing-alerts@example.com');

    const emailService = await import('../services/emailService');
    const { sendBillingAlertNotification } = await import('../server-utils/userAuth');

    await sendBillingAlertNotification({
      event: 'payment.payhere_ipn_signature_failed',
      reason: 'IPN signature verification failed.',
      orderId: 'NXCV-order-123',
      paymentId: 'payhere-payment-123',
      statusCode: '2',
      userId: 'user-123',
      plan: 'payg',
      amount: '499.00',
      currency: 'LKR',
    });

    expect(emailService.sendNotificationEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'billing-alerts@example.com',
      subject: 'NexCV PayHere alert - payment.payhere_ipn_signature_failed',
      text: expect.stringContaining('Order ID: NXCV-order-123'),
    }));
    expect(emailService.sendNotificationEmail).toHaveBeenCalledWith(expect.objectContaining({
      text: expect.stringContaining('Payment ID: payhere-payment-123'),
    }));
    expect(emailService.sendNotificationEmail).toHaveBeenCalledWith(expect.objectContaining({
      text: expect.stringContaining('Reason: IPN signature verification failed.'),
    }));
  }, 15000);
});
