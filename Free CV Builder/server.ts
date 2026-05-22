import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'node:dns';
import * as dotenv from 'dotenv';
import { createHash, pbkdf2Sync, randomBytes, randomInt, timingSafeEqual } from 'crypto';
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
import { CV_TEMPLATES, DEFAULT_TEMPLATE, getTemplateSurfaceColorFallback, isTemplateName, templateRequiresPaidPlan, type TemplateName } from './src/templates';
import { isSuperAdmin, roleForEmail, syncUserRoleFromAllowlist } from './server-models/userRole';
import { hasAdminPermission, isAdminRole, isUserRole, type AdminPermission } from './src/adminAccess';
import { buildCvCreationQuota } from './server-models/cvQuota';
import { buildDownloadQuota } from './server-models/downloadQuotaUtils';
import { createPlanExpiry, getEffectivePlan, isPaidPlan } from './server-models/userPlan';
import type { BillingPlan } from './server-models/userPlan';
import { registerAdminRoutes } from './routes/admin';
import { registerAuthRoutes } from './routes/auth';
import { registerCvRoutes } from './routes/cv';
import { registerPaymentRoutes } from './routes/payment';
import { registerPublicRoutes } from './routes/public';

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
};

dns.setDefaultResultOrder('ipv4first');

// Load environment variables from .env
dotenv.config();

// Connect to MongoDB
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
if (mongoUri) {
    connectDB();
} else {
    console.warn("MongoDB URI not found in .env. MongoDB connection skipped.");
}

const app = express();
const PORT = process.env.PORT || 3002;
app.set('trust proxy', 1);

assertSessionSecret();
configureSessionMiddleware(app);
configurePassportAuth(app);
configureSecurityMiddleware(app);
configureRateLimiters(app);

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
        (req as any).appSettings = await getAppSettings();
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

const normalizeClientIp = (value: unknown) => {
    if (typeof value !== 'string') return '';
    let trimmed = value.trim();
    if (!trimmed) return '';
    trimmed = trimmed.replace(/^\[/, '').replace(/\]$/, '');
    if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(trimmed)) {
        trimmed = trimmed.slice(0, trimmed.lastIndexOf(':'));
    }
    if (trimmed === '::1') return '127.0.0.1';
    return trimmed.replace(/^::ffff:/, '');
};

const getAllowedAdminIps = () => (
    (process.env.ADMIN_ALLOWED_IPS || '')
        .split(',')
        .map(normalizeClientIp)
        .filter(Boolean)
);

const getRequestIpCandidates = (req: Request) => {
    const forwardedFor = (req.header('x-forwarded-for') || '')
        .split(',')
        .map(normalizeClientIp)
        .filter(Boolean);

    return new Set([
        normalizeClientIp(req.ip),
        normalizeClientIp(req.socket?.remoteAddress),
        normalizeClientIp(req.header('x-real-ip')),
        normalizeClientIp(req.header('cf-connecting-ip')),
        normalizeClientIp(req.header('true-client-ip')),
        normalizeClientIp(req.header('fly-client-ip')),
        normalizeClientIp(req.header('x-client-ip')),
        ...((req.ips || []).map(normalizeClientIp)),
        ...forwardedFor,
    ].filter(Boolean));
};

const isAdminIpAllowed = (req: Request) => {
    const allowedIps = getAllowedAdminIps();
    if (!allowedIps.length) return true;
    const candidates = getRequestIpCandidates(req);
    if (process.env.NODE_ENV !== 'production' && (candidates.has('127.0.0.1') || candidates.has('localhost'))) {
        return true;
    }
    return allowedIps.some((ip) => candidates.has(ip));
};

const requireAdminAllowedIp = (req: Request, res: Response, next: NextFunction) => {
    if (isAdminIpAllowed(req)) return next();
    return res.status(403).json({ error: 'Admin access is not allowed from this network.' });
};

const requireAdminPageAllowedIp = (req: Request, res: Response, next: NextFunction) => {
    if (isAdminIpAllowed(req)) return next();
    return res.status(404).send('Not found');
};

// Helper to provide private error responses
export const sendError = (res: express.Response, status: number, clientMessage: string, internalError?: any) => {
    const errorId = crypto.randomUUID();
    console.error(`[Error ID: ${errorId}] Status: ${status} | Message: ${clientMessage} | Details:`, internalError || 'N/A');

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

    const normalizedContents = contents.every(item => item && typeof item === 'object' && Array.isArray(item.parts))
        ? contents
        : [{
            parts: contents.map(item => {
                if (typeof item === 'string') return { text: item };
                if (item?.inlineData) return { inlineData: item.inlineData };
                return item;
            }),
        }];

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: normalizedContents,
                ...(config ? { generationConfig: config } : {}),
            }),
        }
    );

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

const normalizeEmail = (email: unknown) => (
    typeof email === 'string' ? email.trim().toLowerCase() : ''
);

const sanitizeDisplayName = (name: unknown) => (
    typeof name === 'string'
        ? name.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, 80)
        : ''
);

const emailGreetingName = (name: unknown) => sanitizeDisplayName(name) || 'there';

const sanitizeProfileField = (value: unknown, maxLength = 160) => (
    typeof value === 'string'
        ? value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, maxLength)
        : ''
);

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isMongoDuplicateKeyError = (error: any) => (
    error?.code === 11000 || error?.name === 'MongoServerError' && error?.code === 11000
);

const isMongoValidationError = (error: any) => error?.name === 'ValidationError';

const passwordPolicyMessage = 'Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.';
const emailVerificationExpiresMs = 10 * 60 * 1000;

const validatePasswordStrength = (password: string) => (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
);

const hashPassword = (password: string) => {
    const salt = randomBytes(16).toString('hex');
    const hash = pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
    return `${salt}:${hash}`;
};

const verifyPassword = (password: string, storedHash: string) => {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) return false;

    const expected = Buffer.from(hash, 'hex');
    const actual = pbkdf2Sync(password, salt, 120000, 32, 'sha256');
    return expected.length === actual.length && timingSafeEqual(expected, actual);
};

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

const generateEmailVerificationOtp = () => {
    const code = randomInt(100000, 1000000).toString();
    return {
        code,
        codeHash: hashToken(code),
        expires: new Date(Date.now() + emailVerificationExpiresMs),
    };
};

const isEmailVerified = (user: any) => user?.authProvider === 'google' || user?.emailVerified !== false;
const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || 'www.bimanthaperera@gmail.com';

const sendEmailVerification = async (user: any, code: string) => {
    await sendSystemEmail({
        to: user.email,
        subject: 'Your NexCV verification code',
        text: `Hi ${emailGreetingName(user.displayName)},\n\n` +
            `Welcome to NexCV. Use this one-time code to verify your email address:\n\n` +
            `${code}\n\n` +
            `This verification code will expire in 10 minutes.\n\n` +
            `If you did not create a NexCV account, you can safely ignore this email.\n\n` +
            `Thanks,\nThe NexCV Team\n`,
    });
};

const sendEmailVerificationWithRetry = async (user: any, code: string) => {
    try {
        await sendEmailVerification(user, code);
        return true;
    } catch (firstError) {
        console.error('Could not send verification OTP on first attempt:', firstError);

        try {
            await new Promise((resolve) => setTimeout(resolve, 500));
            await sendEmailVerification(user, code);
            return true;
        } catch (retryError) {
            console.error('Could not send verification OTP on retry:', retryError);
            return false;
        }
    }
};

const publicUser = (user: any) => ({
    id: user._id?.toString?.() || user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role || 'user',
    emailVerified: isEmailVerified(user),
    profileImage: user.profileImage,
    phone: user.phone,
    address: user.address,
    dob: user.dob,
    gender: user.gender,
    nationality: user.nationality,
    authProvider: user.authProvider,
    plan: getEffectivePlan(user),
    planExpiresAt: user.planExpiresAt,
});

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
    const day = 'free-lifetime';
    const record = await DownloadQuota.findOne({ userId: user._id || user.id, day });
    const used = record?.count || 0;
    const quota = buildDownloadQuota(user, used);
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
    const day = 'free-lifetime';
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

const md5Upper = (value: string) => createHash('md5').update(value, 'utf8').digest('hex').toUpperCase();

export const PAYHERE_PLAN_PRICES: Record<Exclude<BillingPlan, 'free'>, { amount: string; cents: number; currency: 'LKR' }> = {
    payg: { amount: '499.00', cents: 49900, currency: 'LKR' },
    monthly: { amount: '2199.00', cents: 219900, currency: 'LKR' },
};

const centsToPayHereAmount = (cents: number) => (Math.max(0, cents) / 100).toFixed(2);

const calculateDiscountCents = (amountCents: number, discountType?: string, discountValue?: number) => {
    if (!discountType || !discountValue) return 0;
    const rawDiscount = discountType === 'percent'
        ? Math.floor(amountCents * Math.min(Math.max(discountValue, 0), 100) / 100)
        : Math.round(discountValue);
    return Math.min(Math.max(rawDiscount, 0), Math.max(amountCents - 100, 0));
};

const normalizeCouponCode = (value: unknown) => (
    typeof value === 'string'
        ? value.replace(/[^a-z0-9_-]/gi, '').trim().toUpperCase().slice(0, 32)
        : ''
);

const getPlanPrice = async (plan: Exclude<BillingPlan, 'free'>) => {
    const setting = await BillingPlanSetting.findOne({ plan, active: true });
    const fallback = PAYHERE_PLAN_PRICES[plan];
    const baseAmountCents = setting?.amountCents ?? fallback.cents;
    const promotionDiscountCents = setting?.promotionActive
        ? calculateDiscountCents(baseAmountCents, setting.promotionDiscountType, setting.promotionDiscountValue)
        : 0;
    const finalAmountCents = Math.max(baseAmountCents - promotionDiscountCents, 100);
    return {
        plan,
        label: setting?.label || planDisplayName(plan),
        amount: centsToPayHereAmount(finalAmountCents),
        cents: finalAmountCents,
        baseAmountCents,
        promotionDiscountCents,
        promotionActive: promotionDiscountCents > 0,
        promotionLabel: promotionDiscountCents > 0 ? (setting?.promotionLabel || 'Limited offer') : '',
        promotionDiscountType: setting?.promotionDiscountType || 'fixed',
        promotionDiscountValue: setting?.promotionDiscountValue || 0,
        discountBadge: promotionDiscountCents > 0
            ? (setting?.promotionDiscountType === 'percent'
                ? `${setting.promotionDiscountValue}% OFF`
                : `${setting?.currency || fallback.currency} ${Math.round(promotionDiscountCents / 100)} OFF`)
            : '',
        currency: (setting?.currency || fallback.currency) as 'LKR',
        source: setting ? 'admin' : 'default',
        updatedAt: setting?.updatedAt,
    };
};

const getPublicBillingPlans = async () => {
    const [payg, monthly] = await Promise.all([getPlanPrice('payg'), getPlanPrice('monthly')]);
    return [payg, monthly];
};

const quoteCheckout = async (plan: Exclude<BillingPlan, 'free'>, couponCode?: string) => {
    const price = await getPlanPrice(plan);
    let coupon: any = null;
    let discountCents = 0;
    const code = normalizeCouponCode(couponCode);
    const now = new Date();
    if (code) {
        coupon = await Coupon.findOne({ code, active: true });
        const planAllowed = coupon && (!coupon.appliesTo?.length || coupon.appliesTo.includes(plan));
        const started = !coupon?.startsAt || coupon.startsAt <= now;
        const notExpired = !coupon?.expiresAt || coupon.expiresAt >= now;
        const underLimit = !coupon?.maxRedemptions || coupon.redeemedCount < coupon.maxRedemptions;
        if (!coupon || !planAllowed || !started || !notExpired || !underLimit) {
            return { error: 'Coupon is not valid for this plan.' };
        }
        discountCents = calculateDiscountCents(price.cents, coupon.discountType, coupon.discountValue);
    }
    const finalAmountCents = Math.max(price.cents - discountCents, 100);
    return {
        plan,
        currency: price.currency,
        baseAmountCents: price.baseAmountCents,
        promotionDiscountCents: price.promotionDiscountCents,
        discountCents: price.promotionDiscountCents + discountCents,
        couponDiscountCents: discountCents,
        finalAmountCents,
        amount: centsToPayHereAmount(finalAmountCents),
        couponCode: coupon?.code || '',
        couponLabel: coupon?.label || '',
        promotionLabel: price.promotionLabel,
        discountBadge: price.discountBadge,
    };
};

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

export const getPayHereMerchantConfig = () => ({
    merchantId: (process.env.PAYHERE_MERCHANT_ID || process.env.PAYHERE_SANDBOX_MERCHANT_ID || '').trim(),
    merchantSecret: (process.env.PAYHERE_MERCHANT_SECRET || process.env.PAYHERE_SANDBOX_MERCHANT_SECRET || '').trim(),
});

export const getPayHereCheckoutUrl = () => (
    process.env.PAYHERE_CHECKOUT_URL?.trim() ||
    (process.env.PAYHERE_MERCHANT_ID ? 'https://www.payhere.lk/pay/checkout' : 'https://sandbox.payhere.lk/pay/checkout')
);

export const buildPayHereCheckoutHash = (payload: {
    merchant_id: string;
    order_id: string;
    amount: string;
    currency: string;
}, merchantSecret: string) => md5Upper(
    `${payload.merchant_id}${payload.order_id}${payload.amount}${payload.currency}${md5Upper(merchantSecret)}`
);

export const buildPayHereMd5Signature = (payload: {
    merchant_id: string;
    order_id: string;
    payhere_amount: string;
    payhere_currency: string;
    status_code: string;
}, merchantSecret: string) => md5Upper(
    `${payload.merchant_id}${payload.order_id}${payload.payhere_amount}${payload.payhere_currency}${payload.status_code}${md5Upper(merchantSecret)}`
);

export const verifyPayHereMd5Signature = (payload: {
    merchant_id: string;
    order_id: string;
    payhere_amount: string;
    payhere_currency: string;
    status_code: string;
    md5sig: string;
}, merchantSecret: string) => {
    const received = String(payload.md5sig || '').trim().toUpperCase();
    const expected = buildPayHereMd5Signature(payload, merchantSecret);
    const receivedBuffer = Buffer.from(received, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
};

export const payHereAmountToCents = (value: unknown) => {
    if (typeof value !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return null;
    return Math.round(Number(value.trim()) * 100);
};

const isPaidBillingPlan = (value: unknown): value is Exclude<BillingPlan, 'free'> => (
    value === 'payg' || value === 'monthly'
);

export const resolvePayHerePaymentContext = (payload: Record<string, unknown>) => {
    const customUserId = typeof payload.custom_1 === 'string' ? payload.custom_1.trim() : '';
    const customPlan = typeof payload.custom_2 === 'string' ? payload.custom_2.trim().toLowerCase() : '';
    const orderId = typeof payload.order_id === 'string' ? payload.order_id.trim() : '';
    const orderMatch = orderId.match(/([a-f\d]{24})[^a-z\d]+(payg|monthly)|(payg|monthly)[^a-z\d]+([a-f\d]{24})/i);

    const userId = isValidDocumentId(customUserId)
        ? customUserId
        : orderMatch?.[1] || orderMatch?.[4] || '';
    const plan = isPaidBillingPlan(customPlan)
        ? customPlan
        : orderMatch?.[2]?.toLowerCase() || orderMatch?.[3]?.toLowerCase() || '';

    return {
        userId: isValidDocumentId(userId) ? userId : '',
        plan: isPaidBillingPlan(plan) ? plan : null,
    };
};

const generateTransactionId = () => {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `NX-${datePart}-${randomBytes(4).toString('hex').toUpperCase()}`;
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

const planDisplayName = (plan: BillingPlan) => (
    plan === 'monthly' ? 'Monthly' :
        plan === 'payg' ? 'Pay As You Go' :
            'Free'
);

const sendNewAccountNotification = (user: any) => sendNotificationEmail({
    to: ADMIN_NOTIFICATION_EMAIL,
    subject: 'New NexCV account created',
    text: `A new NexCV account was created.\n\n` +
        `Name: ${sanitizeDisplayName(user.displayName) || 'Unknown'}\n` +
        `Email: ${user.email || 'Unknown'}\n` +
        `Provider: ${user.authProvider || 'email'}\n` +
        `User ID: ${user._id?.toString?.() || user.id || 'Unknown'}\n` +
        `Created at: ${new Date().toISOString()}\n`,
});

const sendContactNotification = (details: { fullName: string; email: string; message: string }) => sendSystemEmail({
    to: ADMIN_NOTIFICATION_EMAIL,
    replyTo: details.email,
    subject: `New NexCV contact message from ${details.fullName}`,
    text: `A contact form message was submitted on NexCV.\n\n` +
        `Name: ${details.fullName}\n` +
        `Email: ${details.email}\n\n` +
        `Message:\n${details.message}\n`,
});

const sendBillingSuccessNotifications = async (details: {
    user: any;
    plan: BillingPlan;
    transactionId: string;
    planExpiresAt?: Date;
}) => {
    const planName = planDisplayName(details.plan);
    const expiresAt = details.planExpiresAt?.toISOString?.() || 'Unknown';

    await sendNotificationEmail({
        to: ADMIN_NOTIFICATION_EMAIL,
        subject: `NexCV payment success - ${details.transactionId}`,
        text: `A NexCV transaction completed successfully.\n\n` +
            `Transaction ID: ${details.transactionId}\n` +
            `Plan: ${planName}\n` +
            `Customer: ${sanitizeDisplayName(details.user.displayName) || 'Unknown'}\n` +
            `Email: ${details.user.email || 'Unknown'}\n` +
            `User ID: ${details.user._id?.toString?.() || details.user.id || 'Unknown'}\n` +
            `Plan expires at: ${expiresAt}\n`,
    });

    await sendNotificationEmail({
        to: details.user.email,
        subject: `Your NexCV transaction is successful - ${details.transactionId}`,
        text: `Hi ${emailGreetingName(details.user.displayName)},\n\n` +
            `Your NexCV ${planName} upgrade is active.\n\n` +
            `Transaction ID: ${details.transactionId}\n` +
            `Plan: ${planName}\n` +
            `Access expires at: ${expiresAt}\n\n` +
            `Keep this transaction ID for support or refund requests.\n\n` +
            `Thanks,\nThe NexCV Team\n`,
    });
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

const TEMPLATE_CATEGORIES = ['Modern', 'ATS Friendly', 'Minimal', 'Executive', 'Creative', 'Tech', 'Corporate'] as const;
const TEMPLATE_STATUSES = ['draft', 'active', 'archived'] as const;
const TEMPLATE_SURFACE_COLOR_ROLES = ['none', 'sidebar', 'header'] as const;
const CUSTOM_TEMPLATE_KEY_PATTERN = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
const MAX_TEMPLATE_HTML_LENGTH = 240_000;
const MAX_TEMPLATE_CSS_LENGTH = 160_000;
const MAX_TEMPLATE_THUMBNAIL_BYTES = 900_000;

const defaultTemplateCategory = (key: string) => {
    if (key === 'classic') return 'ATS Friendly';
    if (key === 'minimalist') return 'Minimal';
    if (key === 'professional') return 'Corporate';
    if (key === 'startup' || key === 'creative') return 'Creative';
    if (key === 'timeline') return 'Executive';
    return 'Modern';
};

const templateThumbnailPath = (key: string, version?: unknown) => (
    `/api/templates/${encodeURIComponent(key)}/thumbnail${version ? `?v=${encodeURIComponent(String(version))}` : ''}`
);

const builtInTemplateSummary = (template: any, setting: any, usageCount = 0) => ({
    key: template.key,
    label: setting?.label || template.label,
    category: setting?.category || defaultTemplateCategory(template.key),
    access: setting?.access || template.access,
    thumbnail: setting?.thumbnail || template.image,
    builtInThumbnail: template.image,
    surfaceColorRole: setting?.surfaceColorRole || template.surfaceColorRole,
    surfaceColorLabel: setting?.surfaceColorLabel || template.surfaceColorLabel || null,
    source: 'built_in',
    status: setting?.status || 'active',
    usageCount,
    updatedAt: setting?.updatedAt,
});

const customTemplateSummary = (setting: any, usageCount = 0) => ({
    key: setting.key,
    label: setting.label || setting.key,
    category: setting.category || defaultTemplateCategory(setting.key),
    access: setting.access || 'paid',
    thumbnail: setting.thumbnail || templateThumbnailPath(setting.key, setting.updatedAt?.getTime?.() || setting.updatedAt),
    builtInThumbnail: setting.thumbnail || templateThumbnailPath(setting.key, setting.updatedAt?.getTime?.() || setting.updatedAt),
    surfaceColorRole: setting.surfaceColorRole || 'none',
    surfaceColorLabel: setting.surfaceColorLabel || null,
    source: 'custom',
    status: setting.status || 'draft',
    usageCount,
    updatedAt: setting.updatedAt,
});

const adminTemplateSummary = (template: any, setting: any, usageCount = 0) => ({
    ...builtInTemplateSummary(template, setting, usageCount),
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

const getTemplateSettingForKey = async (key: string) => {
    const template = CV_TEMPLATES.find((item) => item.key === key);
    if (!template) {
        const setting = await TemplateSetting.findOne({ key, source: 'custom', status: { $ne: 'archived' } });
        return setting ? customTemplateSummary(setting, 0) : null;
    }
    const setting = await TemplateSetting.findOne({ key });
    return adminTemplateSummary(template, setting, 0);
};

const getActiveTemplateForKey = async (key: unknown) => {
    if (!isTemplateName(key)) return null;
    const builtIn = CV_TEMPLATES.find((item) => item.key === key);
    if (builtIn) {
        const setting = await TemplateSetting.findOne({ key });
        const summary = builtInTemplateSummary(builtIn, setting, 0);
        return summary.status === 'archived' ? null : summary;
    }
    const custom = await TemplateSetting.findOne({ key, source: 'custom', status: 'active' });
    return custom ? customTemplateSummary(custom, 0) : null;
};

const resolveRequestedTemplate = async (value: unknown): Promise<TemplateName> => {
    const template = await getActiveTemplateForKey(value);
    return (template?.key || DEFAULT_TEMPLATE) as TemplateName;
};

const validateCustomTemplateKey = (value: unknown) => {
    const key = sanitizeProfileField(value, 60).toLowerCase();
    return CUSTOM_TEMPLATE_KEY_PATTERN.test(key) ? key : '';
};

const sanitizeTemplateSource = (value: unknown, maxLength: number) => (
    typeof value === 'string'
        ? value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, maxLength)
        : ''
);

const validateTemplateHtml = (html: string) => {
    if (!html.trim()) return 'Template HTML is required.';
    if (html.length > MAX_TEMPLATE_HTML_LENGTH) return 'Template HTML is too large.';
    if (/<\s*script\b/i.test(html)) return 'Template HTML cannot include script tags.';
    if (/\son[a-z]+\s*=/i.test(html)) return 'Template HTML cannot include inline event handlers.';
    if (/javascript:/i.test(html)) return 'Template HTML cannot include javascript URLs.';
    if (!/{{\s*personalInfo\.fullName\s*}}/.test(html) && !/{{\s*#/.test(html)) {
        return 'Template HTML must include NexCV template placeholders.';
    }
    return '';
};

const validateTemplateCss = (css: string) => {
    if (!css.trim()) return 'Template CSS is required.';
    if (css.length > MAX_TEMPLATE_CSS_LENGTH) return 'Template CSS is too large.';
    if (/<\s*script\b/i.test(css) || /javascript:/i.test(css)) return 'Template CSS contains unsafe content.';
    return '';
};

const parseThumbnailUpload = (value: unknown) => {
    if (typeof value !== 'string' || !value.trim()) return null;
    const match = value.match(/^data:image\/(png|jpe?g|webp|svg\+xml);base64,([a-z0-9+/=\s]+)$/i);
    if (!match) return null;
    const extension = match[1].toLowerCase().replace('jpeg', 'jpg').replace('svg+xml', 'svg');
    const buffer = Buffer.from(match[2].replace(/\s+/g, ''), 'base64');
    if (!buffer.length || buffer.length > MAX_TEMPLATE_THUMBNAIL_BYTES) return null;
    const contentType = extension === 'svg' ? 'image/svg+xml' : `image/${extension === 'jpg' ? 'jpeg' : extension}`;
    return { buffer, extension, contentType };
};

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
    sendEmailVerificationWithRetry, sendNewAccountNotification, sendContactNotification, sendBillingSuccessNotifications,
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
    emailGreetingName,
    sendAppEmail, sendSystemEmail, sendNotificationEmail, isEmailServiceConfigured, normalizeEmailFrom,
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

// --- Serve frontend static files in production ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, 'dist');

app.use(express.static(distPath));

app.use('/admin', requireAdminPageAllowedIp);

// Catch-all: serve index.html for any non-API route (React Router support)
app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
    });
}







