import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import esbuild from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), '..');
const repoRoot = path.resolve(projectRoot, '..');
const serverPath = path.join(projectRoot, 'server.ts');
const outRoot = path.join(projectRoot, 'lambda-pdf');
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

const serverSource = fs.readFileSync(serverPath, 'utf8');
const pdfIcons = extractConstObject(serverSource, 'PDF_ICONS');
const generateCvHtmlTs = extractBetween(serverSource, 'export function generateCVHTML', '// AI Generate PDF via Puppeteer').replace('export function', 'function');
const sanitizeCvDataTs = extractFunction(serverSource, 'function sanitizeCvData');

const s3TemplatePreprocessorTs = String.raw`
const safeHexColorForTemplate = (value: unknown, fallback: string) =>
  typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;

const safeNumberForTemplate = (value: unknown, fallback: number, min: number, max: number) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(Math.max(number, min), max) : fallback;
};

const getContrastColorForTemplate = (hex: string) => {
  if (!hex || hex.length < 7) return '#ffffff';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#1a1a1a' : '#ffffff';
};

const templateFontMap: Record<string, string> = {
  'Inter': "'Inter', sans-serif",
  'Lora': "'Lora', serif",
  'Roboto': "'Roboto', sans-serif",
  'Montserrat': "'Montserrat', sans-serif",
  'Merriweather': "'Merriweather', serif",
  'Playfair Display': "'Playfair Display', serif",
  'JetBrains Mono': "'JetBrains Mono', monospace",
};

function prepareS3TemplateData(cvData: any, template: TemplateName, options: { watermark?: boolean } = {}) {
  const rawPersonalInfo = cvData.personalInfo || {};
  const personalInfo = {
    ...rawPersonalInfo,
    fullName: rawPersonalInfo.fullName || 'Your Name',
  };
  const experience = Array.isArray(cvData.experience) ? cvData.experience : [];
  const education = Array.isArray(cvData.education) ? cvData.education : [];
  const skills = Array.isArray(cvData.skills) ? cvData.skills : [];
  const projects = Array.isArray(cvData.projects) ? cvData.projects : [];
  const courses = Array.isArray(cvData.courses) ? cvData.courses : [];
  const awards = Array.isArray(cvData.awards) ? cvData.awards : [];
  const languages = Array.isArray(cvData.languages) ? cvData.languages : [];
  const references = Array.isArray(cvData.references) ? cvData.references : [];
  const sectionOrder = Array.isArray(cvData.sectionOrder)
    ? cvData.sectionOrder
    : ['summary', 'personalDetails', 'experience', 'education', 'skills', 'projects', 'courses', 'awards', 'languages', 'references'];
  const hiddenSections = Array.isArray(cvData.hiddenSections) ? cvData.hiddenSections : [];

  const themeColor = safeHexColorForTemplate(cvData.themeColor, '#2563eb');
  const sidebarColor = safeHexColorForTemplate(cvData.sidebarColor, '#111827');
  const templateSurfaceColor = safeHexColorForTemplate(
    cvData.templateSurfaceColor,
    getTemplateSurfaceColorFallback(template, { themeColor, sidebarColor })
  );
  const sidebarTextColor = getContrastColorForTemplate(templateSurfaceColor);
  const fontFamily = cvData.fontFamily || 'Inter';
  const profileImage = sanitizePdfImageSource(cvData.profileImage);
  const imageZoom = Number.isFinite(Number(cvData.imageZoom)) ? Math.min(Math.max(Number(cvData.imageZoom), 0.5), 3) : 1;
  const imageX = Number.isFinite(Number(cvData.imageX)) ? Math.min(Math.max(Number(cvData.imageX), -120), 120) : 0;
  const imageY = Number.isFinite(Number(cvData.imageY)) ? Math.min(Math.max(Number(cvData.imageY), -120), 120) : 0;
  const lineSpacing = safeNumberForTemplate(cvData.lineSpacing, 1.5, 1, 2.5);
  const sectionGap = safeNumberForTemplate(cvData.sectionGap, 2, 0.5, 4);
  const isProfessional = template === 'professional';

  const dateInline = (startDate?: string, endDate?: string) =>
    [startDate || '', endDate || ''].filter(Boolean).join(startDate && endDate ? ' - ' : '');
  const dateStacked = (startDate?: string, endDate?: string) =>
    (startDate || '') + (startDate && endDate ? '<br>-<br>' : '') + (endDate || '');

  const hasPersonalDetails = Boolean(
    personalInfo.dob ||
    personalInfo.nic ||
    personalInfo.gender ||
    personalInfo.nationality ||
    personalInfo.religion ||
    personalInfo.maritalStatus
  );

  const personalDetails = [
    personalInfo.dob ? { label: 'Date of Birth', value: personalInfo.dob } : null,
    personalInfo.nic ? { label: 'NIC', value: personalInfo.nic } : null,
    personalInfo.gender ? { label: 'Gender', value: personalInfo.gender } : null,
    personalInfo.maritalStatus ? { label: 'Marital Status', value: personalInfo.maritalStatus } : null,
    personalInfo.nationality ? { label: 'Nationality', value: personalInfo.nationality } : null,
    personalInfo.religion ? { label: 'Religion', value: personalInfo.religion } : null,
  ].filter(Boolean);

  const processedExperience = experience.map((item: any) => ({
    ...item,
    position: item.position || 'Position',
    company: item.company || 'Company',
    formattedDate: dateInline(item.startDate, item.endDate),
    formattedDateStacked: dateStacked(item.startDate, item.endDate),
  }));

  const processedEducation = education.map((item: any) => ({
    ...item,
    degree: item.degree || 'Degree',
    institution: item.institution || 'Institution',
    formattedDate: dateInline(item.startDate, item.endDate),
    formattedDateStacked: dateStacked(item.startDate, item.endDate),
  }));

  const processedProjects = projects.map((item: any) => ({
    ...item,
    name: item.name || 'Project Name',
    hasLink: Boolean(item.link),
  }));

  const processedCourses = courses.map((item: any) => ({
    ...item,
    name: item.name || 'Course Name',
    institution: item.institution || 'Institution',
    formattedDate: dateInline(item.startDate, item.endDate),
  }));

  const processedAwards = awards.map((item: any) => ({
    ...item,
    name: item.name || 'Award Name',
    issuer: item.issuer || 'Issuer',
  }));

  const processedLanguages = languages.map((item: any) => ({
    ...item,
    label: item.proficiency ? String(item.name || '') + ' (' + String(item.proficiency) + ')' : (item.name || ''),
  }));

  const processedReferences = references.map((item: any) => ({
    ...item,
    name: item.name || 'Reference Name',
    sub: [item.position, item.company].filter(Boolean).join(', '),
    hasContact: Boolean(item.email || item.phone),
  }));

  const sectionBuilders: Record<string, () => any | null> = {
    summary: () => personalInfo.summary ? { key: 'summary', isSummary: true, title: isProfessional ? 'Professional Summary' : 'Profile' } : null,
    personalDetails: () => hasPersonalDetails ? { key: 'personalDetails', isPersonalDetails: true, title: 'Personal Details', items: personalDetails } : null,
    experience: () => processedExperience.length ? { key: 'experience', isExperience: true, title: 'Experience', items: processedExperience } : null,
    education: () => processedEducation.length ? { key: 'education', isEducation: true, title: 'Education', items: processedEducation } : null,
    skills: () => skills.length ? { key: 'skills', isSkills: true, title: isProfessional ? 'Skills & Expertise' : 'Skills', items: skills } : null,
    projects: () => processedProjects.length ? { key: 'projects', isProjects: true, title: isProfessional ? 'Key Projects' : 'Projects', items: processedProjects } : null,
    courses: () => processedCourses.length ? { key: 'courses', isCourses: true, title: isProfessional ? 'Certifications & Courses' : 'Courses & Certifications', items: processedCourses } : null,
    awards: () => processedAwards.length ? { key: 'awards', isAwards: true, title: 'Awards', items: processedAwards } : null,
    languages: () => processedLanguages.length ? { key: 'languages', isLanguages: true, title: 'Languages', items: processedLanguages } : null,
    references: () => processedReferences.length ? { key: 'references', isReferences: true, title: 'References', items: processedReferences } : null,
  };

  const sections = sectionOrder
    .filter((key: string) => !hiddenSections.includes(key))
    .map((key: string) => sectionBuilders[key]?.())
    .filter(Boolean);

  return {
    ...cvData,
    personalInfo,
    contactItems: [personalInfo.email, personalInfo.phone, personalInfo.address].filter(Boolean).map((value: string) => ({ value })),
    experience: processedExperience,
    education: processedEducation,
    skills,
    projects: processedProjects,
    courses: processedCourses,
    awards: processedAwards,
    languages: processedLanguages,
    references: processedReferences,
    sections,
    computed: {
      themeColor,
      sidebarColor,
      templateSurfaceColor,
      sidebarTextColor,
      sidebarMutedColor: sidebarTextColor === '#ffffff' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
      fontFamily,
      fontFamilyCSS: templateFontMap[fontFamily] || "'Inter', sans-serif",
      googleFontName: String(fontFamily || 'Inter').replace(/\s+/g, '+'),
      lineSpacing,
      sectionGap,
      sectionGapRem: String(sectionGap) + 'rem',
      profileImage,
      hasProfileImage: Boolean(profileImage),
      profileImageTransform: 'scale(' + imageZoom + ') translate(' + imageX + 'px,' + imageY + 'px)',
    },
    flags: {
      isProfessional,
      isClassic: template === 'classic',
      hasPersonalDetails,
      hasSkillCategories: skills.some((skill: any) => skill.category?.trim()),
    },
    watermark: Boolean(options.watermark),
  };
}
`;

const handlerTs = `
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

const ALLOWED_RICH_TEXT_TAGS = new Set(['b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'p', 'br', 'u', 'div', 'span']);
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
        if (tag !== 'a') return tag === 'br' ? '<br>' : \`<\${tag}>\`;
        const hrefMatch = String(attrs).match(/\\s+href\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)/i);
        const href = hrefMatch ? hrefMatch[1].replace(/^['"]|['"]$/g, '') : '';
        const safeHref = /^(https?:|mailto:|tel:|#)/i.test(href) ? href.replace(/"/g, '&quot;') : '#';
        return \`<a href="\${safeHref}" target="_blank" rel="noopener noreferrer">\`;
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
const PDF_LAMBDA_BUILD_MARKER = 's3-template-diagnostics-2026-05-19';
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
const SAFE_IMAGE_DATA_URI = /^data:image\\/(?:png|jpe?g|webp);base64,[a-z0-9+/=\\s]+$/i;
const sanitizePdfImageSource = (value: unknown) => {
  if (typeof value !== 'string') return '';
  const source = value.trim();
  if (!source || source.length > MAX_IMAGE_DATA_URI_LENGTH) return '';
  if (!SAFE_IMAGE_DATA_URI.test(source)) return '';
  return source.replace(/\\s/g, '');
};

const S3_TEMPLATE_BUCKET = (process.env.S3_TEMPLATE_BUCKET_NAME || process.env.TEMPLATE_BUCKET_NAME || '').trim();
const S3_TEMPLATE_PREFIX = (process.env.S3_TEMPLATE_PREFIX || 'templates').replace(/^\\/+|\\/+$/g, '');
const S3_TEMPLATE_CACHE_TTL_MS = Number(process.env.S3_TEMPLATE_CACHE_TTL_MS || 5 * 60 * 1000);
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
  const root = { ...cvData, watermark: Boolean(options.watermark) };

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
        ALLOWED_ATTR: ['href', 'target', 'rel'],
      });
    });

    return html.replace(/{{\\s*([\\w.]+)\\s*}}/g, (_match, pathValue) => (
      escTemplateValue(renderTemplateValue(getTemplateValue(pathValue, context, root)))
    ));
  };

  return renderBlock(templateHtml, root);
}

${s3TemplatePreprocessorTs}

async function generateS3CVHTML(cvData: any, template: TemplateName, options: { watermark?: boolean } = {}) {
  lastS3TemplateDebug = 'attempting';
  const templateHtml = await loadS3TemplateHtml(template);
  return templateHtml ? renderCvTemplateString(templateHtml, prepareS3TemplateData(cvData, template, options), options) : null;
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
  const safeCvData = sanitizeCvData(cvData);
  let html: string | null = null;
  try {
    html = await generateS3CVHTML(safeCvData, requestedTemplate, { watermark });
  } catch (error) {
    lastS3TemplateDebug = 'error:' + (error instanceof Error ? error.name : 'unknown');
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
  entryPoints: [path.join(buildDir, 'handler.generated.mjs')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: path.join(buildDir, 'handler.js'),
  external: ['@sparticuz/chromium'],
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

copyDir(path.join(projectRoot, 'node_modules', '@sparticuz'), path.join(buildDir, 'node_modules', '@sparticuz'));
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
  copyDirIfExists(path.join(projectRoot, 'node_modules', name), path.join(buildDir, 'node_modules', name));
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
