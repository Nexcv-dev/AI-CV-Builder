import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  GetDocumentTextDetectionCommand,
  StartDocumentTextDetectionCommand,
  TextractClient,
  type Block,
} from '@aws-sdk/client-textract';
import { randomUUID } from 'node:crypto';

const REGION = process.env.AWS_REGION || 'eu-north-1';
const OCR_DOCUMENT_BUCKET = (process.env.OCR_DOCUMENT_BUCKET || '').trim();
const OCR_DOCUMENT_PREFIX = (process.env.OCR_DOCUMENT_PREFIX || 'ocr-imports').replace(/^\/+|\/+$/g, '');
const OCR_MAX_BYTES = Number(process.env.OCR_MAX_BYTES || 10 * 1024 * 1024);
const OCR_TEXTRACT_TIMEOUT_MS = Number(process.env.OCR_TEXTRACT_TIMEOUT_MS || 55_000);
const OCR_TEXTRACT_POLL_MS = Number(process.env.OCR_TEXTRACT_POLL_MS || 1_500);
const OCR_TEXTRACT_MAX_PAGES = Number(process.env.OCR_TEXTRACT_MAX_PAGES || 8);

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/tiff',
]);

const s3Client = new S3Client({ region: REGION });
const textractClient = new TextractClient({ region: REGION });

const jsonResponse = (statusCode: number, body: Record<string, unknown>) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const parsePayload = (event: any) => {
  if (event?.body) {
    const text = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : event.body;
    return typeof text === 'string' ? JSON.parse(text) : text;
  }
  return event || {};
};

const extensionForMimeType = (mimeType: string) => {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/tiff') return 'tiff';
  return 'jpg';
};

const tempKeyFor = (mimeType: string) => {
  const suffix = extensionForMimeType(mimeType);
  const fileName = `${Date.now()}-${randomUUID()}.${suffix}`;
  return OCR_DOCUMENT_PREFIX ? `${OCR_DOCUMENT_PREFIX}/${fileName}` : fileName;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const lineTextFromBlocks = (blocks: Block[] = []) => blocks
  .filter((block) => block.BlockType === 'LINE' && typeof block.Text === 'string')
  .sort((a, b) => {
    const pageDelta = (a.Page || 0) - (b.Page || 0);
    if (pageDelta !== 0) return pageDelta;
    const topDelta = (a.Geometry?.BoundingBox?.Top || 0) - (b.Geometry?.BoundingBox?.Top || 0);
    if (Math.abs(topDelta) > 0.01) return topDelta;
    return (a.Geometry?.BoundingBox?.Left || 0) - (b.Geometry?.BoundingBox?.Left || 0);
  })
  .map((block) => block.Text?.trim())
  .filter(Boolean)
  .join('\n');

const collectTextractText = async (jobId: string) => {
  const startedAt = Date.now();
  let nextToken: string | undefined;
  const blocks: Block[] = [];
  let status = 'IN_PROGRESS';

  while (Date.now() - startedAt < OCR_TEXTRACT_TIMEOUT_MS) {
    const response = await textractClient.send(new GetDocumentTextDetectionCommand({
      JobId: jobId,
      NextToken: nextToken,
      MaxResults: 1_000,
    }));

    status = response.JobStatus || 'UNKNOWN';
    if (status === 'FAILED' || status === 'PARTIAL_SUCCESS') {
      throw new Error(`Textract job ${status}: ${response.StatusMessage || 'No status message'}`);
    }

    if (status === 'SUCCEEDED') {
      blocks.push(...(response.Blocks || []));
      nextToken = response.NextToken;
      while (nextToken) {
        const page = await textractClient.send(new GetDocumentTextDetectionCommand({
          JobId: jobId,
          NextToken: nextToken,
          MaxResults: 1_000,
        }));
        blocks.push(...(page.Blocks || []));
        nextToken = page.NextToken;
      }
      return lineTextFromBlocks(blocks.filter((block) => !block.Page || block.Page <= OCR_TEXTRACT_MAX_PAGES));
    }

    await sleep(OCR_TEXTRACT_POLL_MS);
  }

  throw new Error(`Textract job timed out while status was ${status}`);
};

const extractWithTextract = async (bucket: string, key: string) => {
  const start = await textractClient.send(new StartDocumentTextDetectionCommand({
    DocumentLocation: {
      S3Object: { Bucket: bucket, Name: key },
    },
  }));

  if (!start.JobId) throw new Error('Textract did not return a JobId');
  return collectTextractText(start.JobId);
};

export async function handler(event: any) {
  let objectKey = '';

  try {
    if (!OCR_DOCUMENT_BUCKET) {
      return jsonResponse(500, { error: 'OCR_DOCUMENT_BUCKET is not configured' });
    }

    const payload = parsePayload(event);
    const mimeType = String(payload?.mimeType || '').toLowerCase();
    const base64Data = typeof payload?.base64Data === 'string' ? payload.base64Data : '';

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return jsonResponse(400, { error: 'Unsupported document type' });
    }
    if (!base64Data) {
      return jsonResponse(400, { error: 'Missing base64Data' });
    }

    const documentBuffer = Buffer.from(base64Data, 'base64');
    if (!documentBuffer.length || documentBuffer.length > OCR_MAX_BYTES) {
      return jsonResponse(400, { error: 'Document is empty or too large' });
    }

    objectKey = tempKeyFor(mimeType);
    await s3Client.send(new PutObjectCommand({
      Bucket: OCR_DOCUMENT_BUCKET,
      Key: objectKey,
      Body: documentBuffer,
      ContentType: mimeType,
      ServerSideEncryption: 'AES256',
    }));

    const text = await extractWithTextract(OCR_DOCUMENT_BUCKET, objectKey);
    return jsonResponse(200, {
      text,
      usedOcr: true,
      source: 'textract',
      pagesLimit: OCR_TEXTRACT_MAX_PAGES,
    });
  } catch (error: any) {
    console.error('OCR Lambda error:', error);
    return jsonResponse(500, {
      error: 'Failed to extract document text',
      details: error?.message || 'Unknown error',
    });
  } finally {
    if (objectKey) {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: OCR_DOCUMENT_BUCKET,
        Key: objectKey,
      })).catch((error) => console.warn('Failed to delete OCR temp object:', error));
    }
  }
}
