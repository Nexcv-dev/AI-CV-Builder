import { describe, it, expect } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import { registerHtmlPdfRoutes } from '../routes/htmlPdf';
import { buildHtmlPdfQuota, getHtmlPdfDailyLimit } from '../server-models/htmlPdfQuota';
import { calculateHtmlPdfAutoScale, calculateHtmlPdfFitScale, sanitizeHtmlPdfFilename, sanitizeHtmlPdfInput } from '../services/htmlPdfJobService';

const validHtml = `
  <html>
    <head>
      <style>
        body { margin: 0; background: white; }
        .page { width: 210mm; min-height: 297mm; padding: 18mm; }
      </style>
    </head>
    <body><main class="page">Hello</main></body>
  </html>
`;

describe('HTML to PDF feature', () => {
  it('defaults signed-in users to three daily HTML PDF exports', () => {
    const original = process.env.HTML_PDF_DAILY_FREE_LIMIT;
    delete process.env.HTML_PDF_DAILY_FREE_LIMIT;

    expect(getHtmlPdfDailyLimit()).toBe(3);
    expect(buildHtmlPdfQuota({ role: 'user', plan: 'free' } as any, 1)).toMatchObject({
      limit: 3,
      used: 1,
      remaining: 2,
      reached: false,
    });
    expect(buildHtmlPdfQuota({ role: 'user', plan: 'free' } as any, 3)).toMatchObject({
      limit: 3,
      used: 3,
      remaining: 0,
      reached: true,
    });

    if (original === undefined) {
      delete process.env.HTML_PDF_DAILY_FREE_LIMIT;
    } else {
      process.env.HTML_PDF_DAILY_FREE_LIMIT = original;
    }
  });

  it('does not limit super admins', () => {
    expect(buildHtmlPdfQuota({ role: 'super_admin' } as any, 999)).toMatchObject({
      limit: null,
      used: 999,
      remaining: null,
      reached: false,
      plan: 'unlimited',
    });
  });

  it('sanitizes uploaded HTML content and download filenames', () => {
    const input = sanitizeHtmlPdfInput({
      html: validHtml.replace('Hello', '<span onclick="alert(1)">Hello</span><img src="data:image/png;base64,abcd">'),
      css: '',
    });

    expect(input.html).toContain('Hello');
    expect(input.html).not.toContain('onclick');
    expect(sanitizeHtmlPdfFilename(' invoice<>:"/\\|?* june ')).toBe('invoice june');
  });

  it('rejects HTML that does not satisfy PDF authoring rules', () => {
    expect(() => sanitizeHtmlPdfInput({
      html: '<html><body style="margin:20px"><main>Hello</main></body></html>',
      css: '',
    })).toThrow(/Fix the HTML PDF rules/i);
  });

  it('rejects oversized HTML and CSS payloads', () => {
    expect(() => sanitizeHtmlPdfInput({
      html: `<main>${'x'.repeat(260 * 1024)}</main>`,
      css: '',
    })).toThrow(/too large/i);
  });

  it('calculates a single-page fit scale for oversized HTML documents', () => {
    expect(calculateHtmlPdfFitScale({
      contentWidth: 794,
      contentHeight: 2244,
      pageSize: 'A4',
    })).toBeCloseTo(0.5, 3);
    expect(calculateHtmlPdfFitScale({
      contentWidth: 500,
      contentHeight: 700,
      pageSize: 'A4',
    })).toBe(1);
  });

  it('only auto-fits documents that stay within the readable single-page threshold', () => {
    expect(calculateHtmlPdfAutoScale({
      contentWidth: 794,
      contentHeight: 2244,
      pageSize: 'A4',
    })).toBeCloseTo(0.5, 3);
    expect(calculateHtmlPdfAutoScale({
      contentWidth: 794,
      contentHeight: 3366,
      pageSize: 'A4',
    })).toBe(1);
  });

  it('requires authentication for job creation', async () => {
    const app = express();
    const router = express.Router();
    app.use(express.json());
    registerHtmlPdfRoutes(router, {
      requireAuth: (_req: any, res: any) => res.status(401).json({ error: 'Not authenticated' }),
      htmlPdfJsonParser: express.json({ limit: '300kb' }),
      pdfLimiter: (_req: any, _res: any, next: any) => next(),
      sendError: (res: any, status: number, message: string) => res.status(status).json({ error: message }),
    });
    app.use(router);

    const server = await new Promise<Server>((resolve) => {
      const listeningServer = app.listen(0, '127.0.0.1', () => resolve(listeningServer));
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server did not bind to a TCP port.');

    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/html-pdf-jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: validHtml, css: '' }),
      });
      const body = await response.json() as { error: string };

      expect(response.status).toBe(401);
      expect(body.error).toContain('Not authenticated');
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      });
    }
  });
});
