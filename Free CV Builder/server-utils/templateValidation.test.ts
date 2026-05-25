import { describe, expect, it } from 'vitest';
import { validateAdminTemplateSource } from './templateValidation';

describe('validateAdminTemplateSource', () => {
  it('blocks unsafe template HTML before S3 upload', () => {
    const result = validateAdminTemplateSource({
      indexHtml: '<html><body><script>alert(1)</script>{{personalInfo.fullName}}</body></html>',
      styleCss: '@page { size: A4; } .page { min-height: 297mm; } a { color: {{themeColor}}; }',
      thumbnailPresent: true,
    });

    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ fileName: 'index.html', message: 'Template HTML must not include <script>.' }),
    ]));
  });

  it('warns when design color cannot affect the template', () => {
    const result = validateAdminTemplateSource({
      indexHtml: '<html><body>{{personalInfo.fullName}}</body></html>',
      styleCss: '@page { size: A4; } .page { min-height: 297mm; } h1 { color: #111827; }',
      thumbnailPresent: true,
    });

    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ fileName: 'style.css', message: expect.stringContaining('No themeColor/primaryColor/computed') }),
    ]));
  });

  it('blocks mobile and PDF clipping CSS', () => {
    const result = validateAdminTemplateSource({
      indexHtml: '<html><body>{{personalInfo.fullName}}</body></html>',
      styleCss: '@page { size: A4; } body { overflow: hidden; } .page { height: 297mm; }',
      thumbnailPresent: true,
    });

    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ fileName: 'style.css', message: expect.stringContaining('overflow:hidden') }),
      expect.objectContaining({ fileName: 'style.css', message: expect.stringContaining('min-height:297mm') }),
    ]));
  });
});
