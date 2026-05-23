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
  it('keeps experience in normal flow for admin template pagination', () => {
    const html = renderCvTemplateString(`
      {{#hasExperienceContinuation}}
        <div class="lead">{{#experienceLeadItems}}<span>{{position}}</span>{{/experienceLeadItems}}</div>
        <div class="rest">{{#experienceContinuationItems}}<span>{{position}}</span>{{/experienceContinuationItems}}</div>
      {{/hasExperienceContinuation}}
      {{^hasExperienceContinuation}}
        <div class="all">{{#experienceLeadItems}}<span>{{position}}</span>{{/experienceLeadItems}}</div>
      {{/hasExperienceContinuation}}
    `, cvData);

    expect(html).toContain('<div class="all"><span>One</span><span>Two</span><span>Three</span></div>');
    expect(html).not.toContain('<div class="lead">');
    expect(html).not.toContain('<div class="rest">');
  });

  it('does not enable continuation groups', () => {
    const html = renderCvTemplateString(`
      {{#hasExperienceContinuation}}split{{/hasExperienceContinuation}}
      {{^hasExperienceContinuation}}keep{{/hasExperienceContinuation}}
    `, cvData);

    expect(html).toContain('keep');
    expect(html).not.toContain('split');
  });
});
