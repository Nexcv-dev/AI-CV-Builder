import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TEMPLATE,
  TEMPLATE_KEYS,
  getTemplateSurfaceColorFallback,
  isTemplateAvailableForPlan,
  isTemplateName,
  templateRequiresPaidPlan,
} from './index';

describe('template contracts', () => {
  it('keeps the default and built-in keys stable', () => {
    expect(DEFAULT_TEMPLATE).toBe('professional');
    expect(TEMPLATE_KEYS).toEqual(['classic', 'modern', 'professional', 'timeline', 'minimalist', 'startup']);
  });

  it('validates template keys', () => {
    expect(isTemplateName('modern')).toBe(true);
    expect(isTemplateName('../bad')).toBe(false);
  });

  it('checks plan availability', () => {
    expect(templateRequiresPaidPlan('classic')).toBe(false);
    expect(isTemplateAvailableForPlan('modern', 'free')).toBe(false);
    expect(isTemplateAvailableForPlan('modern', 'monthly')).toBe(true);
  });

  it('resolves surface color fallback by template role', () => {
    expect(getTemplateSurfaceColorFallback('modern', { themeColor: '#111', sidebarColor: '#222' })).toBe('#222');
    expect(getTemplateSurfaceColorFallback('startup', { themeColor: '#111', sidebarColor: '#222' })).toBe('#111');
  });
});
