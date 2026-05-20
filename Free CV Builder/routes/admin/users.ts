import express, { Router, Request, Response, NextFunction } from 'express';
import { bindDeps } from '../_shared';
import type { BillingPlan } from '../../server-models/userPlan';
import type { TemplateName } from '../../src/templates';

type RouteDeps = Record<string, any>;

export function registerAdminUserRoutes(router: Router, deps: RouteDeps) {
    const { User, CVDocument, DownloadQuota, PaymentTransaction, BillingPlanSetting, Coupon, CheckoutSession, TemplateSetting, SupportTicket, CV_TEMPLATES, DEFAULT_TEMPLATE, TemplateName, templateRequiresPaidPlan, requireAuth, requireSuperAdmin, sendError, passport, adminTemplateJsonParser, cvImportJsonParser, pdfJsonParser, authLimiter, passwordResetLimiter, emailVerificationAttemptLimiter, emailVerificationLimiter, getRequestOrigin, isAllowedOrigin, clearS3TemplateCache, fetchS3Text, generateS3CVHTML, getS3ObjectStream, putS3Object, S3_TEMPLATE_BUCKET, S3_TEMPLATE_PREFIX, generateCVHTML, generatePdfDocument, sanitizeCvData, getDownloadQuota, incrementDownloadQuota, getActiveTemplateForKey, sanitizeTextForPrompt, sanitizeContextField, sanitizeProfileField, sanitizeDisplayName, normalizeEmail, isValidEmail, validatePasswordStrength, hashPassword, verifyPassword, hashToken, generateEmailVerificationOtp, isEmailVerified, publicUser, isMongoDuplicateKeyError, isMongoValidationError, passwordPolicyMessage, sendEmailVerificationWithRetry, sendNewAccountNotification, sendContactNotification, sendBillingSuccessNotifications, getFrontendOrigin, getApiOrigin, currentUserId, isValidDocumentId, adminTemplateSummary, customTemplateSummary, templateThumbnailPath, validateCustomTemplateKey, defaultTemplateCategory, sanitizeTemplateSource, validateTemplateHtml, validateTemplateCss, parseThumbnailUpload, TEMPLATE_CATEGORIES, TEMPLATE_SURFACE_COLOR_ROLES, TEMPLATE_STATUSES, MAX_TEMPLATE_HTML_LENGTH, MAX_TEMPLATE_CSS_LENGTH, ensureDefaultBillingPlans, billingPlanSummary, normalizeCouponCode,  isPaidBillingPlan, calculateBillingQuote, parsePayherePlan, verifyPayhereMd5Signature, markPaymentProcessed, createCheckoutHash, createCheckoutOrderId, getPayhereConfig, buildPayhereCheckoutPayload, createPlanExpiry, getEffectivePlan, isPaidPlan, documentSummary, buildInitialCvData, parsePdfText, generateGeminiText, Type, ALLOWED_MIME_TYPES, ALLOWED_SECTION_TYPES, buildCvCreationQuota, consumeCvCreationQuota, buildDownloadQuota, sendAppEmail, sendSystemEmail, sendNotificationEmail, isEmailServiceConfigured, normalizeEmailFrom, roleForEmail, syncUserRoleFromAllowlist, isSuperAdmin, mongoose, randomBytes, randomInt, createHash, timingSafeEqual, startOfUtcDay, formatUtcDay, parsePaymentAmountCents, escapeRegex, adminUserSummary, getPublicBillingPlans, planDisplayName, getPlanPrice, adminPaymentSummary, SUPPORT_TICKET_STATUSES, SUPPORT_TICKET_TYPES, SUPPORT_TICKET_PRIORITIES, sanitizeContactMessage, adminSupportTicketSummary, emailGreetingName, getCvCreationQuota, incrementCvCreationQuota, documentDetails, requireVerifiedEmail, resolveRequestedTemplate, titleFromCvData, requirePaidPlan, MAX_BASE64_LENGTH, quoteCheckout, getPayHereMerchantConfig, verifyPayHereMd5Signature, resolvePayHerePaymentContext, PAYHERE_PLAN_PRICES, payHereAmountToCents, generateTransactionId, getPayHereCheckoutUrl, buildPayHereCheckoutHash } = bindDeps(deps);

    router.get('/api/admin/users', requireSuperAdmin, async (req: Request, res: Response) => {
        try {
            const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
            const plan = typeof req.query.plan === 'string' ? req.query.plan.trim() : '';
            const role = typeof req.query.role === 'string' ? req.query.role.trim() : '';
            const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
            const limit = Math.min(50, Math.max(5, Number.parseInt(String(req.query.limit || '20'), 10) || 20));
            const filter: any = {};
    
            if (search) {
                const pattern = new RegExp(escapeRegex(search), 'i');
                filter.$or = [{ email: pattern }, { displayName: pattern }];
            }
            if (['free', 'payg', 'monthly'].includes(plan)) {
                filter.plan = plan;
            }
            if (['user', 'super_admin'].includes(role)) {
                filter.role = role;
            }
    
            const [users, total] = await Promise.all([
                User.find(filter)
                    .sort({ createdAt: -1 })
                    .skip((page - 1) * limit)
                    .limit(limit)
                    .select('email displayName role plan planExpiresAt emailVerified authProvider createdAt updatedAt'),
                User.countDocuments(filter),
            ]);
    
            const userIds = users.map((user) => user._id);
            const cvCounts = await CVDocument.aggregate([
                { $match: { userId: { $in: userIds } } },
                { $group: { _id: '$userId', count: { $sum: 1 } } },
            ]);
            const cvCountMap = new Map(cvCounts.map((item: any) => [item._id.toString(), item.count]));
    
            return res.json({
                users: users.map((user) => adminUserSummary(user, cvCountMap.get(user._id.toString()) || 0)),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.max(1, Math.ceil(total / limit)),
                },
            });
        } catch (error) {
            return sendError(res, 500, 'Could not load admin users.', error);
        }
    });


    router.get('/api/admin/users/:id', requireSuperAdmin, async (req: Request, res: Response) => {
        try {
            if (!isValidDocumentId(req.params.id)) {
                return res.status(400).json({ error: 'Invalid user id.' });
            }
    
            const user = await User.findById(req.params.id).select('email displayName role plan planStartedAt planExpiresAt paygCvSaveCredits emailVerified authProvider phone address createdAt updatedAt');
            if (!user) {
                return res.status(404).json({ error: 'User not found.' });
            }
    
            const [documents, cvCount] = await Promise.all([
                CVDocument.find({ userId: user._id })
                    .sort({ updatedAt: -1 })
                    .limit(10)
                    .select('title template status createdAt updatedAt'),
                CVDocument.countDocuments({ userId: user._id }),
            ]);
    
            return res.json({
                user: {
                    ...adminUserSummary(user, cvCount),
                    phone: user.phone,
                    address: user.address,
                    planStartedAt: user.planStartedAt,
                    paygCvSaveCredits: user.paygCvSaveCredits || 0,
                },
                documents: documents.map(documentSummary),
            });
        } catch (error) {
            return sendError(res, 500, 'Could not load admin user.', error);
        }
    });


    router.patch('/api/admin/users/:id/plan', requireSuperAdmin, async (req: Request, res: Response) => {
        try {
            if (!isValidDocumentId(req.params.id)) {
                return res.status(400).json({ error: 'Invalid user id.' });
            }
    
            const plan = req.body.plan as BillingPlan;
            if (plan !== 'free' && plan !== 'payg' && plan !== 'monthly') {
                return res.status(400).json({ error: 'Choose a valid plan.' });
            }
    
            const user = await User.findById(req.params.id);
            if (!user) {
                return res.status(404).json({ error: 'User not found.' });
            }
    
            user.plan = plan;
            if (plan === 'free') {
                user.planStartedAt = undefined;
                user.planExpiresAt = undefined;
            } else {
                user.planStartedAt = new Date();
                user.planExpiresAt = createPlanExpiry(plan);
                if (plan === 'payg') {
                    user.paygCvSaveCredits = Math.max(1, user.paygCvSaveCredits || 0);
                }
            }
    
            await user.save();
            const cvCount = await CVDocument.countDocuments({ userId: user._id });
            return res.json({ user: adminUserSummary(user, cvCount) });
        } catch (error) {
            return sendError(res, 500, 'Could not update user plan.', error);
        }
    });

}

