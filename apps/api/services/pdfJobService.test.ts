import { beforeEach, describe, expect, it, vi } from 'vitest';

const s3Send = vi.fn();
const pdfJobCreate = vi.fn();
const pdfJobFindOneAndUpdate = vi.fn();
const pdfJobUpdateOne = vi.fn();
const pdfJobFindById = vi.fn();
const pdfJobFindOne = vi.fn();
const enqueuePdfJob = vi.fn();
const isPdfQueueConfigured = vi.fn();

vi.mock('@aws-sdk/client-s3', () => ({
  GetObjectCommand: vi.fn(function GetObjectCommand(input) {
    return { type: 'GetObjectCommand', input };
  }),
  PutObjectCommand: vi.fn(function PutObjectCommand(input) {
    return { type: 'PutObjectCommand', input };
  }),
  S3Client: vi.fn(function S3Client(config) {
    return { config, send: s3Send };
  }),
}));

vi.mock('../server-models/PdfJob', () => ({
  default: {
    create: pdfJobCreate,
    findOneAndUpdate: pdfJobFindOneAndUpdate,
    updateOne: pdfJobUpdateOne,
    findById: pdfJobFindById,
    findOne: pdfJobFindOne,
  },
}));

vi.mock('./pdfQueueService', () => ({
  enqueuePdfJob,
  isPdfQueueConfigured,
}));

const makeResponse = () => {
  const res: any = {
    set: vi.fn(),
    status: vi.fn(),
    json: vi.fn(),
    send: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
};

const importService = async () => {
  vi.resetModules();
  return import('./pdfJobService');
};

describe('pdfJobService runtime download failures', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('PDF_OUTPUT_BUCKET_NAME', 'pdf-output-bucket');
    vi.stubEnv('PDF_OUTPUT_REGION', 'ap-south-1');
    s3Send.mockReset();
    pdfJobCreate.mockReset();
    pdfJobFindOneAndUpdate.mockReset();
    pdfJobUpdateOne.mockReset();
    pdfJobFindById.mockReset();
    pdfJobFindOne.mockReset();
    enqueuePdfJob.mockReset();
    isPdfQueueConfigured.mockReset();
  });

  it('returns 404 instead of attempting S3 download when a PDF job is not ready', async () => {
    const { sendPdfJobDownload } = await importService();
    const res = makeResponse();

    await sendPdfJobDownload(
      {
        _id: 'pdf-job-1',
        status: 'processing',
        outputKey: 'pdf-jobs/2026-06-10/pdf-job-1.pdf',
      } as any,
      res,
      'resume.pdf',
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'PDF is not ready.' });
    expect(s3Send).not.toHaveBeenCalled();
  });

  it('downloads a ready PDF from S3 and sets PDF response headers', async () => {
    const { sendPdfJobDownload } = await importService();
    const res = makeResponse();
    s3Send.mockResolvedValue({
      Body: {
        transformToByteArray: vi.fn().mockResolvedValue(Uint8Array.from([37, 80, 68, 70])),
      },
    });

    await sendPdfJobDownload(
      {
        _id: 'pdf-job-1',
        status: 'ready',
        outputBucket: 'custom-pdf-bucket',
        outputKey: 'pdf-jobs/2026-06-10/pdf-job-1.pdf',
        outputBytes: 4,
        renderer: 'lambda',
        templateSource: 's3',
      } as any,
      res,
      'my "resume".pdf',
    );

    expect(s3Send).toHaveBeenCalledWith({
      type: 'GetObjectCommand',
      input: {
        Bucket: 'custom-pdf-bucket',
        Key: 'pdf-jobs/2026-06-10/pdf-job-1.pdf',
      },
    });
    expect(res.set).toHaveBeenCalledWith({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="my resume.pdf"',
      'Content-Length': '4',
      'X-PDF-Renderer': 'lambda',
      'X-PDF-Template-Source': 's3',
    });
    expect(res.send).toHaveBeenCalledWith(Buffer.from([37, 80, 68, 70]));
  });

  it('returns 500 when S3 returns a ready object with an unstreamable body', async () => {
    const { sendPdfJobDownload } = await importService();
    const res = makeResponse();
    s3Send.mockResolvedValue({ Body: {} });

    await sendPdfJobDownload(
      {
        _id: 'pdf-job-1',
        status: 'ready',
        outputKey: 'pdf-jobs/2026-06-10/pdf-job-1.pdf',
      } as any,
      res,
      'resume.pdf',
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Could not stream PDF.' });
  });

  it('marks a job failed and rolls back quota when PDF generation fails', async () => {
    const { processPdfJob } = await importService();
    const job = {
      _id: 'pdf-job-1',
      userId: 'user-1',
      status: 'queued',
      cvData: { personalInfo: { fullName: 'Test User' } },
      template: 'professional',
      watermark: false,
      quotaReserved: true,
      createdAt: new Date('2026-06-10T12:00:00.000Z'),
    };
    const rollbackDownloadQuota = vi.fn().mockResolvedValue(undefined);
    const logError = vi.fn();
    pdfJobFindOneAndUpdate.mockResolvedValue(job);

    await expect(
      processPdfJob('pdf-job-1', {
        CV_TEMPLATES: [{ key: 'professional' }],
        DEFAULT_TEMPLATE: 'professional',
        TemplateSetting: {},
        fetchS3Text: vi.fn(),
        generateCVHTML: vi.fn(() => '<html></html>'),
        generatePdfDocument: vi.fn().mockRejectedValue(new Error('PDF Lambda failed with 500: timeout')),
        generateS3CVHTML: vi.fn().mockResolvedValue(null),
        renderCvTemplateString: vi.fn(),
        rollbackDownloadQuota,
        User: { findById: vi.fn().mockResolvedValue({ _id: 'user-1' }) },
        logError,
        logEvent: vi.fn(),
      }),
    ).rejects.toThrow('PDF Lambda failed with 500: timeout');

    expect(pdfJobUpdateOne).toHaveBeenCalledWith(
      { _id: 'pdf-job-1' },
      {
        $set: {
          status: 'failed',
          error: 'PDF Lambda failed with 500: timeout',
          completedAt: expect.any(Date),
        },
      },
    );
    expect(rollbackDownloadQuota).toHaveBeenCalledWith({ _id: 'user-1' });
    expect(logError).toHaveBeenCalledWith('pdf.job_failed', expect.any(Error), {
      userId: 'user-1',
      jobId: 'pdf-job-1',
    });
  });

  it('marks a job failed when S3 upload fails after PDF generation', async () => {
    const { processPdfJob } = await importService();
    const job = {
      _id: 'pdf-job-2',
      userId: 'user-2',
      status: 'queued',
      cvData: { personalInfo: { fullName: 'Test User' } },
      template: 'professional',
      watermark: false,
      quotaReserved: false,
      createdAt: new Date('2026-06-10T12:00:00.000Z'),
    };
    const logError = vi.fn();
    pdfJobFindOneAndUpdate.mockResolvedValue(job);
    s3Send.mockRejectedValue(new Error('AccessDenied'));

    await expect(
      processPdfJob('pdf-job-2', {
        CV_TEMPLATES: [{ key: 'professional' }],
        DEFAULT_TEMPLATE: 'professional',
        TemplateSetting: {},
        fetchS3Text: vi.fn(),
        generateCVHTML: vi.fn(() => '<html></html>'),
        generatePdfDocument: vi.fn().mockResolvedValue({
          buffer: Buffer.from('%PDF'),
          renderer: 'lambda',
          templateSource: 'built-in',
        }),
        generateS3CVHTML: vi.fn().mockResolvedValue(null),
        renderCvTemplateString: vi.fn(),
        rollbackDownloadQuota: vi.fn(),
        User: { findById: vi.fn() },
        logError,
        logEvent: vi.fn(),
      }),
    ).rejects.toThrow('AccessDenied');

    expect(pdfJobUpdateOne).toHaveBeenCalledWith(
      { _id: 'pdf-job-2' },
      {
        $set: {
          status: 'failed',
          error: 'AccessDenied',
          completedAt: expect.any(Date),
        },
      },
    );
    expect(logError).toHaveBeenCalledWith('pdf.job_failed', expect.any(Error), {
      userId: 'user-2',
      jobId: 'pdf-job-2',
    });
  });
});
