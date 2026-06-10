export interface HtmlPdfRuleValidation {
  valid: boolean;
  errors: string[];
  checks: HtmlPdfRuleCheck[];
}

export interface HtmlPdfRuleCheck {
  id: string;
  label: string;
  passed: boolean;
  error: string;
}

const normalizeCss = (css: string) => css
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s+/g, ' ')
  .trim();

const extractStyleBlocks = (html: string) => (
  Array.from(html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi))
    .map((match) => match[1])
    .join('\n')
);

const selectorDeclarations = (css: string, selectorPattern: RegExp) => {
  const normalized = normalizeCss(css);
  const declarations: string[] = [];
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = rulePattern.exec(normalized))) {
    const selectors = match[1].split(',').map((selector) => selector.trim());
    if (selectors.some((selector) => selectorPattern.test(selector))) {
      declarations.push(match[2].toLowerCase());
    }
  }
  return declarations.join(';');
};

const hasDeclaration = (declarations: string, property: string, valuePattern: RegExp) => {
  const pattern = new RegExp(`${property}\\s*:\\s*([^;]+)`, 'i');
  const match = declarations.match(pattern);
  return Boolean(match && valuePattern.test(match[1].trim()));
};

const hasAnyDeclaration = (declarations: string, properties: string[], valuePattern: RegExp) => (
  properties.some((property) => hasDeclaration(declarations, property, valuePattern))
);

const whiteColorPattern = /^(white|#fff(?:fff)?|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)|rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*1\s*\))$/i;
const zeroPattern = /^0(?:px|rem|em|mm|cm|in)?(?:\s+0(?:px|rem|em|mm|cm|in)?){0,3}$/i;

export function validateHtmlPdfRules(html: string, css = ''): HtmlPdfRuleValidation {
  const source = String(html || '');
  const combinedCss = `${extractStyleBlocks(source)}\n${css || ''}`;
  const bodyDeclarations = selectorDeclarations(combinedCss, /^body$/i);
  const pageDeclarations = selectorDeclarations(combinedCss, /^\.page$/i);
  const checks: HtmlPdfRuleCheck[] = [];

  const addCheck = (id: string, label: string, passed: boolean, error: string) => {
    checks.push({ id, label, passed, error });
  };

  addCheck(
    'body-element',
    'HTML includes a body element',
    /<body\b/i.test(source),
    'Add a body element so PDF rules can be verified.',
  );

  addCheck(
    'page-wrapper',
    'Use one .page wrapper',
    /\bclass\s*=\s*["'][^"']*\bpage\b/i.test(source),
    'Add one page wrapper element, for example <div class="page">...</div>.',
  );

  addCheck(
    'body-margin',
    'body margin is 0',
    hasDeclaration(bodyDeclarations, 'margin', zeroPattern),
    'Set body { margin: 0; }.',
  );

  addCheck(
    'body-background',
    'body background is white',
    hasDeclaration(bodyDeclarations, 'background', whiteColorPattern) || hasDeclaration(bodyDeclarations, 'background-color', whiteColorPattern),
    'Set body { background: white; }.',
  );

  addCheck(
    'page-width',
    '.page width is 210mm',
    hasDeclaration(pageDeclarations, 'width', /^210mm$/i),
    'Set .page { width: 210mm; }.',
  );

  addCheck(
    'page-min-height',
    '.page min-height is 297mm',
    hasDeclaration(pageDeclarations, 'min-height', /^297mm$/i),
    'Set .page { min-height: 297mm; }.',
  );

  addCheck(
    'page-padding',
    'Spacing is inside .page padding',
    hasAnyDeclaration(pageDeclarations, ['padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left'], /^(?!0(?:px|rem|em|mm|cm|in)?$).+/i),
    'Put page spacing inside .page with padding.',
  );

  addCheck(
    'no-page-gutters',
    'No centered preview gutters',
    !hasDeclaration(pageDeclarations, 'margin', /auto|[1-9]/i),
    'Remove centered preview gutters: .page margin must be 0 or omitted.',
  );

  addCheck(
    'no-shadows',
    'No browser preview shadows',
    !/box-shadow\s*:/i.test(combinedCss),
    'Remove browser preview shadows from export CSS.',
  );

  addCheck(
    'inline-css',
    'CSS is inline only',
    !/<link\b[^>]*rel\s*=\s*["']?stylesheet/i.test(source) && !/@import\b/i.test(combinedCss),
    'Use inline CSS only; remove external stylesheets and @import.',
  );

  addCheck(
    'no-scripts',
    'No scripts',
    !/<script\b/i.test(source),
    'Remove scripts; PDF rendering runs with JavaScript disabled.',
  );

  const externalImages = Array.from(source.matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi))
    .map((match) => match[1].trim())
    .filter((src) => src && !src.startsWith('data:image/'));
  addCheck(
    'data-uri-images',
    'Images use data URI sources',
    externalImages.length === 0,
    'Use data URI images only; remote image URLs are not allowed.',
  );

  const externalCssUrls = Array.from(combinedCss.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi))
    .map((match) => match[2].trim())
    .filter((url) => url && !url.startsWith('data:image/'));
  addCheck(
    'data-uri-css-assets',
    'CSS assets use data URI sources',
    externalCssUrls.length === 0,
    'Use data URI assets in CSS; remote url(...) assets are not allowed.',
  );

  const errors = checks.filter((check) => !check.passed).map((check) => check.error);

  return {
    valid: errors.length === 0,
    errors,
    checks,
  };
}
