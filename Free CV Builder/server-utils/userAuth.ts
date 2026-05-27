import { createHash, pbkdf2Sync, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { getAppSettings } from '../server-models/AppSetting';
import { getEffectivePlan } from '../server-models/userPlan';
import { sendNotificationEmail, sendSystemEmail } from '../services/emailService';
import { mergeEmailTemplates, renderEmailTemplate } from '../src/emailTemplateDefaults';
import type { BillingPlan } from '../server-models/userPlan';
import { planDisplayName } from './payHere';

export const normalizeEmail = (email: unknown) => (
    typeof email === 'string' ? email.trim().toLowerCase() : ''
);

export const sanitizeDisplayName = (name: unknown) => (
    typeof name === 'string'
        ? name.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, 80)
        : ''
);

export const emailGreetingName = (name: unknown) => sanitizeDisplayName(name) || 'there';

export const sanitizeProfileField = (value: unknown, maxLength = 160) => (
    typeof value === 'string'
        ? value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, maxLength)
        : ''
);

export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const passwordPolicyMessage = 'Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.';
const emailVerificationExpiresMs = 10 * 60 * 1000;

export const validatePasswordStrength = (password: string) => (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
);

export const hashPassword = (password: string) => {
    const salt = randomBytes(16).toString('hex');
    const hash = pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
    return `${salt}:${hash}`;
};

export const verifyPassword = (password: string, storedHash: string) => {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) return false;

    const expected = Buffer.from(hash, 'hex');
    const actual = pbkdf2Sync(password, salt, 120000, 32, 'sha256');
    return expected.length === actual.length && timingSafeEqual(expected, actual);
};

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export const generateEmailVerificationOtp = () => {
    const code = randomInt(100000, 1000000).toString();
    return {
        code,
        codeHash: hashToken(code),
        expires: new Date(Date.now() + emailVerificationExpiresMs),
    };
};

export const isEmailVerified = (user: any) => user?.authProvider === 'google' || user?.emailVerified !== false;
const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || 'www.bimanthaperera@gmail.com';

const getEmailTemplates = async () => {
    const settings = await getAppSettings().catch(() => null);
    return mergeEmailTemplates(settings?.emailTemplates);
};

const sendEmailVerification = async (user: any, code: string) => {
    const templates = await getEmailTemplates();
    const email = renderEmailTemplate(templates.verification, {
        name: emailGreetingName(user.displayName),
        code,
        expiresIn: '10 minutes',
    });
    await sendSystemEmail({
        to: user.email,
        subject: email.subject,
        text: email.text,
    });
};

export const sendEmailVerificationWithRetry = async (user: any, code: string) => {
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

export const publicUser = (user: any) => ({
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

export const sendNewAccountNotification = (user: any) => sendNotificationEmail({
    to: ADMIN_NOTIFICATION_EMAIL,
    subject: 'New NexCV account created',
    text: `A new NexCV account was created.\n\n` +
        `Name: ${sanitizeDisplayName(user.displayName) || 'Unknown'}\n` +
        `Email: ${user.email || 'Unknown'}\n` +
        `Provider: ${user.authProvider || 'email'}\n` +
        `User ID: ${user._id?.toString?.() || user.id || 'Unknown'}\n` +
        `Created at: ${new Date().toISOString()}\n`,
});

export const sendContactNotification = (details: { fullName: string; email: string; message: string }) => sendSystemEmail({
    to: ADMIN_NOTIFICATION_EMAIL,
    replyTo: details.email,
    subject: `New NexCV contact message from ${details.fullName}`,
    text: `A contact form message was submitted on NexCV.\n\n` +
        `Name: ${details.fullName}\n` +
        `Email: ${details.email}\n\n` +
        `Message:\n${details.message}\n`,
});

export const sendBillingSuccessNotifications = async (details: {
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

    const templates = await getEmailTemplates();
    const receiptEmail = renderEmailTemplate(templates.paymentReceipt, {
        name: emailGreetingName(details.user.displayName),
        planName,
        transactionId: details.transactionId,
        expiresAt,
    });

    await sendNotificationEmail({
        to: details.user.email,
        subject: receiptEmail.subject,
        text: receiptEmail.text,
    });
};

export const sendBillingAlertNotification = async (details: {
    event: string;
    orderId?: string;
    paymentId?: string;
    statusCode?: string;
    reason: string;
    userId?: unknown;
    plan?: unknown;
    amount?: string;
    currency?: string;
}) => {
    await sendNotificationEmail({
        to: ADMIN_NOTIFICATION_EMAIL,
        subject: `NexCV PayHere alert - ${details.event}`,
        text: `A PayHere IPN needs attention.\n\n` +
            `Event: ${details.event}\n` +
            `Reason: ${details.reason}\n` +
            `Order ID: ${details.orderId || 'Unknown'}\n` +
            `Payment ID: ${details.paymentId || 'Unknown'}\n` +
            `Status code: ${details.statusCode || 'Unknown'}\n` +
            `User ID: ${details.userId?.toString?.() || 'Unknown'}\n` +
            `Plan: ${details.plan?.toString?.() || 'Unknown'}\n` +
            `Amount: ${details.amount || 'Unknown'} ${details.currency || ''}\n` +
            `Detected at: ${new Date().toISOString()}\n`,
    });
};
