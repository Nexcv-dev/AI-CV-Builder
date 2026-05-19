
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

const ALLOWED_RICH_TEXT_TAGS = new Set(['b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'p', 'br', 'u', 'div', 'span']);
const DOMPurify = {
  sanitize(value: unknown, _config?: unknown) {
    return String(value || '')
      .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
      .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/\s+(href)\s*=\s*("javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi, '')
      .replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (match, tagName, attrs = '') => {
        const tag = String(tagName).toLowerCase();
        if (!ALLOWED_RICH_TEXT_TAGS.has(tag)) return '';
        const closing = /^<\s*\//.test(match);
        if (closing) return `</${tag}>`;
        if (tag !== 'a') return tag === 'br' ? '<br>' : `<${tag}>`;
        const hrefMatch = String(attrs).match(/\s+href\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i);
        const href = hrefMatch ? hrefMatch[1].replace(/^['"]|['"]$/g, '') : '';
        const safeHref = /^(https?:|mailto:|tel:|#)/i.test(href) ? href.replace(/"/g, '&quot;') : '#';
        return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">`;
      });
  },
};

const CV_TEMPLATES = [
  { key: 'classic', label: 'Classic', image: '/templates/classic.png', access: 'free', surfaceColorRole: 'none' },
  { key: 'modern', label: 'Modern', image: '/templates/modern.png', access: 'paid', surfaceColorRole: 'sidebar', surfaceColorLabel: 'Sidebar Background' },
  { key: 'professional', label: 'Professional', image: '/templates/professional.png', access: 'paid', surfaceColorRole: 'none' },
  { key: 'timeline', label: 'Timeline', image: '/templates/timeline.svg', access: 'paid', surfaceColorRole: 'none' },
  { key: 'minimalist', label: 'Minimalist', image: '/templates/minimalist.svg', access: 'paid', surfaceColorRole: 'none' },
  { key: 'startup', label: 'Startup', image: '/templates/startup.svg', access: 'paid', surfaceColorRole: 'header', surfaceColorLabel: 'Header Background' },
] as const;

type TemplateName = (typeof CV_TEMPLATES)[number]['key'];
const DEFAULT_TEMPLATE: TemplateName = 'professional';
const TEMPLATE_KEYS = CV_TEMPLATES.map((template) => template.key) as TemplateName[];
function getTemplateDefinition(template: TemplateName) {
  return CV_TEMPLATES.find((item) => item.key === template) || CV_TEMPLATES[0];
}
function isTemplateName(value: unknown): value is TemplateName {
  return typeof value === 'string' && TEMPLATE_KEYS.includes(value as TemplateName);
}
function getTemplateSurfaceColorFallback(template: TemplateName, colors: { themeColor: string; sidebarColor: string }): string {
  const definition = getTemplateDefinition(template);
  if (definition.surfaceColorRole === 'sidebar') return colors.sidebarColor;
  if (definition.surfaceColorRole === 'header') return colors.themeColor;
  return colors.themeColor;
}

const MAX_TEXT_LENGTH = 10000;
const MAX_IMAGE_DATA_URI_LENGTH = 2 * 1024 * 1024;
const SAFE_IMAGE_DATA_URI = /^data:image\/(?:png|jpe?g|webp);base64,[a-z0-9+/=\s]+$/i;
const sanitizePdfImageSource = (value: unknown) => {
  if (typeof value !== 'string') return '';
  const source = value.trim();
  if (!source || source.length > MAX_IMAGE_DATA_URI_LENGTH) return '';
  if (!SAFE_IMAGE_DATA_URI.test(source)) return '';
  return source.replace(/\s/g, '');
};

const S3_TEMPLATE_BUCKET = (process.env.S3_TEMPLATE_BUCKET_NAME || process.env.TEMPLATE_BUCKET_NAME || '').trim();
const S3_TEMPLATE_PREFIX = (process.env.S3_TEMPLATE_PREFIX || 'templates').replace(/^\/+|\/+$/g, '');
const S3_TEMPLATE_CACHE_TTL_MS = Number(process.env.S3_TEMPLATE_CACHE_TTL_MS || 5 * 60 * 1000);
let s3Client: S3Client | null = null;
const s3TemplateCache = new Map<string, { html: string; expiresAt: number }>();

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
  if (!S3_TEMPLATE_BUCKET) return null;

  const cached = s3TemplateCache.get(template);
  if (cached && cached.expiresAt > Date.now()) return cached.html;

  const indexHtml = await fetchS3Text(templateS3Key(template, 'index.html'));
  if (!indexHtml) return null;

  const css = await fetchS3Text(templateS3Key(template, 'style.css'));
  const html = css
    ? indexHtml.replace('</head>', '<style>\n' + css + '\n</style>\n</head>')
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

const escTemplateValue = (str: string) => (
  (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
);

function renderCvTemplateString(templateHtml: string, cvData: any, options: { watermark?: boolean } = {}) {
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
      escTemplateValue(renderTemplateValue(getTemplateValue(pathValue, context, root)))
    ));
  };

  return renderBlock(templateHtml, root);
}

async function generateS3CVHTML(cvData: any, template: TemplateName, options: { watermark?: boolean } = {}) {
  const templateHtml = await loadS3TemplateHtml(template);
  return templateHtml ? renderCvTemplateString(templateHtml, cvData, options) : null;
}

const PDF_ICONS = {
    email: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
    phone: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    location: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
    calendar: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>`,
    idCard: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M16 10h2"/><path d="M16 14h2"/><path d="M6.17 15a3 3 0 0 1 5.66 0"/><circle cx="9" cy="11" r="2"/><rect width="18" height="18" x="3" y="3" rx="2"/></svg>`,
    user: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    globe: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20"/><path d="M12 2a14.5 14.5 0 0 1 0 20"/><path d="M2 12h20"/><path d="M12 22a10 10 0 0 0 0-20"/><path d="M12 22a10 10 0 0 1 0-20"/></svg>`,
    sparkles: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>`,
    heart: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
};

function generateCVHTML(cvData: any, template: string, options: { watermark?: boolean } = {}): string {
    const { personalInfo = {}, experience = [], education = [], skills = [], projects = [], courses = [], awards = [], languages = [], references = [] } = cvData;
    const safeHexColor = (value: unknown, fallback: string) =>
        typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
    const safeNumber = (value: unknown, fallback: number, min: number, max: number) => {
        const number = Number(value);
        return Number.isFinite(number) ? Math.min(Math.max(number, min), max) : fallback;
    };

    const safeTemplate = isTemplateName(template) ? template : DEFAULT_TEMPLATE;
    const themeColor = safeHexColor(cvData.themeColor, '#2563eb');
    const sidebarColor = safeHexColor(cvData.sidebarColor, '#111827');
    const templateSurfaceColor = safeHexColor(
        cvData.templateSurfaceColor,
        getTemplateSurfaceColorFallback(safeTemplate, { themeColor, sidebarColor })
    );
    const fontFamily = cvData.fontFamily || 'Inter';
    const lineSpacing = safeNumber(cvData.lineSpacing, 1.5, 1, 2.5);
    const sectionGap = safeNumber(cvData.sectionGap, 2, 0.5, 4);
    const profileImage = sanitizePdfImageSource(cvData.profileImage);
    const imageZoom = Number.isFinite(Number(cvData.imageZoom)) ? Math.min(Math.max(Number(cvData.imageZoom), 0.5), 3) : 1;
    const imageX = Number.isFinite(Number(cvData.imageX)) ? Math.min(Math.max(Number(cvData.imageX), -120), 120) : 0;
    const imageY = Number.isFinite(Number(cvData.imageY)) ? Math.min(Math.max(Number(cvData.imageY), -120), 120) : 0;
    const sectionOrder = cvData.sectionOrder || ['summary', 'personalDetails', 'experience', 'education', 'skills', 'projects', 'courses', 'awards', 'languages', 'references'];
    const hiddenSections = cvData.hiddenSections || [];

    // --- Import shared helpers inline to keep the same export signature ---
    const esc = (str: string) => (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const profileImageSrc = esc(profileImage);

    const sanitize = (html: string) => DOMPurify.sanitize(html || '', {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'p', 'br', 'u', 'div', 'span'],
        ALLOWED_ATTR: ['href', 'target', 'rel']
    }).replace(/>\s+</g, '><');

    const getContrastColor = (hex: string) => {
        if (!hex || hex.length < 7) return '#ffffff';
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#1a1a1a' : '#ffffff';
    };

    const sidebarTextColor = getContrastColor(templateSurfaceColor);
    const sidebarMutedColor = sidebarTextColor === '#ffffff' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)';
    const startupHeaderTextColor = getContrastColor(templateSurfaceColor);
    const startupHeaderMutedColor = startupHeaderTextColor === '#ffffff' ? 'rgba(236,253,245,0.92)' : 'rgba(15,23,42,0.72)';
    const startupHeaderBackground = cvData.templateSurfaceColor
        ? templateSurfaceColor
        : `linear-gradient(135deg,${themeColor} 0%,#047857 100%)`;

    // ─── Reusable micro-templates ────────────────────────────────────
    const isPro = template === 'professional';
    const isModern = template === 'modern';
    const isTimeline = template === 'timeline';
    const isMin = template === 'minimalist';
    const isStartup = template === 'startup';
    const headingFontSize = isPro ? '0.875rem' : (isTimeline ? '0.6875rem' : (isMin ? '0.8125rem' : '1.125rem'));
    const dateColWidth = isTimeline ? '104px' : (isPro ? '114px' : '130px');

    const heading = (title: string, sectionKey?: string) => {
        if (isStartup) {
            return `<h2 style="display:inline-block;position:relative;font-size:1.25rem;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;color:${themeColor};margin-bottom:16px">
                ${title}<span style="position:absolute;left:0;bottom:-5px;width:50%;height:3px;border-radius:9999px;background:${themeColor};opacity:0.65"></span>
            </h2>`;
        }
        if (isTimeline || isMin) {
            const hasLine = !isMin || !['personalDetails', 'skills', 'projects', 'courses', 'awards', 'languages', 'references'].includes(sectionKey || '');
            return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
                <h2 style="flex-shrink:0;font-size:${headingFontSize};font-weight:900;text-transform:uppercase;letter-spacing:${isMin ? '0.15em' : '0.22em'};color:${themeColor}">${title}</h2>
                ${hasLine ? '<div style="height:1px;flex:1;background:#e5e7eb"></div>' : ''}
            </div>`;
        }
        return `<h2 style="font-size:${headingFontSize};font-weight:700;text-transform:uppercase;letter-spacing:0.1em;border-bottom:2px solid ${themeColor};color:${themeColor};padding-bottom:4px;margin-bottom:16px">${title}</h2>`;
    };

    const section = (content: string) =>
        `<section style="margin-bottom:${sectionGap}rem;break-inside:avoid">${content}</section>`;

    const desc = (html: string) => html
        ? `<div class="cv-preview-rich-text" style="font-size:0.875rem;color:#374151;line-height:${lineSpacing};white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word">${sanitize(html)}</div>` : '';

    const dateInline = (s: string, e: string) =>
        `${esc(s || '')} ${s && e ? '—' : ''} ${esc(e || '')}`;

    const dateStacked = (s: string, e: string) =>
        `${esc(s || '')}<br>${s && e ? '—' : ''}<br>${esc(e || '')}`;

    const title3 = (t: string) =>
        `<h3 style="font-size:1rem;font-weight:700;color:#111827;margin:0">${esc(t)}</h3>`;

    const timelineRow = (dateHtml: string, inner: string) => {
        if (isStartup) {
            return `<div style="position:relative;padding-left:20px;break-inside:avoid">
                <div style="position:absolute;left:0;top:8px;bottom:0;width:2px;background:${themeColor}22"></div>
                <div style="position:absolute;left:-5px;top:6px;width:12px;height:12px;border-radius:9999px;background:${themeColor};box-shadow:0 0 0 4px #ffffff"></div>
                ${inner}
            </div>`;
        }
        const ds = isTimeline ? 'font-size:0.6875rem;color:#6b7280;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;padding-top:2px'
            : (isPro ? 'font-size:0.75rem;color:#6b7280;font-weight:700;text-transform:uppercase;padding-top:2px'
                : 'font-size:0.875rem;color:#6b7280;font-weight:500;padding-top:2px');
        const contentStyle = isTimeline
            ? `position:relative;border-left:1px solid #e5e7eb;padding-left:20px`
            : '';
        const dot = isTimeline
            ? `<span style="position:absolute;left:-5px;top:4px;width:10px;height:10px;border-radius:9999px;border:2px solid #ffffff;background:${themeColor}"></span>`
            : '';
        return `<div style="display:grid;grid-template-columns:${dateColWidth} 1fr;gap:16px;break-inside:avoid">
            <div style="${ds}">${dateHtml}</div><div style="${contentStyle}">${dot}${inner}</div></div>`;
    };

    const modernItem = (titleH: string, leftSub: string, rightSub: string, body: string) =>
        `<div style="break-inside:avoid">${titleH}
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <span style="font-size:0.875rem;font-weight:500;color:${leftSub.startsWith('#') ? leftSub : '#374151'}">${leftSub.startsWith('#') ? '' : leftSub}</span>
              <span style="font-size:0.75rem;color:#6b7280;font-weight:500">${rightSub}</span>
            </div>${body}</div>`;

    const itemsList = (items: string[], gap = '24px') =>
        `<div style="display:flex;flex-direction:column;gap:${gap}">${items.join('')}</div>`;

    const renderBars = (level: number) => {
        const pct = ((level || 0) / 5) * 100;
        return `<div style="width:96px;height:6px;background:#e5e7eb;border-radius:9999px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${themeColor};border-radius:9999px"></div></div>`;
    };

    const detailRow = (label: string, val: string) =>
        `<div style="display:flex;justify-content:space-between;border-bottom:1px solid #f3f4f6;padding-bottom:4px"><span style="font-weight:600;color:#4b5563">${label}:</span><span style="color:#1f2937">${esc(val)}</span></div>`;

    const profileImg = (size: number, radius: string, border: string) => profileImage
        ? `<div style="width:${size}px;height:${size}px;border-radius:${radius};overflow:hidden;border:${border};margin:0 auto;display:flex;align-items:center;justify-content:center;position:relative;z-index:1;-webkit-mask-image:-webkit-radial-gradient(white,black);transform:translateZ(0);clip-path:inset(0 round ${radius})"><img src="${profileImageSrc}" style="width:100%;height:100%;object-fit:cover;display:block;transform-origin:center;transform:scale(${imageZoom}) translate(${imageX}px,${imageY}px)" /></div>` : '';

    const renderSection = (key: string): string => {
        if (hiddenSections.includes(key)) return '';

        if (key === 'summary' && personalInfo.summary) {
            const summaryTitle = isStartup ? 'About Me' : (isPro ? 'Professional Summary' : 'Profile');
            const summaryDesc = isPro
                ? `<div class="cv-preview-rich-text" style="font-size:0.875rem;color:#374151;line-height:${lineSpacing};margin-left:130px;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word">${sanitize(personalInfo.summary)}</div>`
                : desc(personalInfo.summary);
            return section(`${heading(summaryTitle, key)}${summaryDesc}`);
        }

        if (key === 'personalDetails' && (personalInfo.dob || personalInfo.nic || personalInfo.gender || personalInfo.nationality || personalInfo.religion || personalInfo.maritalStatus)) {
            if (isModern) return '';
            if (isStartup) {
                const detailItems = [
                    personalInfo.dob ? ['Date of Birth', personalInfo.dob, PDF_ICONS.calendar] : null,
                    personalInfo.nic ? ['NIC Number', personalInfo.nic, PDF_ICONS.idCard] : null,
                    personalInfo.gender ? ['Gender', personalInfo.gender, PDF_ICONS.user] : null,
                    personalInfo.maritalStatus ? ['Marital Status', personalInfo.maritalStatus, PDF_ICONS.heart] : null,
                    personalInfo.nationality ? ['Nationality', personalInfo.nationality, PDF_ICONS.globe] : null,
                    personalInfo.religion ? ['Religion', personalInfo.religion, PDF_ICONS.sparkles] : null,
                ].filter(Boolean) as [string, string, string][];

                const detailCell = (item?: [string, string, string]) => item ? `
                    <td style="width:50%;vertical-align:top;padding:0 10px 10px 0">
                        <div style="border-bottom:1px solid #f3f4f6;padding-bottom:6px;break-inside:avoid">
                            <div style="display:flex;align-items:center;gap:6px;font-size:0.875rem;font-weight:700;color:#6b7280">${item[2]}<span>${esc(item[0])}:</span></div>
                            <div style="margin-top:2px;font-size:0.875rem;font-weight:600;color:#1f2937;word-break:break-word;overflow-wrap:anywhere">${esc(item[1])}</div>
                        </div>
                    </td>
                ` : '<td style="width:50%;padding:0"></td>';

                const details = Array.from({ length: Math.ceil(detailItems.length / 2) }, (_, rowIndex) => {
                    const index = rowIndex * 2;
                    return `<tr>${detailCell(detailItems[index])}${detailCell(detailItems[index + 1])}</tr>`;
                }).join('');

                return section(`${heading('Personal Details', key)}<table style="width:100%;margin-top:8px;border-collapse:collapse;table-layout:fixed;font-size:0.875rem"><tbody>${details}</tbody></table>`);
            }
            const details = [
                personalInfo.dob ? detailRow('Date of Birth', personalInfo.dob) : '',
                personalInfo.nic ? detailRow('NIC', personalInfo.nic) : '',
                personalInfo.gender ? detailRow('Gender', personalInfo.gender) : '',
                personalInfo.maritalStatus ? detailRow('Marital Status', personalInfo.maritalStatus) : '',
                personalInfo.nationality ? detailRow('Nationality', personalInfo.nationality) : '',
                personalInfo.religion ? detailRow('Religion', personalInfo.religion) : '',
            ].filter(Boolean).join('');

            if (isMin) {
                return section(`${heading('Personal Details', key)}<div style="display:flex;flex-direction:column;gap:8px;font-size:0.875rem">${details}</div>`);
            }
            return section(`${heading('Personal Details', key)}<div style="display:grid;grid-template-columns:1fr 1fr;column-gap:48px;row-gap:8px;font-size:0.875rem${isPro ? ';margin-left:130px' : ''}">${details}</div>`);
        }

        if (key === 'experience' && experience.length > 0) {
            const items = experience.map((exp: any) => {
                const t = title3(exp.position || 'Position');
                const d = desc(exp.description);
                if (isModern || isMin) {
                    return `<div style="break-inside:avoid">${t}
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                          <span style="font-size:0.875rem;font-weight:500;color:${themeColor}">${esc(exp.company || 'Company')}</span>
                          <span style="font-size:0.75rem;color:#6b7280;font-weight:500">${dateInline(exp.startDate, exp.endDate)}</span>
                        </div>${d}</div>`;
                }
                const sub = isStartup
                    ? `<div style="display:flex;align-items:center;gap:8px;margin:4px 0 8px 0;font-size:0.875rem;font-weight:700;color:${themeColor}"><span>${esc(exp.company || 'Company')}</span>${(exp.startDate || exp.endDate) ? `<span style="width:4px;height:4px;border-radius:9999px;background:#d1d5db"></span><span style="font-size:0.75rem;font-weight:600;color:#9ca3af">${dateInline(exp.startDate, exp.endDate)}</span>` : ''}</div>`
                    : `<div style="font-size:0.875rem;font-weight:500;color:${isPro ? themeColor : '#374151'};margin-bottom:${isPro ? '6px' : '8px'}">${esc(exp.company || 'Company')}</div>`;
                const dateH = isPro ? dateStacked(exp.startDate, exp.endDate) : dateInline(exp.startDate, exp.endDate);
                return timelineRow(dateH, `${t}${sub}${d}`);
            });
            return section(`${heading('Experience', key)}${itemsList(items)}`);
        }

        if (key === 'education' && education.length > 0) {
            const items = education.map((edu: any) => {
                const t = title3(edu.degree || 'Degree');
                const d = desc(edu.description);
                if (isModern || isMin) {
                    return `<div style="break-inside:avoid">${t}<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><span style="font-size:0.875rem;font-weight:500;color:#374151">${esc(edu.institution || 'Institution')}</span><span style="font-size:0.75rem;color:#6b7280;font-weight:500">${dateInline(edu.startDate, edu.endDate)}</span></div>${d}</div>`;
                }
                if (isStartup) {
                    return `<div style="break-inside:avoid;border:1px solid #f3f4f6;background:#f9fafb;border-radius:12px;padding:16px">
                        ${(edu.startDate || edu.endDate) ? `<div style="display:inline-block;border:1px solid ${themeColor}44;background:${themeColor}12;color:${themeColor};border-radius:9999px;padding:4px 12px;margin-bottom:8px;font-size:0.75rem;font-weight:700">${dateInline(edu.startDate, edu.endDate)}</div>` : ''}
                        <h3 style="font-size:0.875rem;font-weight:700;color:#111827;margin:0">${esc(edu.degree || 'Degree')}</h3>
                        <div style="font-size:0.75rem;font-weight:500;color:#6b7280;margin-top:4px">${esc(edu.institution || 'Institution')}</div>
                        ${d}
                    </div>`;
                }
                const sub = `<div style="font-size:0.875rem;font-weight:500;color:${isPro ? themeColor : '#374151'};margin-bottom:${isPro ? '6px' : '4px'}">${esc(edu.institution || 'Institution')}</div>`;
                return timelineRow(isPro ? dateStacked(edu.startDate, edu.endDate) : dateInline(edu.startDate, edu.endDate), `${t}${sub}${d}`);
            });
            return section(`${heading('Education', key)}${itemsList(items)}`);
        }

        if (key === 'skills' && skills.length > 0) {
            if (isModern) return '';
            const chipsFor = (skillList: any[]) => skillList.map((s: any, index: number) => isStartup
                ? `<span style="font-size:0.75rem;font-weight:700;padding:6px 12px;border-radius:6px;border:1px solid ${index < 2 ? '#111827' : '#e5e7eb'};background:${index < 2 ? '#111827' : '#ffffff'};color:${index < 2 ? '#ffffff' : '#374151'}">${esc(s.name || '')}</span>`
                : `<span style="font-size:${isTimeline || isMin ? '0.75rem' : '0.875rem'};font-weight:600;padding:${isTimeline || isMin ? '4px 10px' : '6px 12px'};background:#f3f4f6;color:#374151;border-radius:6px;border:1px solid #e5e7eb">${esc(s.name || '')}</span>`
            ).join('');

            if (isPro) {
                const chips = chipsFor(skills);
                return section(`${heading('Skills & Expertise', key)}<div style="display:grid;grid-template-columns:114px 1fr;gap:16px"><div style="font-size:0.75rem;color:#6b7280;font-weight:700;text-transform:uppercase;padding-top:2px">Core Setup</div><div style="display:flex;flex-wrap:wrap;gap:8px">${chips}</div></div>`);
            }

            if (isStartup) {
                return section(`${heading('Expertise', key)}<div style="display:flex;flex-wrap:wrap;gap:8px">${chipsFor(skills)}</div>`);
            }

            if (isTimeline || isMin) {
                const hasCategories = skills.some((s: any) => s.category?.trim());
                const skillsByCategory = hasCategories
                    ? skills.reduce((acc: any, skill: any) => {
                        const category = skill.category?.trim() || (isMin ? 'Core Expertise' : 'Core Skills');
                        if (!acc[category]) acc[category] = [];
                        acc[category].push(skill);
                        return acc;
                    }, {})
                    : { [isMin ? 'Core Expertise' : 'Core Skills']: skills };

                const grouped = Object.entries(skillsByCategory).map(([category, catSkills]: [string, any]) => `
                  <div style="${isMin ? 'margin-bottom:8px' : 'display:grid;grid-template-columns:104px 1fr;gap:16px'}">
                    <div style="font-size:0.6875rem;color:${isMin ? '#374151' : '#6b7280'};font-weight:900;text-transform:uppercase;letter-spacing:0.05em;padding-top:4px;margin-bottom:${isMin ? '6px' : '0'}">${esc(category)}</div>
                    <div style="display:flex;flex-wrap:wrap;gap:8px">${chipsFor(catSkills)}</div>
                  </div>
                `).join('');
                return section(`${heading('Skills', key)}<div style="display:flex;flex-direction:column;gap:12px">${grouped}</div>`);
            }

            const chips = chipsFor(skills);
            return section(`${heading('Skills', key)}<div style="display:flex;flex-wrap:wrap;gap:8px">${chips}</div>`);
        }

        if (key === 'projects' && projects.length > 0) {
            const items = projects.map((p: any) => {
                const link = p.link ? `<a href="${esc(p.link)}" style="font-size:0.75rem;font-weight:500;color:${themeColor};text-decoration:none">View Project</a>` : '';
                const d = p.description ? `<div class="cv-preview-rich-text" style="font-size:0.875rem;color:#374151;line-height:${lineSpacing};margin-top:4px;white-space:pre-wrap;word-break:break-word">${sanitize(p.description)}</div>` : '';
                if (isModern || isMin) {
                    return `<div style="break-inside:avoid"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">${title3(p.name || 'Project Name')}${link}</div>${d}</div>`;
                }
                return timelineRow(link, `${title3(p.name || 'Project Name')}${d}`);
            });
            return section(`${heading(isPro ? 'Key Projects' : 'Projects', key)}${itemsList(items)}`);
        }

        if (key === 'courses' && courses.length > 0) {
            const items = courses.map((c: any) => {
                if (isModern || isMin) {
                    return `<div style="break-inside:avoid">${title3(c.name || 'Course Name')}<div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:0.875rem;font-weight:500;color:#374151">${esc(c.institution || 'Institution')}</span><span style="font-size:0.75rem;color:#6b7280;font-weight:500">${dateInline(c.startDate, c.endDate)}</span></div></div>`;
                }
                if (isStartup) {
                    return `<div style="break-inside:avoid">
                        <h3 style="font-size:1rem;font-weight:700;color:#111827;margin:0">${esc(c.name || 'Course Name')}</h3>
                        ${(c.startDate || c.endDate) ? `<div style="display:inline-block;border:1px solid ${themeColor}44;background:${themeColor}12;color:${themeColor};border-radius:9999px;padding:4px 10px;margin-top:4px;font-size:0.6875rem;font-weight:700">${dateInline(c.startDate, c.endDate)}</div>` : ''}
                        <div style="font-size:0.875rem;color:#374151;margin-top:4px">${esc(c.institution || 'Institution')}</div>
                    </div>`;
                }
                const fontSize = isPro ? '0.875rem' : '1rem';
                const ss = isPro ? '0.75rem' : '0.875rem';
                return timelineRow(dateInline(c.startDate, c.endDate), `<h3 style="font-size:${fontSize};font-weight:700;color:#111827;margin:0">${esc(c.name || 'Course Name')}</h3><div style="font-size:${ss};color:#374151;margin-top:2px">${esc(c.institution || 'Institution')}</div>`);
            });
            return section(`${heading(isPro ? 'Certifications & Courses' : 'Courses & Certifications', key)}${itemsList(items, isPro ? '16px' : '24px')}`);
        }

        if (key === 'awards' && awards.length > 0) {
            const items = awards.map((a: any) => {
                if (isModern || isMin) {
                    return `<div style="break-inside:avoid">${title3(a.name || 'Award Name')}<div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:0.875rem;font-weight:500;color:#374151">${esc(a.issuer || 'Issuer')}</span><span style="font-size:0.75rem;color:#6b7280;font-weight:500">${esc(a.date || '')}</span></div></div>`;
                }
                if (isStartup) {
                    return `<div style="break-inside:avoid">
                        <h3 style="font-size:1rem;font-weight:700;color:#111827;margin:0">${esc(a.name || 'Award Name')}</h3>
                        ${a.date ? `<div style="display:inline-block;border:1px solid ${themeColor}44;background:${themeColor}12;color:${themeColor};border-radius:9999px;padding:4px 10px;margin-top:4px;font-size:0.6875rem;font-weight:700">${esc(a.date)}</div>` : ''}
                        <div style="font-size:0.875rem;color:#374151;margin-top:4px">${esc(a.issuer || 'Issuer')}</div>
                    </div>`;
                }
                const fontSize = isPro ? '0.875rem' : '1rem';
                const ss = isPro ? '0.75rem' : '0.875rem';
                return timelineRow(esc(a.date || ''), `<h3 style="font-size:${fontSize};font-weight:700;color:#111827;margin:0">${esc(a.name || 'Award Name')}</h3><div style="font-size:${ss};color:#374151;margin-top:2px">${esc(a.issuer || 'Issuer')}</div>`);
            });
            return section(`${heading('Awards', key)}${itemsList(items, isPro ? '16px' : '24px')}`);
        }

        if (key === 'languages' && languages.length > 0) {
            if (isModern) return '';
            if (isStartup) {
                const li = languages.map((l: any) => `<div style="break-inside:avoid">
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:0.875rem;font-weight:700;color:#1f2937"><span>${esc(l.name || '')}</span><span style="color:${themeColor}">${esc(l.proficiency || '')}</span></div>
                    <div style="width:100%;height:6px;background:#e5e7eb;border-radius:9999px"><div style="width:78%;height:6px;background:${themeColor};border-radius:9999px"></div></div>
                </div>`).join('');
                return section(`${heading('Languages', key)}<div style="display:flex;flex-direction:column;gap:12px">${li}</div>`);
            }
            if (isTimeline) {
                const li = languages.map((l: any) => `<div style="break-inside:avoid;min-width:0"><span style="font-size:0.875rem;font-weight:700;color:#1f2937">${esc(l.name || '')}</span><span style="margin-left:6px;font-size:0.75rem;color:#6b7280">${esc(l.proficiency || '')}</span></div>`).join('');
                return section(`${heading('Languages', key)}<div style="display:grid;grid-template-columns:1fr 1fr 1fr;column-gap:24px;row-gap:8px">${li}</div>`);
            }
            if (isPro) {
                const li = languages.map((l: any) => `<span style="font-size:0.875rem;font-weight:500;color:#1f2937">${esc(l.name || '')} <span style="color:#9ca3af;font-weight:400">(${esc(l.proficiency || '')})</span></span>`).join('');
                return section(`${heading('Languages', key)}<div style="display:grid;grid-template-columns:114px 1fr;gap:16px"><div style="font-size:0.75rem;color:#6b7280;font-weight:700;text-transform:uppercase;padding-top:2px">Spoken</div><div style="display:flex;flex-wrap:wrap;gap:16px">${li}</div></div>`);
            }
            if (isMin) {
                const li = languages.map((l: any) => `<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #f9fafb;padding-bottom:4px"><span style="font-size:0.875rem;font-weight:600;color:#374151">${esc(l.name || '')}</span><span style="font-size:0.875rem;color:#6b7280">${esc(l.proficiency || '')}</span></div>`).join('');
                return section(`${heading('Languages', key)}<div style="display:flex;flex-direction:column;gap:8px">${li}</div>`);
            }
            const li = languages.map((l: any) => `<div style="display:flex;align-items:center;justify-content:space-between;break-inside:avoid"><span style="font-size:0.875rem;font-weight:500;color:#374151">${esc(l.name || '')}</span><span style="font-size:0.875rem;color:#6b7280">${esc(l.proficiency || '')}</span></div>`).join('');
            return section(`${heading('Languages', key)}<div style="display:grid;grid-template-columns:1fr 1fr;column-gap:48px;row-gap:16px">${li}</div>`);
        }

        if (key === 'references' && references.length > 0) {
            const items = references.map((r: any) => {
                const subParts = [r.position, r.company].filter(Boolean).join(', ');
                const sub = subParts ? `<div style="font-size:${isPro ? '0.75rem' : '0.875rem'};font-weight:500;color:#4b5563;margin-top:2px">${esc(subParts)}</div>` : '';
                const contacts = [
                    r.email ? `<div>${esc(r.email)}</div>` : '',
                    r.phone ? `<div>${esc(r.phone)}</div>` : ''
                ].filter(Boolean).join('');
                const contactHtml = contacts ? `<div style="margin-top:4px;font-size:0.75rem;color:#6b7280;line-height:1.4">${contacts}</div>` : '';
                return `<div style="break-inside:avoid"><h3 style="font-size:${isPro ? '0.875rem' : '1rem'};font-weight:700;color:#111827;margin:0">${esc(r.name || 'Reference Name')}</h3>${sub}${contactHtml}</div>`;
            });

            if (isPro) {
                return section(`${heading('References', key)}<div style="display:grid;grid-template-columns:114px 1fr;gap:16px"><div style="font-size:0.75rem;color:#6b7280;font-weight:700;text-transform:uppercase;padding-top:2px">Contacts</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:32px">${items.join('')}</div></div>`);
            }
            const gridCols = isModern || isMin ? '1fr' : '1fr 1fr';
            return section(`${heading('References', key)}<div style="display:grid;grid-template-columns:${gridCols};column-gap:40px;row-gap:16px">${items.join('')}</div>`);

        }

        return '';
    };

    const leftSectionsHTML = isMin ? sectionOrder.filter(k => !['personalDetails', 'skills', 'projects', 'courses', 'awards', 'languages', 'references'].includes(k)).map(renderSection).join('') : '';
    const rightSectionsHTML = isMin ? sectionOrder.filter(k => ['personalDetails', 'skills', 'projects', 'courses', 'awards', 'languages', 'references'].includes(k)).map(renderSection).join('') : '';
    const startupLeftSectionsHTML = isStartup ? sectionOrder.filter(k => ['personalDetails', 'summary', 'experience'].includes(k)).map(renderSection).join('') : '';
    const startupRightSectionsHTML = isStartup ? sectionOrder.filter(k => ['education', 'skills', 'projects', 'courses', 'awards', 'languages', 'references'].includes(k)).map(renderSection).join('') : '';
    const sectionsHTML = isMin ? '' : sectionOrder.map(renderSection).join('');

    // Build template-specific layout
    let bodyContent = '';

    if (template === 'modern') {
        // Modern sidebar
        const sidebarDetails = [
            personalInfo.email ? `<div style="display:flex;align-items:center;gap:8px;word-break:break-word">${PDF_ICONS.email} <span>${esc(personalInfo.email)}</span></div>` : '',
            personalInfo.phone ? `<div style="display:flex;align-items:center;gap:8px;word-break:break-word">${PDF_ICONS.phone} <span>${esc(personalInfo.phone)}</span></div>` : '',
            personalInfo.address ? `<div style="display:flex;align-items:center;gap:8px;word-break:break-word">${PDF_ICONS.location} <span>${esc(personalInfo.address)}</span></div>` : '',
        ].filter(Boolean).join('');

        const personalDetails = [
            personalInfo.dob ? `<div style="display:flex;align-items:center;gap:8px">${PDF_ICONS.calendar} <span>${esc(personalInfo.dob)}</span></div>` : '',
            personalInfo.nic ? `<div style="display:flex;align-items:center;gap:8px">${PDF_ICONS.idCard} <span>${esc(personalInfo.nic)}</span></div>` : '',
            personalInfo.gender ? `<div style="display:flex;align-items:center;gap:8px">${PDF_ICONS.user} <span>${esc(personalInfo.gender)}</span></div>` : '',
            personalInfo.nationality ? `<div style="display:flex;align-items:center;gap:8px">${PDF_ICONS.globe} <span>${esc(personalInfo.nationality)}</span></div>` : '',
            personalInfo.religion ? `<div style="display:flex;align-items:center;gap:8px">${PDF_ICONS.sparkles} <span>${esc(personalInfo.religion)}</span></div>` : '',
            personalInfo.maritalStatus ? `<div style="display:flex;align-items:center;gap:8px">${PDF_ICONS.heart} <span>${esc(personalInfo.maritalStatus)}</span></div>` : '',
        ].filter(Boolean).join('');

        const hasSkillCategories = skills.some((s: any) => s.category?.trim());
        let sidebarSkillsHTML = '';

        if (!hasSkillCategories) {
            sidebarSkillsHTML = skills.map((s: any) =>
                `<div style="display:flex;flex-direction:column;gap:6px">
          <span style="font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:${sidebarTextColor}">${esc(s.name || '')}</span>
          ${renderBars(s.level || 0)}
        </div>`
            ).join('');
        } else {
            const skillsByCategory = skills.reduce((acc: any, skill: any) => {
                const category = skill.category?.trim() || 'Other Skills';
                if (!acc[category]) acc[category] = [];
                acc[category].push(skill);
                return acc;
            }, {});

            sidebarSkillsHTML = Object.entries(skillsByCategory).map(([category, catSkills]: [string, any]) => `
        <div style="margin-bottom:12px">
          <h3 style="font-size:0.625rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:${sidebarTextColor};opacity:0.8;margin-bottom:8px">${esc(category)}</h3>
          <div style="display:flex;flex-direction:column;gap:12px">
            ${catSkills.map((s: any) => `
              <div style="display:flex;flex-direction:column;gap:4px">
                <span style="font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:${sidebarTextColor}">${esc(s.name || '')}</span>
                ${renderBars(s.level || 0)}
              </div>
            `).join('')}
          </div>
        </div>
      `).join('');
        }

        const sidebarLanguages = languages.map((l: any) =>
            `<div style="display:flex;justify-content:space-between;align-items:center;font-size:0.875rem">
        <span style="font-weight:600;color:${sidebarTextColor}">${esc(l.name || '')}</span>
        <span style="font-size:0.75rem;color:${sidebarMutedColor}">${esc(l.proficiency || '')}</span>
      </div>`
        ).join('');
        bodyContent = `
    <table style="width:100%; border-collapse:collapse; border:none; table-layout:fixed; position:relative; z-index:2">
      <tr>
        <td style="width:30%; vertical-align:top; padding:15mm; padding-top:15mm; color:${sidebarTextColor}; background:${templateSurfaceColor}; position:relative; z-index:2">
          ${profileImage ? `<div style="width:128px;height:128px;border-radius:9999px;overflow:hidden;border:4px solid rgba(255,255,255,0.2);margin:0 auto 24px auto;display:flex;align-items:center;justify-content:center;position:relative;z-index:1;-webkit-mask-image:-webkit-radial-gradient(white,black);transform:translateZ(0);clip-path:inset(0 round 9999px)"><img src="${profileImageSrc}" style="width:100%;height:100%;object-fit:cover;display:block;transform-origin:center;transform:scale(${imageZoom}) translate(${imageX}px,${imageY}px)" /></div>` : ''}
          
          <div style="margin-bottom:32px">
            <h2 style="font-size:1rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;border-bottom:1px solid ${sidebarTextColor === '#ffffff' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'};margin-bottom:16px;padding-bottom:4px;color:${sidebarTextColor}">Details</h2>
            <div style="display:flex;flex-direction:column;gap:16px;font-size:0.75rem;color:${sidebarMutedColor}">${sidebarDetails}</div>
          </div>

          ${personalDetails ? `<div style="margin-bottom:32px">
            <h2 style="font-size:1rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;border-bottom:1px solid ${sidebarTextColor === '#ffffff' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'};margin-bottom:16px;padding-bottom:4px;color:${sidebarTextColor}">Personal Info</h2>
            <div style="display:flex;flex-direction:column;gap:12px;font-size:0.625rem;text-transform:uppercase;letter-spacing:0.05em;color:${sidebarMutedColor}">${personalDetails}</div>
          </div>` : ''}

          ${skills.length > 0 ? `<div style="margin-top:16px">
            <h2 style="font-size:1rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;border-bottom:1px solid ${sidebarTextColor === '#ffffff' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'};margin-bottom:16px;padding-bottom:4px;color:${sidebarTextColor}">Skills</h2>
            <div style="display:flex;flex-direction:column;gap:16px">${sidebarSkillsHTML}</div>
          </div>` : ''}

          ${languages.length > 0 ? `<div style="margin-top:32px">
            <h2 style="font-size:1rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;border-bottom:1px solid ${sidebarTextColor === '#ffffff' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'};margin-bottom:16px;padding-bottom:4px;color:${sidebarTextColor}">Languages</h2>
            <div style="display:flex;flex-direction:column;gap:12px">${sidebarLanguages}</div>
          </div>` : ''}
        </td>
        <td style="width:70%; vertical-align:top; padding:20mm; padding-top:0; background:white; position:relative; z-index:2">
          <header style="margin-bottom:40px; padding-top:27mm">
            <h1 style="font-size:2.5rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;color:${themeColor};word-break:break-word">${esc(personalInfo.fullName || 'Your Name')}</h1>
            <div style="width:64px;height:4px;background:${themeColor};margin-bottom:8px"></div>
          </header>

          <table style="width:100%; border-collapse: collapse; border: none; margin: 0; padding: 0;">
            <thead style="height: 0;"><tr style="border:none"><td style="border: none; padding: 0; height: 0;"></td></tr></thead>
            <tbody style="border: none;"><tr><td style="border: none; padding: 0; vertical-align: top;">
              ${sectionsHTML}
            </td></tr></tbody>
          </table>
        </td>
      </tr>
    </table>`;
    } else if (template === 'startup') {
        const contactItems = [
            personalInfo.email ? `<div style="display:flex;align-items:center;gap:12px">${PDF_ICONS.email}<span>${esc(personalInfo.email)}</span></div>` : '',
            personalInfo.phone ? `<div style="display:flex;align-items:center;gap:12px">${PDF_ICONS.phone}<span>${esc(personalInfo.phone)}</span></div>` : '',
            personalInfo.address ? `<div style="display:flex;align-items:center;gap:12px">${PDF_ICONS.location}<span>${esc(personalInfo.address)}</span></div>` : '',
        ].filter(Boolean).join('');

        bodyContent = `<div style="display:block;background:white;min-height:297mm;position:relative;overflow:hidden">
          <header style="position:relative;overflow:hidden;padding:15mm 20mm 25mm 20mm;color:${startupHeaderTextColor};clip-path:polygon(0 0,100% 0,100% 75%,0 100%);background:${startupHeaderBackground}">
            <div style="position:absolute;inset:0;opacity:0.1;background-image:radial-gradient(#ffffff 2px,transparent 2px);background-size:24px 24px"></div>
            <div style="position:relative;z-index:2;padding-right:${profileImage ? '170px' : '0'}">
              <h1 style="font-size:3rem;line-height:1.05;font-weight:800;letter-spacing:-0.025em;word-break:break-word">${esc(personalInfo.fullName || 'Your Name')}</h1>
              <div style="margin-top:8px;font-size:1.125rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:${startupHeaderMutedColor}">${esc(experience[0]?.position || 'Professional Title')}</div>
              <div style="margin-top:24px;display:flex;flex-direction:column;gap:8px;font-size:0.875rem;font-weight:500;color:${startupHeaderMutedColor}">${contactItems}</div>
            </div>
          </header>
          ${profileImage ? `<div style="position:absolute;right:20mm;top:15mm;z-index:5;width:144px;height:144px;border-radius:9999px;overflow:hidden;border:4px solid #ffffff;box-shadow:0 18px 30px rgba(15,23,42,0.22);display:flex;align-items:center;justify-content:center;-webkit-mask-image:-webkit-radial-gradient(white,black);transform:translateZ(0);clip-path:inset(0 round 9999px)"><img src="${profileImageSrc}" style="width:100%;height:100%;object-fit:cover;display:block;transform-origin:center;transform:scale(${imageZoom}) translate(${imageX}px,${imageY}px)" /></div>` : ''}
          <table style="position:relative;z-index:2;margin-top:-16px;padding:0 20mm 15mm 20mm;width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed">
            <tbody>
              <tr>
                <td style="width:60%;vertical-align:top;padding:0 20px 0 0">${startupLeftSectionsHTML}</td>
                <td style="width:40%;vertical-align:top;padding:64px 0 0 20px">${startupRightSectionsHTML}</td>
              </tr>
            </tbody>
          </table>
        </div>`;
    } else if (template === 'professional') {
        bodyContent = `<div style="display:block;background:white">
      <div style="width:100%;height:8px;background:${themeColor}"></div>
      <div style="padding:0 20mm;padding-top:15mm">
        <table style="width:100%; border-collapse: collapse; border: none; margin: 0; padding: 0;">
          <thead style="height: 0;"><tr><td style="border: none; padding: 0;"></td></tr></thead>
          <tbody style="border: none;"><tr><td style="border: none; padding: 0; vertical-align: top;">
            <header style="margin-bottom:40px;display:flex;border-bottom:2px solid #f3f4f6;padding-bottom:24px">
              <div style="flex:1">
                <h1 style="font-size:2.4rem;line-height:1.1;font-weight:800;letter-spacing:-0.025em;margin-bottom:8px;color:#111827;word-break:break-word">${esc(personalInfo.fullName || 'Your Name')}</h1>
                <div style="display:flex;flex-direction:column;gap:4px;font-size:0.875rem;font-weight:500;margin-top:16px">
                  ${personalInfo.email ? `<div style="color:#4b5563">${esc(personalInfo.email)}</div>` : ''}
                  ${personalInfo.phone ? `<div style="color:#4b5563">${esc(personalInfo.phone)}</div>` : ''}
                  ${personalInfo.address ? `<div style="color:#6b7280">${esc(personalInfo.address)}</div>` : ''}
                </div>
              </div>
              ${profileImage ? `<div style="margin-left:24px;flex-shrink:0"><div style="width:112px;height:112px;border-radius:6px;overflow:hidden;border:1px solid #e5e7eb;display:flex;align-items:center;justify-content:center;position:relative;z-index:1;-webkit-mask-image:-webkit-radial-gradient(white,black);transform:translateZ(0);clip-path:inset(0 round 6px)"><img src="${profileImageSrc}" style="width:100%;height:100%;object-fit:cover;display:block;transform-origin:center;transform:scale(${imageZoom}) translate(${imageX}px,${imageY}px)" /></div></div>` : ''}
            </header>
            ${sectionsHTML}
          </td></tr></tbody>
        </table>
      </div>
    </div>`;
    } else if (template === 'timeline') {
        const contactItems = [personalInfo.email, personalInfo.phone, personalInfo.address]
            .filter(Boolean)
            .map((item: string) => `<span style="word-break:break-word;text-decoration:none">${esc(item)}</span>`)
            .join('');

        bodyContent = `<div style="display:block;background:white">
      <div style="padding:0 18mm;padding-top:18mm;min-height:297mm">
        <table style="width:100%; border-collapse: collapse; border: none; margin: 0; padding: 0;">
          <thead style="height: 0;"><tr><td style="border: none; padding: 0;"></td></tr></thead>
          <tbody style="border: none;"><tr><td style="border: none; padding: 0; vertical-align: top;">
            <header style="margin-bottom:36px;border-bottom:1px solid #e5e7eb;padding-bottom:24px">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:32px">
                <div style="min-width:0;flex:1">
                  <div style="width:64px;height:6px;border-radius:9999px;background:${themeColor};margin-bottom:12px"></div>
                  <h1 style="font-size:2.45rem;line-height:1;font-weight:900;letter-spacing:-0.025em;color:#030712;word-break:break-word">${esc(personalInfo.fullName || 'Your Name')}</h1>
                  <div style="margin-top:16px;display:flex;flex-direction:column;gap:2px;font-size:0.75rem;font-weight:500;line-height:1.65;color:#6b7280">${contactItems}</div>
                </div>
                ${profileImage ? `<div style="flex-shrink:0"><div style="width:112px;height:112px;border-radius:9999px;overflow:hidden;border:3px solid #ffffff;box-shadow:0 0 0 1px #e5e7eb;display:flex;align-items:center;justify-content:center;position:relative;z-index:1;-webkit-mask-image:-webkit-radial-gradient(white,black);transform:translateZ(0);clip-path:inset(0 round 9999px)"><img src="${profileImageSrc}" style="width:100%;height:100%;object-fit:cover;display:block;transform-origin:center;transform:scale(${imageZoom}) translate(${imageX}px,${imageY}px)" /></div></div>` : ''}
              </div>
            </header>
            ${sectionsHTML}
          </td></tr></tbody>
        </table>
      </div>
    </div>`;
    } else if (template === 'minimalist') {
        bodyContent = `<div style="display:block;background:white">
      <div style="padding:0 20mm;padding-top:15mm">
        <table style="width:100%; border-collapse: collapse; border: none; margin: 0; padding: 0;">
          <thead style="height: 0;"><tr><td style="border: none; padding: 0;"></td></tr></thead>
          <tbody style="border: none;"><tr><td style="border: none; padding: 0; vertical-align: top;">
            <header style="margin-bottom:40px;text-align:center;border-bottom:2px solid #f3f4f6;padding-bottom:30px">
              ${profileImage ? `<div style="width:112px;height:112px;border-radius:9999px;overflow:hidden;border:3px solid #ffffff;box-shadow:0 0 0 1px #e5e7eb;margin:0 auto 20px auto;display:flex;align-items:center;justify-content:center;position:relative;z-index:1;-webkit-mask-image:-webkit-radial-gradient(white,black);transform:translateZ(0);clip-path:inset(0 round 9999px)"><img src="${profileImageSrc}" style="width:100%;height:100%;object-fit:cover;display:block;transform-origin:center;transform:scale(${imageZoom}) translate(${imageX}px,${imageY}px)" /></div>` : ''}
              <h1 style="font-size:2.25rem;font-weight:700;margin-bottom:10px;color:#111827">${esc(personalInfo.fullName || 'Your Name')}</h1>
              <div style="font-size:0.8125rem;color:#4b5563;display:flex;justify-content:center;gap:15px;font-weight:500">
                ${[
                personalInfo.email ? `<span>${esc(personalInfo.email)}</span>` : '',
                personalInfo.phone ? `<span>${esc(personalInfo.phone)}</span>` : '',
                personalInfo.address ? `<span>${esc(personalInfo.address)}</span>` : ''
            ].filter(Boolean).join(' | ')}
              </div>
            </header>

            <div style="display:grid;grid-template-columns:1fr 250px;gap:40px;position:relative">
               <!-- Vertical Divider -->
               <div style="position:absolute;top:0;bottom:0;left:calc(100% - 250px - 20px);width:1px;background-color:#9ca3af"></div>

               <div style="display:flex;flex-direction:column;gap:8px">
                 ${leftSectionsHTML}
               </div>

               <div style="display:flex;flex-direction:column;gap:24px">
                 ${rightSectionsHTML}
               </div>
            </div>
          </td></tr></tbody>
        </table>
      </div>
    </div>`;
    } else {
        // Classic
        bodyContent = `<div style="display:block;background:white">
      <div style="width:100%;height:1px;background:transparent"></div>
      <div style="padding:0 20mm;padding-top:20mm">
        <table style="width:100%; border-collapse: collapse; border: none; margin: 0; padding: 0;">
          <thead style="height: 0;"><tr><td style="border: none; padding: 0;"></td></tr></thead>
          <tbody style="border: none;"><tr><td style="border: none; padding: 0; vertical-align: top;">
            <header style="margin-bottom:32px;text-align:center;">
              ${profileImage ? `<div style="width:96px;height:96px;border-radius:9999px;overflow:hidden;border:2px solid #e5e7eb;margin:0 auto 16px auto;display:flex;align-items:center;justify-content:center;position:relative;z-index:1;-webkit-mask-image:-webkit-radial-gradient(white,black);transform:translateZ(0);clip-path:inset(0 round 9999px)"><img src="${profileImageSrc}" style="width:100%;height:100%;object-fit:cover;display:block;transform-origin:center;transform:scale(${imageZoom}) translate(${imageX}px,${imageY}px)" /></div>` : ''}
              <h1 style="font-size:2.25rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px;color:${themeColor}">${esc(personalInfo.fullName || 'Your Name')}</h1>
              <div style="font-size:0.875rem;color:#4b5563;text-align:center;">
                ${[
                personalInfo.email ? `<span>${esc(personalInfo.email)}</span>` : '',
                personalInfo.phone ? `<span>${esc(personalInfo.phone)}</span>` : '',
                personalInfo.address ? `<span>${esc(personalInfo.address)}</span>` : ''
            ].filter(Boolean).join(' &nbsp;&bull;&nbsp; ')}
              </div>
            </header>
            ${sectionsHTML}
          </td></tr></tbody>
        </table>
      </div>
    </div>`;
    }

    const fontMap: Record<string, string> = {
        'Inter': "'Inter', sans-serif",
        'Lora': "'Lora', serif",
        'Roboto': "'Roboto', sans-serif",
        'Montserrat': "'Montserrat', sans-serif",
        'Merriweather': "'Merriweather', serif",
        'Playfair Display': "'Playfair Display', serif",
        'JetBrains Mono': "'JetBrains Mono', monospace",
    };

    const fontFamilyCSS = fontMap[fontFamily] || "'Inter', sans-serif";
    const googleFontName = (fontFamily || 'Inter').replace(/\s+/g, '+');
    const watermarkHtml = options.watermark ? `
      <div class="nexcv-watermark" aria-hidden="true">
        <div>Created with NexCV Free</div>
        <div>Upgrade to remove watermark</div>
      </div>
    ` : '';

    const cssInjections = template === 'modern' ? `
    @media print {
      @page {
        margin: 0 !important;
      }
      body::before {
        content: "";
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        width: 30%;
        background-color: ${templateSurfaceColor} !important;
        z-index: 0;
      }
    }
  ` : '';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=${googleFontName}:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: ${fontFamilyCSS}; background: white; color: #111827; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; }
    body, body * {
      max-width: 100%;
      min-width: 0;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    a {
      overflow-wrap: anywhere;
      word-break: break-all;
    }
    svg, img {
      min-width: initial;
      overflow-wrap: normal;
      word-break: normal;
    }
    ::-webkit-scrollbar { display: none; }
    a { color: inherit; text-decoration: none; }
    ul { padding-left: 20px; margin: 4px 0; }
    li { margin-bottom: 4px; }
    .cv-preview-rich-text,
    .cv-preview-rich-text * {
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .cv-preview-rich-text ul, .cv-preview-rich-text ol { margin-top: 0; margin-bottom: 0; }
    .cv-preview-rich-text li { margin-top: 0; margin-bottom: 0.25rem; }
    .cv-preview-rich-text li:last-child { margin-bottom: 0; }
    .cv-preview-rich-text p { margin-top: 0; margin-bottom: 0.25rem; }
    .cv-preview-rich-text p:last-child { margin-bottom: 0; }
    h1, h2, h3 { margin: 0; }
    .nexcv-watermark {
      position: fixed;
      inset: 0;
      z-index: 9999;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      color: rgba(15, 23, 42, 0.13);
      font-family: Arial, sans-serif;
      font-size: 44px;
      font-weight: 800;
      letter-spacing: 0;
      text-transform: uppercase;
      transform: rotate(-28deg);
      text-align: center;
    }
    .nexcv-watermark div + div {
      font-size: 22px;
      letter-spacing: 0;
    }
    table, tbody, tr, td, th, thead, tfoot {
      page-break-inside: auto !important;
      break-inside: auto !important;
    }
    @page { margin: 0.5in 0 0 0; }
    @page :first { margin-top: 0; }
    ${cssInjections}
  </style>
</head>
<body>
  ${watermarkHtml}
  ${template === 'classic'
            ? bodyContent
            : `<div style="width:210mm;background:transparent;margin:0 auto;position:relative">${bodyContent}</div>`
        }
</body>
</html>`;
}

function sanitizeCvData(obj: any, depth = 0): any {
    if (depth > 10) return obj; // Prevent infinite recursion
    if (typeof obj === 'string') {
        const safeImage = sanitizePdfImageSource(obj);
        if (safeImage) return safeImage;
        if (obj.trim().startsWith('data:image/')) return '';
        return obj.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, MAX_TEXT_LENGTH);
    }
    if (Array.isArray(obj)) {
        return obj.slice(0, 50).map(item => sanitizeCvData(item, depth + 1));
    }
    if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = sanitizeCvData(value, depth + 1);
        }
        return sanitized;
    }
    return obj;
}

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
  const safeCvData = sanitizeCvData(cvData);
  let html: string | null = null;
  try {
    html = await generateS3CVHTML(safeCvData, requestedTemplate, { watermark });
  } catch (error) {
    console.warn('S3 template unavailable; falling back to built-in PDF template.', error);
  }
  const templateSource = html ? 's3' : 'built-in';
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
    return { pdf, templateSource };
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
    const { pdf, templateSource } = await renderPdf(payload.cvData, payload.template, Boolean(payload.watermark));
    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="resume.pdf"',
        'X-PDF-Template-Source': templateSource,
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
