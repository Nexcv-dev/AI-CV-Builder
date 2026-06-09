export type SqsEventLike = {
  Records?: Array<{
    body?: string | null;
  }>;
};

export type PdfQueueJobType = 'cv-pdf' | 'html-pdf';

export type JobQueuePayload = {
  jobId: string;
};

export type PdfQueuePayload = JobQueuePayload & {
  type?: PdfQueueJobType;
};

export type EmailQueuePayload<TEmail = unknown> = {
  email: TEmail;
};

const parseRecordBody = (body: string | null | undefined): unknown => {
  if (!body) return {};
  return JSON.parse(body);
};

export const parseSqsRecordBodies = (event: SqsEventLike): unknown[] => {
  const records = Array.isArray(event?.Records) ? event.Records : [];
  return records.map((record) => parseRecordBody(record.body));
};

export const createJobQueuePayload = (jobId: string): JobQueuePayload => ({ jobId });

export const createPdfQueuePayload = (jobId: string): PdfQueuePayload => ({
  jobId,
  type: 'cv-pdf',
});

export const createHtmlPdfQueuePayload = (jobId: string): PdfQueuePayload => ({
  jobId,
  type: 'html-pdf',
});

export const createEmailQueuePayload = <TEmail>(email: TEmail): EmailQueuePayload<TEmail> => ({ email });

export const readJobId = (payload: unknown, errorMessage = 'SQS message is missing jobId.'): string => {
  if (!payload || typeof payload !== 'object' || typeof (payload as { jobId?: unknown }).jobId !== 'string') {
    throw new Error(errorMessage);
  }
  return (payload as { jobId: string }).jobId;
};

export const parseJobIdsFromSqsEvent = (event: SqsEventLike, errorMessage?: string): string[] =>
  parseSqsRecordBodies(event).map((payload) => readJobId(payload, errorMessage));

export const parsePdfJobsFromSqsEvent = (
  event: SqsEventLike,
  fallbackType: PdfQueueJobType = 'cv-pdf',
): Array<{ jobId: string; type: PdfQueueJobType }> =>
  parseSqsRecordBodies(event).map((payload) => {
    const jobId = readJobId(payload);
    const rawType = payload && typeof payload === 'object' ? (payload as { type?: unknown }).type : undefined;
    return {
      jobId,
      type: rawType === 'html-pdf' || rawType === 'cv-pdf' ? rawType : fallbackType,
    };
  });

export const parseEmailPayloadsFromSqsEvent = <TEmail = unknown>(event: SqsEventLike): TEmail[] =>
  parseSqsRecordBodies(event).map((payload) => {
    const email = payload && typeof payload === 'object' ? (payload as EmailQueuePayload<TEmail>).email : undefined;
    if (!email || typeof email !== 'object') {
      throw new Error('SQS message is missing email payload.');
    }
    return email;
  });
