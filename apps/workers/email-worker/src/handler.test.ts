import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendAppEmail = vi.fn();

vi.mock('../../../api/services/emailService', () => ({
  sendAppEmail,
}));

const sqsEvent = (payloads: unknown[]) => ({
  Records: payloads.map((payload) => ({ body: JSON.stringify(payload) })),
});

describe('email worker handler', () => {
  beforeEach(() => {
    sendAppEmail.mockReset();
  });

  it('sends every email payload from the SQS event', async () => {
    const { handler } = await import('./handler');
    const firstEmail = {
      to: 'first@example.com',
      from: 'hello@nexcv.com',
      subject: 'Welcome',
      text: 'Thanks for signing up.',
      html: '<p>Thanks for signing up.</p>',
      replyTo: 'support@nexcv.com',
    };
    const secondEmail = {
      to: 'second@example.com',
      from: 'hello@nexcv.com',
      subject: 'Receipt',
      text: 'Your receipt is ready.',
    };

    await expect(handler(sqsEvent([{ email: firstEmail }, { email: secondEmail }]))).resolves.toEqual({
      processed: 2,
    });

    expect(sendAppEmail).toHaveBeenCalledTimes(2);
    expect(sendAppEmail).toHaveBeenNthCalledWith(1, firstEmail);
    expect(sendAppEmail).toHaveBeenNthCalledWith(2, secondEmail);
  });

  it('rejects malformed messages before sending mail', async () => {
    const { handler } = await import('./handler');

    await expect(handler(sqsEvent([{ email: { to: 'missing-fields@example.com' } }]))).rejects.toThrow(
      'Email payload is missing required fields.',
    );

    expect(sendAppEmail).not.toHaveBeenCalled();
  });
});
