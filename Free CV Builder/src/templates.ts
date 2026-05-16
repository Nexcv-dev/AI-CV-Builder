export const CV_TEMPLATES = [
  {
    key: 'classic',
    label: 'Classic',
    image: '/templates/classic.png',
  },
  {
    key: 'modern',
    label: 'Modern',
    image: '/templates/modern.png',
  },
  {
    key: 'professional',
    label: 'Professional',
    image: '/templates/professional.png',
  },
  {
    key: 'timeline',
    label: 'Timeline',
    image: '/templates/timeline.svg',
  },
  {
    key: 'minimalist',
    label: 'Minimalist',
    image: '/templates/minimalist.svg',
  },
] as const;

export type TemplateName = (typeof CV_TEMPLATES)[number]['key'];

export const DEFAULT_TEMPLATE: TemplateName = 'professional';

export const TEMPLATE_KEYS = CV_TEMPLATES.map((template) => template.key) as TemplateName[];

export function isTemplateName(value: unknown): value is TemplateName {
  return typeof value === 'string' && TEMPLATE_KEYS.includes(value as TemplateName);
}
