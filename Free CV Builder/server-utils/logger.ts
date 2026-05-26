import crypto from 'crypto';

type LogLevel = 'info' | 'warn' | 'error';

type LogMeta = Record<string, unknown>;

const SENSITIVE_KEY_PATTERN = /password|secret|token|authorization|cookie|md5sig|hash|api[-_]?key|refresh/i;

const normalizeError = (error: unknown) => {
    if (!error) return undefined;
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
        };
    }
    return { message: String(error) };
};

const redact = (value: unknown, depth = 0): unknown => {
    if (depth > 5) return '[MaxDepth]';
    if (value === null || value === undefined) return value;
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.slice(0, 20).map((item) => redact(item, depth + 1));
    if (typeof value !== 'object') return value;

    return Object.entries(value as Record<string, unknown>).reduce((acc, [key, item]) => {
        acc[key] = SENSITIVE_KEY_PATTERN.test(key) ? '[REDACTED]' : redact(item, depth + 1);
        return acc;
    }, {} as Record<string, unknown>);
};

export const createErrorId = () => crypto.randomUUID();

export const logEvent = (level: LogLevel, event: string, meta: LogMeta = {}) => {
    const entry = {
        level,
        event,
        timestamp: new Date().toISOString(),
        ...(redact(meta) as LogMeta),
    };
    const line = JSON.stringify(entry);
    if (level === 'error') {
        console.error(line);
    } else if (level === 'warn') {
        console.warn(line);
    } else {
        console.log(line);
    }
};

export const logError = (event: string, error: unknown, meta: LogMeta = {}) => {
    const errorId = typeof meta.errorId === 'string' ? meta.errorId : createErrorId();
    logEvent('error', event, {
        ...meta,
        errorId,
        error: normalizeError(error),
    });
    return errorId;
};
