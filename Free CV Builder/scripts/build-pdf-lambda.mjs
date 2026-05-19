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

const handlerTs = `
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

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
  const html = generateCVHTML(safeCvData, requestedTemplate, { watermark });
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
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
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

export async function handler(event: any) {
  try {
    const payload = parsePayload(event);
    if (!payload?.cvData || typeof payload.cvData !== 'object') {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing or invalid cvData' }),
      };
    }
    const pdf = await renderPdf(payload.cvData, payload.template, Boolean(payload.watermark));
    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="resume.pdf"',
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

Request body:

\`\`\`json
{
  "cvData": {},
  "template": "professional",
  "watermark": false
}
\`\`\`

The response is API Gateway compatible and returns the PDF as base64 with \`isBase64Encoded: true\`.
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
execFileSync('powershell.exe', [
  '-NoProfile',
  '-Command',
  `Compress-Archive -Path '${buildDir.replaceAll("'", "''")}\\*' -DestinationPath '${zipPath.replaceAll("'", "''")}' -Force`,
], { stdio: 'inherit' });

const zipSizeMb = fs.statSync(zipPath).size / (1024 * 1024);
fs.rmSync(buildDir, { recursive: true, force: true });
console.log(`Created ${path.relative(repoRoot, zipPath)} (${zipSizeMb.toFixed(2)} MB)`);
