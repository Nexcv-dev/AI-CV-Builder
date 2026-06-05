import mongoose from 'mongoose';
import User from '../../server-models/User';
import CvImportQuota from '../../server-models/CvImportQuotaModel';
import { getCvImportQuotaPeriod } from '../../server-models/cvImportQuota';
import { isPaidPlan } from '../../server-models/userPlan';
import { extractCvText, parseCvTextToStructuredData, withImportMeta } from '../../services/cvImportService';
import { Type, generateGeminiText } from '../../services/geminiService';
import { processCvImportJob } from '../../services/cvImportJobService';
import { sanitizeTextForPrompt } from '../../services/serverHelpers';

const MONGODB_URI = (process.env.MONGODB_URI || process.env.MONGO_URI || '').trim();

let mongoConnection: typeof mongoose | null = null;

const connectMongo = async () => {
  if (!MONGODB_URI) throw new Error('MONGODB_URI is not configured.');
  if (!mongoConnection) {
    mongoConnection = await mongoose.connect(MONGODB_URI, {
      maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE || 3),
      serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 10000),
      dbName: process.env.MONGODB_DB_NAME || undefined,
    });
  }
  return mongoConnection;
};

const parseSqsJobIds = (event: any) => {
  const records = Array.isArray(event?.Records) ? event.Records : [];
  return records.map((record: any) => {
    const payload = JSON.parse(record.body || '{}');
    if (!payload.jobId || typeof payload.jobId !== 'string') {
      throw new Error('SQS message is missing jobId.');
    }
    return payload.jobId;
  });
};

const rollbackCvImportQuota = async (user: any) => {
  const { period } = getCvImportQuotaPeriod(user);
  if (period === 'unlimited') return;
  await CvImportQuota.updateOne(
    { userId: user._id || user.id, period, count: { $gt: 0 } },
    { $inc: { count: -1 } }
  );
};

const deps = {
  User,
  Type,
  extractCvText,
  generateGeminiText,
  isPaidPlan,
  parseCvTextToStructuredData,
  rollbackCvImportQuota,
  sanitizeTextForPrompt,
  withImportMeta,
  logError: (event: string, error: any, meta?: Record<string, any>) => {
    console.error(event, { message: error?.message || String(error), ...meta });
  },
  logEvent: (level: string, event: string, meta?: Record<string, any>) => {
    console.log(level, event, meta || {});
  },
};

export async function handler(event: any) {
  await connectMongo();
  const jobIds = parseSqsJobIds(event);
  for (const jobId of jobIds) {
    await processCvImportJob(jobId, deps);
  }
  return { processed: jobIds.length };
}
