import express, { Router, Request, Response, NextFunction } from 'express';
import path from 'path';
import { bindDeps } from './_shared';
import type { BillingPlan } from '../server-models/userPlan';
import type { TemplateName } from '../src/templates';
import { mergeCmsContent } from '../src/contentDefaults';
import { getOrSetCachedValue, parseCacheTtlMs } from '../server-utils/ttlCache';

type RouteDeps = Record<string, any>;

const publicCacheControl = (browserMaxAgeSeconds: number, cdnMaxAgeSeconds = browserMaxAgeSeconds) => (
    `public, max-age=${browserMaxAgeSeconds}, s-maxage=${cdnMaxAgeSeconds}, stale-while-revalidate=${cdnMaxAgeSeconds}`
);

export function registerPublicRoutes(router: Router, deps: RouteDeps) {
    const { User, CVDocument, DownloadQuota, PaymentTransaction, BillingPlanSetting, Coupon, CheckoutSession, TemplateSetting, SupportTicket, CV_TEMPLATES, DEFAULT_TEMPLATE, TemplateName, templateRequiresPaidPlan, requireAuth, requireSuperAdmin, sendError, passport, adminTemplateJsonParser, cvImportJsonParser, pdfJsonParser, authLimiter, passwordResetLimiter, emailVerificationAttemptLimiter, emailVerificationLimiter, getRequestOrigin, isAllowedOrigin, clearS3TemplateCache, fetchS3Text, generateS3CVHTML, getS3ObjectStream, putS3Object, S3_TEMPLATE_BUCKET, S3_TEMPLATE_PREFIX, generateCVHTML, generatePdfDocument, sanitizeCvData, getDownloadQuota, incrementDownloadQuota, getActiveTemplateForKey, sanitizeTextForPrompt, sanitizeContextField, sanitizeProfileField, sanitizeDisplayName, normalizeEmail, isValidEmail, validatePasswordStrength, hashPassword, verifyPassword, hashToken, generateEmailVerificationOtp, isEmailVerified, publicUser, isMongoDuplicateKeyError, isMongoValidationError, passwordPolicyMessage, sendEmailVerificationWithRetry, sendNewAccountNotification, sendContactNotification, sendBillingSuccessNotifications, getFrontendOrigin, getApiOrigin, currentUserId, isValidDocumentId, adminTemplateSummary, customTemplateSummary, templateThumbnailPath, validateCustomTemplateKey, defaultTemplateCategory, sanitizeTemplateSource, validateTemplateHtml, validateTemplateCss, parseThumbnailUpload, TEMPLATE_CATEGORIES, TEMPLATE_SURFACE_COLOR_ROLES, TEMPLATE_STATUSES, MAX_TEMPLATE_HTML_LENGTH, MAX_TEMPLATE_CSS_LENGTH, ensureDefaultBillingPlans, billingPlanSummary, normalizeCouponCode,  isPaidBillingPlan, calculateBillingQuote, parsePayherePlan, verifyPayhereMd5Signature, markPaymentProcessed, createCheckoutHash, createCheckoutOrderId, getPayhereConfig, buildPayhereCheckoutPayload, createPlanExpiry, getEffectivePlan, isPaidPlan, documentSummary, buildInitialCvData, parsePdfText, generateGeminiText, Type, ALLOWED_MIME_TYPES, ALLOWED_SECTION_TYPES, buildCvCreationQuota, consumeCvCreationQuota, buildDownloadQuota, sendAppEmail, sendSystemEmail, sendNotificationEmail, isEmailServiceConfigured, normalizeEmailFrom, roleForEmail, syncUserRoleFromAllowlist, isSuperAdmin, mongoose, randomBytes, randomInt, createHash, timingSafeEqual, startOfUtcDay, formatUtcDay, parsePaymentAmountCents, escapeRegex, adminUserSummary, getPublicBillingPlans, planDisplayName, getPlanPrice, adminPaymentSummary, SUPPORT_TICKET_STATUSES, SUPPORT_TICKET_TYPES, SUPPORT_TICKET_PRIORITIES, sanitizeContactMessage, adminSupportTicketSummary, emailGreetingName, getCvCreationQuota, incrementCvCreationQuota, documentDetails, requireVerifiedEmail, resolveRequestedTemplate, titleFromCvData, requirePaidPlan, MAX_BASE64_LENGTH, quoteCheckout, getPayHereMerchantConfig, verifyPayHereMd5Signature, resolvePayHerePaymentContext, PAYHERE_PLAN_PRICES, payHereAmountToCents, generateTransactionId, getPayHereCheckoutUrl, buildPayHereCheckoutHash } = bindDeps(deps);

    router.get('/api/health', (req: Request, res: Response) => {
        if (req.accepts(['json', 'html']) === 'html') {
            return res.status(404).sendFile(path.join(process.cwd(), 'dist', 'index.html'));
        }

        const mongoConfigured = Boolean((process.env.MONGO_URI || process.env.MONGODB_URI || '').trim());
        const mongoReadyState = mongoose?.connection?.readyState;
        const payhereConfig = getPayHereMerchantConfig();
        const checks = {
            api: {
                ok: true,
                detail: 'API process is responding.',
            },
            mongodb: {
                ok: !mongoConfigured || mongoReadyState === 1,
                configured: mongoConfigured,
                state: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoReadyState] || 'unknown',
            },
            session: {
                ok: Boolean((process.env.SESSION_SECRET || '').trim()) || process.env.NODE_ENV !== 'production',
                configured: Boolean((process.env.SESSION_SECRET || '').trim()),
            },
            email: {
                ok: isEmailServiceConfigured(),
                configured: isEmailServiceConfigured(),
            },
            payhere: {
                ok: Boolean(payhereConfig.merchantId && payhereConfig.merchantSecret),
                configured: Boolean(payhereConfig.merchantId && payhereConfig.merchantSecret),
                checkoutUrl: getPayHereCheckoutUrl(),
                notifyUrlConfigured: Boolean((process.env.PAYHERE_NOTIFY_URL || '').trim()),
            },
            s3Templates: {
                ok: Boolean(S3_TEMPLATE_BUCKET),
                configured: Boolean(S3_TEMPLATE_BUCKET),
                prefix: S3_TEMPLATE_PREFIX || '',
            },
            pdfLambda: {
                ok: Boolean((process.env.PDF_LAMBDA_URL || '').trim()),
                configured: Boolean((process.env.PDF_LAMBDA_URL || '').trim()),
            },
        };
        const status = Object.values(checks).every((check: any) => check.ok) ? 'ok' : 'degraded';
        const canViewDetailedHealth = process.env.NODE_ENV !== 'production' || isSuperAdmin(req.user);
        if (!canViewDetailedHealth) {
            return res.json({
                status,
                timestamp: new Date().toISOString(),
            });
        }

        res.json({
            status,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            uptimeSeconds: Math.round(process.uptime()),
            checks,
        });
    });

    router.get('/api/ready', (_req: Request, res: Response) => {
        const mongoConfigured = Boolean((process.env.MONGO_URI || process.env.MONGODB_URI || '').trim());
        const mongoReady = !mongoConfigured || mongoose?.connection?.readyState === 1;
        if (!mongoReady) {
            return res.status(503).json({
                status: 'not_ready',
                mongodb: {
                    configured: mongoConfigured,
                    state: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose?.connection?.readyState] || 'unknown',
                },
            });
        }

        return res.json({ status: 'ready' });
    });

    router.get('/api/public/app-settings', (req: Request, res: Response) => {
        const settings = (req as any).appSettings;
        const cmsContent = mergeCmsContent(settings?.cmsContent);
        return res.json({
            maintenanceMode: Boolean(settings?.maintenanceMode),
            announcementEnabled: Boolean(settings?.announcementEnabled || cmsContent.announcement.enabled),
            announcementText: settings?.announcementText || cmsContent.announcement.text || '',
            announcement: cmsContent.announcement,
            cmsContent,
            supportEmail: settings?.supportEmail || 'support@nexcv.com',
            adminAccessAllowed: typeof deps.isAdminIpAllowed === 'function' ? deps.isAdminIpAllowed(req) : true,
        });
    });


    router.get('/api/templates/config', async (_req: Request, res: Response) => {
        try {
            const data = await getOrSetCachedValue(
                'public:templates:config',
                parseCacheTtlMs(process.env.TEMPLATE_CONFIG_CACHE_TTL_MS, 5 * 60_000),
                async () => {
                    const settings = await TemplateSetting.find();
                    const settingMap = new Map(settings.map((setting) => [setting.key, setting]));
                    const builtInKeys = new Set<string>(CV_TEMPLATES.map((template) => template.key));
                    const builtIns = CV_TEMPLATES
                        .map((template) => adminTemplateSummary(template, settingMap.get(template.key), 0))
                        .filter((template) => template.status !== 'archived');
                    const customTemplates = settings
                        .filter((setting) => setting.source === 'custom' && setting.status === 'active' && !builtInKeys.has(setting.key))
                        .map((setting) => customTemplateSummary(setting, 0));
                    return { templates: [...builtIns, ...customTemplates] };
                }
            );
            res.setHeader('Cache-Control', publicCacheControl(60, 300));
            return res.json(data);
        } catch (error) {
            return sendError(res, 500, 'Could not load template configuration.', error);
        }
    });


    router.get('/api/templates/:key/html', async (req: Request, res: Response) => {
        try {
            const key = validateCustomTemplateKey(req.params.key);
            if (!key) return res.status(400).json({ error: 'Invalid template key.' });

            const html = await getOrSetCachedValue(
                `public:templates:html:${key}`,
                parseCacheTtlMs(process.env.TEMPLATE_HTML_CACHE_TTL_MS, 10 * 60_000),
                async () => {
                    const setting = await TemplateSetting.findOne({ key, source: 'custom', status: 'active' }).select('indexS3Key styleS3Key');
                    const builtInTemplate = CV_TEMPLATES.find((template: any) => template.key === key);
                    const s3Prefix = setting?.indexS3Key
                        ? ''
                        : builtInTemplate
                            ? (S3_TEMPLATE_PREFIX ? `${S3_TEMPLATE_PREFIX}/${key}` : key)
                            : '';
                    const indexS3Key = setting?.indexS3Key || (s3Prefix ? `${s3Prefix}/index.html` : '');
                    const styleS3Key = setting?.styleS3Key || (s3Prefix ? `${s3Prefix}/style.css` : '');
                    if (!indexS3Key) return '';

                    const indexHtml = await fetchS3Text(indexS3Key);
                    if (!indexHtml) return '';

                    const css = styleS3Key ? await fetchS3Text(styleS3Key) : '';
                    return css
                        ? indexHtml.includes('</head>')
                            ? indexHtml.replace('</head>', `<style>\n${css}\n</style>\n</head>`)
                            : `<style>\n${css}\n</style>\n${indexHtml}`
                        : indexHtml;
                }
            );
            if (!html) return res.status(404).json({ error: 'Template HTML not found.' });

            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Cache-Control', publicCacheControl(300, 600));
            return res.send(html);
        } catch (error) {
            return sendError(res, 500, 'Could not load template HTML.', error);
        }
    });


    router.get('/api/templates/:key/thumbnail', async (req: Request, res: Response) => {
        try {
            const key = validateCustomTemplateKey(req.params.key);
            if (!key) return res.status(400).json({ error: 'Invalid template key.' });
            const setting = await TemplateSetting.findOne({ key, source: 'custom', thumbnailS3Key: { $exists: true, $ne: '' } });
            if (!setting?.thumbnailS3Key) return res.status(404).json({ error: 'Template thumbnail not found.' });
            const response = await getS3ObjectStream(setting.thumbnailS3Key);
            if (!response) return res.status(404).json({ error: 'Template thumbnail not configured.' });
            res.setHeader('Content-Type', response.ContentType || 'image/svg+xml');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            if (response.Body && typeof (response.Body as any).pipe === 'function') {
                return (response.Body as any).pipe(res);
            }
            const chunks: Buffer[] = [];
            for await (const chunk of response.Body as any) {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            return res.send(Buffer.concat(chunks));
        } catch (error) {
            return sendError(res, 500, 'Could not load template thumbnail.', error);
        }
    });


    router.post('/api/support/tickets', async (req: Request, res: Response) => {
        try {
            const fullName = sanitizeDisplayName(req.body.fullName || (req.user as any)?.displayName || '');
            const email = normalizeEmail(req.body.email || (req.user as any)?.email || '');
            const type = SUPPORT_TICKET_TYPES.includes(req.body.type) ? req.body.type : 'general';
            const subject = sanitizeProfileField(req.body.subject, 160) || 'Support request';
            const message = sanitizeContactMessage(req.body.message);
    
            if (!fullName) {
                return res.status(400).json({ error: 'Enter your name.' });
            }
            if (!isValidEmail(email)) {
                return res.status(400).json({ error: 'Enter a valid email address.' });
            }
            if (!message || message.length < 10) {
                return res.status(400).json({ error: 'Enter a message with at least 10 characters.' });
            }
    
            const ticket = await SupportTicket.create({
                userId: req.user ? currentUserId(req) : undefined,
                fullName,
                email,
                type,
                subject,
                message,
                priority: type === 'payment_issue' ? 'high' : 'normal',
            });
    
            if (isEmailServiceConfigured()) {
                void sendContactNotification({ fullName, email, message: `[${type}] ${subject}\n\n${message}` });
            }
    
            return res.status(201).json({
                ticket: adminSupportTicketSummary(ticket),
                message: 'Support ticket created. We will get back to you soon.',
            });
        } catch (error) {
            return sendError(res, 500, 'Could not create support ticket.', error);
        }
    });


    router.post('/api/contact', async (req: Request, res: Response) => {
        try {
            const fullName = sanitizeDisplayName(req.body.fullName);
            const email = normalizeEmail(req.body.email);
            const message = sanitizeContactMessage(req.body.message);
    
            if (!fullName) {
                return res.status(400).json({ error: 'Enter your name.' });
            }
    
            if (!isValidEmail(email)) {
                return res.status(400).json({ error: 'Enter a valid email address.' });
            }
    
            if (!message || message.length < 10) {
                return res.status(400).json({ error: 'Enter a message with at least 10 characters.' });
            }
    
            if (!isEmailServiceConfigured()) {
                return res.status(500).json({ error: 'Email service is not configured.' });
            }
    
            await sendContactNotification({ fullName, email, message });
            return res.json({ message: 'Message sent. We will get back to you soon.' });
        } catch (error) {
            return sendError(res, 500, 'Could not send your message.', error);
        }
    });
    
    // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Auth Routes (Placeholders) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

}
