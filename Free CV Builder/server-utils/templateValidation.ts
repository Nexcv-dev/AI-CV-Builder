export type TemplateValidationSeverity = 'error' | 'warn';

export interface TemplateValidationIssue {
  severity: TemplateValidationSeverity;
  fileName: string;
  message: string;
}

export interface TemplateValidationResult {
  errors: TemplateValidationIssue[];
  warnings: TemplateValidationIssue[];
}

export interface TemplateMetadataValidationInput {
  key?: string | null;
  label?: string | null;
  category?: string | null;
  access?: string | null;
  surfaceColorRole?: string | null;
  surfaceColorLabel?: string | null;
  defaultThemeColor?: string | null;
  thumbnail?: string | null;
}

const SUPPORTED_ROOTS = new Set([
  'awards',
  'computed',
  'contactItems',
  'courses',
  'creativeMainSections',
  'creativeSideSections',
  'education',
  'experience',
  'flags',
  'groupedSkills',
  'languages',
  'lineSpacing',
  'minimalistLeftSections',
  'minimalistRightSections',
  'modernMainSections',
  'personalInfo',
  'fontFamily',
  'primaryColor',
  'projects',
  'references',
  'sections',
  'sectionGap',
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

const lineForIndex = (source: string, index: number) => source.slice(0, index).split(/\r?\n/).length;

const addIssue = (issues: TemplateValidationIssue[], severity: TemplateValidationSeverity, fileName: string, message: string) => {
  issues.push({ severity, fileName, message });
};

const TEMPLATE_KEY_PATTERN = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const CATEGORIES = new Set(['Modern', 'ATS Friendly', 'Minimal', 'Executive', 'Creative', 'Tech', 'Corporate']);
const ACCESS_LEVELS = new Set(['free', 'paid']);
const SURFACE_COLOR_ROLES = new Set(['none', 'sidebar', 'header']);

export const validateAdminTemplateMetadata = (input: TemplateMetadataValidationInput, options: { requireThumbnailPath?: boolean } = {}) => {
  const issues: TemplateValidationIssue[] = [];
  const key = String(input.key || '').trim();
  const label = String(input.label || '').trim();
  const category = String(input.category || '').trim();
  const access = String(input.access || '').trim();
  const surfaceColorRole = String(input.surfaceColorRole || '').trim();
  const surfaceColorLabel = String(input.surfaceColorLabel || '').trim();
  const defaultThemeColor = String(input.defaultThemeColor || '').trim();
  const thumbnail = String(input.thumbnail || '').trim();

  if (key && !TEMPLATE_KEY_PATTERN.test(key)) {
    addIssue(issues, 'error', 'metadata', 'Template key must be a lowercase slug like modern-2026.');
  }
  if (!label) addIssue(issues, 'error', 'metadata', 'Template label is required.');
  if (label.length > 80) addIssue(issues, 'error', 'metadata', 'Template label must be 80 characters or fewer.');
  if (!CATEGORIES.has(category)) addIssue(issues, 'error', 'metadata', 'Template category is invalid.');
  if (!ACCESS_LEVELS.has(access)) addIssue(issues, 'error', 'metadata', 'Template access must be free or paid.');
  if (!SURFACE_COLOR_ROLES.has(surfaceColorRole)) addIssue(issues, 'error', 'metadata', 'Surface color role is invalid.');
  if (!COLOR_PATTERN.test(defaultThemeColor)) addIssue(issues, 'error', 'metadata', 'Default theme color must be a #rrggbb hex color.');
  if (surfaceColorRole === 'none' && surfaceColorLabel) {
    addIssue(issues, 'warn', 'metadata', 'Surface label is ignored when surface color role is None.');
  }
  if (surfaceColorRole !== 'none' && !surfaceColorLabel) {
    addIssue(issues, 'warn', 'metadata', 'Add a surface label so the design panel explains what this color controls.');
  }
  if (options.requireThumbnailPath && !thumbnail) {
    addIssue(issues, 'warn', 'metadata', 'Thumbnail path is empty; the template list may show a broken preview.');
  }

  return {
    errors: issues.filter((issue) => issue.severity === 'error'),
    warnings: issues.filter((issue) => issue.severity === 'warn'),
  };
};

export const mergeTemplateValidationResults = (...results: TemplateValidationResult[]) => ({
  errors: results.flatMap((result) => result.errors),
  warnings: results.flatMap((result) => result.warnings),
});

const extractPlaceholders = (source: string) => {
  const matches = source.matchAll(/{{{?\s*([#/^]?)\s*([^{}]+?)\s*}?}}/g);
  return [...matches].map((match) => ({
    raw: match[0],
    name: match[2].trim().replace(/^\//, '').trim(),
    index: match.index || 0,
  }));
};

const validatePlaceholders = (issues: TemplateValidationIssue[], fileName: string, source: string) => {
  for (const placeholder of extractPlaceholders(source)) {
    const name = placeholder.name;
    if (!name || name.startsWith('!')) continue;
    if (name.includes(' ')) {
      addIssue(issues, 'error', fileName, `Invalid placeholder "${placeholder.raw}" at line ${lineForIndex(source, placeholder.index)}.`);
      continue;
    }

    const root = name.split('.')[0];
    if (!SUPPORTED_ROOTS.has(root) && !CONTEXT_FIELDS.has(root)) {
      addIssue(issues, 'warn', fileName, `Unknown placeholder root "${root}" at line ${lineForIndex(source, placeholder.index)}.`);
    }
  }
};

const validateHtml = (issues: TemplateValidationIssue[], source: string) => {
  if (!source.trim()) {
    addIssue(issues, 'error', 'index.html', 'Template HTML is required.');
    return;
  }
  if (/<script[\s>]/i.test(source)) addIssue(issues, 'error', 'index.html', 'Template HTML must not include <script>.');
  if (/<iframe[\s>]/i.test(source)) addIssue(issues, 'error', 'index.html', 'Template HTML must not include <iframe>.');
  if (/\son[a-z]+\s*=/i.test(source)) addIssue(issues, 'error', 'index.html', 'Template HTML cannot include inline event handlers.');
  if (/javascript:/i.test(source)) addIssue(issues, 'error', 'index.html', 'Template HTML cannot include javascript URLs.');
  if (!/{{\s*personalInfo\.fullName\s*}}/.test(source)) {
    addIssue(issues, 'warn', 'index.html', 'Missing {{personalInfo.fullName}} in template HTML.');
  }
  if (/{{\s*position\s*}}/.test(source) && !/{{#\s*position\s*}}[\s\S]*?{{\/\s*position\s*}}/.test(source)) {
    addIssue(issues, 'warn', 'index.html', '{{position}} appears without a local {{#position}} guard.');
  }
  if (/{{\s*position\s*}}{{#\s*company\s*}},/.test(source)) {
    addIssue(issues, 'error', 'index.html', 'Reference subtitle can render a leading comma; use {{sub}} instead.');
  }
  if (/\b(Position|Professional Title)\b/.test(source)) {
    addIssue(issues, 'warn', 'index.html', 'Hardcoded placeholder-like title text found.');
  }
  validatePlaceholders(issues, 'index.html', source);
};

const validateCss = (issues: TemplateValidationIssue[], source: string) => {
  if (!source.trim()) {
    addIssue(issues, 'error', 'style.css', 'Template CSS is required.');
    return;
  }
  if (/<script[\s>]/i.test(source) || /javascript:/i.test(source)) {
    addIssue(issues, 'error', 'style.css', 'Template CSS contains unsafe content.');
  }
  if (!/@page\s*{[\s\S]*?size:\s*A4/i.test(source)) {
    addIssue(issues, 'warn', 'style.css', 'Missing @page size: A4 rule.');
  }
  const bodyBlocks = [...source.matchAll(/(?:html\s*,\s*)?body\s*{[^}]*}/gi)].map((match) => match[0]);
  if (bodyBlocks.some((block) => /overflow\s*:\s*hidden/i.test(block))) {
    addIssue(issues, 'error', 'style.css', 'Do not set overflow:hidden on html/body; it can clip PDF/mobile preview.');
  }
  const pageBlocks = [...source.matchAll(/\.page\s*{[^}]*}/gi)].map((match) => match[0]);
  if (pageBlocks.some((block) => /(^|[;\s{])height\s*:\s*297mm/i.test(block))) {
    addIssue(issues, 'error', 'style.css', 'Use min-height:297mm, not fixed height:297mm on .page.');
  }
  if (/(^|[^-])color:\s*(#000000|#000|black)\b/i.test(source) || /background(?:-color)?:\s*(#000000|#000|black)\b/i.test(source)) {
    addIssue(issues, 'warn', 'style.css', 'Hard black foreground/background found. Confirm this is intentional, not a default accent.');
  }
  if (!/{{\s*(themeColor|primaryColor)\s*}}|{{{\s*computed\.|{{\s*computed\./.test(source)) {
    addIssue(issues, 'warn', 'style.css', 'No themeColor/primaryColor/computed color placeholder found; design panel color may not affect this template.');
  }
  validatePlaceholders(issues, 'style.css', source);
};

export function validateAdminTemplateSource(input: { indexHtml?: string | null; styleCss?: string | null; thumbnailPresent?: boolean }) {
  const issues: TemplateValidationIssue[] = [];
  validateHtml(issues, input.indexHtml || '');
  validateCss(issues, input.styleCss || '');
  if (!input.thumbnailPresent) {
    addIssue(issues, 'error', 'thumbnail.*', 'Upload a PNG, JPG, WebP, or SVG thumbnail under 900 KB.');
  }

  return {
    errors: issues.filter((issue) => issue.severity === 'error'),
    warnings: issues.filter((issue) => issue.severity === 'warn'),
  };
}
