import { getEffectivePlan } from '../../server-models/userPlan';
import { payHereAmountToCents } from '../payHere';
import { isEmailVerified } from '../userAuth';

export const parsePaymentAmountCents = (amount: unknown) => {
    if (typeof amount !== 'string') return 0;
    return payHereAmountToCents(amount) || 0;
};

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
