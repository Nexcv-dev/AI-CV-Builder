import express, { Router, Request, Response, NextFunction } from 'express';
import { bindDeps } from '../_shared';
import type { BillingPlan } from '../../server-models/userPlan';
import type { TemplateName } from '../../src/templates';

type RouteDeps = Record<string, any>;

export function registerAdminTemplateRoutes(router: Router, deps: RouteDeps) {
    const { User, CVDocument, DownloadQuota, PaymentTransaction, BillingPlanSetting, Coupon, CheckoutSession, TemplateSetting, SupportTicket, CV_TEMPLATES, DEFAULT_TEMPLATE, TemplateName, templateRequiresPaidPlan, requireAuth, requireSuperAdmin, sendError, passport, adminTemplateJsonParser, cvImportJsonParser, pdfJsonParser, authLimiter, passwordResetLimiter, emailVerificationAttemptLimiter, emailVerificationLimiter, getRequestOrigin, isAllowedOrigin, clearS3TemplateCache, fetchS3Text, generateS3CVHTML, getS3ObjectStream, putS3Object, S3_TEMPLATE_BUCKET, S3_TEMPLATE_PREFIX, generateCVHTML, generatePdfDocument, sanitizeCvData, getDownloadQuota, incrementDownloadQuota, getActiveTemplateForKey, sanitizeTextForPrompt, sanitizeContextField, sanitizeProfileField, sanitizeDisplayName, normalizeEmail, isValidEmail, validatePasswordStrength, hashPassword, verifyPassword, hashToken, generateEmailVerificationOtp, isEmailVerified, publicUser, isMongoDuplicateKeyError, isMongoValidationError, passwordPolicyMessage, sendEmailVerificationWithRetry, sendNewAccountNotification, sendContactNotification, sendBillingSuccessNotifications, getFrontendOrigin, getApiOrigin, currentUserId, isValidDocumentId, adminTemplateSummary, customTemplateSummary, templateThumbnailPath, validateCustomTemplateKey, defaultTemplateCategory, sanitizeTemplateSource, validateTemplateHtml, validateTemplateCss, parseThumbnailUpload, TEMPLATE_CATEGORIES, TEMPLATE_SURFACE_COLOR_ROLES, TEMPLATE_STATUSES, MAX_TEMPLATE_HTML_LENGTH, MAX_TEMPLATE_CSS_LENGTH, ensureDefaultBillingPlans, billingPlanSummary, normalizeCouponCode,  isPaidBillingPlan, calculateBillingQuote, parsePayherePlan, verifyPayhereMd5Signature, markPaymentProcessed, createCheckoutHash, createCheckoutOrderId, getPayhereConfig, buildPayhereCheckoutPayload, createPlanExpiry, getEffectivePlan, isPaidPlan, documentSummary, buildInitialCvData, parsePdfText, generateGeminiText, Type, ALLOWED_MIME_TYPES, ALLOWED_SECTION_TYPES, buildCvCreationQuota, consumeCvCreationQuota, buildDownloadQuota, sendAppEmail, sendSystemEmail, sendNotificationEmail, isEmailServiceConfigured, normalizeEmailFrom, roleForEmail, syncUserRoleFromAllowlist, isSuperAdmin, mongoose, randomBytes, randomInt, createHash, timingSafeEqual, startOfUtcDay, formatUtcDay, parsePaymentAmountCents, escapeRegex, adminUserSummary, getPublicBillingPlans, planDisplayName, getPlanPrice, adminPaymentSummary, SUPPORT_TICKET_STATUSES, SUPPORT_TICKET_TYPES, SUPPORT_TICKET_PRIORITIES, sanitizeContactMessage, adminSupportTicketSummary, emailGreetingName, getCvCreationQuota, incrementCvCreationQuota, documentDetails, requireVerifiedEmail, resolveRequestedTemplate, titleFromCvData, requirePaidPlan, MAX_BASE64_LENGTH, quoteCheckout, getPayHereMerchantConfig, verifyPayHereMd5Signature, resolvePayHerePaymentContext, PAYHERE_PLAN_PRICES, payHereAmountToCents, generateTransactionId, getPayHereCheckoutUrl, buildPayHereCheckoutHash } = bindDeps(deps);

    router.get('/api/admin/templates', requireSuperAdmin, async (_req: Request, res: Response) => {
        try {
            const [settings, usage] = await Promise.all([
                TemplateSetting.find(),
                CVDocument.aggregate([
                    { $group: { _id: '$template', count: { $sum: 1 } } },
                ]),
            ]);
            const settingMap = new Map(settings.map((setting) => [setting.key, setting]));
            const usageMap = new Map(usage.map((item: any) => [item._id, item.count]));
            const builtInKeys = new Set<string>(CV_TEMPLATES.map((template) => template.key));
            const customTemplates = settings
                .filter((setting) => setting.source === 'custom' && !builtInKeys.has(setting.key))
                .map((setting) => customTemplateSummary(setting, usageMap.get(setting.key) || 0));

            return res.json({
                categories: TEMPLATE_CATEGORIES,
                statuses: TEMPLATE_STATUSES,
                surfaceColorRoles: TEMPLATE_SURFACE_COLOR_ROLES,
                templates: [
                    ...CV_TEMPLATES.map((template) => adminTemplateSummary(
                    template,
                    settingMap.get(template.key),
                    usageMap.get(template.key) || 0
                    )),
                    ...customTemplates,
                ],
            });
        } catch (error) {
            return sendError(res, 500, 'Could not load admin templates.', error);
        }
    });


    router.post('/api/admin/templates', requireSuperAdmin, adminTemplateJsonParser, async (req: Request, res: Response) => {
        try {
            const key = validateCustomTemplateKey(req.body.key);
            if (!key) return res.status(400).json({ error: 'Use a lowercase slug key like creative-2026.' });
            if (CV_TEMPLATES.some((template) => template.key === key) || await TemplateSetting.exists({ key })) {
                return res.status(409).json({ error: 'A template with this key already exists.' });
            }
            if (!S3_TEMPLATE_BUCKET) {
                return res.status(400).json({ error: 'S3 template bucket is not configured.' });
            }

            const label = sanitizeProfileField(req.body.label, 80) || key;
            const category = typeof req.body.category === 'string' && TEMPLATE_CATEGORIES.includes(req.body.category as any)
                ? req.body.category
                : defaultTemplateCategory(key);
            const access = req.body.access === 'free' ? 'free' : 'paid';
            const surfaceColorRole = TEMPLATE_SURFACE_COLOR_ROLES.includes(req.body.surfaceColorRole)
                ? req.body.surfaceColorRole
                : 'none';
            const surfaceColorLabel = sanitizeProfileField(req.body.surfaceColorLabel, 80);
            const indexHtml = sanitizeTemplateSource(req.body.indexHtml, MAX_TEMPLATE_HTML_LENGTH);
            const styleCss = sanitizeTemplateSource(req.body.styleCss, MAX_TEMPLATE_CSS_LENGTH);
            const thumbnailUpload = parseThumbnailUpload(req.body.thumbnailDataUrl);
            const htmlError = validateTemplateHtml(indexHtml);
            const cssError = validateTemplateCss(styleCss);
            if (htmlError || cssError) return res.status(400).json({ error: htmlError || cssError });
            if (!thumbnailUpload) return res.status(400).json({ error: 'Upload a PNG, JPG, WebP, or SVG thumbnail under 900 KB.' });

            const s3Prefix = S3_TEMPLATE_PREFIX ? `${S3_TEMPLATE_PREFIX}/${key}` : key;
            const indexS3Key = `${s3Prefix}/index.html`;
            const styleS3Key = `${s3Prefix}/style.css`;
            const thumbnailS3Key = `${s3Prefix}/thumbnail.${thumbnailUpload.extension}`;
            await Promise.all([
                putS3Object(indexS3Key, indexHtml, 'text/html; charset=utf-8'),
                putS3Object(styleS3Key, styleCss, 'text/css; charset=utf-8'),
                putS3Object(thumbnailS3Key, thumbnailUpload.buffer, thumbnailUpload.contentType),
            ]);

            const setting = await TemplateSetting.create({
                key,
                label,
                category,
                access,
                thumbnail: templateThumbnailPath(key, Date.now()),
                surfaceColorRole,
                surfaceColorLabel,
                source: 'custom',
                status: req.body.status === 'active' ? 'active' : 'draft',
                s3Prefix,
                indexS3Key,
                styleS3Key,
                thumbnailS3Key,
                createdBy: currentUserId(req),
                updatedBy: currentUserId(req),
            });

            clearS3TemplateCache(key);
            return res.status(201).json({ template: customTemplateSummary(setting, 0) });
        } catch (error) {
            return sendError(res, 500, 'Could not create template.', error);
        }
    });


    router.patch('/api/admin/templates/:key', requireSuperAdmin, adminTemplateJsonParser, async (req: Request, res: Response) => {
        try {
            const key = req.params.key;
            const template = CV_TEMPLATES.find((item) => item.key === key);
            const existingCustom = !template ? await TemplateSetting.findOne({ key, source: 'custom' }) : null;
            if (!template && !existingCustom) {
                return res.status(404).json({ error: 'Template not found.' });
            }

            const label = sanitizeProfileField(req.body.label, 80) || template?.label || existingCustom?.label || key;
            const category = typeof req.body.category === 'string' && TEMPLATE_CATEGORIES.includes(req.body.category as any)
                ? req.body.category
                : defaultTemplateCategory(key);
            const access = req.body.access === 'free' ? 'free' : 'paid';
            const surfaceColorRole = TEMPLATE_SURFACE_COLOR_ROLES.includes(req.body.surfaceColorRole)
                ? req.body.surfaceColorRole
                : (template?.surfaceColorRole || existingCustom?.surfaceColorRole || 'none');
            const surfaceColorLabel = sanitizeProfileField(req.body.surfaceColorLabel, 80) || (template && 'surfaceColorLabel' in template ? template.surfaceColorLabel : '') || existingCustom?.surfaceColorLabel || '';
            let thumbnail = sanitizeProfileField(req.body.thumbnail, 500) || template?.image || existingCustom?.thumbnail || templateThumbnailPath(key, Date.now());
            const update: any = {
                key,
                label,
                category,
                access,
                thumbnail,
                surfaceColorRole,
                surfaceColorLabel,
                source: template ? 'built_in' : 'custom',
                updatedBy: currentUserId(req),
            };

            if (!template) {
                const indexHtml = typeof req.body.indexHtml === 'string' ? sanitizeTemplateSource(req.body.indexHtml, MAX_TEMPLATE_HTML_LENGTH) : '';
                const styleCss = typeof req.body.styleCss === 'string' ? sanitizeTemplateSource(req.body.styleCss, MAX_TEMPLATE_CSS_LENGTH) : '';
                const thumbnailUpload = parseThumbnailUpload(req.body.thumbnailDataUrl);
                const s3Prefix = existingCustom?.s3Prefix || (S3_TEMPLATE_PREFIX ? `${S3_TEMPLATE_PREFIX}/${key}` : key);
                update.s3Prefix = s3Prefix;

                if (indexHtml) {
                    const htmlError = validateTemplateHtml(indexHtml);
                    if (htmlError) return res.status(400).json({ error: htmlError });
                    update.indexS3Key = `${s3Prefix}/index.html`;
                    await putS3Object(update.indexS3Key, indexHtml, 'text/html; charset=utf-8');
                }
                if (styleCss) {
                    const cssError = validateTemplateCss(styleCss);
                    if (cssError) return res.status(400).json({ error: cssError });
                    update.styleS3Key = `${s3Prefix}/style.css`;
                    await putS3Object(update.styleS3Key, styleCss, 'text/css; charset=utf-8');
                }
                if (thumbnailUpload) {
                    update.thumbnailS3Key = `${s3Prefix}/thumbnail.${thumbnailUpload.extension}`;
                    await putS3Object(update.thumbnailS3Key, thumbnailUpload.buffer, thumbnailUpload.contentType);
                    thumbnail = templateThumbnailPath(key, Date.now());
                    update.thumbnail = thumbnail;
                }
                update.status = TEMPLATE_STATUSES.includes(req.body.status) ? req.body.status : existingCustom?.status || 'draft';
            }

            const setting = await TemplateSetting.findOneAndUpdate(
                { key },
                update,
                { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
            );
            const usageCount = await CVDocument.countDocuments({ template: key });

            clearS3TemplateCache(key);
            return res.json({ template: template ? adminTemplateSummary(template, setting, usageCount) : customTemplateSummary(setting, usageCount) });
        } catch (error) {
            return sendError(res, 500, 'Could not update template.', error);
        }
    });


    router.post('/api/admin/templates/:key/publish', requireSuperAdmin, adminTemplateJsonParser, async (req: Request, res: Response) => {
        try {
            const key = validateCustomTemplateKey(req.params.key);
            const setting = key ? await TemplateSetting.findOne({ key, source: 'custom' }) : null;
            if (!setting) return res.status(404).json({ error: 'Template not found.' });
            const indexHtml = setting.indexS3Key ? await fetchS3Text(setting.indexS3Key) : null;
            const styleCss = setting.styleS3Key ? await fetchS3Text(setting.styleS3Key) : null;
            if (!indexHtml || !styleCss || !setting.thumbnailS3Key) {
                return res.status(400).json({ error: 'Template needs HTML, CSS, and thumbnail files before publishing.' });
            }
            setting.status = 'active';
            setting.updatedBy = currentUserId(req);
            await setting.save();
            clearS3TemplateCache(key);
            const usageCount = await CVDocument.countDocuments({ template: key });
            return res.json({ template: customTemplateSummary(setting, usageCount) });
        } catch (error) {
            return sendError(res, 500, 'Could not publish template.', error);
        }
    });


    router.post('/api/admin/templates/:key/archive', requireSuperAdmin, adminTemplateJsonParser, async (req: Request, res: Response) => {
        try {
            const key = validateCustomTemplateKey(req.params.key);
            const setting = key ? await TemplateSetting.findOne({ key, source: 'custom' }) : null;
            if (!setting) return res.status(404).json({ error: 'Template not found.' });
            setting.status = 'archived';
            setting.updatedBy = currentUserId(req);
            await setting.save();
            clearS3TemplateCache(key);
            const usageCount = await CVDocument.countDocuments({ template: key });
            return res.json({ template: customTemplateSummary(setting, usageCount) });
        } catch (error) {
            return sendError(res, 500, 'Could not archive template.', error);
        }
    });

}

