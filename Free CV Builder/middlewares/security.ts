import type { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';

const productionCspDirectives = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", 'https://cloud.umami.is'],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
    connectSrc: ["'self'", 'https://cloud.umami.is', 'https://api-gateway.umami.dev'],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'", 'https://sandbox.payhere.lk', 'https://www.payhere.lk'],
    frameAncestors: ["'none'"],
};

const normalizeOrigin = (value: string) => {
    try {
        return new URL(value.trim()).origin;
    } catch {
        return '';
    }
};

const expandOriginVariants = (origin: string) => {
    if (!origin) return [];
    const variants = new Set([origin]);

    try {
        const url = new URL(origin);
        if (url.hostname.startsWith('www.')) {
            url.hostname = url.hostname.replace(/^www\./, '');
            variants.add(url.origin);
        } else {
            url.hostname = `www.${url.hostname}`;
            variants.add(url.origin);
        }
    } catch {
        return Array.from(variants);
    }

    return Array.from(variants);
};

const envOrigins = (...values: Array<string | undefined>) => values
    .flatMap((value) => (value || '').split(','))
    .map(normalizeOrigin)
    .flatMap(expandOriginVariants)
    .filter(Boolean);

const allowedOrigins = process.env.NODE_ENV === 'production'
    ? Array.from(new Set(envOrigins(
        process.env.ALLOWED_ORIGIN,
        process.env.ALLOWED_ORIGINS,
        process.env.FRONTEND_URL,
        process.env.FRONTEND_ORIGIN,
    )))
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'];

export const isAllowedOrigin = (origin: string) => {
    if (process.env.NODE_ENV === 'production') {
        return allowedOrigins.length > 0 && allowedOrigins.includes(origin);
    }
    return origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');
};

export const getRequestOrigin = (req: Request) => {
    const origin = req.header('Origin');
    if (origin) return origin;

    const referer = req.header('Referer');
    if (!referer) return '';

    try {
        return new URL(referer).origin;
    } catch {
        return '';
    }
};

const getSameOrigin = (req: Request) => {
    const protocol = req.protocol;
    const host = typeof req.get === 'function' ? req.get('host') : req.header('host');
    return host ? `${protocol}://${host}` : '';
};

const isTrustedRequestOrigin = (req: Request) => {
    const requestOrigin = getRequestOrigin(req);
    if (!requestOrigin) {
        return process.env.NODE_ENV !== 'production';
    }

    const sameOrigin = getSameOrigin(req);
    return requestOrigin === sameOrigin || isAllowedOrigin(requestOrigin);
};

export const integrityCheck = (req: Request, res: Response, next: NextFunction) => {
    if (!req.path.startsWith('/api/') || !['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        return next();
    }
    if (req.path === '/api/payhere/ipn') {
        return next();
    }

    const appSource = req.header('X-App-Source');
    if (appSource !== 'cv-builder-app') {
        return res.status(403).json({ error: 'Unauthorized request source' });
    }

    if (!isTrustedRequestOrigin(req)) {
        return res.status(403).json({ error: 'Untrusted request origin' });
    }

    return next();
};

export const configureSecurityMiddleware = (app: Express) => {
    app.use(helmet({
        contentSecurityPolicy: process.env.NODE_ENV === 'production'
            ? { useDefaults: true, directives: productionCspDirectives }
            : false,
    }));

    app.use((_req: Request, res: Response, next: NextFunction) => {
        res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
        next();
    });

    app.use(cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (isAllowedOrigin(origin)) return callback(null, true);
            callback(new Error('Cross-Origin Request Blocked by Security Policy'));
        },
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowedHeaders: ['Content-Type', 'X-App-Source'],
    }));

    app.use(integrityCheck);
};
