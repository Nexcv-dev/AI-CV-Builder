import * as Sentry from '@sentry/node';

const parseSampleRate = (value: string | undefined, fallback: number) => {
    if (!value) return fallback;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(parsed, 0), 1);
};

export const isSentryEnabled = () => Boolean(process.env.SENTRY_DSN?.trim());

export const initSentry = () => {
    if (!isSentryEnabled()) return;

    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
        release: process.env.SENTRY_RELEASE,
        tracesSampleRate: parseSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE, 0.1),
    });
};

export const setupSentryExpressErrorHandler = (app: Parameters<typeof Sentry.setupExpressErrorHandler>[0]) => {
    if (!isSentryEnabled()) return;
    Sentry.setupExpressErrorHandler(app);
};

export const captureException = (error: unknown, context?: Record<string, unknown>) => {
    if (!isSentryEnabled()) return;

    Sentry.withScope((scope) => {
        if (context) {
            scope.setContext('app', context);
        }
        Sentry.captureException(error);
    });
};
