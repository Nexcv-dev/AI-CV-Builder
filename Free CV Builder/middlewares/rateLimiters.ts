import type { Express, Request, RequestHandler } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Options } from 'express-rate-limit';
import { MongoRateLimitStore } from '../server-utils/mongoRateLimitStore';

export const EMAIL_VERIFICATION_RESEND_LIMIT = 6;
export const EMAIL_VERIFICATION_RESEND_WINDOW_MS = 15 * 60 * 1000;
export const EMAIL_VERIFICATION_ATTEMPT_LIMIT = 5;
export const EMAIL_VERIFICATION_ATTEMPT_WINDOW_MS = 10 * 60 * 1000;

export const getAuthenticatedRateLimitKey = (req: Request) => {
    const user = req.user as any;
    return user?._id?.toString?.() || user?.id?.toString?.() || ipKeyGenerator(req.ip);
};

export const getEmailVerificationSendRateLimitKey = (req: Request) => {
    const user = req.user as any;
    const userId = user?._id?.toString?.() || user?.id?.toString?.();
    if (userId) return `user:${userId}`;

    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (email) return `email:${email}`;

    return `ip:${ipKeyGenerator(req.ip)}`;
};

const useSharedRateLimitStore = () => Boolean((process.env.MONGO_URI || process.env.MONGODB_URI || '').trim());
const createRateLimitStore = (prefix: string) => useSharedRateLimitStore()
    ? new MongoRateLimitStore(prefix)
    : undefined;

const lazyRateLimit = (prefix: string, options: Partial<Options>): RequestHandler => {
    let limiter: RequestHandler | null = null;
    return (req, res, next) => {
        if (!limiter) {
            limiter = rateLimit({
                ...options,
                store: createRateLimitStore(prefix),
            });
        }
        return limiter(req, res, next);
    };
};

export const apiLimiter = lazyRateLimit('api', {
    windowMs: 15 * 60 * 1000,
    max: 150,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
});

export const pdfLimiter = lazyRateLimit('pdf', {
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'PDF generation limit reached. Please wait a few minutes before trying again.' },
});

export const authLimiter = lazyRateLimit('auth', {
    windowMs: 15 * 60 * 1000,
    max: 8,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { error: 'Too many login attempts. Please wait a few minutes before trying again.' },
});

export const passwordResetLimiter = lazyRateLimit('password-reset', {
    windowMs: 60 * 60 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many password reset attempts. Please wait an hour before trying again.' },
});

export const emailVerificationLimiter = lazyRateLimit('email-verification-send-v2', {
    windowMs: EMAIL_VERIFICATION_RESEND_WINDOW_MS,
    max: EMAIL_VERIFICATION_RESEND_LIMIT,
    standardHeaders: true,
    legacyHeaders: false,
    skipFailedRequests: true,
    keyGenerator: getEmailVerificationSendRateLimitKey,
    message: { error: 'Too many OTP requests. Please wait 15 minutes before trying again.' },
});

export const emailVerificationAttemptLimiter = lazyRateLimit('email-verification-attempt', {
    windowMs: EMAIL_VERIFICATION_ATTEMPT_WINDOW_MS,
    max: EMAIL_VERIFICATION_ATTEMPT_LIMIT,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    keyGenerator: getAuthenticatedRateLimitKey,
    message: { error: 'Too many OTP verification attempts. Please wait 10 minutes before trying again.' },
});

export const configureRateLimiters = (app: Express) => {
    app.use('/api/', apiLimiter);
    app.use('/api/generate-pdf', pdfLimiter);
    app.use('/api/auth/login', authLimiter);
    app.use('/api/auth/signup', authLimiter);
    app.use('/api/auth/signup', emailVerificationLimiter);
};
