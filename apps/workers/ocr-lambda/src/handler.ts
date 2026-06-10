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
const OCR_AI_PARSE_ENABLED = process.env.OCR_AI_PARSE_ENABLED !== 'false';
const OCR_AI_TIMEOUT_MS = Number(process.env.OCR_AI_TIMEOUT_MS || 30_000);
const OCR_AI_MODEL = process.env.OCR_AI_MODEL || 'gemini-flash-latest';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim();

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

const cleanText = (value: unknown, limit = 1600) => String(value || '')
  .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, limit);

const blankCv = () => ({
  personalInfo: {
    fullName: '',
    email: '',
    phone: '',
    address: '',
    summary: '',
    dob: '',
    nic: '',
    gender: '',
    nationality: '',
    religion: '',
    maritalStatus: '',
  },
  experience: [] as Array<{ company: string; position: string; startDate: string; endDate: string; description: string }>,
  education: [] as Array<{ institution: string; degree: string; startDate: string; endDate: string; description: string }>,
  skills: [] as Array<{ name: string; level: number; category?: string }>,
  courses: [] as Array<{ name: string; institution: string; startDate: string; endDate: string }>,
  languages: [] as Array<{ name: string; proficiency: string }>,
  projects: [] as Array<{ name: string; description: string; link: string }>,
  awards: [] as Array<{ name: string; date: string; issuer: string }>,
  references: [] as Array<{ name: string; position: string; company: string; email: string; phone: string }>,
});

const isPlainObject = (value: unknown): value is Record<string, any> => Boolean(value && typeof value === 'object' && !Array.isArray(value));

const normalizeDescription = (value: unknown, limit = 1400) => {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/<li\b/i.test(text)) return text.slice(0, limit);
  const lines = text
    .split(/\r?\n|(?:^|\s)[\u2022*-]\s+/)
    .map((line) => cleanText(line, 300))
    .filter(Boolean)
    .slice(0, 10);
  return lines.length > 1
    ? `<ul>${lines.map((line) => `<li>${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</li>`).join('')}</ul>`.slice(0, limit)
    : cleanText(text, limit);
};

const sanitizeParsedCv = (value: unknown) => {
  if (!isPlainObject(value)) return null;
  const blank = blankCv();
  const personalInfo = isPlainObject(value.personalInfo) ? value.personalInfo : {};

  const parsed = {
    ...blank,
    personalInfo: {
      ...blank.personalInfo,
      fullName: cleanText(personalInfo.fullName, 120),
      email: cleanText(personalInfo.email, 160),
      phone: cleanText(personalInfo.phone, 80),
      address: cleanText(personalInfo.address, 240),
      summary: cleanText(personalInfo.summary, 1200),
      dob: cleanText(personalInfo.dob, 40),
      nic: cleanText(personalInfo.nic, 40),
      gender: cleanText(personalInfo.gender, 40),
      nationality: cleanText(personalInfo.nationality, 80),
      religion: cleanText(personalInfo.religion, 80),
      maritalStatus: cleanText(personalInfo.maritalStatus, 40),
    },
    experience: Array.isArray(value.experience) ? value.experience.slice(0, 12).map((item: any) => ({
      company: cleanText(item?.company, 160),
      position: cleanText(item?.position, 160),
      startDate: cleanText(item?.startDate, 80),
      endDate: cleanText(item?.endDate, 80),
      description: normalizeDescription(item?.description, 1400),
    })).filter((item) => item.company || item.position || item.description) : [],
    education: Array.isArray(value.education) ? value.education.slice(0, 12).map((item: any) => ({
      institution: cleanText(item?.institution, 180),
      degree: cleanText(item?.degree, 180),
      startDate: cleanText(item?.startDate, 80),
      endDate: cleanText(item?.endDate, 80),
      description: normalizeDescription(item?.description, 900),
    })).filter((item) => item.institution || item.degree || item.description) : [],
    skills: Array.isArray(value.skills) ? value.skills.slice(0, 40).map((item: any) => ({
      name: cleanText(typeof item === 'string' ? item : item?.name, 80),
      level: Math.min(5, Math.max(1, Number(typeof item === 'string' ? 4 : item?.level || 4) || 4)),
      ...(typeof item !== 'string' && item?.category ? { category: cleanText(item.category, 80) } : {}),
    })).filter((item) => item.name) : [],
    courses: Array.isArray(value.courses) ? value.courses.slice(0, 12).map((item: any) => ({
      name: cleanText(item?.name, 160),
      institution: cleanText(item?.institution, 160),
      startDate: cleanText(item?.startDate, 80),
      endDate: cleanText(item?.endDate, 80),
    })).filter((item) => item.name || item.institution) : [],
    languages: Array.isArray(value.languages) ? value.languages.slice(0, 10).map((item: any) => ({
      name: cleanText(typeof item === 'string' ? item : item?.name, 80),
      proficiency: cleanText(typeof item === 'string' ? '' : item?.proficiency, 80),
    })).filter((item) => item.name) : [],
    projects: Array.isArray(value.projects) ? value.projects.slice(0, 12).map((item: any) => ({
      name: cleanText(item?.name, 160),
      description: cleanText(item?.description, 700),
      link: cleanText(item?.link, 240),
    })).filter((item) => item.name || item.description) : [],
    awards: Array.isArray(value.awards) ? value.awards.slice(0, 12).map((item: any) => ({
      name: cleanText(item?.name, 160),
      date: cleanText(item?.date, 80),
      issuer: cleanText(item?.issuer, 160),
    })).filter((item) => item.name) : [],
    references: Array.isArray(value.references) ? value.references.slice(0, 6).map((item: any) => ({
      name: cleanText(item?.name, 160),
      position: cleanText(item?.position, 160),
      company: cleanText(item?.company, 160),
      email: cleanText(item?.email, 160),
      phone: cleanText(item?.phone, 80),
    })).filter((item) => item.name || item.email || item.phone) : [],
  };

  const hasData = parsed.personalInfo.fullName
    || parsed.personalInfo.email
    || parsed.experience.length
    || parsed.education.length
    || parsed.skills.length;
  return hasData ? parsed : null;
};

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

const parseCvWithAi = async (text: string) => {
  if (!OCR_AI_PARSE_ENABLED || !GEMINI_API_KEY || text.trim().length < 20) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OCR_AI_TIMEOUT_MS);

  try {
    const prompt = `Extract structured data from this CV/resume OCR text.
Return only valid JSON matching this schema:
{
  "personalInfo": {"fullName":"","email":"","phone":"","address":"","summary":"","dob":"","nic":"","gender":"","nationality":"","religion":"","maritalStatus":""},
  "experience": [{"company":"","position":"","startDate":"","endDate":"","description":""}],
  "education": [{"institution":"","degree":"","startDate":"","endDate":"","description":""}],
  "skills": [{"name":"","level":4,"category":""}],
  "courses": [{"name":"","institution":"","startDate":"","endDate":""}],
  "languages": [{"name":"","proficiency":""}],
  "projects": [{"name":"","description":"","link":""}],
  "awards": [{"name":"","date":"","issuer":""}],
  "references": [{"name":"","position":"","company":"","email":"","phone":""}]
}
Rules:
- Do not invent missing data. Use empty strings or empty arrays for unknown fields.
- Keep separate work experience and education entries as separate array items.
- Put job responsibilities, achievements, key contributions, and body bullet lines in the correct experience description.
- Put education notes in education description only when clearly education-related.
- When a description has multiple bullet/body lines, return it as HTML using <ul><li>...</li></ul>.
- Do not mix contact/sidebar text into experience or education.

OCR text:
${text.slice(0, 24_000)}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${OCR_AI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      throw new Error(`Gemini parse failed with ${response.status}: ${details.slice(0, 300)}`);
    }

    const payload = await response.json();
    const rawText = payload?.candidates?.[0]?.content?.parts
      ?.map((part: any) => part?.text || '')
      .join('')
      .trim();
    if (!rawText) return null;

    const cleanJson = rawText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
    return sanitizeParsedCv(JSON.parse(cleanJson));
  } finally {
    clearTimeout(timeout);
  }
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
    let parsedCv = null;
    let structuredError = '';

    try {
      parsedCv = await parseCvWithAi(text);
    } catch (error: any) {
      structuredError = error?.message || 'AI structured parsing failed';
      console.warn('OCR Lambda structured parse warning:', error);
    }

    return jsonResponse(200, {
      text,
      usedOcr: true,
      source: 'textract',
      pagesLimit: OCR_TEXTRACT_MAX_PAGES,
      usedAi: Boolean(parsedCv),
      structuredProvider: parsedCv ? 'gemini' : 'none',
      ...(parsedCv ? { parsedCv } : {}),
      ...(structuredError ? { structuredError } : {}),
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
