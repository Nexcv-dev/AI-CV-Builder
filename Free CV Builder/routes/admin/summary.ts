import express, { Router, Request, Response, NextFunction } from 'express';
import { bindDeps } from '../_shared';
import type { BillingPlan } from '../../server-models/userPlan';
import type { TemplateName } from '../../src/templates';

type RouteDeps = Record<string, any>;

export function registerAdminSummaryRoutes(router: Router, deps: RouteDeps) {
    const { User, CVDocument, DownloadQuota, PaymentTransaction, BillingPlanSetting, Coupon, CheckoutSession, TemplateSetting, SupportTicket, CV_TEMPLATES, DEFAULT_TEMPLATE, TemplateName, templateRequiresPaidPlan, requireAuth, requireSuperAdmin, sendError, passport, adminTemplateJsonParser, cvImportJsonParser, pdfJsonParser, authLimiter, passwordResetLimiter, emailVerificationAttemptLimiter, emailVerificationLimiter, getRequestOrigin, isAllowedOrigin, clearS3TemplateCache, fetchS3Text, generateS3CVHTML, getS3ObjectStream, putS3Object, S3_TEMPLATE_BUCKET, S3_TEMPLATE_PREFIX, generateCVHTML, generatePdfDocument, sanitizeCvData, getDownloadQuota, incrementDownloadQuota, getActiveTemplateForKey, sanitizeTextForPrompt, sanitizeContextField, sanitizeProfileField, sanitizeDisplayName, normalizeEmail, isValidEmail, validatePasswordStrength, hashPassword, verifyPassword, hashToken, generateEmailVerificationOtp, isEmailVerified, publicUser, isMongoDuplicateKeyError, isMongoValidationError, passwordPolicyMessage, sendEmailVerificationWithRetry, sendNewAccountNotification, sendContactNotification, sendBillingSuccessNotifications, getFrontendOrigin, getApiOrigin, currentUserId, isValidDocumentId, adminTemplateSummary, customTemplateSummary, templateThumbnailPath, validateCustomTemplateKey, defaultTemplateCategory, sanitizeTemplateSource, validateTemplateHtml, validateTemplateCss, parseThumbnailUpload, TEMPLATE_CATEGORIES, TEMPLATE_SURFACE_COLOR_ROLES, TEMPLATE_STATUSES, MAX_TEMPLATE_HTML_LENGTH, MAX_TEMPLATE_CSS_LENGTH, ensureDefaultBillingPlans, billingPlanSummary, normalizeCouponCode,  isPaidBillingPlan, calculateBillingQuote, parsePayherePlan, verifyPayhereMd5Signature, markPaymentProcessed, createCheckoutHash, createCheckoutOrderId, getPayhereConfig, buildPayhereCheckoutPayload, createPlanExpiry, getEffectivePlan, isPaidPlan, documentSummary, buildInitialCvData, parsePdfText, generateGeminiText, Type, ALLOWED_MIME_TYPES, ALLOWED_SECTION_TYPES, buildCvCreationQuota, consumeCvCreationQuota, buildDownloadQuota, sendAppEmail, sendSystemEmail, sendNotificationEmail, isEmailServiceConfigured, normalizeEmailFrom, roleForEmail, syncUserRoleFromAllowlist, isSuperAdmin, mongoose, randomBytes, randomInt, createHash, timingSafeEqual, startOfUtcDay, formatUtcDay, parsePaymentAmountCents, escapeRegex, adminUserSummary, getPublicBillingPlans, planDisplayName, getPlanPrice, adminPaymentSummary, SUPPORT_TICKET_STATUSES, SUPPORT_TICKET_TYPES, SUPPORT_TICKET_PRIORITIES, sanitizeContactMessage, adminSupportTicketSummary, emailGreetingName, getCvCreationQuota, incrementCvCreationQuota, documentDetails, requireVerifiedEmail, resolveRequestedTemplate, titleFromCvData, requirePaidPlan, MAX_BASE64_LENGTH, quoteCheckout, getPayHereMerchantConfig, verifyPayHereMd5Signature, resolvePayHerePaymentContext, PAYHERE_PLAN_PRICES, payHereAmountToCents, generateTransactionId, getPayHereCheckoutUrl, buildPayHereCheckoutHash } = bindDeps(deps);

    router.get('/api/admin/summary', requireSuperAdmin, async (_req: Request, res: Response) => {
        try {
            const now = new Date();
            const todayStart = startOfUtcDay(now);
            const sevenDaysAgo = new Date(todayStart);
            sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);
    
            const [
                totalUsers,
                activeUsersToday,
                premiumSubscribers,
                totalCvsCreated,
                recentUsers,
                templateUsage,
                userGrowth,
                cvDownloads,
                payments,
                supportStatusCounts,
            ] = await Promise.all([
                User.countDocuments(),
                User.countDocuments({ updatedAt: { $gte: todayStart } }),
                User.countDocuments({ plan: { $in: ['payg', 'monthly'] }, planExpiresAt: { $gt: now } }),
                CVDocument.countDocuments(),
                User.find().sort({ createdAt: -1 }).limit(6).select('email displayName role plan createdAt'),
                CVDocument.aggregate([
                    { $group: { _id: '$template', count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                    { $limit: 6 },
                ]),
                User.aggregate([
                    { $match: { createdAt: { $gte: sevenDaysAgo } } },
                    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } },
                ]),
                DownloadQuota.aggregate([
                    { $match: { updatedAt: { $gte: sevenDaysAgo } } },
                    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } }, count: { $sum: '$count' } } },
                    { $sort: { _id: 1 } },
                ]),
                PaymentTransaction.find({ processed: true }).sort({ createdAt: -1 }).limit(200).select('amount currency plan createdAt'),
                SupportTicket.aggregate([
                    { $group: { _id: '$status', count: { $sum: 1 } } },
                ]),
            ]);
    
            const revenueCents = payments.reduce((sum, payment) => sum + parsePaymentAmountCents(payment.amount), 0);
            const revenueByDay = new Map<string, number>();
            payments.forEach((payment) => {
                if (!payment.createdAt || payment.createdAt < sevenDaysAgo) return;
                const day = formatUtcDay(payment.createdAt);
                revenueByDay.set(day, (revenueByDay.get(day) || 0) + parsePaymentAmountCents(payment.amount));
            });
    
            const growthByDay = new Map(userGrowth.map((item: any) => [item._id, item.count]));
            const downloadsByDay = new Map(cvDownloads.map((item: any) => [item._id, item.count]));
            const supportCounts = new Map(supportStatusCounts.map((item: any) => [item._id, item.count]));
            const dailySeries = Array.from({ length: 7 }, (_, index) => {
                const date = new Date(sevenDaysAgo);
                date.setUTCDate(sevenDaysAgo.getUTCDate() + index);
                const day = formatUtcDay(date);
                return {
                    day,
                    users: growthByDay.get(day) || 0,
                    revenue: revenueByDay.get(day) || 0,
                    downloads: downloadsByDay.get(day) || 0,
                };
            });
    
            return res.json({
                widgets: {
                    totalUsers,
                    activeUsersToday,
                    premiumSubscribers,
                    totalCvsCreated,
                    revenue: {
                        cents: revenueCents,
                        currency: 'LKR',
                    },
                    supportTickets: {
                        open: supportCounts.get('open') || 0,
                        pending: supportCounts.get('pending') || 0,
                        resolved: supportCounts.get('resolved') || 0,
                        closed: supportCounts.get('closed') || 0,
                    },
                },
                recentRegistrations: recentUsers.map((user: any) => ({
                    id: user._id.toString(),
                    email: user.email,
                    displayName: user.displayName,
                    role: user.role,
                    plan: getEffectivePlan(user),
                    createdAt: user.createdAt,
                })),
                templateUsage: templateUsage.map((item: any) => ({
                    template: item._id || 'unknown',
                    count: item.count,
                })),
                charts: {
                    userGrowth: dailySeries.map(({ day, users }) => ({ day, count: users })),
                    subscriptionRevenue: dailySeries.map(({ day, revenue }) => ({ day, cents: revenue })),
                    cvDownloadsPerDay: dailySeries.map(({ day, downloads }) => ({ day, count: downloads })),
                    templateUsage: templateUsage.map((item: any) => ({ template: item._id || 'unknown', count: item.count })),
                },
                modules: [
                    { key: 'users', label: 'User Management', status: 'planned' },
                    { key: 'templates', label: 'Template Management', status: 'planned' },
                    { key: 'billing', label: 'Subscription & Payments', status: 'planned' },
                    { key: 'cms', label: 'Content Management', status: 'planned' },
                    { key: 'notifications', label: 'Notifications', status: 'planned' },
                    { key: 'support', label: 'Support Tickets', status: 'planned' },
                    { key: 'settings', label: 'Settings & Roles', status: 'planned' },
                ],
            });
        } catch (error) {
            return sendError(res, 500, 'Could not load admin summary.', error);
        }
    });

}

