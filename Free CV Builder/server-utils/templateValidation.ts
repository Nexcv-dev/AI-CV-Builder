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
