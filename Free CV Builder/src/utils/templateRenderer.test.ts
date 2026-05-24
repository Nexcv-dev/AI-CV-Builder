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

  it('injects shared pagination rules into admin template HTML', () => {
    const html = renderCvTemplateString(`
      <html>
        <head><style>@page { margin: 0; }</style></head>
        <body><section class="experience-section"><article class="item">Work</article></section></body>
      </html>
    `, cvData);

    expect(html).toContain('id="nexcv-pagination-rules"');
    expect(html).toContain('@page');
    expect(html).toContain('margin: 8mm 0 0 0');
    expect(html).toContain('.experience-section.experience-keep-together');
    expect(html).toContain('page-break-inside: avoid !important');
    expect(html).toContain('.side-card');
    expect(html).toContain('.side-box');
    expect(html).toContain('.code-card');
    expect(html).toContain('.line');
    expect(html).toContain('padding-top: 0 !important');
  });
});
