import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import esbuild from 'esbuild';
import { createMonorepoResolvePlugin } from './esbuild-monorepo-resolver.mjs';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), '..');
const repoRoot = path.resolve(projectRoot, '../..');
const pdfServicePath = path.join(repoRoot, 'apps', 'api', 'services', 'pdfService.ts');
const cvTemplateRulesPath = path.join(repoRoot, 'packages', 'templates', 'src', 'cvTemplateRules.ts');
const cvFontsPath = path.join(repoRoot, 'packages', 'templates', 'src', 'cvFonts.ts');
const templateReleaseMapPath = path.join(projectRoot, 'config', 'template-release-map.json');
const outRoot = path.join(repoRoot, 'apps', 'workers', 'pdf-lambda');
const moduleResolutionPaths = [
  path.join(projectRoot, 'node_modules'),
  path.join(repoRoot, 'apps', 'api', 'node_modules'),
  path.join(repoRoot, 'node_modules'),
];
const dependencyRoot = fs.existsSync(path.join(projectRoot, 'node_modules', '@sparticuz'))
  ? path.join(projectRoot, 'node_modules')
  : path.join(repoRoot, 'node_modules');
const buildDir = path.join(outRoot, 'build');
const distDir = path.join(outRoot, 'dist');
const srcDir = path.join(outRoot, 'src');
const zipPath = path.join(distDir, 'nexcv-pdf-lambda.zip');

function cleanDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function extractBalanced(source, startNeedle) {
  const start = source.indexOf(startNeedle);
  if (start === -1) throw new Error(`Could not find ${startNeedle}`);
  const braceStart = source.indexOf('{', start);
  return extractBalancedFromBrace(source, start, braceStart, startNeedle);
}

function extractBalancedFromBrace(source, start, braceStart, label) {
  let depth = 0;
  let inString = null;
  let inTemplate = false;
  let escaped = false;

  for (let i = braceStart; i < source.length; i += 1) {
    const char = source[i];
    const prev = source[i - 1];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (inString) {
      if (char === inString) inString = null;
      continue;
    }
    if (!inTemplate && (char === '"' || char === "'")) {
      inString = char;
      continue;
    }
    if (char === '`') {
      inTemplate = !inTemplate;
      continue;
    }
    if (inTemplate && char !== '$') continue;
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
    if (inTemplate && char === '$' && source[i + 1] === '{') {
      depth += 1;
      i += 1;
    }
  }
  throw new Error(`Could not extract balanced block for ${label}`);
}

function extractFunction(source, startNeedle) {
  const start = source.indexOf(startNeedle);
  if (start === -1) throw new Error(`Could not find ${startNeedle}`);
  let parenDepth = 0;
  let inString = null;
  let escaped = false;
  let sawParams = false;

  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (inString) {
      if (char === inString) inString = null;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      inString = char;
      continue;
    }
    if (char === '(') {
      parenDepth += 1;
      sawParams = true;
      continue;
    }
    if (char === ')') {
      parenDepth -= 1;
      continue;
    }
    if (sawParams && parenDepth === 0 && char === '{') {
      return extractBalancedFromBrace(source, start, i, startNeedle);
    }
  }
  throw new Error(`Could not extract function body for ${startNeedle}`);
}

function extractBetween(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  if (start === -1) throw new Error(`Could not find ${startNeedle}`);
  const end = source.indexOf(endNeedle, start);
  if (end === -1) throw new Error(`Could not find end marker ${endNeedle}`);
  return source.slice(start, end).trim();
}

function extractConstStatement(source, constName) {
  const startNeedle = `export const ${constName}`;
  const start = source.indexOf(startNeedle);
  if (start === -1) throw new Error(`Could not find ${startNeedle}`);
  const valueStart = source.indexOf('`', start);
  if (valueStart === -1) throw new Error(`Could not find template literal for ${constName}`);
  const valueEnd = source.indexOf('`;', valueStart + 1);
  if (valueEnd === -1) throw new Error(`Could not find end of template literal for ${constName}`);
  return source.slice(start, valueEnd + 2).replace('export const', 'const');
}

function extractConstObject(source, constName) {
  const startNeedle = `const ${constName}`;
  const block = extractBalanced(source, startNeedle);
  const semicolon = source.indexOf(';', source.indexOf(block) + block.length);
  return source.slice(source.indexOf(startNeedle), semicolon + 1);
}

function copyDir(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });
}

function copyDirIfExists(src, dest) {
  if (fs.existsSync(src)) copyDir(src, dest);
}

const pdfServiceSource = fs.readFileSync(pdfServicePath, 'utf8');
const cvTemplateRulesSource = fs.readFileSync(cvTemplateRulesPath, 'utf8');
const cvTemplatePaginationRulesTs = extractConstStatement(cvTemplateRulesSource, 'CV_TEMPLATE_PAGINATION_RULES');
const pdfIcons = extractConstObject(pdfServiceSource, 'PDF_ICONS');
const generateCvHtmlTs = extractBetween(pdfServiceSource, 'export function generateCVHTML', '// AI Generate PDF via Puppeteer').replace('export function', 'function');
const sanitizeCvDataTs = extractFunction(pdfServiceSource, 'export function sanitizeCvData').replace('export function', 'function');

function inlineSharedModule(source) {
  return source
    .replace(/^import\s+.*$/gm, '')
    .replace(/^export\s+/gm, '');
}

function inlineTemplateDataPreprocessor(source, releaseMapJson) {
  return source
    .replace(/^import\s+templateReleaseMap\s+from\s+['"].*template-release-map\.json['"];$/m, `const templateReleaseMap = ${releaseMapJson};`)
    .replace(/^import\s+.*cvFonts.*$/gm, '')
    .replace(/^export\s+/gm, '')
    .replace(/safeHexColor\(cvData\?\.templateSurfaceColor, themeColor\)/g, 'safeHexColor(cvData?.templateSurfaceColor, getTemplateSurfaceColorFallback(cvData?.template, { themeColor, sidebarColor }))')
    .replace(/const profileImage = cvData\?\.profileImage \|\| '';/g, 'const profileImage = sanitizePdfImageSource(cvData?.profileImage);');
}

const cvFontsSource = fs.readFileSync(cvFontsPath, 'utf8');
const cvFontsTs = inlineSharedModule(cvFontsSource);
const templateReleaseMapJson = fs.readFileSync(templateReleaseMapPath, 'utf8');
const templateDataPath = path.join(repoRoot, 'packages', 'templates', 'src', 'templateData.ts');
const templateDataSource = fs.readFileSync(templateDataPath, 'utf8');
const s3TemplatePreprocessorTs = inlineTemplateDataPreprocessor(templateDataSource, templateReleaseMapJson);

const handlerTs = `
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

const ALLOWED_RICH_TEXT_TAGS = new Set(['b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'p', 'br', 'u', 'div', 'span', 'svg', 'path', 'circle']);
const keepSafeSvgAttrs = (attrs: string) => {
  const allowed = new Set(['class', 'style', 'width', 'height', 'xmlns', 'viewbox', 'aria-hidden', 'cx', 'cy', 'r', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'd']);
  return Array.from(String(attrs || '').matchAll(/\\s+([a-zA-Z:-]+)\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)/g))
    .map((match) => {
      const name = match[1].toLowerCase();
      if (!allowed.has(name)) return '';
      const value = match[2].replace(/^['"]|['"]$/g, '').replace(/"/g, '&quot;');
      return \` \${match[1]}="\${value}"\`;
    })
    .join('');
};
const DOMPurify = {
  sanitize(value: unknown, _config?: unknown) {
    return String(value || '')
      .replace(/<\\s*(script|style)[^>]*>[\\s\\S]*?<\\s*\\/\\s*\\1\\s*>/gi, '')
      .replace(/\\s+on[a-z]+\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)/gi, '')
      .replace(/\\s+(href)\\s*=\\s*("javascript:[^"]*"|'javascript:[^']*'|javascript:[^\\s>]+)/gi, '')
      .replace(/<\\/?([a-z0-9]+)([^>]*)>/gi, (match, tagName, attrs = '') => {
        const tag = String(tagName).toLowerCase();
        if (!ALLOWED_RICH_TEXT_TAGS.has(tag)) return '';
        const closing = /^<\\s*\\//.test(match);
        if (closing) return \`</\${tag}>\`;
        if (tag === 'svg' || tag === 'path' || tag === 'circle') return \`<\${tag}\${keepSafeSvgAttrs(String(attrs))}>\`;
        if (tag !== 'a') return tag === 'br' ? '<br>' : \`<\${tag}>\`;
        const hrefMatch = String(attrs).match(/\\s+href\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)/i);
        const href = hrefMatch ? hrefMatch[1].replace(/^['"]|['"]$/g, '') : '';
        const safeHref = /^(https?:|mailto:|tel:|#)/i.test(href) ? href.replace(/"/g, '&quot;') : '#';
        return \`<a href="\${safeHref}" target="_blank" rel="noopener noreferrer">\`;
      });
  },
};

const CV_TEMPLATES = [
  { key: 'classic', label: 'Classic', image: '/templates/classic.webp', access: 'free', surfaceColorRole: 'none' },
  { key: 'modern', label: 'Modern', image: '/templates/modern.webp', access: 'paid', surfaceColorRole: 'sidebar', surfaceColorLabel: 'Sidebar Background' },
  { key: 'professional', label: 'Professional', image: '/templates/professional.webp', access: 'paid', surfaceColorRole: 'none' },
  { key: 'timeline', label: 'Timeline', image: '/templates/timeline.webp', access: 'paid', surfaceColorRole: 'none' },
  { key: 'minimalist', label: 'Minimalist', image: '/templates/minimalist.webp', access: 'paid', surfaceColorRole: 'none' },
  { key: 'startup', label: 'Startup', image: '/templates/startup.webp', access: 'paid', surfaceColorRole: 'header', surfaceColorLabel: 'Header Background' },
] as const;

type TemplateName = (typeof CV_TEMPLATES)[number]['key'];
const DEFAULT_TEMPLATE: TemplateName = 'professional';
const PDF_LAMBDA_BUILD_MARKER = 's3-template-diagnostics-2026-05-19';
const TEMPLATE_KEYS = CV_TEMPLATES.map((template) => template.key) as TemplateName[];
const TEMPLATE_KEY_PATTERN = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
function getTemplateDefinition(template: TemplateName) {
  return CV_TEMPLATES.find((item) => item.key === template) || CV_TEMPLATES[0];
}
function isTemplateName(value: unknown): value is TemplateName {
  return typeof value === 'string' && TEMPLATE_KEY_PATTERN.test(value);
}
function getTemplateSurfaceColorFallback(template: TemplateName, colors: { themeColor: string; sidebarColor: string }): string {
  const definition = getTemplateDefinition(template);
  if (definition.surfaceColorRole === 'sidebar') return colors.sidebarColor;
  if (definition.surfaceColorRole === 'header') return colors.themeColor;
  return colors.themeColor;
}

const MAX_TEXT_LENGTH = 10000;
const MAX_IMAGE_DATA_URI_LENGTH = 2 * 1024 * 1024;
const SAFE_IMAGE_DATA_URI = /^data:image\\/(?:png|jpe?g|webp);base64,[a-z0-9+/=\\s]+$/i;
const sanitizePdfImageSource = (value: unknown) => {
  if (typeof value !== 'string') return '';
  const source = value.trim();
  if (!source || source.length > MAX_IMAGE_DATA_URI_LENGTH) return '';
  if (!SAFE_IMAGE_DATA_URI.test(source)) return '';
  return source.replace(/\\s/g, '');
};

${cvFontsTs}

const S3_TEMPLATE_BUCKET = (process.env.S3_TEMPLATE_BUCKET_NAME || process.env.TEMPLATE_BUCKET_NAME || '').trim();
const S3_TEMPLATE_PREFIX = (process.env.S3_TEMPLATE_PREFIX || 'templates').replace(/^\\/+|\\/+$/g, '');
const S3_TEMPLATE_CACHE_TTL_MS = Number(process.env.S3_TEMPLATE_CACHE_TTL_MS || 0);
let s3Client: S3Client | null = null;
const s3TemplateCache = new Map<string, { html: string; expiresAt: number }>();
let lastS3TemplateDebug = 'not-attempted';

const getS3Client = () => {
  if (!S3_TEMPLATE_BUCKET) return null;
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'eu-north-1',
    });
  }
  return s3Client;
};

const streamToString = async (stream: any): Promise<string> => {
  if (!stream) return '';
  if (typeof stream.transformToString === 'function') return stream.transformToString();

  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
};

async function fetchS3Text(key: string): Promise<string | null> {
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

const templateS3Key = (template: TemplateName, fileName: string) => (
  S3_TEMPLATE_PREFIX ? S3_TEMPLATE_PREFIX + '/' + template + '/' + fileName : template + '/' + fileName
);

async function loadS3TemplateHtml(template: TemplateName): Promise<string | null> {
  if (!S3_TEMPLATE_BUCKET) {
    lastS3TemplateDebug = 'bucket-not-configured';
    console.warn('S3 template bucket is not configured; falling back to built-in PDF template.');
    return null;
  }

  const cached = s3TemplateCache.get(template);
  if (cached && cached.expiresAt > Date.now()) {
    lastS3TemplateDebug = 'cache-hit:' + template;
    return cached.html;
  }

  const indexHtml = await fetchS3Text(templateS3Key(template, 'index.html'));
  if (!indexHtml) {
    lastS3TemplateDebug = 'index-not-found:' + templateS3Key(template, 'index.html');
    console.warn(\`S3 template index not found at \${templateS3Key(template, 'index.html')}; falling back to built-in PDF template.\`);
    return null;
  }

  const css = await fetchS3Text(templateS3Key(template, 'style.css'));
  const html = css
    ? indexHtml.replace('</head>', '<style>\\n' + css + '\\n</style>\\n</head>')
    : indexHtml;

  lastS3TemplateDebug = 'loaded:' + templateS3Key(template, 'index.html') + ':' + (css ? 'css' : 'no-css');
  console.log(\`Loaded S3 PDF template \${template} from \${templateS3Key(template, 'index.html')}\${css ? ' with CSS' : ' without CSS'}.\`);

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

const escTemplateValue = (str: string) => (
  (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
);

function renderCvTemplateString(templateHtml: string, cvData: any, options: { watermark?: boolean } = {}) {
  const personalInfo = cvData?.personalInfo || {};
  const imageCss = profileImageCss(cvData);
  const profileImageUrl = sanitizePdfImageSource(cvData?.profileImage);
  const headline = cvData?.headline || personalInfo.position || cvData?.experience?.[0]?.position || cvData?.education?.[0]?.degree || '';
  const location = personalInfo.address || '';
  const hasSummary = Boolean(personalInfo.summary);
  const hasPersonalDetails = Boolean(cvData?.flags?.hasPersonalDetails);
  const hasContact = Boolean(personalInfo.email || personalInfo.phone || location || cvData?.socialLinks?.length);
  const hasSocialLinks = Boolean(cvData?.socialLinks?.length);
  const hasExperience = Boolean(cvData?.experience?.length);
  const hasEducation = Boolean(cvData?.education?.length);
  const hasSkills = Boolean(cvData?.skills?.length);
  const hasCourses = Boolean(cvData?.courses?.length);
  const hasProjects = Boolean(cvData?.projects?.length);
  const hasAwards = Boolean(cvData?.awards?.length);
  const hasLanguages = Boolean(cvData?.languages?.length);
  const hasReferences = Boolean(cvData?.references?.length);
  const root = {
    ...cvData,
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
    hasSocialLinks,
    hasPersonalDetails,
    hasProfileCard: Boolean(profileImageUrl || hasContact || hasPersonalDetails),
    hasExperience,
    hasExperienceContinuation: false,
    experienceLeadItems: cvData?.experience || [],
    experienceContinuationItems: [],
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
    let html = source.replace(/{{#\\s*([\\w.]+)\\s*}}([\\s\\S]*?){{\\/\\s*\\1\\s*}}/g, (_match, pathValue, block) => {
      const value = getTemplateValue(pathValue, context, root);
      if (Array.isArray(value)) {
        return value.map((item) => renderBlock(block, item)).join('');
      }
      if (value && typeof value === 'object') return renderBlock(block, value);
      return value ? renderBlock(block, context) : '';
    });

    html = html.replace(/{{\\^\\s*([\\w.]+)\\s*}}([\\s\\S]*?){{\\/\\s*\\1\\s*}}/g, (_match, pathValue, block) => {
      const value = getTemplateValue(pathValue, context, root);
      const isEmptyArray = Array.isArray(value) && value.length === 0;
      return (!value || isEmptyArray) ? renderBlock(block, context) : '';
    });

    html = html.replace(/{{{\\s*([\\w.]+)\\s*}}}/g, (_match, pathValue) => {
      const value = renderTemplateValue(getTemplateValue(pathValue, context, root));
      return DOMPurify.sanitize(value, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'p', 'br', 'u', 'div', 'span'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style', 'width', 'height', 'xmlns', 'viewBox', 'aria-hidden', 'cx', 'cy', 'r', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'd'],
      });
    });

    return html.replace(/{{\\s*([\\w.]+)\\s*}}/g, (_match, pathValue) => (
      escTemplateValue(renderTemplateValue(getTemplateValue(pathValue, context, root)))
    ));
  };

  const renderedHtml = renderBlock(templateHtml, root);
  const newline = String.fromCharCode(10);
  const htmlWithPaginationRules = renderedHtml.includes('</head>')
    ? renderedHtml.replace('</head>', '<style>' + newline + CV_TEMPLATE_PAGINATION_RULES + newline + '</style>' + newline + '</head>')
    : '<style>' + newline + CV_TEMPLATE_PAGINATION_RULES + newline + '</style>' + newline + renderedHtml;
  return scaleCssFontSizes(htmlWithPaginationRules, root?.computed?.textScale ?? cvData?.textScale);
}

${s3TemplatePreprocessorTs}

${cvTemplatePaginationRulesTs}

async function generateS3CVHTML(cvData: any, template: TemplateName, options: { watermark?: boolean } = {}) {
  lastS3TemplateDebug = 'attempting';
  const templateHtml = await loadS3TemplateHtml(template);
  return templateHtml ? renderCvTemplateString(templateHtml, prepareS3TemplateData({ ...cvData, template }, options), options) : null;
}

${pdfIcons}

${generateCvHtmlTs}

${sanitizeCvDataTs}

async function launchBrowser() {
  const launchOptions: any = {
    args: chromium.args,
    defaultViewport: (chromium as any).defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: (chromium as any).headless,
    ignoreHTTPSErrors: true,
  };
  return puppeteer.launch(launchOptions);
}

async function renderPdf(cvData: any, template: unknown, watermark: boolean) {
  const requestedTemplate = isTemplateName(template) ? template : DEFAULT_TEMPLATE;
  const isBuiltInTemplate = TEMPLATE_KEYS.includes(requestedTemplate as any);
  const safeCvData = sanitizeCvData(cvData);
  let html: string | null = null;
  try {
    html = await generateS3CVHTML(safeCvData, requestedTemplate, { watermark });
  } catch (error) {
    lastS3TemplateDebug = 'error:' + (error instanceof Error ? error.name : 'unknown');
    console.warn('S3 template unavailable; falling back to built-in PDF template.', error);
  }
  const templateSource = html ? 's3' : 'built-in';
  if (!html && !isBuiltInTemplate) {
    throw new Error('S3 template unavailable for "' + requestedTemplate + '" (' + lastS3TemplateDebug + ').');
  }
  html = html || generateCVHTML(safeCvData, requestedTemplate, { watermark });
  const browser = await launchBrowser();
  let page: any = null;
  try {
    page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (request: any) => {
      const url = request.url();
      const isAllowedFont = url.startsWith('https://fonts.googleapis.com/') || url.startsWith('https://fonts.gstatic.com/');
      if (url.startsWith('data:') || url === 'about:blank' || isAllowedFont) {
        request.continue();
        return;
      }
      request.abort();
    });
    await page.setViewport({ width: 794, height: 1122, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluate(async () => {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
      const images = Array.from(document.querySelectorAll('img'));
      await Promise.all(images.map((img: any) => img.decode().catch(() => undefined)));
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    return { pdf, templateSource, s3TemplateDebug: lastS3TemplateDebug };
  } finally {
    if (page) await page.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

function parsePayload(event: any) {
  if (event?.body) {
    const text = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
    return typeof text === 'string' ? JSON.parse(text) : text;
  }
  return event || {};
}

function isWarmupEvent(event: any) {
  if (!event || typeof event !== 'object') return false;
  if (event.warmup === true || event.action === 'warmup') return true;
  if (event.source === 'aws.events' || event['detail-type'] === 'Scheduled Event' || event.detailType === 'Scheduled Event') return true;
  if (typeof event.body === 'string') {
    try {
      const body = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body);
      return body?.warmup === true || body?.action === 'warmup';
    } catch {
      return false;
    }
  }
  return false;
}

export async function handler(event: any) {
  try {
    if (isWarmupEvent(event)) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'PDF Lambda warmup successful' }),
      };
    }

    const payload = parsePayload(event);
    if (!payload?.cvData || typeof payload.cvData !== 'object') {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing or invalid cvData' }),
      };
    }
    const { pdf, templateSource, s3TemplateDebug } = await renderPdf(payload.cvData, payload.template, Boolean(payload.watermark));
    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="resume.pdf"',
        'X-PDF-Template-Source': templateSource,
        'X-PDF-Lambda-Build': PDF_LAMBDA_BUILD_MARKER,
        'X-PDF-S3-Debug': s3TemplateDebug,
      },
      body: Buffer.from(pdf).toString('base64'),
    };
  } catch (error: any) {
    console.error('PDF Lambda error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to generate PDF', details: error?.message || 'Unknown error' }),
    };
  }
}
`;

cleanDir(outRoot);
fs.mkdirSync(srcDir, { recursive: true });
fs.mkdirSync(buildDir, { recursive: true });
fs.mkdirSync(distDir, { recursive: true });

fs.writeFileSync(path.join(srcDir, 'handler.ts'), handlerTs, 'utf8');
fs.writeFileSync(path.join(outRoot, 'README.md'), `# NexCV PDF Lambda

Deploy \`dist/nexcv-pdf-lambda.zip\` to AWS Lambda with:

- Runtime: Node.js 20.x
- Handler: \`handler.handler\`
- Architecture: x86_64
- Memory: 1024 MB or higher
- Timeout: 30 seconds or higher

Environment variables:

- \`AWS_REGION=eu-north-1\`
- \`S3_TEMPLATE_BUCKET_NAME=cv-template-bucket\`
- \`S3_TEMPLATE_PREFIX=templates\`

Request body:

\`\`\`json
{
  "cvData": {},
  "template": "professional",
  "watermark": false
}
\`\`\`

The response is API Gateway compatible and returns the PDF as base64 with \`isBase64Encoded: true\`.
Warmup events can send \`{ "warmup": true }\` or an EventBridge scheduled event and receive \`PDF Lambda warmup successful\`.
Keep auth, plan checks, premium template checks, and download quota logic in the main app before calling this Lambda.
`, 'utf8');

const transpiled = ts.transpileModule(handlerTs, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    esModuleInterop: true,
    skipLibCheck: true,
  },
}).outputText;
fs.writeFileSync(path.join(buildDir, 'handler.generated.mjs'), transpiled, 'utf8');

await esbuild.build({
  stdin: {
    contents: fs.readFileSync(path.join(buildDir, 'handler.generated.mjs'), 'utf8'),
    loader: 'js',
    sourcefile: 'handler.generated.mjs',
    resolveDir: buildDir,
  },
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: path.join(buildDir, 'handler.js'),
  external: ['@sparticuz/chromium'],
  absWorkingDir: repoRoot,
  nodePaths: moduleResolutionPaths,
  plugins: [createMonorepoResolvePlugin({ repoRoot, projectRoot })],
  minify: true,
});

fs.writeFileSync(path.join(buildDir, 'package.json'), JSON.stringify({
  name: 'nexcv-pdf-lambda',
  version: '1.0.0',
  private: true,
  main: 'handler.js',
  dependencies: {
    '@sparticuz/chromium': '^147.0.0',
  },
}, null, 2), 'utf8');

copyDir(path.join(dependencyRoot, '@sparticuz'), path.join(buildDir, 'node_modules', '@sparticuz'));
[
  'follow-redirects',
  'tar-fs',
  'tar-stream',
  'pump',
  'end-of-stream',
  'once',
  'wrappy',
  'streamx',
  'events-universal',
  'fast-fifo',
  'text-decoder',
  'bare-events',
  'bare-fs',
  'bare-os',
  'bare-path',
  'bare-stream',
  'bare-url',
].forEach((name) => {
  copyDirIfExists(path.join(dependencyRoot, name), path.join(buildDir, 'node_modules', name));
});

if (fs.existsSync(zipPath)) fs.rmSync(zipPath, { force: true });
if (process.platform === 'win32') {
  execFileSync('powershell.exe', [
    '-NoProfile',
    '-Command',
    `Compress-Archive -Path '${buildDir.replaceAll("'", "''")}\\*' -DestinationPath '${zipPath.replaceAll("'", "''")}' -Force`,
  ], { stdio: 'inherit' });
} else {
  execFileSync('zip', ['-qr', zipPath, '.'], {
    cwd: buildDir,
    stdio: 'inherit',
  });
}

const zipSizeMb = fs.statSync(zipPath).size / (1024 * 1024);
fs.rmSync(buildDir, { recursive: true, force: true });
console.log(`Created ${path.relative(repoRoot, zipPath)} (${zipSizeMb.toFixed(2)} MB)`);
