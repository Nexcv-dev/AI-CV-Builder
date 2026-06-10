import { Router, Request, Response } from 'express';
import { createHash } from 'crypto';
import { bindDeps } from './_shared';
import {
    createHtmlPdfJob,
    findUserHtmlPdfJob,
    isHtmlPdfJobStorageConfigured,
    MAX_HTML_PDF_INPUT_BYTES,
    normalizeHtmlPdfPageSize,
    processHtmlPdfJob,
    queueHtmlPdfJob,
    sanitizeHtmlPdfFilename,
    sanitizeHtmlPdfInput,
    sendHtmlPdfJobDownload,
} from '../services/htmlPdfJobService';
import type { HtmlPdfJobResponse, HtmlPdfQuotaResponse } from '@nexcv/api-contracts/documents';

type RouteDeps = Record<string, any>;

export function registerHtmlPdfRoutes(router: Router, deps: RouteDeps) {
    const {
        User,
        requireAuth,
        sendError,
        htmlPdfJsonParser,
        pdfLimiter,
        currentUserId,
        isValidDocumentId,
        getHtmlPdfQuota,
        consumeHtmlPdfQuota,
        rollbackHtmlPdfQuota,
        logError,
    } = bindDeps(deps);

    const getHtmlPdfGuestKey = (req: Request) => {
        const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
        const ip = forwardedFor || req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = String(req.headers['user-agent'] || '').slice(0, 300);
        return createHash('sha256').update(`${ip}|${userAgent}`).digest('hex').slice(0, 48);
    };

    const getHtmlPdfOwner = (req: Request) => (
        req.user ? { user: req.user } : { guestKey: getHtmlPdfGuestKey(req) }
    );

    const getHtmlPdfJobOwnerFilter = (req: Request) => (
        req.user ? { userId: String(currentUserId(req)) } : { guestKey: getHtmlPdfGuestKey(req) }
    );

    const expireJobAndRollbackQuota = async (job: any) => {
        const canRollbackReservedQuota = job.quotaReserved && ['queued', 'processing'].includes(job.status);
        const claimed = canRollbackReservedQuota
            ? await job.constructor.updateOne(
                { _id: job._id, quotaReserved: true },
                { $set: { status: 'expired', quotaReserved: false } }
            )
            : await job.constructor.updateOne(
                { _id: job._id },
                { $set: { status: 'expired' } }
            );

        job.status = 'expired';
        if (canRollbackReservedQuota && claimed.modifiedCount > 0) {
            job.quotaReserved = false;
            const user = job.userId && User ? await User.findById(job.userId) : null;
            const quotaOwner = user ? { user } : job.guestKey ? { guestKey: job.guestKey } : null;
            if (quotaOwner) {
                await rollbackHtmlPdfQuota(quotaOwner).catch((rollbackError: any) => {
                    logError?.('html_pdf.job_expired_quota_rollback_failed', rollbackError, {
                        userId: job.userId ? String(job.userId) : undefined,
                        jobId: String(job._id),
                    });
                });
            }
        }
    };

    router.get('/api/html-pdf-quota', async (req: Request, res: Response) => {
        try {
            const response = { quota: await getHtmlPdfQuota(getHtmlPdfOwner(req)) } satisfies HtmlPdfQuotaResponse;
            res.json(response);
        } catch (error) {
            return sendError(res, 500, 'Could not load HTML PDF quota.', error);
        }
    });

    router.post('/api/html-pdf-jobs', pdfLimiter, htmlPdfJsonParser, async (req: Request, res: Response) => {
        let quotaReserved = false;
        try {
            if (!isHtmlPdfJobStorageConfigured()) {
                return res.status(503).json({ error: 'HTML PDF storage is not configured.' });
            }

            const input = sanitizeHtmlPdfInput({ html: req.body?.html, css: req.body?.css });
            const owner = getHtmlPdfOwner(req);
            const quota = await consumeHtmlPdfQuota(owner);
            if (!quota.reserved) {
                return res.status(403).json({
                    error: 'Daily HTML to PDF limit reached.',
                    quota: { ...quota, reserved: undefined },
                    upgradeRequired: false,
                });
            }
            quotaReserved = quota.limit !== null;

            const job = await createHtmlPdfJob({
                ...(req.user ? { userId: String(currentUserId(req)) } : { guestKey: owner.guestKey }),
                html: input.html,
                css: input.css,
                filename: sanitizeHtmlPdfFilename(req.body?.filename),
                pageSize: normalizeHtmlPdfPageSize(req.body?.pageSize),
                quotaReserved,
            });

            const queuedInSqs = await queueHtmlPdfJob(job);
            if (!queuedInSqs) {
                setTimeout(() => {
                    void processHtmlPdfJob(String(job._id), { User, rollbackHtmlPdfQuota }).catch(() => undefined);
                }, 0);
            }

            const response = {
                job: {
                    id: String(job._id),
                    status: job.status,
                    queuedInSqs,
                    pollUrl: `/api/html-pdf-jobs/${String(job._id)}`,
                },
                quota: { ...quota, reserved: undefined },
                maxInputBytes: MAX_HTML_PDF_INPUT_BYTES,
            } satisfies HtmlPdfJobResponse;
            return res.status(202).json(response);
        } catch (error: any) {
            if (quotaReserved) {
                await rollbackHtmlPdfQuota(getHtmlPdfOwner(req)).catch((rollbackError: any) => {
                    logError?.('html_pdf.quota_rollback_failed', rollbackError, {
                        userId: req.user ? String(currentUserId(req)) : undefined,
                    });
                });
            }
            const status = Number.isInteger(error?.status) ? error.status : 500;
            return sendError(res, status, status === 500 ? 'Could not queue HTML PDF. Please try again.' : error.message, error);
        }
    });

    router.get('/api/html-pdf-jobs/:id', async (req: Request, res: Response) => {
        try {
            if (!isValidDocumentId(req.params.id)) {
                return res.status(400).json({ error: 'Invalid HTML PDF job id.' });
            }

            const job = await findUserHtmlPdfJob(req.params.id, getHtmlPdfJobOwnerFilter(req));
            if (!job) return res.status(404).json({ error: 'HTML PDF job not found.' });

            if (job.expiresAt.getTime() < Date.now() && job.status !== 'ready') {
                await expireJobAndRollbackQuota(job);
            }

            const downloadUrl = job.status === 'ready' ? `/api/html-pdf-jobs/${String(job._id)}/download` : undefined;
            const response = {
                job: {
                    id: String(job._id),
                    status: job.status,
                    error: job.error,
                    downloadUrl,
                    expiresAt: job.expiresAt,
                },
            } satisfies HtmlPdfJobResponse;
            return res.json(response);
        } catch (error) {
            return sendError(res, 500, 'Could not check HTML PDF job status.', error);
        }
    });

    router.get('/api/html-pdf-jobs/:id/download', async (req: Request, res: Response) => {
        try {
            if (!isValidDocumentId(req.params.id)) {
                return res.status(400).json({ error: 'Invalid HTML PDF job id.' });
            }

            const job = await findUserHtmlPdfJob(req.params.id, getHtmlPdfJobOwnerFilter(req));
            if (!job) return res.status(404).json({ error: 'HTML PDF job not found.' });
            await sendHtmlPdfJobDownload(job, res);
        } catch (error) {
            return sendError(res, 500, 'Could not download HTML PDF.', error);
        }
    });
}
