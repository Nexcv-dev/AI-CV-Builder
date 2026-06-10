import { beforeEach, describe, expect, it, vi } from 'vitest';

const connect = vi.fn();
const processCvImportJob = vi.fn();
const extractCvText = vi.fn();
const generateGeminiText = vi.fn();
const parseCvTextToStructuredData = vi.fn();
const sanitizeTextForPrompt = vi.fn();
const updateOne = vi.fn();
const withImportMeta = vi.fn();

vi.mock('mongoose', () => ({
  default: { connect },
}));

vi.mock('../../../api/server-models/User', () => ({
  default: { modelName: 'User' },
}));

vi.mock('../../../api/server-models/CvImportQuotaModel', () => ({
  default: { updateOne },
}));

vi.mock('../../../api/server-models/cvImportQuota', () => ({
  getCvImportQuotaPeriod: vi.fn(() => ({ period: 'daily' })),
}));

vi.mock('../../../api/server-models/userPlan', () => ({
  isPaidPlan: vi.fn(),
}));

vi.mock('../../../api/services/cvImportService', () => ({
  extractCvText,
  parseCvTextToStructuredData,
  withImportMeta,
}));

vi.mock('../../../api/services/geminiService', () => ({
  Type: { OBJECT: 'object' },
  generateGeminiText,
}));

vi.mock('../../../api/services/cvImportJobService', () => ({
  processCvImportJob,
}));

vi.mock('../../../api/services/serverHelpers', () => ({
  sanitizeTextForPrompt,
}));

const sqsEvent = (jobIds: string[]) => ({
  Records: jobIds.map((jobId) => ({ body: JSON.stringify({ jobId }) })),
});

describe('cv import worker handler', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('MONGODB_URI', 'mongodb://localhost:27017/nexcv-test');
    vi.stubEnv('MONGODB_DB_NAME', 'nexcv-test');
    connect.mockReset();
    connect.mockResolvedValue({ connection: { readyState: 1 } });
    processCvImportJob.mockReset();
    updateOne.mockReset();
  });

  it('connects to Mongo and processes every queued import job', async () => {
    const { handler } = await import('./handler');

    await expect(handler(sqsEvent(['job-a', 'job-b']))).resolves.toEqual({ processed: 2 });

    expect(connect).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenCalledWith('mongodb://localhost:27017/nexcv-test', {
      maxPoolSize: 3,
      serverSelectionTimeoutMS: 10000,
      dbName: 'nexcv-test',
    });
    expect(processCvImportJob).toHaveBeenCalledTimes(2);
    expect(processCvImportJob.mock.calls.map(([jobId]) => jobId)).toEqual(['job-a', 'job-b']);
    expect(processCvImportJob.mock.calls[0][1]).toMatchObject({
      extractCvText,
      generateGeminiText,
      parseCvTextToStructuredData,
      sanitizeTextForPrompt,
      withImportMeta,
    });
  });

  it('reuses the cached Mongo connection across handler calls', async () => {
    const { handler } = await import('./handler');

    await handler(sqsEvent(['job-a']));
    await handler(sqsEvent(['job-b']));

    expect(connect).toHaveBeenCalledTimes(1);
    expect(processCvImportJob.mock.calls.map(([jobId]) => jobId)).toEqual(['job-a', 'job-b']);
  });

  it('fails fast when Mongo is not configured', async () => {
    vi.unstubAllEnvs();
    const { handler } = await import('./handler');

    await expect(handler(sqsEvent(['job-a']))).rejects.toThrow('MONGODB_URI is not configured.');

    expect(connect).not.toHaveBeenCalled();
    expect(processCvImportJob).not.toHaveBeenCalled();
  });
});
