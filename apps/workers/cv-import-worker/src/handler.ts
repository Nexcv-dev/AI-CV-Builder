import { parseJobIdsFromSqsEvent } from '@nexcv/shared/queuePayloads';
import mongoose from 'mongoose';
import User from '../../../api/server-models/User';
import CvImportQuota from '../../../api/server-models/CvImportQuotaModel';
import { getCvImportQuotaPeriod } from '../../../api/server-models/cvImportQuota';
import { isPaidPlan } from '../../../api/server-models/userPlan';
import { extractCvText, parseCvTextToStructuredData, withImportMeta } from '../../../api/services/cvImportService';
import { Type, generateGeminiText } from '../../../api/services/geminiService';
import { processCvImportJob } from '../../../api/services/cvImportJobService';
import { sanitizeTextForPrompt } from '../../../api/services/serverHelpers';

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
  const jobIds = parseJobIdsFromSqsEvent(event);
  for (const jobId of jobIds) {
    await processCvImportJob(jobId, deps);
  }
  return { processed: jobIds.length };
}
