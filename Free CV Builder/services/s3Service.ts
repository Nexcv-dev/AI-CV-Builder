import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import * as dotenv from 'dotenv';
import { injectCvTemplatePaginationRules } from '../src/utils/cvTemplateRules';
import { prepareS3TemplateData, profileImageCss, scaleCssFontSizes } from '../src/utils/templateData';

dotenv.config();

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

export const S3_TEMPLATE_BUCKET = (process.env.S3_TEMPLATE_BUCKET_NAME || process.env.TEMPLATE_BUCKET_NAME || '').trim();
export const S3_TEMPLATE_PREFIX = (process.env.S3_TEMPLATE_PREFIX || 'templates').replace(/^\/+|\/+$/g, '');
const S3_TEMPLATE_CACHE_TTL_MS = Number(process.env.S3_TEMPLATE_CACHE_TTL_MS || 0);

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

const applyProfileImageAdjustments = (html: string, profileImageUrl: string, style: string) => {
    if (!profileImageUrl) return html;
    const dom = new JSDOM(html);
    dom.window.document.querySelectorAll('img').forEach((image) => {
        if (image.getAttribute('src') !== profileImageUrl) return;
        const existingStyle = image.getAttribute('style') || '';
        const nextStyle = `${existingStyle}${existingStyle && !existingStyle.trim().endsWith(';') ? ';' : ''}${style}`;
        image.setAttribute('style', nextStyle);
        if (!image.getAttribute('alt')) image.setAttribute('alt', 'Profile');
    });
    return dom.serialize();
};

export function renderCvTemplateString(templateHtml: string, cvData: any, options: { watermark?: boolean } = {}) {
    const rootData = prepareS3TemplateData(cvData, options);
    const headline = rootData?.experience?.[0]?.position || rootData?.education?.[0]?.degree || '';
    const location = rootData?.personalInfo?.address || '';
    const profileImageUrl = rootData?.profileImage || '';
    const imageCss = profileImageCss(rootData);
    const personalInfo = rootData?.personalInfo || {};
    const hasSummary = Boolean(personalInfo.summary);
    const hasPersonalDetails = Boolean(rootData?.flags?.hasPersonalDetails);
    const hasContact = Boolean(personalInfo.email || personalInfo.phone || location);
    const hasExperience = Boolean(rootData?.experience?.length);
    const hasEducation = Boolean(rootData?.education?.length);
    const hasSkills = Boolean(rootData?.skills?.length);
    const hasCourses = Boolean(rootData?.courses?.length);
    const hasProjects = Boolean(rootData?.projects?.length);
    const hasAwards = Boolean(rootData?.awards?.length);
    const hasLanguages = Boolean(rootData?.languages?.length);
    const hasReferences = Boolean(rootData?.references?.length);
    const root = {
        ...rootData,
        headline,
        location,
        profileImageUrl,
        profileImageTransform: imageCss.transform,
        profileImageStyle: imageCss.style,
        imageZoom: imageCss.imageZoom,
        imageX: imageCss.imageX,
        imageY: imageCss.imageY,
        hasHeader: Boolean(personalInfo.fullName || headline || hasSummary),
        hasSummary,
        hasContact,
        hasProfileCard: Boolean(profileImageUrl || hasContact || hasPersonalDetails),
        hasPersonalDetails,
        hasExperience,
        hasEducation,
        hasSkills,
        hasCourses,
        hasProjects,
        hasAwards,
        hasLanguages,
        hasReferences,
        hasMainColumn: Boolean(hasExperience || hasEducation || hasCourses || hasAwards),
        hasSideColumn: Boolean(hasSkills || hasProjects || hasLanguages || hasReferences || hasPersonalDetails),
        hasBody: Boolean(personalInfo.fullName || headline || hasSummary || hasContact || hasExperience || hasEducation || hasSkills || hasCourses || hasProjects || hasAwards || hasLanguages || hasReferences || hasPersonalDetails),
        watermark: Boolean(options.watermark),
    };

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

    const renderedHtml = applyProfileImageAdjustments(renderBlock(templateHtml, root), profileImageUrl, imageCss.style);
    return injectCvTemplatePaginationRules(scaleCssFontSizes(renderedHtml, rootData?.computed?.textScale));
}

export async function generateS3CVHTML(cvData: any, template: string, options: { watermark?: boolean } = {}) {
    const templateHtml = await loadS3TemplateHtml(template);
    return templateHtml ? renderCvTemplateString(templateHtml, { ...cvData, template }, options) : null;
}
