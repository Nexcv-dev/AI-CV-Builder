import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { parsePdfJobsFromSqsEvent, type PdfQueueJobType } from '@nexcv/shared/queuePayloads';
import { MongoClient, ObjectId } from 'mongodb';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const MONGODB_URI = (process.env.MONGODB_URI || process.env.MONGO_URI || '').trim();
const PDF_LAMBDA_URL = (process.env.PDF_LAMBDA_URL || '').trim();
const PDF_OUTPUT_BUCKET = (process.env.PDF_OUTPUT_BUCKET_NAME || process.env.S3_PDF_BUCKET_NAME || '').trim();
const PDF_OUTPUT_PREFIX = (process.env.PDF_OUTPUT_PREFIX || 'pdf-jobs').replace(/^\/+|\/+$/g, '');
const HTML_PDF_OUTPUT_BUCKET = (process.env.HTML_PDF_OUTPUT_BUCKET_NAME || PDF_OUTPUT_BUCKET).trim();
const HTML_PDF_OUTPUT_PREFIX = (process.env.HTML_PDF_OUTPUT_PREFIX || 'html-pdf-jobs').replace(/^\/+|\/+$/g, '');
const PDF_LAMBDA_TIMEOUT_MS = Number(process.env.PDF_LAMBDA_TIMEOUT_MS || 45000);
const PDF_JOBS_COLLECTION = process.env.PDF_JOBS_COLLECTION || 'pdfjobs';
const HTML_PDF_JOBS_COLLECTION = process.env.HTML_PDF_JOBS_COLLECTION || 'htmlpdfjobs';
const USERS_COLLECTION = process.env.USERS_COLLECTION || 'users';
const DOWNLOAD_QUOTAS_COLLECTION = process.env.DOWNLOAD_QUOTAS_COLLECTION || 'downloadquotas';
const HTML_PDF_QUOTAS_COLLECTION = process.env.HTML_PDF_QUOTAS_COLLECTION || 'htmlpdfquotas';
const HTML_PDF_GUEST_QUOTAS_COLLECTION = process.env.HTML_PDF_GUEST_QUOTAS_COLLECTION || 'htmlpdfguestquotas';
const HTML_PDF_RENDER_TIMEOUT_MS = Number(process.env.HTML_PDF_RENDER_TIMEOUT_MS || 30000);
const MAX_HTML_PDF_DATA_URI_LENGTH = 2 * 1024 * 1024;
const HTML_PDF_PAGE_PIXELS = {
  A4: { width: 794, height: 1122 },
  Letter: { width: 816, height: 1056 },
} as const;
const MIN_HTML_PDF_SCALE = 0.1;
const HTML_PDF_SINGLE_PAGE_FIT_MAX_PAGES = 2;
const BROWSER_LAUNCH_MAX_ATTEMPTS = Math.max(1, Number(process.env.PDF_BROWSER_LAUNCH_ATTEMPTS || 3));

let mongoClient: MongoClient | null = null;
let s3Client: S3Client | null = null;
let chromiumExecutablePathPromise: Promise<string> | null = null;

const getMongoClient = async () => {
  if (!MONGODB_URI) throw new Error('MONGODB_URI is not configured.');
  if (!mongoClient) {
    mongoClient = new MongoClient(MONGODB_URI, {
      maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE || 3),
      serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 10000),
    });
    await mongoClient.connect();
  }
  return mongoClient;
};

const getS3Client = () => {
  if (!PDF_OUTPUT_BUCKET) throw new Error('PDF_OUTPUT_BUCKET_NAME is not configured.');
  if (!s3Client) {
    s3Client = new S3Client({ region: process.env.PDF_OUTPUT_REGION || process.env.AWS_REGION || 'eu-north-1' });
  }
  return s3Client;
};

const getDatabase = async () => {
  const client = await getMongoClient();
  return client.db(process.env.MONGODB_DB_NAME || undefined);
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getChromiumExecutablePath = () => {
  if (!chromiumExecutablePathPromise) {
    chromiumExecutablePathPromise = chromium.executablePath();
  }
  return chromiumExecutablePathPromise;
};

const isRetryableBrowserLaunchError = (error: any) => {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return code === 'ETXTBSY' || message.includes('ETXTBSY') || message.includes('Text file busy');
};

const launchBrowser = async () => {
  const launchOptions: any = {
    args: chromium.args,
    defaultViewport: (chromium as any).defaultViewport,
    executablePath: await getChromiumExecutablePath(),
    headless: (chromium as any).headless,
    ignoreHTTPSErrors: true,
  };
  let lastError: any;
  for (let attempt = 1; attempt <= BROWSER_LAUNCH_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await puppeteer.launch(launchOptions);
    } catch (error) {
      lastError = error;
      if (!isRetryableBrowserLaunchError(error) || attempt === BROWSER_LAUNCH_MAX_ATTEMPTS) throw error;
      const delayMs = 250 * attempt;
      console.warn(`Chromium launch failed with a transient file-busy error; retrying in ${delayMs}ms.`, error);
      await wait(delayMs);
    }
  }
  throw lastError;
};

const pdfWorkerMode = (): PdfQueueJobType => process.env.PDF_WORKER_MODE === 'html-pdf' ? 'html-pdf' : 'cv-pdf';

const pdfOutputKey = (job: any) => {
  const createdAt = job.createdAt instanceof Date ? job.createdAt : new Date();
  const createdDay = createdAt.toISOString().slice(0, 10);
  return `${PDF_OUTPUT_PREFIX}/${createdDay}/${String(job._id)}.pdf`;
};

const htmlPdfOutputKey = (job: any) => {
  const createdAt = job.createdAt instanceof Date ? job.createdAt : new Date();
  const createdDay = createdAt.toISOString().slice(0, 10);
  return `${HTML_PDF_OUTPUT_PREFIX}/${createdDay}/${String(job._id)}.pdf`;
};

const callPdfLambda = async (job: any) => {
  if (!PDF_LAMBDA_URL) throw new Error('PDF_LAMBDA_URL is not configured.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PDF_LAMBDA_TIMEOUT_MS);
  try {
    const response = await fetch(PDF_LAMBDA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Source': 'cv-builder-pdf-worker',
      },
      body: JSON.stringify({
        cvData: job.cvData,
        template: job.template,
        watermark: Boolean(job.watermark),
      }),
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type') || '';
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`PDF Lambda failed with ${response.status}: ${detail.slice(0, 500)}`);
    }

    if (contentType.includes('application/pdf')) {
      return {
        buffer: Buffer.from(await response.arrayBuffer()),
        templateSource: response.headers.get('x-pdf-template-source') || 'unknown',
        s3TemplateDebug: response.headers.get('x-pdf-s3-debug') || '',
        lambdaBuild: response.headers.get('x-pdf-lambda-build') || '',
        renderer: 'lambda',
      };
    }

    const payload = await response.json();
    if (payload?.isBase64Encoded && typeof payload.body === 'string') {
      return {
        buffer: Buffer.from(payload.body, 'base64'),
        templateSource: payload.headers?.['X-PDF-Template-Source'] || payload.headers?.['x-pdf-template-source'] || 'unknown',
        s3TemplateDebug: payload.headers?.['X-PDF-S3-Debug'] || payload.headers?.['x-pdf-s3-debug'] || '',
        lambdaBuild: payload.headers?.['X-PDF-Lambda-Build'] || payload.headers?.['x-pdf-lambda-build'] || '',
        renderer: 'lambda',
      };
    }

    throw new Error('PDF Lambda returned an unexpected response format.');
  } finally {
    clearTimeout(timeout);
  }
};

const planUsesDailyQuota = (plan: string) => plan === 'payg' || plan === 'monthly' || plan === 'quarterly';

const rollbackDownloadQuota = async (db: any, userId: ObjectId) => {
  const user = await db.collection(USERS_COLLECTION).findOne({ _id: userId }, { projection: { plan: 1 } });
  const plan = user?.plan || 'free';
  const day = planUsesDailyQuota(plan) ? new Date().toISOString().slice(0, 10) : 'free-lifetime';
  await db.collection(DOWNLOAD_QUOTAS_COLLECTION).updateOne(
    { userId, day, count: { $gt: 0 } },
    { $inc: { count: -1 } }
  );
};

const rollbackHtmlPdfQuota = async (db: any, owner: { userId?: ObjectId; guestKey?: string }) => {
  const day = new Date().toISOString().slice(0, 10);
  const collection = owner.userId ? HTML_PDF_QUOTAS_COLLECTION : HTML_PDF_GUEST_QUOTAS_COLLECTION;
  const filter = owner.userId
    ? { userId: owner.userId, day, count: { $gt: 0 } }
    : { guestKey: owner.guestKey, day, count: { $gt: 0 } };
  await db.collection(collection).updateOne(
    filter,
    { $inc: { count: -1 } }
  );
};

const buildHtmlPdfDocument = (html: string, css: string) => {
  const style = `<style>
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    img { max-width: 100%; }
    ${css || ''}
  </style>`;
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${style}</head>`);
  if (/<body[^>]*>/i.test(html)) return html.replace(/<body([^>]*)>/i, `<head>${style}</head><body$1>`);
  return `<!DOCTYPE html><html><head><meta charset="utf-8">${style}</head><body>${html}</body></html>`;
};

const calculateHtmlPdfFitScale = ({
  contentWidth,
  contentHeight,
  pageSize,
}: {
  contentWidth: number;
  contentHeight: number;
  pageSize: keyof typeof HTML_PDF_PAGE_PIXELS;
}) => {
  const page = HTML_PDF_PAGE_PIXELS[pageSize];
  const widthScale = contentWidth > page.width ? page.width / contentWidth : 1;
  const heightScale = contentHeight > page.height ? page.height / contentHeight : 1;
  return Math.max(MIN_HTML_PDF_SCALE, Math.min(1, widthScale, heightScale));
};

const calculateHtmlPdfAutoScale = ({
  contentWidth,
  contentHeight,
  pageSize,
}: {
  contentWidth: number;
  contentHeight: number;
  pageSize: keyof typeof HTML_PDF_PAGE_PIXELS;
}) => {
  const page = HTML_PDF_PAGE_PIXELS[pageSize];
  const widthScale = contentWidth > page.width ? page.width / contentWidth : 1;
  const canFitSinglePage = contentHeight <= page.height * HTML_PDF_SINGLE_PAGE_FIT_MAX_PAGES;
  if (!canFitSinglePage) return Math.max(MIN_HTML_PDF_SCALE, Math.min(1, widthScale));
  return calculateHtmlPdfFitScale({ contentWidth, contentHeight, pageSize });
};

const renderHtmlToPdf = async (job: any) => {
  const browser = await launchBrowser();
  let page: any = null;
  try {
    const pageSize = job.pageSize === 'Letter' ? 'Letter' : 'A4';
    page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on('request', (request: any) => {
      const url = request.url();
      if (url === 'about:blank' || url.startsWith('data:')) {
        if (url.startsWith('data:') && url.length > MAX_HTML_PDF_DATA_URI_LENGTH) return request.abort();
        return request.continue();
      }
      return request.abort();
    });
    const pageSizePixels = HTML_PDF_PAGE_PIXELS[pageSize];
    await page.setViewport({ width: pageSizePixels.width, height: pageSizePixels.height, deviceScaleFactor: 1 });
    await page.setContent(buildHtmlPdfDocument(job.html || '', job.css || ''), { waitUntil: 'domcontentloaded', timeout: HTML_PDF_RENDER_TIMEOUT_MS });
    await page.evaluate(async () => {
      const images = Array.from(document.querySelectorAll('img'));
      await Promise.all(images.map((img: any) => img.decode().catch(() => undefined)));
    });
    await new Promise((resolve) => setTimeout(resolve, 250));
    const dimensions = await page.evaluate(() => {
      const body = document.body;
      const root = document.documentElement;
      const pageLikeElements = Array.from(document.querySelectorAll('main.cv, .cv, main.page, .page, [data-pdf-page]'))
        .filter((element): element is HTMLElement => element instanceof HTMLElement)
        .filter((element) => {
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        });

      if (pageLikeElements.length > 0) {
        const pageBounds = pageLikeElements.reduce(
          (acc, element) => {
            const rect = element.getBoundingClientRect();
            return {
              width: Math.max(acc.width, Math.ceil(rect.width)),
              height: Math.max(acc.height, Math.ceil(Math.max(element.scrollHeight, element.offsetHeight, rect.height))),
            };
          },
          { width: 0, height: 0 }
        );
        return {
          width: Math.max(pageBounds.width, root.clientWidth || 0),
          height: Math.max(pageBounds.height, root.clientHeight || 0),
        };
      }

      const visibleElements = Array.from(document.querySelectorAll('body *'))
        .filter((element): element is HTMLElement => element instanceof HTMLElement)
        .filter((element) => {
          const style = window.getComputedStyle(element);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });
      const bounds = visibleElements.reduce(
        (acc, element) => {
          const rect = element.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return acc;
          return {
            right: Math.max(acc.right, rect.right),
            bottom: Math.max(acc.bottom, rect.bottom),
          };
        },
        { right: 0, bottom: 0 }
      );

      return {
        width: Math.max(root.scrollWidth, body?.scrollWidth || 0, root.offsetWidth, body?.offsetWidth || 0, Math.ceil(bounds.right)),
        height: Math.max(root.scrollHeight, body?.scrollHeight || 0, root.offsetHeight, body?.offsetHeight || 0, Math.ceil(bounds.bottom)),
      };
    });
    if (dimensions.height > pageSizePixels.height * 20) throw new Error('Document is too long to render safely.');
    const fitScale = calculateHtmlPdfAutoScale({
      contentWidth: dimensions.width,
      contentHeight: dimensions.height,
      pageSize,
    });
    return Buffer.from(await page.pdf({
      format: pageSize,
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      scale: fitScale,
      timeout: HTML_PDF_RENDER_TIMEOUT_MS,
    }));
  } finally {
    if (page) await page.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
};

const processPdfJob = async (jobId: string) => {
  const db = await getDatabase();
  const jobs = db.collection(PDF_JOBS_COLLECTION);
  const objectId = new ObjectId(jobId);

  const job = await jobs.findOneAndUpdate(
    { _id: objectId, status: 'queued' },
    { $set: { status: 'processing', startedAt: new Date() }, $inc: { attempts: 1 } },
    { returnDocument: 'after' }
  );

  if (!job) {
    console.log(`PDF job ${jobId} is not queued; skipping.`);
    return;
  }

  try {
    const pdf = await callPdfLambda(job);
    const outputKey = pdfOutputKey(job);
    await getS3Client().send(new PutObjectCommand({
      Bucket: PDF_OUTPUT_BUCKET,
      Key: outputKey,
      Body: pdf.buffer,
      ContentType: 'application/pdf',
      Metadata: {
        userId: String(job.userId),
        jobId,
      },
    }));

    await jobs.updateOne(
      { _id: objectId },
      {
        $set: {
          status: 'ready',
          renderer: pdf.renderer,
          templateSource: pdf.templateSource,
          s3TemplateDebug: pdf.s3TemplateDebug,
          lambdaBuild: pdf.lambdaBuild,
          outputBucket: PDF_OUTPUT_BUCKET,
          outputKey,
          outputBytes: pdf.buffer.length,
          completedAt: new Date(),
        },
      }
    );
    console.log(`PDF job ${jobId} ready (${pdf.buffer.length} bytes).`);
  } catch (error: any) {
    await jobs.updateOne(
      { _id: objectId },
      {
        $set: {
          status: 'failed',
          error: String(error?.message || 'PDF generation failed.').slice(0, 500),
          completedAt: new Date(),
        },
      }
    );

    if (job.quotaReserved && job.userId) {
      await rollbackDownloadQuota(db, job.userId).catch((rollbackError: any) => {
        console.error(`PDF quota rollback failed for job ${jobId}.`, rollbackError);
      });
    }
    throw error;
  }
};

const processHtmlPdfJob = async (jobId: string) => {
  if (!HTML_PDF_OUTPUT_BUCKET) throw new Error('HTML_PDF_OUTPUT_BUCKET_NAME is not configured.');
  const db = await getDatabase();
  const jobs = db.collection(HTML_PDF_JOBS_COLLECTION);
  const objectId = new ObjectId(jobId);

  const job = await jobs.findOneAndUpdate(
    { _id: objectId, status: 'queued' },
    { $set: { status: 'processing', startedAt: new Date() }, $inc: { attempts: 1 } },
    { returnDocument: 'after' }
  );

  if (!job) {
    console.log(`HTML PDF job ${jobId} is not queued; skipping.`);
    return;
  }

  try {
    const buffer = await renderHtmlToPdf(job);
    const outputKey = htmlPdfOutputKey(job);
    const client = new S3Client({ region: process.env.HTML_PDF_OUTPUT_REGION || process.env.PDF_OUTPUT_REGION || process.env.AWS_REGION || 'eu-north-1' });
    await client.send(new PutObjectCommand({
      Bucket: HTML_PDF_OUTPUT_BUCKET,
      Key: outputKey,
      Body: buffer,
      ContentType: 'application/pdf',
      Metadata: {
        userId: job.userId ? String(job.userId) : 'guest',
        jobId,
        source: 'html-pdf',
      },
    }));

    await jobs.updateOne(
      { _id: objectId },
      {
        $set: {
          status: 'ready',
          renderer: 'lambda-worker',
          outputBucket: HTML_PDF_OUTPUT_BUCKET,
          outputKey,
          outputBytes: buffer.length,
          completedAt: new Date(),
        },
      }
    );
    console.log(`HTML PDF job ${jobId} ready (${buffer.length} bytes).`);
  } catch (error: any) {
    await jobs.updateOne(
      { _id: objectId },
      { $set: { status: 'failed', error: String(error?.message || 'HTML PDF generation failed.').slice(0, 500), completedAt: new Date() } }
    );
    if (job.quotaReserved && (job.userId || job.guestKey)) {
      await rollbackHtmlPdfQuota(db, { userId: job.userId, guestKey: job.guestKey }).catch((rollbackError: any) => {
        console.error(`HTML PDF quota rollback failed for job ${jobId}.`, rollbackError);
      });
    }
    throw error;
  }
};

export async function handler(event: any) {
  const jobs = parsePdfJobsFromSqsEvent(event, pdfWorkerMode());
  for (const job of jobs) {
    if (job.type === 'html-pdf') {
      await processHtmlPdfJob(job.jobId);
    } else {
      await processPdfJob(job.jobId);
    }
  }
  return { processed: jobs.length };
}
