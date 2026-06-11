import { beforeEach, describe, expect, it, vi } from 'vitest';

const sqsSend = vi.fn();
const logEvent = vi.fn();
const sentMessages: any[] = [];
const createdClients: any[] = [];

vi.mock('@aws-sdk/client-sqs', () => ({
  SendMessageCommand: vi.fn(function SendMessageCommand(input) {
    sentMessages.push(input);
    return { input };
  }),
  SQSClient: vi.fn(function SQSClient(config) {
    createdClients.push(config);
    return { send: sqsSend };
  }),
}));

vi.mock('../server-utils/logger', () => ({
  logEvent,
}));

describe('queue services', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    sqsSend.mockReset();
    sqsSend.mockResolvedValue({});
    logEvent.mockReset();
    sentMessages.length = 0;
    createdClients.length = 0;
  });

  it('does not enqueue PDF jobs when the queue is not configured', async () => {
    const { enqueuePdfJob, isPdfQueueConfigured } = await import('./pdfQueueService');

    expect(isPdfQueueConfigured()).toBe(false);
    await expect(enqueuePdfJob('pdf-job-1')).resolves.toBe(false);

    expect(sqsSend).not.toHaveBeenCalled();
    expect(sentMessages).toEqual([]);
  });

  it('enqueues PDF jobs with the expected payload and region', async () => {
    vi.stubEnv('PDF_QUEUE_URL', 'https://sqs.example/pdf');
    vi.stubEnv('PDF_QUEUE_REGION', 'ap-south-1');
    const { enqueuePdfJob, isPdfQueueConfigured } = await import('./pdfQueueService');

    expect(isPdfQueueConfigured()).toBe(true);
    await expect(enqueuePdfJob('pdf-job-1')).resolves.toBe(true);

    expect(createdClients).toEqual([{ region: 'ap-south-1' }]);
    expect(sqsSend).toHaveBeenCalledTimes(1);
    expect(sentMessages).toEqual([
      {
        QueueUrl: 'https://sqs.example/pdf',
        MessageBody: JSON.stringify({ jobId: 'pdf-job-1', type: 'cv-pdf' }),
      },
    ]);
  });

  it('enqueues HTML PDF jobs with the html-pdf payload type', async () => {
    vi.stubEnv('HTML_PDF_QUEUE_URL', 'https://sqs.example/html-pdf');
    vi.stubEnv('AWS_REGION', 'eu-west-1');
    const { enqueueHtmlPdfJob, isHtmlPdfQueueConfigured } = await import('./htmlPdfQueueService');

    expect(isHtmlPdfQueueConfigured()).toBe(true);
    await expect(enqueueHtmlPdfJob('html-pdf-job-1')).resolves.toBe(true);

    expect(createdClients).toEqual([{ region: 'eu-west-1' }]);
    expect(sentMessages).toEqual([
      {
        QueueUrl: 'https://sqs.example/html-pdf',
        MessageBody: JSON.stringify({ jobId: 'html-pdf-job-1', type: 'html-pdf' }),
      },
    ]);
  });

  it('supports the CV import queue alias and sends a jobId payload', async () => {
    vi.stubEnv('SQS_CV_IMPORT_QUEUE_URL', 'https://sqs.example/cv-import');
    vi.stubEnv('CV_IMPORT_QUEUE_REGION', 'us-east-1');
    const { enqueueCvImportJob, isCvImportQueueConfigured } = await import('./cvImportQueueService');

    expect(isCvImportQueueConfigured()).toBe(true);
    await expect(enqueueCvImportJob('cv-import-job-1')).resolves.toBe(true);

    expect(createdClients).toEqual([{ region: 'us-east-1' }]);
    expect(sentMessages).toEqual([
      {
        QueueUrl: 'https://sqs.example/cv-import',
        MessageBody: JSON.stringify({ jobId: 'cv-import-job-1' }),
      },
    ]);
  });

  it('supports the email queue alias, sends the email payload, and logs the queue event', async () => {
    vi.stubEnv('SQS_EMAIL_QUEUE_URL', 'https://sqs.example/email');
    vi.stubEnv('EMAIL_QUEUE_REGION', 'ap-southeast-1');
    const { enqueueEmail, isEmailQueueConfigured } = await import('./emailQueueService');
    const email = {
      to: 'candidate@example.com',
      from: 'hello@nexcv.com',
      subject: 'Welcome',
      text: 'Welcome to NexCV.',
    };

    expect(isEmailQueueConfigured()).toBe(true);
    await expect(enqueueEmail(email)).resolves.toBe(true);

    expect(createdClients).toEqual([{ region: 'ap-southeast-1' }]);
    expect(sentMessages).toEqual([
      {
        QueueUrl: 'https://sqs.example/email',
        MessageBody: JSON.stringify({ email }),
      },
    ]);
    expect(logEvent).toHaveBeenCalledWith('info', 'email.queued', {
      to: 'candidate@example.com',
      subject: 'Welcome',
    });
  });
});
