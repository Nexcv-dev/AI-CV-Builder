import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { Response } from 'express';
import fs from 'fs';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import HtmlPdfJob, { IHtmlPdfJob, HtmlPdfPageSize } from '../server-models/HtmlPdfJob';
import { enqueueHtmlPdfJob, isHtmlPdfQueueConfigured } from './htmlPdfQueueService';
import { logError, logEvent } from '../server-utils/logger';
import { validateHtmlPdfRules } from '@nexcv/templates/htmlPdfValidation';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

export const MAX_HTML_PDF_INPUT_BYTES = Number(process.env.HTML_PDF_MAX_INPUT_BYTES || 250 * 1024);
const HTML_PDF_JOB_TTL_MS = Number(process.env.HTML_PDF_JOB_TTL_MS || process.env.PDF_JOB_TTL_MS || 24 * 60 * 60 * 1000);
const HTML_PDF_OUTPUT_BUCKET = (process.env.HTML_PDF_OUTPUT_BUCKET_NAME || process.env.PDF_OUTPUT_BUCKET_NAME || process.env.S3_PDF_BUCKET_NAME || process.env.S3_TEMPLATE_BUCKET_NAME || '').trim();
const HTML_PDF_OUTPUT_PREFIX = (process.env.HTML_PDF_OUTPUT_PREFIX || 'html-pdf-jobs').replace(/^\/+|\/+$/g, '');
const HTML_PDF_RENDER_TIMEOUT_MS = Number(process.env.HTML_PDF_RENDER_TIMEOUT_MS || 30000);
const MAX_HTML_PDF_DATA_URI_LENGTH = 2 * 1024 * 1024;

let s3Client: S3Client | null = null;

const getHtmlPdfS3Client = () => {
    if (!HTML_PDF_OUTPUT_BUCKET) return null;
    if (!s3Client) {
        s3Client = new S3Client({ region: process.env.HTML_PDF_OUTPUT_REGION || process.env.PDF_OUTPUT_REGION || process.env.AWS_REGION || 'eu-north-1' });
    }
    return s3Client;
};

const allowedPageSizes = new Set(['A4', 'Letter']);
const pagePixelSize: Record<HtmlPdfPageSize, { width: number; height: number }> = {
    A4: { width: 794, height: 1122 },
    Letter: { width: 816, height: 1056 },
};
const MIN_HTML_PDF_SCALE = 0.1;
const HTML_PDF_SINGLE_PAGE_FIT_MAX_PAGES = 2;

export const isHtmlPdfJobStorageConfigured = () => Boolean(HTML_PDF_OUTPUT_BUCKET);

export const htmlPdfJobExpiresAt = () => new Date(Date.now() + HTML_PDF_JOB_TTL_MS);

export const sanitizeHtmlPdfFilename = (value: unknown) => {
    const raw = typeof value === 'string' ? value : 'document';
    const cleaned = raw
        .replace(/[\x00-\x1F\x7F]/g, '')
        .replace(/[<>:"/\\|?*]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80);
    return cleaned || 'document';
};

const stripDangerousCss = (value: string) => value
    .replace(/@import\s+[^;]+;?/gi, '')
    .replace(/expression\s*\([^)]*\)/gi, '')
    .replace(/url\s*\(\s*(['"]?)(?!data:image\/)[^)]+?\1\s*\)/gi, 'none');

export const sanitizeHtmlPdfInput = ({ html, css }: { html: unknown; css: unknown }) => {
    if (typeof html !== 'string' || !html.trim()) {
        throw Object.assign(new Error('HTML is required.'), { status: 400 });
    }
    const safeCss = typeof css === 'string' ? stripDangerousCss(css) : '';
    const payloadBytes = Buffer.byteLength(html, 'utf8') + Buffer.byteLength(safeCss, 'utf8');
    if (payloadBytes > MAX_HTML_PDF_INPUT_BYTES) {
        throw Object.assign(new Error('HTML and CSS are too large. Keep the combined input under 250 KB.'), { status: 413 });
    }
    const ruleValidation = validateHtmlPdfRules(html, safeCss);
    if (!ruleValidation.valid) {
        throw Object.assign(new Error(`Fix the HTML PDF rules before exporting: ${ruleValidation.errors.join(' ')}`), {
            status: 400,
            ruleErrors: ruleValidation.errors,
        });
    }
    const safeHtml = DOMPurify.sanitize(html, {
        WHOLE_DOCUMENT: true,
        ADD_TAGS: ['html', 'head', 'body', 'style', 'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'g', 'defs', 'linearGradient', 'stop'],
        ADD_ATTR: ['viewBox', 'xmlns', 'd', 'fill', 'stroke', 'stroke-width', 'x', 'y', 'cx', 'cy', 'r', 'x1', 'x2', 'y1', 'y2', 'points', 'offset', 'stop-color', 'stop-opacity'],
        FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'link', 'meta'],
        FORBID_ATTR: ['srcdoc'],
    }).replace(/data:image\/[^"')\s>]{2097153,}/gi, '');
    return { html: safeHtml, css: safeCss, payloadBytes };
};

const buildHtmlPdfDocument = (html: string, css: string) => {
    const style = `<style>
      * { box-sizing: border-box; }
      html, body { margin: 0; min-height: 100%; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      img { max-width: 100%; }
      ${css}
    </style>`;

    if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${style}</head>`);
    if (/<body[^>]*>/i.test(html)) return html.replace(/<body([^>]*)>/i, `<head>${style}</head><body$1>`);
    return `<!DOCTYPE html><html><head><meta charset="utf-8">${style}</head><body>${html}</body></html>`;
};

export const calculateHtmlPdfFitScale = ({
    contentWidth,
    contentHeight,
    pageSize,
}: {
    contentWidth: number;
    contentHeight: number;
    pageSize: HtmlPdfPageSize;
}) => {
    const page = pagePixelSize[pageSize];
    const widthScale = contentWidth > page.width ? page.width / contentWidth : 1;
    const heightScale = contentHeight > page.height ? page.height / contentHeight : 1;
    return Math.max(MIN_HTML_PDF_SCALE, Math.min(1, widthScale, heightScale));
};

export const calculateHtmlPdfAutoScale = ({
    contentWidth,
    contentHeight,
    pageSize,
}: {
    contentWidth: number;
    contentHeight: number;
    pageSize: HtmlPdfPageSize;
}) => {
    const page = pagePixelSize[pageSize];
    const widthScale = contentWidth > page.width ? page.width / contentWidth : 1;
    const canFitSinglePage = contentHeight <= page.height * HTML_PDF_SINGLE_PAGE_FIT_MAX_PAGES;
    if (!canFitSinglePage) return Math.max(MIN_HTML_PDF_SCALE, Math.min(1, widthScale));
    return calculateHtmlPdfFitScale({ contentWidth, contentHeight, pageSize });
};

export const createHtmlPdfJob = async ({
    userId,
    guestKey,
    html,
    css,
    filename,
    pageSize,
    quotaReserved,
}: {
    userId?: string;
    guestKey?: string;
    html: string;
    css: string;
    filename: string;
    pageSize: HtmlPdfPageSize;
    quotaReserved: boolean;
}) => HtmlPdfJob.create({
    ...(userId ? { userId } : {}),
    ...(guestKey ? { guestKey } : {}),
    html,
    css,
    filename,
    pageSize,
    quotaReserved,
    status: 'queued',
    expiresAt: htmlPdfJobExpiresAt(),
});

export const queueHtmlPdfJob = async (job: IHtmlPdfJob) => {
    if (!isHtmlPdfQueueConfigured()) return false;
    await enqueueHtmlPdfJob(String(job._id));
    return true;
};

const htmlPdfOutputKey = (job: IHtmlPdfJob) => {
    const createdDay = job.createdAt ? job.createdAt.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    return `${HTML_PDF_OUTPUT_PREFIX}/${createdDay}/${String(job._id)}.pdf`;
};

function findSystemBrowser(): string | null {
    if (process.platform !== 'win32') return null;
    const commonPaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
        `${process.env.LOCALAPPDATA}\\Microsoft\\Edge\\Application\\msedge.exe`,
    ];
    for (const browserPath of commonPaths) {
        if (fs.existsSync(browserPath)) return browserPath;
    }
    return null;
}

async function buildBrowserLaunchOptions() {
    const isLocal = process.env.NODE_ENV !== 'production';
    const launchOptions: any = {
        args: isLocal ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote'] : chromium.args,
        defaultViewport: (chromium as any).defaultViewport,
        headless: isLocal ? true : (chromium as any).headless,
        ignoreHTTPSErrors: true,
    };
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    } else if (isLocal) {
        const browser = findSystemBrowser();
        if (!browser) throw new Error('Could not find a local Chrome installation. Please set PUPPETEER_EXECUTABLE_PATH.');
        launchOptions.executablePath = browser;
    } else {
        launchOptions.executablePath = await chromium.executablePath();
    }
    return launchOptions;
}

export async function renderHtmlToPdf({ html, css, pageSize }: { html: string; css: string; pageSize: HtmlPdfPageSize }) {
    const browser = await puppeteer.launch(await buildBrowserLaunchOptions());
    let page: any = null;
    try {
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
        const pageSizePixels = pagePixelSize[pageSize];
        await page.setViewport({ width: pageSizePixels.width, height: pageSizePixels.height, deviceScaleFactor: 1 });
        await page.setContent(buildHtmlPdfDocument(html, css), { waitUntil: 'domcontentloaded', timeout: HTML_PDF_RENDER_TIMEOUT_MS });
        await page.evaluate(async () => {
            const images = Array.from(document.querySelectorAll('img'));
            await Promise.all(images.map((img: any) => img.decode().catch(() => undefined)));
        });
        await new Promise(resolve => setTimeout(resolve, 250));
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
        const buffer = await page.pdf({
            format: pageSize,
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' },
            scale: fitScale,
            timeout: HTML_PDF_RENDER_TIMEOUT_MS,
        });
        return Buffer.from(buffer);
    } finally {
        if (page) await page.close().catch(() => undefined);
        await browser.close().catch(() => undefined);
    }
}

export const processHtmlPdfJob = async (jobId: string, deps: Record<string, any> = {}) => {
    const storageClient = getHtmlPdfS3Client();
    if (!storageClient || !HTML_PDF_OUTPUT_BUCKET) {
        throw new Error('HTML PDF output bucket is not configured.');
    }

    const job = await HtmlPdfJob.findOneAndUpdate(
        { _id: jobId, status: 'queued' },
        { $set: { status: 'processing', startedAt: new Date() }, $inc: { attempts: 1 } },
        { new: true }
    );
    if (!job) return null;

    try {
        const buffer = await renderHtmlToPdf({ html: job.html, css: job.css, pageSize: job.pageSize });
        const outputKey = htmlPdfOutputKey(job);

        await storageClient.send(new PutObjectCommand({
            Bucket: HTML_PDF_OUTPUT_BUCKET,
            Key: outputKey,
            Body: buffer,
            ContentType: 'application/pdf',
            Metadata: {
                userId: job.userId ? String(job.userId) : 'guest',
                jobId: String(job._id),
                source: 'html-pdf',
            },
        }));

        await HtmlPdfJob.updateOne(
            { _id: job._id },
            {
                $set: {
                    status: 'ready',
                    renderer: 'local',
                    outputBucket: HTML_PDF_OUTPUT_BUCKET,
                    outputKey,
                    outputBytes: buffer.length,
                    completedAt: new Date(),
                },
            }
        );

        logEvent?.('info', 'html_pdf.job_ready', { userId: String(job.userId), jobId: String(job._id), bytes: buffer.length });
        return HtmlPdfJob.findById(job._id);
    } catch (error: any) {
        await HtmlPdfJob.updateOne(
            { _id: job._id },
            { $set: { status: 'failed', error: String(error?.message || 'HTML PDF generation failed.').slice(0, 500), completedAt: new Date() } }
        );
        if (job.quotaReserved) {
            const user = job.userId && deps.User ? await deps.User.findById(job.userId) : null;
            const quotaOwner = user ? { user } : job.guestKey ? { guestKey: job.guestKey } : null;
            if (quotaOwner && deps.rollbackHtmlPdfQuota) await deps.rollbackHtmlPdfQuota(quotaOwner).catch((rollbackError: any) => {
                logError?.('html_pdf.job_quota_rollback_failed', rollbackError, { userId: String(job.userId), jobId: String(job._id) });
            });
        }
        logError?.('html_pdf.job_failed', error, { userId: String(job.userId), jobId: String(job._id) });
        throw error;
    }
};

export const findUserHtmlPdfJob = async (jobId: string, owner: string | { userId?: string; guestKey?: string }) => {
    const ownerFilter = typeof owner === 'string'
        ? { userId: owner }
        : owner.userId
            ? { userId: owner.userId }
            : { guestKey: owner.guestKey };
    return HtmlPdfJob.findOne({ _id: jobId, ...ownerFilter });
};

export const sendHtmlPdfJobDownload = async (job: IHtmlPdfJob, res: Response) => {
    const client = getHtmlPdfS3Client();
    const bucket = job.outputBucket || HTML_PDF_OUTPUT_BUCKET;
    if (!client || !bucket || !job.outputKey || job.status !== 'ready') {
        res.status(404).json({ error: 'PDF is not ready.' });
        return;
    }

    const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: job.outputKey }));
    const filename = `${sanitizeHtmlPdfFilename(job.filename)}.pdf`;
    res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename.replace(/"/g, '')}"`,
        ...(job.outputBytes ? { 'Content-Length': String(job.outputBytes) } : {}),
        ...(job.renderer ? { 'X-PDF-Renderer': job.renderer } : {}),
    });

    const body = response.Body as any;
    if (body?.pipe) {
        body.pipe(res);
        return;
    }
    if (body?.transformToByteArray) {
        res.send(Buffer.from(await body.transformToByteArray()));
        return;
    }
    res.status(500).json({ error: 'Could not stream PDF.' });
};

export const normalizeHtmlPdfPageSize = (value: unknown): HtmlPdfPageSize => (
    typeof value === 'string' && allowedPageSizes.has(value) ? value as HtmlPdfPageSize : 'A4'
);
