import { describe, expect, it } from 'vitest';
import { applyTemplateColorDefaults } from './templateData';

interface TestColorData {
  themeColor: string;
  templateThemeColors?: Record<string, string>;
  templateSurfaceColor?: string;
  templateSurfaceColors?: Record<string, string>;
}

describe('applyTemplateColorDefaults', () => {
  it('switches to the next template default color when the current color is not customized', () => {
    const nextData = applyTemplateColorDefaults<TestColorData>(
      { themeColor: '#000000', templateSurfaceColor: '#123456' },
      'classic',
      'tech-1'
    );

    expect(nextData.themeColor).toBe('#22d3ee');
    expect(nextData.templateSurfaceColor).toBeUndefined();
  });

  it('uses the next template default instead of leaking a custom color across templates', () => {
    const nextData = applyTemplateColorDefaults<TestColorData>(
      { themeColor: '#ff0000', templateThemeColors: { 'tech-1': '#ff0000' } },
      'tech-1',
      'modular-card'
    );

    expect(nextData.themeColor).toBe('#14b8a6');
    expect(nextData.templateSurfaceColor).toBeUndefined();
  });

  it('restores a saved custom color when switching back to that template', () => {
    const nextData = applyTemplateColorDefaults<TestColorData>(
      { themeColor: '#14b8a6', templateThemeColors: { 'tech-1': '#ff0000' } },
      'modular-card',
      'tech-1'
    );

    expect(nextData.themeColor).toBe('#ff0000');
  });

  it('preserves a legacy custom current color into the per-template map before switching away', () => {
    const nextData = applyTemplateColorDefaults<TestColorData>(
      { themeColor: '#ff0000' },
      'tech-1',
      'modular-card'
    );

    expect(nextData.themeColor).toBe('#14b8a6');
    expect(nextData.templateThemeColors?.['tech-1']).toBe('#ff0000');
  });
});
