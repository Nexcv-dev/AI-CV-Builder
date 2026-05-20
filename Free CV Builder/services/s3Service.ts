import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import * as dotenv from 'dotenv';

dotenv.config();

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

export const S3_TEMPLATE_BUCKET = (process.env.S3_TEMPLATE_BUCKET_NAME || process.env.TEMPLATE_BUCKET_NAME || '').trim();
export const S3_TEMPLATE_PREFIX = (process.env.S3_TEMPLATE_PREFIX || 'templates').replace(/^\/+|\/+$/g, '');
const S3_TEMPLATE_CACHE_TTL_MS = Number(process.env.S3_TEMPLATE_CACHE_TTL_MS || 5 * 60 * 1000);

let s3Client: S3Client | null = null;
const s3TemplateCache = new Map<string, { html: string; expiresAt: number }>();

export const getS3Client = () => {
    if (!S3_TEMPLATE_BUCKET) return null;
    if (!s3Client) {
        s3Client = new S3Client({
            region: process.env.AWS_REGION || 'eu-north-1',
        });
    }
    return s3Client;
};

export const streamToString = async (stream: any): Promise<string> => {
    if (!stream) return '';
    if (typeof stream.transformToString === 'function') return stream.transformToString();

    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf8');
};

export async function fetchS3Text(key: string): Promise<string | null> {
    const client = getS3Client();
    if (!client) return null;

    try {
        const response = await client.send(new GetObjectCommand({
            Bucket: S3_TEMPLATE_BUCKET,
            Key: key,
        }));
        return streamToString(response.Body);
    } catch (error: any) {
        const code = error?.name || error?.Code || error?.code;
        if (code === 'NoSuchKey' || code === 'NotFound' || error?.$metadata?.httpStatusCode === 404) {
            return null;
        }
        throw error;
    }
}

export const templateS3Key = (template: string, fileName: string) => (
    S3_TEMPLATE_PREFIX ? `${S3_TEMPLATE_PREFIX}/${template}/${fileName}` : `${template}/${fileName}`
);

export async function putS3Object(key: string, body: string | Buffer, contentType: string) {
    const client = getS3Client();
    if (!client || !S3_TEMPLATE_BUCKET) {
        throw new Error('S3 template bucket is not configured.');
    }
    await client.send(new PutObjectCommand({
        Bucket: S3_TEMPLATE_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
    }));
}

export async function getS3ObjectStream(key: string) {
    const client = getS3Client();
    if (!client || !S3_TEMPLATE_BUCKET) return null;

    return client.send(new GetObjectCommand({
        Bucket: S3_TEMPLATE_BUCKET,
        Key: key,
    }));
}

export const clearS3TemplateCache = (key: string) => {
    s3TemplateCache.delete(key);
};

async function loadS3TemplateHtml(template: string): Promise<string | null> {
    if (!S3_TEMPLATE_BUCKET) return null;

    const cached = s3TemplateCache.get(template);
    if (cached && cached.expiresAt > Date.now()) return cached.html;

    const indexHtml = await fetchS3Text(templateS3Key(template, 'index.html'));
    if (!indexHtml) return null;

    const css = await fetchS3Text(templateS3Key(template, 'style.css'));
    const html = css
        ? indexHtml.replace('</head>', `<style>\n${css}\n</style>\n</head>`)
        : indexHtml;

    s3TemplateCache.set(template, {
        html,
        expiresAt: Date.now() + Math.max(S3_TEMPLATE_CACHE_TTL_MS, 0),
    });
    return html;
}

const getTemplateValue = (pathValue: string, context: any, root: any) => {
    const pathParts = pathValue.trim().split('.').filter(Boolean);
    const readPath = (source: any) => pathParts.reduce((value, part) => value?.[part], source);
    const contextValue = readPath(context);
    return contextValue === undefined ? readPath(root) : contextValue;
};

const renderTemplateValue = (value: unknown) => {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return '';
    return String(value);
};

const esc = (str: string) => (
    (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
);

export function renderCvTemplateString(templateHtml: string, cvData: any, options: { watermark?: boolean } = {}) {
    const root = { ...cvData, watermark: Boolean(options.watermark) };

    const renderBlock = (source: string, context: any): string => {
        let html = source.replace(/{{#\s*([\w.]+)\s*}}([\s\S]*?){{\/\s*\1\s*}}/g, (_match, pathValue, block) => {
            const value = getTemplateValue(pathValue, context, root);
            if (Array.isArray(value)) {
                return value.map((item) => renderBlock(block, item)).join('');
            }
            if (value && typeof value === 'object') return renderBlock(block, value);
            return value ? renderBlock(block, context) : '';
        });

        html = html.replace(/{{\^\s*([\w.]+)\s*}}([\s\S]*?){{\/\s*\1\s*}}/g, (_match, pathValue, block) => {
            const value = getTemplateValue(pathValue, context, root);
            const isEmptyArray = Array.isArray(value) && value.length === 0;
            return (!value || isEmptyArray) ? renderBlock(block, context) : '';
        });

        html = html.replace(/{{{\s*([\w.]+)\s*}}}/g, (_match, pathValue) => {
            const value = renderTemplateValue(getTemplateValue(pathValue, context, root));
            return DOMPurify.sanitize(value, {
                ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'p', 'br', 'u', 'div', 'span'],
                ALLOWED_ATTR: ['href', 'target', 'rel'],
            });
        });

        return html.replace(/{{\s*([\w.]+)\s*}}/g, (_match, pathValue) => (
            esc(renderTemplateValue(getTemplateValue(pathValue, context, root)))
        ));
    };

    return renderBlock(templateHtml, root);
}

export async function generateS3CVHTML(cvData: any, template: string, options: { watermark?: boolean } = {}) {
    const templateHtml = await loadS3TemplateHtml(template);
    return templateHtml ? renderCvTemplateString(templateHtml, cvData, options) : null;
}
