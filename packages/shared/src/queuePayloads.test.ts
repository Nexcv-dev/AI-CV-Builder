import { describe, expect, it } from 'vitest';
import {
  createHtmlPdfQueuePayload,
  parseEmailPayloadsFromSqsEvent,
  parseJobIdsFromSqsEvent,
  parsePdfJobsFromSqsEvent,
} from './queuePayloads';

describe('queue payload helpers', () => {
  it('reads job ids from SQS records', () => {
    expect(parseJobIdsFromSqsEvent({ Records: [{ body: JSON.stringify({ jobId: 'job-1' }) }] })).toEqual(['job-1']);
  });

  it('keeps PDF job type explicit with a fallback', () => {
    expect(parsePdfJobsFromSqsEvent({
      Records: [
        { body: JSON.stringify({ jobId: 'pdf-1' }) },
        { body: JSON.stringify(createHtmlPdfQueuePayload('html-1')) },
      ],
    })).toEqual([
      { jobId: 'pdf-1', type: 'cv-pdf' },
      { jobId: 'html-1', type: 'html-pdf' },
    ]);
  });

  it('validates email payload shape at the SQS envelope level', () => {
    expect(parseEmailPayloadsFromSqsEvent({
      Records: [{ body: JSON.stringify({ email: { to: 'hello@nexcv.com' } }) }],
    })).toEqual([{ to: 'hello@nexcv.com' }]);
  });
});
