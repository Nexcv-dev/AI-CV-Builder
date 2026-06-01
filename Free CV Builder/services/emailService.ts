import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import { logError, logEvent } from '../server-utils/logger';

dotenv.config();

export interface AppEmailOptions {
    to: string;
    from: string;
    subject: string;
    text: string;
    html?: string;
    replyTo?: string;
}

const numberFromEnv = (value: string | undefined, fallback: number) => {
    const normalized = value?.trim();
    if (!normalized) return fallback;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const smtpFamilyFromEnv = (value: string | undefined) => {
    const normalized = value?.trim();
    return normalized === '6' ? 6 : 4;
};

export const buildPasswordResetTransportOptions = () => {
    const port = numberFromEnv(process.env.SMTP_PORT, 587);
    const host = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';

    return {
        host,
        port,
        secure: process.env.SMTP_SECURE
            ? process.env.SMTP_SECURE === 'true'
            : port === 465,
        family: smtpFamilyFromEnv(process.env.SMTP_FAMILY),
        connectionTimeout: numberFromEnv(process.env.SMTP_CONNECTION_TIMEOUT_MS, 10000),
        greetingTimeout: numberFromEnv(process.env.SMTP_GREETING_TIMEOUT_MS, 10000),
        socketTimeout: numberFromEnv(process.env.SMTP_SOCKET_TIMEOUT_MS, 20000),
        tls: {
            servername: host,
        },
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    };
};

const stripEnvAssignment = (value: string) => value.replace(/^[A-Z0-9_]+\s*=\s*/i, '').trim();
const stripWrappingQuotes = (value: string) => value.replace(/^['"]|['"]$/g, '').trim();

const isValidEmailFrom = (value: string) => (
    /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(value) ||
    /^.+\s<[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+>$/.test(value)
);

export const normalizeEmailFrom = (value: string | undefined, fallback: string) => {
    const normalized = stripWrappingQuotes(stripEnvAssignment(value || ''));
    return isValidEmailFrom(normalized) ? normalized : fallback;
};

export async function sendAppEmail({ to, from, subject, text, html, replyTo }: AppEmailOptions) {
    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    if (resendApiKey) {
        try {
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${resendApiKey}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'NexCV/1.0',
                },
                body: JSON.stringify({
                    from,
                    to,
                    subject,
                    text,
                    ...(html ? { html } : {}),
                    ...(replyTo ? { reply_to: replyTo } : {}),
                }),
            });

            if (!response.ok) {
                const details = await response.text().catch(() => '');
                throw new Error(`Resend email API failed with ${response.status}: ${details || response.statusText}`);
            }
            logEvent('info', 'email.sent', { provider: 'resend', to, subject });
            return;
        } catch (error) {
            logError('email.resend_failed', error, { to, subject });
            if (!hasSmtpConfig()) {
                throw error;
            }
        }
    }

    try {
        const transporter = nodemailer.createTransport(buildPasswordResetTransportOptions());
        await transporter.sendMail({ to, from, subject, text, html, replyTo });
        logEvent('info', 'email.sent', { provider: 'smtp', to, subject });
    } catch (error) {
        logError('email.smtp_failed', error, { to, subject });
        throw error;
    }
}

const hasSmtpConfig = () => Boolean(process.env.EMAIL_USER?.trim() && process.env.EMAIL_PASS?.trim());

export const getAppEmailFrom = () => {
    const emailUser = process.env.EMAIL_USER?.trim();
    const fallback = process.env.RESEND_API_KEY?.trim()
            ? 'NexCV <onboarding@resend.dev>'
            : emailUser || '';
    return normalizeEmailFrom(process.env.EMAIL_FROM, fallback);
};

export const isEmailServiceConfigured = () => Boolean(
    getAppEmailFrom() &&
    (process.env.RESEND_API_KEY?.trim() ||
        hasSmtpConfig())
);

export const sendSystemEmail = async (options: Omit<AppEmailOptions, 'from'>) => {
    const from = getAppEmailFrom();
    if (!from) {
        throw new Error('Email sender is not configured.');
    }

    await sendAppEmail({ ...options, from });
};

export const sendNotificationEmail = async (options: Omit<AppEmailOptions, 'from'>) => {
    if (!isEmailServiceConfigured()) {
        logEvent('warn', 'email.notification_skipped_config_missing', { to: options.to, subject: options.subject });
        return false;
    }

    try {
        await sendSystemEmail(options);
        return true;
    } catch (error) {
        logError('email.notification_failed', error, { to: options.to, subject: options.subject });
        return false;
    }
};
