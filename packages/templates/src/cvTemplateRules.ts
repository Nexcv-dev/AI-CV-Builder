export const CV_TEMPLATE_PAGINATION_RULES = `
    @page {
      size: A4;
      margin: 8mm 0 0 0;
    }

    @page :first {
      margin-top: 0;
    }

    html,
    body {
      overflow: visible !important;
      -webkit-text-size-adjust: 100% !important;
      text-size-adjust: 100% !important;
    }

    @media screen {
      html,
      body {
        margin: 0 !important;
        width: 794px !important;
        min-width: 794px !important;
        min-height: 1122px !important;
        overflow: visible !important;
      }

      .page,
      .cv,
      .resume,
      .sheet,
      .document,
      .wrapper {
        width: 794px !important;
        min-width: 794px !important;
        min-height: 1122px !important;
        max-width: none !important;
      }
    }

    .page,
    .cv,
    .resume,
    .sheet,
    .document,
    .wrapper,
    .container,
    .content,
    .body,
    .body-grid,
    .main,
    .main-column,
    .main-col {
      height: auto !important;
      overflow: visible !important;
    }

    .sidebar,
    .side-column,
    .side-col {
      overflow: visible !important;
      page-break-inside: auto !important;
      break-inside: auto !important;
      -webkit-box-decoration-break: clone;
      box-decoration-break: clone;
    }

    section,
    .section,
    .sidebar-box,
    .experience-section,
    .experience-section.experience-keep-together,
    .experience-section.experience-lead-section,
    .experience-section.experience-continuation-section,
    .item-stack,
    .stack,
    .cards,
    .timeline,
    .timeline-list,
    .experience-list,
    .items {
      page-break-inside: auto !important;
      break-inside: auto !important;
    }

    article,
    .item,
    .experience-item,
    .experience-card,
    .side-card,
    .side-box,
    .sidebar-box,
    .code-card,
    .list-item,
    .line,
    .metric,
    .project,
    .timeline-item,
    .exp-card,
    .exp,
    .card-line {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .item,
    .experience-item,
    .experience-card,
    .side-card,
    .side-box,
    .sidebar-box,
    .code-card,
    .list-item,
    .project,
    .timeline-item,
    .exp-card,
    .exp,
    .card-line {
      display: inline-block !important;
      width: 100% !important;
      vertical-align: top;
    }

    h1,
    h2,
    h3,
    .section-title,
    .item-header {
      page-break-after: avoid;
      break-after: avoid;
    }

    .experience-continuation-section {
      page-break-before: auto !important;
      break-before: auto !important;
      margin-top: 0 !important;
    }

    .experience-section.experience-keep-together,
    .experience-section.experience-lead-section,
    .experience-section.experience-continuation-section {
      padding-top: 0 !important;
    }
`;

export const CV_TEMPLATE_PAGINATION_STYLE = `
  <style id="nexcv-pagination-rules">
${CV_TEMPLATE_PAGINATION_RULES}
  </style>
`;

export const injectCvTemplatePaginationRules = (html: string) => {
  if (!html || html.includes('id="nexcv-pagination-rules"')) return html;
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${CV_TEMPLATE_PAGINATION_STYLE}\n</head>`);
  return `${CV_TEMPLATE_PAGINATION_STYLE}\n${html}`;
};
