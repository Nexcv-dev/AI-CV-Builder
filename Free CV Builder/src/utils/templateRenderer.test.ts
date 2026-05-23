import { describe, expect, it } from 'vitest';
import { renderCvTemplateString } from './templateRenderer';

const cvData = {
  personalInfo: { fullName: 'Jane Doe' },
  experience: [
    { id: '1', position: 'One' },
    { id: '2', position: 'Two' },
    { id: '3', position: 'Three' },
  ],
};

describe('renderCvTemplateString', () => {
  it('exposes experience groups for admin template page-break control', () => {
    const html = renderCvTemplateString(`
      {{#hasExperienceContinuation}}
        <div class="lead">{{#experienceLeadItems}}<span>{{position}}</span>{{/experienceLeadItems}}</div>
        <div class="rest">{{#experienceContinuationItems}}<span>{{position}}</span>{{/experienceContinuationItems}}</div>
      {{/hasExperienceContinuation}}
    `, cvData);

    expect(html).toContain('<div class="lead"><span>One</span><span>Two</span></div>');
    expect(html).toContain('<div class="rest"><span>Three</span></div>');
    expect(html.indexOf('<div class="lead">')).toBeLessThan(html.indexOf('<div class="rest">'));
  });

  it('does not enable continuation groups for two experience items', () => {
    const html = renderCvTemplateString(`
      {{#hasExperienceContinuation}}split{{/hasExperienceContinuation}}
      {{^hasExperienceContinuation}}keep{{/hasExperienceContinuation}}
    `, { ...cvData, experience: cvData.experience.slice(0, 2) });

    expect(html).toContain('keep');
    expect(html).not.toContain('split');
  });
});
