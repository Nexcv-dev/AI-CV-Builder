import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = (process.env.MONGODB_URI || process.env.MONGO_URI || '').trim();
const PDF_LAMBDA_URL = (process.env.PDF_LAMBDA_URL || '').trim();
const PDF_OUTPUT_BUCKET = (process.env.PDF_OUTPUT_BUCKET_NAME || process.env.S3_PDF_BUCKET_NAME || '').trim();
const PDF_OUTPUT_PREFIX = (process.env.PDF_OUTPUT_PREFIX || 'pdf-jobs').replace(/^\/+|\/+$/g, '');
const PDF_LAMBDA_TIMEOUT_MS = Number(process.env.PDF_LAMBDA_TIMEOUT_MS || 45000);
const PDF_JOBS_COLLECTION = process.env.PDF_JOBS_COLLECTION || 'pdfjobs';
const USERS_COLLECTION = process.env.USERS_COLLECTION || 'users';
const DOWNLOAD_QUOTAS_COLLECTION = process.env.DOWNLOAD_QUOTAS_COLLECTION || 'downloadquotas';

let mongoClient: MongoClient | null = null;
let s3Client: S3Client | null = null;

const getMongoClient = async () => {
  if (!MONGODB_URI) throw new Error('MONGODB_URI is not configured.');
  if (!mongoClient) {
    mongoClient = new MongoClient(MONGODB_URI, {
      maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE || 3),
      serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 10000),
    });
    await mongoClient.connect();
  }
  return mongoClient;
};

const getS3Client = () => {
  if (!PDF_OUTPUT_BUCKET) throw new Error('PDF_OUTPUT_BUCKET_NAME is not configured.');
  if (!s3Client) {
    s3Client = new S3Client({ region: process.env.PDF_OUTPUT_REGION || process.env.AWS_REGION || 'eu-north-1' });
  }
  return s3Client;
};

const getDatabase = async () => {
  const client = await getMongoClient();
  return client.db(process.env.MONGODB_DB_NAME || undefined);
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

const pdfOutputKey = (job: any) => {
  const createdAt = job.createdAt instanceof Date ? job.createdAt : new Date();
  const createdDay = createdAt.toISOString().slice(0, 10);
  return `${PDF_OUTPUT_PREFIX}/${createdDay}/${String(job._id)}.pdf`;
};

const callPdfLambda = async (job: any) => {
  if (!PDF_LAMBDA_URL) throw new Error('PDF_LAMBDA_URL is not configured.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PDF_LAMBDA_TIMEOUT_MS);
  try {
    const response = await fetch(PDF_LAMBDA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Source': 'cv-builder-pdf-worker',
      },
      body: JSON.stringify({
        cvData: job.cvData,
        template: job.template,
        watermark: Boolean(job.watermark),
      }),
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type') || '';
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`PDF Lambda failed with ${response.status}: ${detail.slice(0, 500)}`);
    }

    if (contentType.includes('application/pdf')) {
      return {
        buffer: Buffer.from(await response.arrayBuffer()),
        templateSource: response.headers.get('x-pdf-template-source') || 'unknown',
        s3TemplateDebug: response.headers.get('x-pdf-s3-debug') || '',
        lambdaBuild: response.headers.get('x-pdf-lambda-build') || '',
        renderer: 'lambda',
      };
    }

    const payload = await response.json();
    if (payload?.isBase64Encoded && typeof payload.body === 'string') {
      return {
        buffer: Buffer.from(payload.body, 'base64'),
        templateSource: payload.headers?.['X-PDF-Template-Source'] || payload.headers?.['x-pdf-template-source'] || 'unknown',
        s3TemplateDebug: payload.headers?.['X-PDF-S3-Debug'] || payload.headers?.['x-pdf-s3-debug'] || '',
        lambdaBuild: payload.headers?.['X-PDF-Lambda-Build'] || payload.headers?.['x-pdf-lambda-build'] || '',
        renderer: 'lambda',
      };
    }

    throw new Error('PDF Lambda returned an unexpected response format.');
  } finally {
    clearTimeout(timeout);
  }
};

const planUsesDailyQuota = (plan: string) => plan === 'payg' || plan === 'monthly' || plan === 'quarterly';

const rollbackDownloadQuota = async (db: any, userId: ObjectId) => {
  const user = await db.collection(USERS_COLLECTION).findOne({ _id: userId }, { projection: { plan: 1 } });
  const plan = user?.plan || 'free';
  const day = planUsesDailyQuota(plan) ? new Date().toISOString().slice(0, 10) : 'free-lifetime';
  await db.collection(DOWNLOAD_QUOTAS_COLLECTION).updateOne(
    { userId, day, count: { $gt: 0 } },
    { $inc: { count: -1 } }
  );
};

const processPdfJob = async (jobId: string) => {
  const db = await getDatabase();
  const jobs = db.collection(PDF_JOBS_COLLECTION);
  const objectId = new ObjectId(jobId);

  const job = await jobs.findOneAndUpdate(
    { _id: objectId, status: 'queued' },
    { $set: { status: 'processing', startedAt: new Date() }, $inc: { attempts: 1 } },
    { returnDocument: 'after' }
  );

  if (!job) {
    console.log(`PDF job ${jobId} is not queued; skipping.`);
    return;
  }

  try {
    const pdf = await callPdfLambda(job);
    const outputKey = pdfOutputKey(job);
    await getS3Client().send(new PutObjectCommand({
      Bucket: PDF_OUTPUT_BUCKET,
      Key: outputKey,
      Body: pdf.buffer,
      ContentType: 'application/pdf',
      Metadata: {
        userId: String(job.userId),
        jobId,
      },
    }));

    await jobs.updateOne(
      { _id: objectId },
      {
        $set: {
          status: 'ready',
          renderer: pdf.renderer,
          templateSource: pdf.templateSource,
          s3TemplateDebug: pdf.s3TemplateDebug,
          lambdaBuild: pdf.lambdaBuild,
          outputBucket: PDF_OUTPUT_BUCKET,
          outputKey,
          outputBytes: pdf.buffer.length,
          completedAt: new Date(),
        },
      }
    );
    console.log(`PDF job ${jobId} ready (${pdf.buffer.length} bytes).`);
  } catch (error: any) {
    await jobs.updateOne(
      { _id: objectId },
      {
        $set: {
          status: 'failed',
          error: String(error?.message || 'PDF generation failed.').slice(0, 500),
          completedAt: new Date(),
        },
      }
    );

    if (job.quotaReserved && job.userId) {
      await rollbackDownloadQuota(db, job.userId).catch((rollbackError: any) => {
        console.error(`PDF quota rollback failed for job ${jobId}.`, rollbackError);
      });
    }
    throw error;
  }
};

export async function handler(event: any) {
  const jobIds = parseSqsJobIds(event);
  for (const jobId of jobIds) {
    await processPdfJob(jobId);
  }
  return { processed: jobIds.length };
}
