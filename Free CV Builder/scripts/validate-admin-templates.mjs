import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), '..');
const repoRoot = path.resolve(projectRoot, '..');
const adminTemplatesRoot = path.join(repoRoot, 'Admin Templates');

const SUPPORTED_ROOTS = new Set([
  'awards',
  'computed',
  'contactItems',
  'courses',
  'creativeMainSections',
  'creativeSideSections',
  'education',
  'experience',
  'experienceContinuationItems',
  'experienceLeadItems',
  'flags',
  'groupedSkills',
  'hasAwards',
  'hasBody',
  'hasContact',
  'hasCourses',
  'hasEducation',
  'hasExperience',
  'hasExperienceContinuation',
  'hasHeader',
  'hasLanguages',
  'hasMainColumn',
  'hasPersonalDetails',
  'hasProfileCard',
  'hasProfileImage',
  'hasProjects',
  'hasReferences',
  'hasSideColumn',
  'hasSkills',
  'hasSummary',
  'headline',
  'imageX',
  'imageY',
  'imageZoom',
  'languages',
  'lineSpacing',
  'location',
  'minimalistLeftSections',
  'minimalistRightSections',
  'modernMainSections',
  'personalInfo',
  'fontFamily',
  'primaryColor',
  'profileImageStyle',
  'profileImageTransform',
  'profileImageUrl',
  'projects',
  'references',
  'sectionGap',
  'sections',
  'sidebarColor',
  'skills',
  'startupLeftSections',
  'startupRightSections',
  'templateSurfaceColor',
  'themeColor',
  'watermark',
]);

const CONTEXT_FIELDS = new Set([
  '.',
  'category',
  'company',
  'date',
  'degree',
  'description',
  'email',
  'endDate',
  'formattedDate',
  'formattedDateStacked',
  'hasContact',
  'hasLink',
  'institution',
  'issuer',
  'items',
  'key',
  'label',
  'level',
  'levelPercent',
  'link',
  'name',
  'phone',
  'position',
  'proficiency',
  'startDate',
  'sub',
  'title',
  'value',
]);

const TEXT_EXTENSIONS = new Set(['.html', '.css', '.svg']);
const THUMBNAIL_EXTENSIONS = new Set(['.svg', '.png', '.jpg', '.jpeg', '.webp']);

const results = [];

const addResult = (template, severity, fileName, message) => {
  results.push({ template, severity, fileName, message });
};

const readTextIfExists = async (filePath) => {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
};

const findLine = (source, index) => source.slice(0, index).split(/\r?\n/).length;

const extractPlaceholders = (source) => {
  const matches = source.matchAll(/{{{?\s*([#/^]?)\s*([^{}]+?)\s*}?}}/g);
  return [...matches].map((match) => ({
    raw: match[0],
    mode: match[1],
    name: match[2].trim().replace(/^\//, '').trim(),
    index: match.index || 0,
  }));
};

const validatePlaceholders = (template, fileName, source) => {
  for (const placeholder of extractPlaceholders(source)) {
    const name = placeholder.name;
    if (!name || name.startsWith('!')) continue;
    if (name.includes(' ')) {
      addResult(template, 'error', fileName, `Invalid placeholder "${placeholder.raw}" at line ${findLine(source, placeholder.index)}.`);
      continue;
    }

    const root = name.split('.')[0];
    if (!SUPPORTED_ROOTS.has(root) && !CONTEXT_FIELDS.has(root)) {
      addResult(template, 'warn', fileName, `Unknown placeholder root "${root}" at line ${findLine(source, placeholder.index)}.`);
    }
  }
};

const validateHtml = (template, source) => {
  if (/<script[\s>]/i.test(source)) addResult(template, 'error', 'index.html', 'Template HTML must not include <script>.');
  if (/<iframe[\s>]/i.test(source)) addResult(template, 'error', 'index.html', 'Template HTML must not include <iframe>.');
  if (!/{{\s*personalInfo\.fullName\s*}}/.test(source)) {
    addResult(template, 'warn', 'index.html', 'Missing {{personalInfo.fullName}} in template HTML.');
  }
  if (/{{\s*position\s*}}/.test(source) && !/{{#\s*position\s*}}[\s\S]*?{{\/\s*position\s*}}/.test(source)) {
    addResult(template, 'warn', 'index.html', '{{position}} appears without a local {{#position}} guard.');
  }
  if (/{{\s*position\s*}}{{#\s*company\s*}},/.test(source)) {
    addResult(template, 'error', 'index.html', 'Reference subtitle can render a leading comma; use {{sub}} instead.');
  }
  if (/\b(Position|Professional Title)\b/.test(source)) {
    addResult(template, 'warn', 'index.html', 'Hardcoded placeholder-like title text found.');
  }
  validatePlaceholders(template, 'index.html', source);
};

const validateCss = (template, source) => {
  if (!/@page\s*{[\s\S]*?size:\s*A4/i.test(source)) {
    addResult(template, 'warn', 'style.css', 'Missing @page size: A4 rule.');
  }
  const bodyBlocks = [...source.matchAll(/(?:html\s*,\s*)?body\s*{[^}]*}/gi)].map((match) => match[0]);
  if (bodyBlocks.some((block) => /overflow\s*:\s*hidden/i.test(block))) {
    addResult(template, 'error', 'style.css', 'Do not set overflow:hidden on html/body; it can clip PDF/mobile preview.');
  }
  const pageBlocks = [...source.matchAll(/\.page\s*{[^}]*}/gi)].map((match) => match[0]);
  if (pageBlocks.some((block) => /(^|[;\s{])height\s*:\s*297mm/i.test(block))) {
    addResult(template, 'error', 'style.css', 'Use min-height:297mm, not fixed height:297mm on .page.');
  }
  if (/(^|[^-])color:\s*(#000000|#000|black)\b/i.test(source) || /background(?:-color)?:\s*(#000000|#000|black)\b/i.test(source)) {
    addResult(template, 'warn', 'style.css', 'Hard black foreground/background found. Confirm this is intentional, not a default accent.');
  }
  if (!/{{\s*themeColor\s*}}|{{{\s*computed\.|{{\s*computed\./.test(source)) {
    addResult(template, 'warn', 'style.css', 'No themeColor/computed color placeholder found; design panel color may not affect this template.');
  }
  validatePlaceholders(template, 'style.css', source);
};

const validateTemplate = async (entry) => {
  const template = entry.name;
  const dir = path.join(adminTemplatesRoot, template);
  const files = await fs.readdir(dir, { withFileTypes: true });
  const fileNames = files.filter((file) => file.isFile()).map((file) => file.name);
  const nestedDirs = files.filter((file) => file.isDirectory()).map((file) => file.name);

  let htmlFileName = 'index.html';
  let templateDir = dir;
  if (!fileNames.includes('index.html')) {
    const fallbackHtml = fileNames.find((fileName) => fileName.toLowerCase().endsWith('.html'));
    if (fallbackHtml) {
      htmlFileName = fallbackHtml;
      addResult(template, 'warn', fallbackHtml, 'Non-standard template HTML filename; prefer index.html before S3 upload.');
    } else if (nestedDirs.length === 1) {
      const nestedDir = path.join(dir, nestedDirs[0]);
      const nestedFiles = await fs.readdir(nestedDir, { withFileTypes: true });
      const nestedFileNames = nestedFiles.filter((file) => file.isFile()).map((file) => file.name);
      if (nestedFileNames.includes('index.html') || nestedFileNames.includes('style.css')) {
        templateDir = nestedDir;
        htmlFileName = 'index.html';
        fileNames.splice(0, fileNames.length, ...nestedFileNames);
        addResult(template, 'warn', nestedDirs[0], 'Template files are nested; prefer placing index.html/style.css at the template folder root.');
      }
    }
  }

  const indexHtml = await readTextIfExists(path.join(templateDir, htmlFileName));
  const styleCss = await readTextIfExists(path.join(templateDir, 'style.css'));
  const thumbnails = fileNames.filter((fileName) => fileName.toLowerCase().startsWith('thumbnail.') && THUMBNAIL_EXTENSIONS.has(path.extname(fileName).toLowerCase()));

  if (!indexHtml) addResult(template, 'error', 'index.html', 'Missing required index.html.');
  if (!styleCss) addResult(template, 'error', 'style.css', 'Missing required style.css.');
  if (!thumbnails.length) addResult(template, 'error', 'thumbnail.*', 'Missing thumbnail image.');

  if (indexHtml) validateHtml(template, indexHtml);
  if (styleCss) validateCss(template, styleCss);

  for (const fileName of fileNames) {
    const extension = path.extname(fileName).toLowerCase();
    if (!TEXT_EXTENSIONS.has(extension)) continue;
    const source = await readTextIfExists(path.join(templateDir, fileName));
    if (source && /\bLorem ipsum\b/i.test(source)) {
      addResult(template, 'warn', fileName, 'Lorem ipsum text found.');
    }
  }
};

const entries = (await fs.readdir(adminTemplatesRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .sort((a, b) => a.name.localeCompare(b.name));

for (const entry of entries) {
  await validateTemplate(entry);
}

const errors = results.filter((result) => result.severity === 'error');
const warnings = results.filter((result) => result.severity === 'warn');

if (!results.length) {
  console.log(`Validated ${entries.length} admin templates. No issues found.`);
} else {
  console.log(`Validated ${entries.length} admin templates: ${errors.length} errors, ${warnings.length} warnings.`);
  for (const result of results) {
    const label = result.severity === 'error' ? 'ERROR' : 'WARN';
    console.log(`[${label}] ${result.template}/${result.fileName}: ${result.message}`);
  }
}

if (errors.length) {
  process.exitCode = 1;
}
