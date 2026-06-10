import { beforeEach, describe, expect, it, vi } from 'vitest';

const s3Send = vi.fn();
const textractSend = vi.fn();

vi.mock('@aws-sdk/client-s3', () => ({
  DeleteObjectCommand: vi.fn((input) => ({ input })),
  PutObjectCommand: vi.fn((input) => ({ input })),
  S3Client: vi.fn(function S3Client() {
    return { send: s3Send };
  }),
}));

vi.mock('@aws-sdk/client-textract', () => ({
  GetDocumentTextDetectionCommand: vi.fn((input) => ({ input })),
  StartDocumentTextDetectionCommand: vi.fn((input) => ({ input })),
  TextractClient: vi.fn(function TextractClient() {
    return { send: textractSend };
  }),
}));

const parseBody = (response: { body: string }) => JSON.parse(response.body);

describe('ocr lambda handler validation', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    s3Send.mockReset();
    textractSend.mockReset();
  });

  it('returns a configuration error when the OCR bucket is missing', async () => {
    const { handler } = await import('./handler');

    const response = await handler({
      mimeType: 'application/pdf',
      base64Data: Buffer.from('document').toString('base64'),
    });

    expect(response.statusCode).toBe(500);
    expect(parseBody(response)).toEqual({ error: 'OCR_DOCUMENT_BUCKET is not configured' });
    expect(s3Send).not.toHaveBeenCalled();
    expect(textractSend).not.toHaveBeenCalled();
  });

  it('rejects unsupported document types before uploading to S3', async () => {
    vi.stubEnv('OCR_DOCUMENT_BUCKET', 'ocr-bucket');
    const { handler } = await import('./handler');

    const response = await handler({
      mimeType: 'text/plain',
      base64Data: Buffer.from('document').toString('base64'),
    });

    expect(response.statusCode).toBe(400);
    expect(parseBody(response)).toEqual({ error: 'Unsupported document type' });
    expect(s3Send).not.toHaveBeenCalled();
    expect(textractSend).not.toHaveBeenCalled();
  });

  it('rejects requests with no document body before calling Textract', async () => {
    vi.stubEnv('OCR_DOCUMENT_BUCKET', 'ocr-bucket');
    const { handler } = await import('./handler');

    const response = await handler({
      body: JSON.stringify({ mimeType: 'application/pdf' }),
    });

    expect(response.statusCode).toBe(400);
    expect(parseBody(response)).toEqual({ error: 'Missing base64Data' });
    expect(s3Send).not.toHaveBeenCalled();
    expect(textractSend).not.toHaveBeenCalled();
  });
});
