import type { NextFunction, Request, Response } from 'express';

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

const hasConfiguredAdminIpAllowlist = () => getAllowedAdminIps().length > 0;

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

export const isAdminIpAllowed = (req: Request) => {
    const allowedIps = getAllowedAdminIps();
    if (!allowedIps.length) return false;
    const candidates = getRequestIpCandidates(req);
    if (process.env.NODE_ENV !== 'production' && (candidates.has('127.0.0.1') || candidates.has('localhost'))) {
        return true;
    }
    return allowedIps.some((ip) => candidates.has(ip));
};

export const requireAdminAllowedIp = (req: Request, res: Response, next: NextFunction) => {
    if (!hasConfiguredAdminIpAllowlist()) {
        return res.status(403).json({ error: 'Admin IP allowlist is not configured.' });
    }
    if (isAdminIpAllowed(req)) return next();
    return res.status(403).json({ error: 'Admin access is not allowed from this network.' });
};

export const requireAdminPageAllowedIp = (req: Request, res: Response, next: NextFunction) => {
    if (!hasConfiguredAdminIpAllowlist()) {
        return res.status(404).send('Not found');
    }
    if (isAdminIpAllowed(req)) return next();
    return res.status(404).send('Not found');
};
