import mongoose from 'mongoose';
import { sanitizeCvData } from './pdfService';
import { isEmailVerified } from '../server-utils/userAuth';
import { getEffectivePlan, isPaidPlan } from '../server-models/userPlan';
import { payHereAmountToCents } from '../server-utils/payHere';
import { logError } from '../server-utils/logger';
import type { Request, Response, NextFunction } from 'express';
import { isSuperAdmin } from '../server-models/userRole';
import { hasAdminPermission, isAdminRole, isUserRole, type AdminPermission } from '@nexcv/shared/admin';

export const MAX_TEXT_LENGTH = 10000;
export const MAX_BASE64_LENGTH = 15 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif',
];

export const ALLOWED_SECTION_TYPES = ['experience', 'education', 'project'];

export function sanitizeTextForPrompt(text: string): string {
    return text
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .slice(0, MAX_TEXT_LENGTH)
        .trim();
}

export function sanitizeContextField(value: any): string {
    if (typeof value !== 'string') return 'Unknown';
    return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, 200).trim() || 'Unknown';
}

export const isMongoDuplicateKeyError = (error: any) => (
    error?.code === 11000 || error?.name === 'MongoServerError' && error?.code === 11000
);

export const isMongoValidationError = (error: any) => error?.name === 'ValidationError';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    next();
};

export const requireVerifiedEmail = (req: Request, res: Response) => {
    if ((req as any).appSettings?.emailVerificationRequired === false) {
        return true;
    }
    if (!isEmailVerified(req.user)) {
        res.status(403).json({ error: 'Verify your email to save CVs.' });
        return false;
    }
    return true;
};

export const currentUserId = (req: Request) => (req.user as any)._id || (req.user as any).id;

export const requirePaidPlan = (req: Request, res: Response) => {
    if (!isPaidPlan(req.user as any)) {
        res.status(403).json({
            error: 'AI features are available on paid plans.',
            upgradeRequired: true,
        });
        return false;
    }
    return true;
};

export const isValidDocumentId = (id: unknown) => (
    typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)
);

export const sanitizeContactMessage = (value: unknown) => (
    typeof value === 'string'
        ? value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, 3000)
        : ''
);

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
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

export const sendError = (res: Response, status: number, clientMessage: string, internalError?: any) => {
    const errorId = logError('http.request_failed', internalError, { status, clientMessage });
    return res.status(status).json({
        error: clientMessage,
        errorId: process.env.NODE_ENV !== 'production' ? errorId : undefined
    });
};

export const getApiOrigin = (req: Request) => {
    const configured = process.env.API_PUBLIC_URL || process.env.BACKEND_PUBLIC_URL;
    if (configured?.trim()) return configured.trim().replace(/\/+$/, '');
    return `${req.protocol}://${req.get('host')}`;
};

import { getRequestOrigin, isAllowedOrigin } from '../middlewares/security';

export const getFrontendOrigin = (req: Request) => {
    const requestOrigin = getRequestOrigin(req);
    if (requestOrigin && isAllowedOrigin(requestOrigin)) return requestOrigin;
    const configured = process.env.FRONTEND_URL || process.env.ALLOWED_ORIGIN;
    if (configured?.trim()) return configured.trim().replace(/\/+$/, '');
    return getApiOrigin(req);
};

export const documentSummary = (document: any) => ({
    id: document._id.toString(),
    title: document.title,
    template: document.template,
    status: document.status || 'completed',
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
});

export const documentDetails = (document: any) => ({
    ...documentSummary(document),
    cvData: document.cvData,
});

export const titleFromCvData = (cvData: any) => {
    const fullName = cvData?.personalInfo?.fullName?.trim?.();
    return fullName ? `${fullName} CV` : 'Untitled CV';
};

export const startOfUtcDay = (date = new Date()) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

export const formatUtcDay = (date: Date) => date.toISOString().slice(0, 10);

export const parsePaymentAmountCents = (amount: unknown) => {
    if (typeof amount !== 'string') return 0;
    return payHereAmountToCents(amount) || 0;
};

export const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const adminUserSummary = (user: any, cvCount = 0) => ({
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

export const adminPaymentSummary = (payment: any) => {
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

export const SUPPORT_TICKET_TYPES = ['complaint', 'bug', 'feature_request', 'payment_issue', 'general'] as const;
export const SUPPORT_TICKET_STATUSES = ['open', 'pending', 'resolved', 'closed'] as const;
export const SUPPORT_TICKET_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

export const adminSupportTicketSummary = (ticket: any) => ({
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
