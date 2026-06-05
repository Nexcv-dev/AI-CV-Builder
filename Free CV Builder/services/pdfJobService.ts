import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { Response } from 'express';
import PdfJob, { IPdfJob } from '../server-models/PdfJob';
import { enqueuePdfJob, isPdfQueueConfigured } from './pdfQueueService';

const PDF_JOB_TTL_MS = Number(process.env.PDF_JOB_TTL_MS || 24 * 60 * 60 * 1000);
const PDF_OUTPUT_BUCKET = (process.env.PDF_OUTPUT_BUCKET_NAME || process.env.S3_PDF_BUCKET_NAME || process.env.S3_TEMPLATE_BUCKET_NAME || '').trim();
const PDF_OUTPUT_PREFIX = (process.env.PDF_OUTPUT_PREFIX || 'pdf-jobs').replace(/^\/+|\/+$/g, '');

let s3Client: S3Client | null = null;

const getPdfS3Client = () => {
    if (!PDF_OUTPUT_BUCKET) return null;
    if (!s3Client) {
        s3Client = new S3Client({ region: process.env.PDF_OUTPUT_REGION || process.env.AWS_REGION || 'eu-north-1' });
    }
    return s3Client;
};

export const isPdfJobStorageConfigured = () => Boolean(PDF_OUTPUT_BUCKET);

export const pdfJobExpiresAt = () => new Date(Date.now() + PDF_JOB_TTL_MS);

export const createPdfJob = async ({
    userId,
    cvData,
    template,
    watermark,
    quotaReserved,
}: {
    userId: string;
    cvData: Record<string, any>;
    template: string;
    watermark: boolean;
    quotaReserved: boolean;
}) => PdfJob.create({
    userId,
    cvData,
    template,
    watermark,
    quotaReserved,
    status: 'queued',
    expiresAt: pdfJobExpiresAt(),
});

export const queuePdfJob = async (job: IPdfJob) => {
    if (!isPdfQueueConfigured()) return false;
    await enqueuePdfJob(String(job._id));
    return true;
};

const pdfOutputKey = (job: IPdfJob) => {
    const createdDay = job.createdAt ? job.createdAt.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    return `${PDF_OUTPUT_PREFIX}/${createdDay}/${String(job._id)}.pdf`;
};

export const processPdfJob = async (jobId: string, deps: Record<string, any>) => {
    const {
        CV_TEMPLATES,
        DEFAULT_TEMPLATE,
        TemplateSetting,
        fetchS3Text,
        generateCVHTML,
        generatePdfDocument,
        generateS3CVHTML,
        renderCvTemplateString,
        rollbackDownloadQuota,
        User,
        logError,
        logEvent,
    } = deps;

    const storageClient = getPdfS3Client();
    if (!storageClient || !PDF_OUTPUT_BUCKET) {
        throw new Error('PDF output bucket is not configured.');
    }

    const job = await PdfJob.findOneAndUpdate(
        { _id: jobId, status: 'queued' },
        { $set: { status: 'processing', startedAt: new Date() }, $inc: { attempts: 1 } },
        { new: true }
    );
    if (!job) return null;

    try {
        const requestedTemplate = job.template || DEFAULT_TEMPLATE;
        const isBuiltInTemplate = CV_TEMPLATES.some((item: any) => item.key === requestedTemplate);
        let s3Html: string | null = null;

        if (!isBuiltInTemplate) {
            const customTemplate = await TemplateSetting
                .findOne({ key: requestedTemplate, source: 'custom', status: 'active' })
                .select('indexS3Key styleS3Key');
            if (customTemplate?.indexS3Key) {
                const indexHtml = await fetchS3Text(customTemplate.indexS3Key);
                if (!indexHtml) throw new Error('Could not load selected template HTML.');

                const css = customTemplate.styleS3Key ? await fetchS3Text(customTemplate.styleS3Key) : '';
                const templateHtml = css
                    ? indexHtml.includes('</head>')
                        ? indexHtml.replace('</head>', `<style>\n${css}\n</style>\n</head>`)
                        : `<style>\n${css}\n</style>\n${indexHtml}`
                    : indexHtml;
                s3Html = renderCvTemplateString(templateHtml, { ...job.cvData, template: requestedTemplate }, { watermark: job.watermark });
            } else {
                s3Html = await generateS3CVHTML(job.cvData, requestedTemplate, { watermark: job.watermark }).catch(() => null);
                if (!s3Html) throw new Error('Could not load selected template files.');
            }
        } else {
            s3Html = await generateS3CVHTML(job.cvData, requestedTemplate, { watermark: job.watermark }).catch(() => null);
        }

        const html = s3Html || generateCVHTML(job.cvData, requestedTemplate, { watermark: job.watermark });
        const pdf = await generatePdfDocument({
            cvData: job.cvData,
            template: requestedTemplate,
            watermark: job.watermark,
            html,
            templateSource: s3Html ? 's3' : 'built-in',
            useLambda: isBuiltInTemplate,
            useWarmBrowser: !job.watermark,
        });
        const outputKey = pdfOutputKey(job);

        await storageClient.send(new PutObjectCommand({
            Bucket: PDF_OUTPUT_BUCKET,
            Key: outputKey,
            Body: Buffer.from(pdf.buffer),
            ContentType: 'application/pdf',
            Metadata: {
                userId: String(job.userId),
                jobId: String(job._id),
            },
        }));

        await PdfJob.updateOne(
            { _id: job._id },
            {
                $set: {
                    status: 'ready',
                    renderer: pdf.renderer,
                    templateSource: pdf.templateSource,
                    outputBucket: PDF_OUTPUT_BUCKET,
                    outputKey,
                    outputBytes: pdf.buffer.length,
                    completedAt: new Date(),
                },
            }
        );

        logEvent?.('info', 'pdf.job_ready', {
            userId: String(job.userId),
            jobId: String(job._id),
            template: requestedTemplate,
            renderer: pdf.renderer,
            bytes: pdf.buffer.length,
        });
        return PdfJob.findById(job._id);
    } catch (error: any) {
        await PdfJob.updateOne(
            { _id: job._id },
            { $set: { status: 'failed', error: String(error?.message || 'PDF generation failed.').slice(0, 500), completedAt: new Date() } }
        );
        if (job.quotaReserved) {
            const user = await User.findById(job.userId);
            if (user) await rollbackDownloadQuota(user).catch((rollbackError: any) => {
                logError?.('pdf.job_quota_rollback_failed', rollbackError, { userId: String(job.userId), jobId: String(job._id) });
            });
        }
        logError?.('pdf.job_failed', error, { userId: String(job.userId), jobId: String(job._id) });
        throw error;
    }
};

export const findUserPdfJob = async (jobId: string, userId: string) => PdfJob.findOne({ _id: jobId, userId });

export const sendPdfJobDownload = async (job: IPdfJob, res: Response, filename: string) => {
    const client = getPdfS3Client();
    const bucket = job.outputBucket || PDF_OUTPUT_BUCKET;
    if (!client || !bucket || !job.outputKey || job.status !== 'ready') {
        res.status(404).json({ error: 'PDF is not ready.' });
        return;
    }

    const response = await client.send(new GetObjectCommand({
        Bucket: bucket,
        Key: job.outputKey,
    }));

    res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename.replace(/"/g, '')}"`,
        ...(job.outputBytes ? { 'Content-Length': String(job.outputBytes) } : {}),
        ...(job.renderer ? { 'X-PDF-Renderer': job.renderer } : {}),
        ...(job.templateSource ? { 'X-PDF-Template-Source': job.templateSource } : {}),
    });

    const body = response.Body as any;
    if (body?.pipe) {
        body.pipe(res);
        return;
    }
    if (body?.transformToByteArray) {
        res.send(Buffer.from(await body.transformToByteArray()));
        return;
    }
    res.status(500).json({ error: 'Could not stream PDF.' });
};
