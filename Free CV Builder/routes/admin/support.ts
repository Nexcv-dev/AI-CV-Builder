import express, { Router, Request, Response, NextFunction } from 'express';
import { bindDeps } from '../_shared';
import type { BillingPlan } from '../../server-models/userPlan';
import type { TemplateName } from '../../src/templates';

type RouteDeps = Record<string, any>;

export function registerAdminSupportRoutes(router: Router, deps: RouteDeps) {
    const { User, CVDocument, DownloadQuota, PaymentTransaction, BillingPlanSetting, Coupon, CheckoutSession, TemplateSetting, SupportTicket, CV_TEMPLATES, DEFAULT_TEMPLATE, TemplateName, templateRequiresPaidPlan, requireAuth, requireSuperAdmin, sendError, passport, adminTemplateJsonParser, cvImportJsonParser, pdfJsonParser, authLimiter, passwordResetLimiter, emailVerificationAttemptLimiter, emailVerificationLimiter, getRequestOrigin, isAllowedOrigin, clearS3TemplateCache, fetchS3Text, generateS3CVHTML, getS3ObjectStream, putS3Object, S3_TEMPLATE_BUCKET, S3_TEMPLATE_PREFIX, generateCVHTML, generatePdfDocument, sanitizeCvData, getDownloadQuota, incrementDownloadQuota, getActiveTemplateForKey, sanitizeTextForPrompt, sanitizeContextField, sanitizeProfileField, sanitizeDisplayName, normalizeEmail, isValidEmail, validatePasswordStrength, hashPassword, verifyPassword, hashToken, generateEmailVerificationOtp, isEmailVerified, publicUser, isMongoDuplicateKeyError, isMongoValidationError, passwordPolicyMessage, sendEmailVerificationWithRetry, sendNewAccountNotification, sendContactNotification, sendBillingSuccessNotifications, getFrontendOrigin, getApiOrigin, currentUserId, isValidDocumentId, adminTemplateSummary, customTemplateSummary, templateThumbnailPath, validateCustomTemplateKey, defaultTemplateCategory, sanitizeTemplateSource, validateTemplateHtml, validateTemplateCss, parseThumbnailUpload, TEMPLATE_CATEGORIES, TEMPLATE_SURFACE_COLOR_ROLES, TEMPLATE_STATUSES, MAX_TEMPLATE_HTML_LENGTH, MAX_TEMPLATE_CSS_LENGTH, ensureDefaultBillingPlans, billingPlanSummary, normalizeCouponCode,  isPaidBillingPlan, calculateBillingQuote, parsePayherePlan, verifyPayhereMd5Signature, markPaymentProcessed, createCheckoutHash, createCheckoutOrderId, getPayhereConfig, buildPayhereCheckoutPayload, createPlanExpiry, getEffectivePlan, isPaidPlan, documentSummary, buildInitialCvData, parsePdfText, generateGeminiText, Type, ALLOWED_MIME_TYPES, ALLOWED_SECTION_TYPES, buildCvCreationQuota, consumeCvCreationQuota, buildDownloadQuota, sendAppEmail, sendSystemEmail, sendNotificationEmail, isEmailServiceConfigured, normalizeEmailFrom, roleForEmail, syncUserRoleFromAllowlist, isSuperAdmin, mongoose, randomBytes, randomInt, createHash, timingSafeEqual, startOfUtcDay, formatUtcDay, parsePaymentAmountCents, escapeRegex, adminUserSummary, getPublicBillingPlans, planDisplayName, getPlanPrice, adminPaymentSummary, SUPPORT_TICKET_STATUSES, SUPPORT_TICKET_TYPES, SUPPORT_TICKET_PRIORITIES, sanitizeContactMessage, adminSupportTicketSummary, emailGreetingName, getCvCreationQuota, incrementCvCreationQuota, documentDetails, requireVerifiedEmail, resolveRequestedTemplate, titleFromCvData, requirePaidPlan, MAX_BASE64_LENGTH, quoteCheckout, getPayHereMerchantConfig, verifyPayHereMd5Signature, resolvePayHerePaymentContext, PAYHERE_PLAN_PRICES, payHereAmountToCents, generateTransactionId, getPayHereCheckoutUrl, buildPayHereCheckoutHash } = bindDeps(deps);

    router.get('/api/admin/support/tickets', requireSuperAdmin, async (req: Request, res: Response) => {
        try {
            const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
            const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
            const type = typeof req.query.type === 'string' ? req.query.type.trim() : '';
            const priority = typeof req.query.priority === 'string' ? req.query.priority.trim() : '';
            const filter: any = {};
    
            if (SUPPORT_TICKET_STATUSES.includes(status as any)) filter.status = status;
            if (SUPPORT_TICKET_TYPES.includes(type as any)) filter.type = type;
            if (SUPPORT_TICKET_PRIORITIES.includes(priority as any)) filter.priority = priority;
            if (search) {
                const pattern = new RegExp(escapeRegex(search), 'i');
                filter.$or = [{ fullName: pattern }, { email: pattern }, { subject: pattern }, { message: pattern }];
            }
    
            const [tickets, statusCounts] = await Promise.all([
                SupportTicket.find(filter).sort({ createdAt: -1 }).limit(100).populate('userId', 'email displayName'),
                SupportTicket.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
            ]);
            const statusCountMap = new Map(statusCounts.map((item: any) => [item._id, item.count]));
    
            return res.json({
                tickets: tickets.map(adminSupportTicketSummary),
                summary: {
                    open: statusCountMap.get('open') || 0,
                    pending: statusCountMap.get('pending') || 0,
                    resolved: statusCountMap.get('resolved') || 0,
                    closed: statusCountMap.get('closed') || 0,
                },
            });
        } catch (error) {
            return sendError(res, 500, 'Could not load support tickets.', error);
        }
    });


    router.patch('/api/admin/support/tickets/:id', requireSuperAdmin, async (req: Request, res: Response) => {
        try {
            if (!isValidDocumentId(req.params.id)) {
                return res.status(400).json({ error: 'Invalid ticket id.' });
            }
    
            const update: any = {};
            if (SUPPORT_TICKET_STATUSES.includes(req.body.status)) update.status = req.body.status;
            if (SUPPORT_TICKET_PRIORITIES.includes(req.body.priority)) update.priority = req.body.priority;
            if (typeof req.body.adminNotes === 'string') update.adminNotes = sanitizeProfileField(req.body.adminNotes, 2000);
    
            const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).populate('userId', 'email displayName');
            if (!ticket) {
                return res.status(404).json({ error: 'Support ticket not found.' });
            }
    
            return res.json({ ticket: adminSupportTicketSummary(ticket) });
        } catch (error) {
            return sendError(res, 500, 'Could not update support ticket.', error);
        }
    });

}

