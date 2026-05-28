export const CV_TEMPLATES = [
  {
    key: 'classic',
    label: 'Classic',
    image: '/templates/classic.webp',
    access: 'free',
    surfaceColorRole: 'none',
  },
  {
    key: 'modern',
    label: 'Modern',
    image: '/templates/modern.webp',
    access: 'paid',
    surfaceColorRole: 'sidebar',
    surfaceColorLabel: 'Sidebar Background',
  },
  {
    key: 'professional',
    label: 'Professional',
    image: '/templates/professional.webp',
    access: 'paid',
    surfaceColorRole: 'none',
  },
  {
    key: 'timeline',
    label: 'Timeline',
    image: '/templates/timeline.svg',
    access: 'paid',
    surfaceColorRole: 'none',
  },
  {
    key: 'minimalist',
    label: 'Minimalist',
    image: '/templates/minimalist.svg',
    access: 'paid',
    surfaceColorRole: 'none',
  },
  {
    key: 'startup',
    label: 'Startup',
    image: '/templates/startup.svg',
    access: 'paid',
    surfaceColorRole: 'header',
    surfaceColorLabel: 'Header Background',
  },
] as const;

export type BuiltInTemplateName = (typeof CV_TEMPLATES)[number]['key'];
export type TemplateName = BuiltInTemplateName | (string & {});
export type TemplateAccess = (typeof CV_TEMPLATES)[number]['access'];
export type TemplateSurfaceColorRole = (typeof CV_TEMPLATES)[number]['surfaceColorRole'];

export const DEFAULT_TEMPLATE: TemplateName = 'professional';

export const TEMPLATE_KEYS = CV_TEMPLATES.map((template) => template.key) as BuiltInTemplateName[];
export const TEMPLATE_KEY_PATTERN = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;

export function getTemplateDefinition(template: TemplateName) {
  return CV_TEMPLATES.find((item) => item.key === template) || CV_TEMPLATES[0];
}

export function isTemplateName(value: unknown): value is TemplateName {
  return typeof value === 'string' && TEMPLATE_KEY_PATTERN.test(value);
}

export function templateRequiresPaidPlan(template: TemplateName): boolean {
  return getTemplateDefinition(template).access === 'paid';
}

export function isTemplateAvailableForPlan(template: TemplateName, plan?: string | null): boolean {
  return plan !== 'free' || !templateRequiresPaidPlan(template);
}

export function getTemplateSurfaceColorLabel(template: TemplateName): string | null {
  const definition = getTemplateDefinition(template);
  return definition.surfaceColorRole === 'none'
    ? null
    : ('surfaceColorLabel' in definition ? definition.surfaceColorLabel : 'Template Background');
}

export function getTemplateSurfaceColorFallback(template: TemplateName, colors: { themeColor: string; sidebarColor: string }): string {
  const definition = getTemplateDefinition(template);
  if (definition.surfaceColorRole === 'sidebar') return colors.sidebarColor;
  if (definition.surfaceColorRole === 'header') return colors.themeColor;
  return colors.themeColor;
}
