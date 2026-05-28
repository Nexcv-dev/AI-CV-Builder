import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'node:dns';
import { readFileSync } from 'fs';
import * as dotenv from 'dotenv';
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import mongoose from 'mongoose';
import connectDB from './server-models/db';
import User from './server-models/User';
import CVDocument from './server-models/CVDocument';
import DownloadQuota from './server-models/DownloadQuotaModel';
import PaymentTransaction from './server-models/PaymentTransaction';
import BillingPlanSetting from './server-models/BillingPlanSetting';
import Coupon from './server-models/Coupon';
import CheckoutSession from './server-models/CheckoutSession';
import TemplateSetting from './server-models/TemplateSetting';
import SupportTicket from './server-models/SupportTicket';
import AppSetting, { getAppSettings } from './server-models/AppSetting';
import AdminAuditLog, { adminAuditLogSummary, recordAdminAuditLog } from './server-models/AdminAuditLog';
import { configureSecurityMiddleware, getRequestOrigin, isAllowedOrigin, integrityCheck } from './middlewares/security';
import { assertSessionSecret, configureSessionMiddleware } from './middlewares/session';
import { configurePassportAuth, passport } from './middlewares/passportAuth';
import { configureRequestTimeout } from './middlewares/requestTimeout';
import {
    authLimiter,
    configureRateLimiters,
    emailVerificationAttemptLimiter,
    emailVerificationLimiter,
    EMAIL_VERIFICATION_ATTEMPT_LIMIT,
    EMAIL_VERIFICATION_ATTEMPT_WINDOW_MS,
    EMAIL_VERIFICATION_RESEND_LIMIT,
    EMAIL_VERIFICATION_RESEND_WINDOW_MS,
    getAuthenticatedRateLimitKey,
    passwordResetLimiter,
} from './middlewares/rateLimiters';
import {
    buildPasswordResetTransportOptions,
    getAppEmailFrom,
    isEmailServiceConfigured,
    normalizeEmailFrom,
    sendAppEmail,
    sendNotificationEmail,
    sendSystemEmail,
} from './services/emailService';
import {
    clearS3TemplateCache,
    fetchS3Text,
    generateS3CVHTML,
    getS3ObjectStream,
    putS3Object,
    renderCvTemplateString,
    S3_TEMPLATE_BUCKET,
    S3_TEMPLATE_PREFIX,
} from './services/s3Service';
import { generateCVHTML, generatePdfDocument, sanitizeCvData } from './services/pdfService';
import { CV_TEMPLATES, DEFAULT_TEMPLATE, templateRequiresPaidPlan } from './src/templates';
import { isSuperAdmin, roleForEmail, syncUserRoleFromAllowlist } from './server-models/userRole';
import { hasAdminPermission, isAdminRole, isUserRole, type AdminPermission } from './src/adminAccess';
import { mergeEmailTemplates, renderEmailTemplate } from './src/emailTemplateDefaults';
import { buildCvCreationQuota } from './server-models/cvQuota';
import { buildDownloadQuota, getNextUtcDayResetAt, getUtcDayKey } from './server-models/downloadQuotaUtils';
import { createPlanExpiry, getEffectivePlan, isPaidPlan } from './server-models/userPlan';
import type { BillingPlan } from './server-models/userPlan';
import { isAdminIpAllowed, requireAdminAllowedIp, requireAdminPageAllowedIp } from './server-utils/adminIpAllowlist';
import { logError, logEvent } from './server-utils/logger';
import {
    adminTemplateSummary,
    customTemplateSummary,
    defaultTemplateCategory,
    getActiveTemplateForKey,
    MAX_TEMPLATE_CSS_LENGTH,
    MAX_TEMPLATE_HTML_LENGTH,
    parseThumbnailUpload,
    resolveRequestedTemplate,
    sanitizeTemplateSource,
    TEMPLATE_CATEGORIES,
    TEMPLATE_STATUSES,
    TEMPLATE_SURFACE_COLOR_ROLES,
    templateThumbnailPath,
    validateCustomTemplateKey,
    validateTemplateCss,
    validateTemplateHtml,
} from './server-utils/templateAdmin';
import {
    buildPayHereCheckoutHash,
    buildPayHereMd5Signature,
    generateTransactionId,
    getPayHereCheckoutUrl,
    getPayHereMerchantConfig,
    getPlanPrice,
    getPublicBillingPlans,
    isPaidBillingPlan,
    normalizeCouponCode,
    PAYHERE_PLAN_PRICES,
    payHereAmountToCents,
    planDisplayName,
    quoteCheckout,
    resolvePayHerePaymentContext,
    verifyPayHereMd5Signature,
} from './server-utils/payHere';
import {
    emailGreetingName,
    generateEmailVerificationOtp,
    hashPassword,
    hashToken,
    isEmailVerified,
    isValidEmail,
    normalizeEmail,
    passwordPolicyMessage,
    publicUser,
    sanitizeDisplayName,
    sanitizeProfileField,
    sendBillingAlertNotification,
    sendBillingSuccessNotifications,
    sendContactNotification,
    sendEmailVerificationWithRetry,
    sendNewAccountNotification,
    validatePasswordStrength,
    verifyPassword,
} from './server-utils/userAuth';
import { registerAdminRoutes } from './routes/admin';
import { registerAuthRoutes } from './routes/auth';
import { registerCvRoutes } from './routes/cv';
import { registerPaymentRoutes } from './routes/payment';
import { registerPublicRoutes } from './routes/public';
import { initSentry, setupSentryExpressErrorHandler } from './server-utils/sentry';
import { getOrSetCachedValue, parseCacheTtlMs } from './server-utils/ttlCache';
import { withCircuitBreaker } from './server-utils/circuitBreaker';
import {
    buildAssetUrl,
    buildCanonicalUrl,
    buildJsonLd,
    DEFAULT_SITE_URL,
    getSeoRoute,
    isPublicSeoPath,
    normalizeSiteUrl,
    PUBLIC_SEO_ROUTES,
    shouldNoIndexPath,
    SITE_NAME,
} from './src/seo';

export {
    integrityCheck,
    EMAIL_VERIFICATION_ATTEMPT_LIMIT,
    EMAIL_VERIFICATION_ATTEMPT_WINDOW_MS,
    EMAIL_VERIFICATION_RESEND_LIMIT,
    EMAIL_VERIFICATION_RESEND_WINDOW_MS,
    getAuthenticatedRateLimitKey,
    buildPasswordResetTransportOptions,
    generateCVHTML,
    renderCvTemplateString,
    PAYHERE_PLAN_PRICES,
    buildPayHereCheckoutHash,
    buildPayHereMd5Signature,
    payHereAmountToCents,
    resolvePayHerePaymentContext,
    verifyPayHereMd5Signature,
};

dns.setDefaultResultOrder('ipv4first');

// Load environment variables from .env
dotenv.config();
initSentry();

// Connect to MongoDB
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
if (mongoUri) {
    connectDB();
} else {
    logEvent('warn', 'mongodb.config_missing', { message: 'MongoDB URI not found. MongoDB connection skipped.' });
}

const app = express();
const PORT = process.env.PORT || 3002;
app.set('trust proxy', 1);

assertSessionSecret();
configureSessionMiddleware(app);
configurePassportAuth(app);
configureSecurityMiddleware(app);
configureRateLimiters(app);
configureRequestTimeout(app);

const defaultJsonParser = express.json({ limit: '1mb' });
const cvImportJsonParser = express.json({ limit: '16mb' });
const pdfJsonParser = express.json({ limit: '5mb' });
const adminTemplateJsonParser = express.json({ limit: '6mb' });

// Default JSON limit for most endpoints. Larger payloads are allowed only on specific routes.
app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/api/parse-cv' || req.path === '/api/generate-pdf' || req.path.startsWith('/api/admin/templates')) {
        return next();
    }
    return defaultJsonParser(req, res, next);
});

app.use(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.path.startsWith('/api')) return next();
    try {
        (req as any).appSettings = await getOrSetCachedValue(
            'app-settings',
            parseCacheTtlMs(process.env.APP_SETTINGS_CACHE_TTL_MS, 30_000),
            getAppSettings
        );
    } catch {
        (req as any).appSettings = null;
    }
    next();
});

const isMaintenanceBypassRoute = (req: Request) => {
    if (req.path === '/api/health' || req.path === '/api/public/app-settings') return true;
    if (req.path.startsWith('/api/admin')) return true;
    if (req.path === '/api/auth/current-user' || req.path === '/api/auth/login' || req.path === '/api/auth/logout') return true;
    if (req.path === '/api/auth/forgot-password' || req.path === '/api/auth/validate-reset-token' || req.path === '/api/auth/reset-password') return true;
    if (req.path === '/api/auth/google' || req.path === '/api/auth/google/callback') return true;
    return false;
};

app.use((req: Request, res: Response, next: NextFunction) => {
    const settings = (req as any).appSettings;
    if (!req.path.startsWith('/api') || !settings?.maintenanceMode) return next();
    if (req.user && isAdminRole((req.user as any).role)) return next();
    if (isMaintenanceBypassRoute(req)) return next();

    return res.status(503).json({
        error: 'NexCV is temporarily down for maintenance.',
        maintenanceMode: true,
        supportEmail: settings.supportEmail || 'support@nexcv.com',
    });
});

// Helper to provide private error responses
export const sendError = (res: express.Response, status: number, clientMessage: string, internalError?: any) => {
    const errorId = logError('http.request_failed', internalError, { status, clientMessage });

    return res.status(status).json({
        error: clientMessage,
        errorId: process.env.NODE_ENV !== 'production' ? errorId : undefined
    });
};

const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif',
];

const ALLOWED_SECTION_TYPES = ['experience', 'education', 'project'];
const GEMINI_MODEL = 'gemini-flash-latest';
const Type = {
    OBJECT: 'OBJECT',
    ARRAY: 'ARRAY',
    STRING: 'STRING',
    INTEGER: 'INTEGER',
} as const;

async function generateGeminiText(contents: any[], config?: Record<string, any>): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('Gemini API key is not configured.');
    }
    const timeoutMs = Number.parseInt(process.env.GEMINI_REQUEST_TIMEOUT_MS || '35000', 10) || 35000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const normalizedContents = contents.every(item => item && typeof item === 'object' && Array.isArray(item.parts))
        ? contents
        : [{
            parts: contents.map(item => {
                if (typeof item === 'string') return { text: item };
                if (item?.inlineData) return { inlineData: item.inlineData };
                return item;
            }),
        }];

    let response;
    try {
        response = await withCircuitBreaker(
            { name: 'gemini', failureThreshold: Number.parseInt(process.env.GEMINI_CIRCUIT_FAILURE_THRESHOLD || '5', 10) || 5 },
            () => fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: normalizedContents,
                    ...(config ? { generationConfig: config } : {}),
                }),
                signal: controller.signal,
            }
        ));
    } finally {
        clearTimeout(timeout);
    }

    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`Gemini request failed with ${response.status}: ${detail.slice(0, 300)}`);
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts
        ?.map((part: any) => typeof part.text === 'string' ? part.text : '')
        .join('')
        .trim() || '';
}

const MAX_TEXT_LENGTH = 10000; // Maximum characters for text inputs
const MAX_BASE64_LENGTH = 15 * 1024 * 1024; // ~15MB for base64 data

export function sanitizeTextForPrompt(text: string): string {
    // Strip control characters and limit length
    return text
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .slice(0, MAX_TEXT_LENGTH)
        .trim();
}

export function sanitizeContextField(value: any): string {
    if (typeof value !== 'string') return 'Unknown';
    return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, 200).trim() || 'Unknown';
}

const isMongoDuplicateKeyError = (error: any) => (
    error?.code === 11000 || error?.name === 'MongoServerError' && error?.code === 11000
);

const isMongoValidationError = (error: any) => error?.name === 'ValidationError';

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    next();
};

const requireVerifiedEmail = (req: Request, res: Response) => {
    if ((req as any).appSettings?.emailVerificationRequired === false) {
        return true;
    }

    if (!isEmailVerified(req.user)) {
        res.status(403).json({ error: 'Verify your email to save CVs.' });
        return false;
    }

    return true;
};

const currentUserId = (req: Request) => (req.user as any)._id || (req.user as any).id;

const requirePaidPlan = (req: Request, res: Response) => {
    if (!isPaidPlan(req.user as any)) {
        res.status(403).json({
            error: 'AI features are available on paid plans.',
            upgradeRequired: true,
        });
        return false;
    }

    return true;
};

const getCvCreationQuota = async (user: any) => {
    const used = await CVDocument.countDocuments({ userId: user._id || user.id });
    const quota = buildCvCreationQuota(user, used);
    const settings = await getAppSettings().catch(() => null);
    if (quota.plan !== 'free' || !settings) return quota;
    const limit = Math.max(0, Math.floor(settings.freeCvCreationLimit));
    return {
        ...quota,
        limit,
        remaining: Math.max(limit - used, 0),
        reached: limit - used <= 0,
    };
};

const incrementCvCreationQuota = async (user: any) => {
    return getCvCreationQuota(user);
};

const getDownloadQuota = async (user: any) => {
    const plan = getEffectivePlan(user);
    const usesDailyDownloadQuota = plan === 'payg' || plan === 'monthly';
    const day = usesDailyDownloadQuota ? getUtcDayKey() : 'free-lifetime';
    const record = await DownloadQuota.findOne({ userId: user._id || user.id, day });
    const used = record?.count || 0;
    const quota = {
        ...buildDownloadQuota(user, used),
        ...(usesDailyDownloadQuota ? { resetAt: getNextUtcDayResetAt() } : {}),
    };
    const settings = await getAppSettings().catch(() => null);
    if (quota.plan !== 'free' || !settings) return quota;
    const limit = Math.max(0, Math.floor(settings.freePdfDownloadLimit));
    return {
        ...quota,
        limit,
        remaining: Math.max(limit - used, 0),
        reached: limit - used <= 0,
    };
};

const incrementDownloadQuota = async (user: any) => {
    const plan = getEffectivePlan(user);
    const day = plan === 'payg' || plan === 'monthly' ? getUtcDayKey() : 'free-lifetime';
    const record = await DownloadQuota.findOneAndUpdate(
        { userId: user._id || user.id, day },
        { $inc: { count: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return getDownloadQuota(user);
};

const isValidDocumentId = (id: unknown) => (
    typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)
);

const sanitizeContactMessage = (value: unknown) => (
    typeof value === 'string'
        ? value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, 3000)
        : ''
);

const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!isSuperAdmin(req.user as any)) {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    next();
};

export const requireAdminPermission = (permission: AdminPermission) => (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!hasAdminPermission(req.user as any, permission)) {
        return res.status(403).json({ error: 'Admin permission required.' });
    }

    next();
};

const getApiOrigin = (req: Request) => {
    const configured = process.env.API_PUBLIC_URL || process.env.BACKEND_PUBLIC_URL;
    if (configured?.trim()) return configured.trim().replace(/\/+$/, '');
    return `${req.protocol}://${req.get('host')}`;
};

const getFrontendOrigin = (req: Request) => {
    const requestOrigin = getRequestOrigin(req);
    if (requestOrigin && isAllowedOrigin(requestOrigin)) return requestOrigin;
    const configured = process.env.FRONTEND_URL || process.env.ALLOWED_ORIGIN;
    if (configured?.trim()) return configured.trim().replace(/\/+$/, '');
    return getApiOrigin(req);
};

const documentSummary = (document: any) => ({
    id: document._id.toString(),
    title: document.title,
    template: document.template,
    status: document.status || 'completed',
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
});

const documentDetails = (document: any) => ({
    ...documentSummary(document),
    cvData: document.cvData,
});

const titleFromCvData = (cvData: any) => {
    const fullName = cvData?.personalInfo?.fullName?.trim?.();
    return fullName ? `${fullName} CV` : 'Untitled CV';
};

const startOfUtcDay = (date = new Date()) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const formatUtcDay = (date: Date) => date.toISOString().slice(0, 10);

const parsePaymentAmountCents = (amount: unknown) => {
    if (typeof amount !== 'string') return 0;
    return payHereAmountToCents(amount) || 0;
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const adminUserSummary = (user: any, cvCount = 0) => ({
    id: user._id?.toString?.() || user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role || 'user',
    plan: getEffectivePlan(user),
    rawPlan: user.plan || 'free',
    planExpiresAt: user.planExpiresAt,
    emailVerified: isEmailVerified(user),
    authProvider: user.authProvider,
    cvCount,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});

const adminPaymentSummary = (payment: any) => {
    const user = payment.userId && typeof payment.userId === 'object' ? payment.userId : null;
    return {
        id: payment._id?.toString?.() || payment.id,
        provider: payment.provider,
        paymentId: payment.paymentId,
        orderId: payment.orderId,
        user: user ? {
            id: user._id?.toString?.() || user.id,
            email: user.email,
            displayName: user.displayName,
        } : null,
        plan: payment.plan || null,
        amount: payment.amount || '0.00',
        amountCents: parsePaymentAmountCents(payment.amount),
        baseAmountCents: payment.baseAmountCents || 0,
        discountCents: payment.discountCents || 0,
        finalAmountCents: payment.finalAmountCents || parsePaymentAmountCents(payment.amount),
        couponCode: payment.couponCode || '',
        currency: payment.currency || 'LKR',
        statusCode: payment.statusCode,
        processed: Boolean(payment.processed),
        processingStartedAt: payment.processingStartedAt,
        processedAt: payment.processedAt,
        billingReviewStatus: payment.billingReviewStatus || 'open',
        reviewedAt: payment.reviewedAt,
        reviewNote: payment.reviewNote || '',
        rawPayload: payment.rawPayload || {},
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
    };
};

const SUPPORT_TICKET_TYPES = ['complaint', 'bug', 'feature_request', 'payment_issue', 'general'] as const;
const SUPPORT_TICKET_STATUSES = ['open', 'pending', 'resolved', 'closed'] as const;
const SUPPORT_TICKET_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

const adminSupportTicketSummary = (ticket: any) => ({
    id: ticket._id?.toString?.() || ticket.id,
    user: ticket.userId && typeof ticket.userId === 'object' ? {
        id: ticket.userId._id?.toString?.() || ticket.userId.id,
        email: ticket.userId.email,
        displayName: ticket.userId.displayName,
    } : null,
    fullName: ticket.fullName,
    email: ticket.email,
    type: ticket.type,
    subject: ticket.subject,
    message: ticket.message,
    status: ticket.status,
    priority: ticket.priority,
    adminNotes: ticket.adminNotes || '',
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
});

// â”€â”€â”€ API Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const routeDeps = {
    User, CVDocument, DownloadQuota, PaymentTransaction, BillingPlanSetting, Coupon, CheckoutSession, TemplateSetting, SupportTicket, AppSetting, AdminAuditLog,
    CV_TEMPLATES, DEFAULT_TEMPLATE, templateRequiresPaidPlan,
    requireAuth, requireSuperAdmin, requireAdminPermission, sendError, passport,
    adminTemplateJsonParser, cvImportJsonParser, pdfJsonParser,
    authLimiter, passwordResetLimiter, emailVerificationAttemptLimiter, emailVerificationLimiter,
    getRequestOrigin, isAllowedOrigin,
    clearS3TemplateCache, fetchS3Text, generateS3CVHTML, getS3ObjectStream, putS3Object, renderCvTemplateString, S3_TEMPLATE_BUCKET, S3_TEMPLATE_PREFIX,
    generateCVHTML, generatePdfDocument, sanitizeCvData,
    getDownloadQuota, incrementDownloadQuota, getActiveTemplateForKey,
    sanitizeTextForPrompt, sanitizeContextField, sanitizeProfileField, sanitizeDisplayName, normalizeEmail, isValidEmail,
    validatePasswordStrength, hashPassword, verifyPassword, hashToken, generateEmailVerificationOtp, isEmailVerified, publicUser,
    isMongoDuplicateKeyError, isMongoValidationError, passwordPolicyMessage,
    sendEmailVerificationWithRetry, sendNewAccountNotification, sendContactNotification, sendBillingSuccessNotifications, sendBillingAlertNotification,
    getFrontendOrigin, getApiOrigin, currentUserId, isValidDocumentId,
    adminTemplateSummary, customTemplateSummary, templateThumbnailPath, validateCustomTemplateKey, defaultTemplateCategory,
    sanitizeTemplateSource, validateTemplateHtml, validateTemplateCss, parseThumbnailUpload,
    TEMPLATE_CATEGORIES, TEMPLATE_SURFACE_COLOR_ROLES, TEMPLATE_STATUSES, MAX_TEMPLATE_HTML_LENGTH, MAX_TEMPLATE_CSS_LENGTH,
    normalizeCouponCode, isPaidBillingPlan, getPublicBillingPlans, quoteCheckout, getPlanPrice,
    PAYHERE_PLAN_PRICES, payHereAmountToCents, getPayHereMerchantConfig, getPayHereCheckoutUrl,
    buildPayHereCheckoutHash, verifyPayHereMd5Signature, resolvePayHerePaymentContext,
    generateTransactionId, planDisplayName, createPlanExpiry, getEffectivePlan, isPaidPlan,
    documentSummary, documentDetails, titleFromCvData, resolveRequestedTemplate, generateGeminiText, Type, ALLOWED_MIME_TYPES, ALLOWED_SECTION_TYPES, MAX_BASE64_LENGTH,
    getCvCreationQuota, incrementCvCreationQuota, buildCvCreationQuota, buildDownloadQuota,
    requireVerifiedEmail, requirePaidPlan,
    startOfUtcDay, formatUtcDay, parsePaymentAmountCents, escapeRegex, adminUserSummary, adminPaymentSummary,
    SUPPORT_TICKET_TYPES, SUPPORT_TICKET_STATUSES, SUPPORT_TICKET_PRIORITIES, sanitizeContactMessage, adminSupportTicketSummary,
    recordAdminAuditLog, adminAuditLogSummary,
    logEvent, logError,
    emailGreetingName, mergeEmailTemplates, renderEmailTemplate,
    sendAppEmail, sendSystemEmail, sendNotificationEmail, isEmailServiceConfigured, normalizeEmailFrom, getAppEmailFrom,
    roleForEmail, syncUserRoleFromAllowlist, isSuperAdmin, isUserRole, isAdminIpAllowed,
    mongoose, randomBytes, randomInt, createHash, timingSafeEqual,
};

const publicRouter = express.Router();
registerPublicRoutes(publicRouter, routeDeps);
app.use(publicRouter);

const adminRouter = express.Router();
registerAdminRoutes(adminRouter, routeDeps);
app.use('/api/admin', requireAdminAllowedIp);
app.use(adminRouter);

const paymentRouter = express.Router();
registerPaymentRoutes(paymentRouter, routeDeps);
app.use(paymentRouter);

const authRouter = express.Router();
registerAuthRoutes(authRouter, routeDeps);
app.use(authRouter);

const cvRouter = express.Router();
registerCvRoutes(cvRouter, routeDeps);
app.use(cvRouter);

setupSentryExpressErrorHandler(app);

// --- Serve frontend static files in production ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, 'dist');
const siteUrl = normalizeSiteUrl(process.env.FRONTEND_URL || process.env.ALLOWED_ORIGIN || DEFAULT_SITE_URL);

function buildSitemapXml() {
    const now = new Date().toISOString();
    const urls = PUBLIC_SEO_ROUTES.map((route) => {
        const loc = escapeXml(buildCanonicalUrl(route.path, siteUrl));
        const priority = route.path === '/' ? '1.0' : route.path === '/templates' || route.path === '/tips' ? '0.8' : '0.6';
        return [
            '  <url>',
            `    <loc>${loc}</loc>`,
            `    <lastmod>${now}</lastmod>`,
            '    <changefreq>weekly</changefreq>',
            `    <priority>${priority}</priority>`,
            '  </url>',
        ].join('\n');
    }).join('\n');

    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        urls,
        '</urlset>',
        '',
    ].join('\n');
}

function buildRobotsTxt() {
    return [
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin',
        'Disallow: /builder',
        'Disallow: /checkout',
        'Disallow: /dashboard',
        'Disallow: /forgot-password',
        'Disallow: /my-cvs',
        'Disallow: /print',
        'Disallow: /profile',
        'Disallow: /reset-password',
        'Disallow: /settings',
        'Disallow: /verify-email',
        `Sitemap: ${siteUrl}/sitemap.xml`,
        '',
    ].join('\n');
}

function renderSeoIndexHtml(req: Request) {
    const indexPath = path.join(distPath, 'index.html');
    const html = readFileSync(indexPath, 'utf-8');
    const route = getSeoRoute(req.path);
    const noIndex = shouldNoIndexPath(req.path) || !isPublicSeoPath(req.path);
    const canonicalPath = isPublicSeoPath(req.path) ? route.path : '/';
    const canonicalUrl = buildCanonicalUrl(canonicalPath, siteUrl);
    const imageUrl = buildAssetUrl(route.image, siteUrl);
    const jsonLd = JSON.stringify(buildJsonLd(route, siteUrl));
    const jsonLdHash = createHash('sha256').update(jsonLd).digest('base64');
    const meta = [
        `<meta name="description" content="${escapeHtml(route.description)}">`,
        `<meta name="keywords" content="${escapeHtml(route.keywords.join(', '))}">`,
        `<meta name="robots" content="${noIndex ? 'noindex, nofollow' : 'index, follow'}">`,
        `<link rel="canonical" href="${escapeHtml(canonicalUrl)}">`,
        `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}">`,
        '<meta property="og:type" content="website">',
        `<meta property="og:title" content="${escapeHtml(route.title)}">`,
        `<meta property="og:description" content="${escapeHtml(route.description)}">`,
        `<meta property="og:url" content="${escapeHtml(canonicalUrl)}">`,
        `<meta property="og:image" content="${escapeHtml(imageUrl)}">`,
        '<meta name="twitter:card" content="summary_large_image">',
        `<meta name="twitter:title" content="${escapeHtml(route.title)}">`,
        `<meta name="twitter:description" content="${escapeHtml(route.description)}">`,
        `<meta name="twitter:image" content="${escapeHtml(imageUrl)}">`,
        `<script type="application/ld+json">${escapeScriptJson(jsonLd)}</script>`,
    ].join('\n  ');

    return html
        .replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(route.title)}</title>`)
        .replace(/(script-src[^;"]*)/, `$1 'sha256-${jsonLdHash}'`)
        .replace('</head>', `  ${meta}\n</head>`);
}

function escapeHtml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function escapeXml(value: string) {
    return escapeHtml(value).replace(/'/g, '&apos;');
}

function escapeScriptJson(value: string) {
    return value.replace(/</g, '\\u003c');
}

app.get('/robots.txt', (_req: Request, res: Response) => {
    res.type('text/plain').setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buildRobotsTxt());
});

app.get('/sitemap.xml', (_req: Request, res: Response) => {
    res.type('application/xml').setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buildSitemapXml());
});

app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            return;
        }
        if (/\.(png|jpe?g|webp|svg|ico|woff2?)$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
        }
    },
}));

app.use('/admin', requireAdminPageAllowedIp);

app.get('/assets/*', (_req: Request, res: Response) => {
    res.status(404).type('text/plain').send('Asset not found');
});

// Catch-all: serve index.html for any non-API route (React Router support)
app.get('*', (req: Request, res: Response) => {
    try {
        res.type('html').send(renderSeoIndexHtml(req));
    } catch (error) {
        logError('server.seo_index_render_failed', error, { path: req.path });
        res.sendFile(path.join(distPath, 'index.html'));
    }
});

if (process.env.NODE_ENV !== 'test') {
    const server = app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
    });
    server.requestTimeout = Number.parseInt(process.env.SERVER_REQUEST_TIMEOUT_MS || '95000', 10) || 95000;
    server.headersTimeout = Number.parseInt(process.env.SERVER_HEADERS_TIMEOUT_MS || '15000', 10) || 15000;
    server.keepAliveTimeout = Number.parseInt(process.env.SERVER_KEEP_ALIVE_TIMEOUT_MS || '65000', 10) || 65000;

    const shutdown = (signal: string) => {
        logEvent('info', 'server.shutdown_started', { signal });
        server.close(() => {
            mongoose.connection.close(false)
                .then(() => {
                    logEvent('info', 'server.shutdown_completed', { signal });
                    process.exit(0);
                })
                .catch((error) => {
                    logError('server.shutdown_failed', error, { signal });
                    process.exit(1);
                });
        });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}







