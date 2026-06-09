import { describe, expect, it } from 'vitest';
import type { DocumentsResponse, HtmlPdfJobResponse, PdfJobResponse } from './documents';

describe('document and job contracts', () => {
  it('allows document lists and queued job responses', () => {
    const documents = {
      documents: [
        {
          id: 'doc_1',
          title: 'Software Engineer CV',
          template: 'modern',
          status: 'draft',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      quota: { limit: 3, used: 1, remaining: 2, reached: false },
    } satisfies DocumentsResponse;

    const pdfJob = {
      job: { id: 'job_1', status: 'queued', queuedInSqs: true, pollUrl: '/api/pdf-jobs/job_1' },
      quota: { limit: 1, used: 1, remaining: 0, reached: true },
    } satisfies PdfJobResponse;

    const htmlJob = {
      job: { id: 'job_2', status: 'ready', downloadUrl: '/api/html-pdf-jobs/job_2/download' },
    } satisfies HtmlPdfJobResponse;

    expect(documents.documents).toHaveLength(1);
    expect(pdfJob.job.status).toBe('queued');
    expect(htmlJob.job.status).toBe('ready');
  });
});
