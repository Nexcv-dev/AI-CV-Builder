import type { NextFunction, Request, Response } from 'express';
import { isIP } from 'net';

const normalizeClientIp = (value: unknown) => {
    if (typeof value !== 'string') return '';
    let trimmed = value.trim();
    if (!trimmed) return '';
    const bracketedIpv6 = trimmed.match(/^\[([^\]]+)\](?::\d+)?$/);
    if (bracketedIpv6) {
        trimmed = bracketedIpv6[1];
    } else {
        trimmed = trimmed.replace(/^\[/, '').replace(/\]$/, '');
    }
    if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(trimmed)) {
        trimmed = trimmed.slice(0, trimmed.lastIndexOf(':'));
    }
    if (trimmed === '::1') return '127.0.0.1';
    trimmed = trimmed.replace(/^::ffff:/, '');
    return isIP(trimmed) ? trimmed : '';
};

const getAllowedAdminIps = () => (
    (process.env.ADMIN_ALLOWED_IPS || '')
        .split(',')
        .map(normalizeClientIp)
        .filter(Boolean)
);

const hasConfiguredAdminIpAllowlist = () => getAllowedAdminIps().length > 0;

const getTrustedAdminProxyIps = () => (
    (process.env.ADMIN_TRUSTED_PROXY_IPS || '')
        .split(',')
        .map(normalizeClientIp)
        .filter(Boolean)
);

export const resolveAdminClientIp = (req: Request) => {
    const remoteIp = normalizeClientIp(req.socket?.remoteAddress);
    const expressResolvedIp = normalizeClientIp(req.ip);
    const trustedProxyIps = getTrustedAdminProxyIps();
    if (!remoteIp || !trustedProxyIps.includes(remoteIp)) {
        return expressResolvedIp || remoteIp;
    }

    const proxyResolvedIp = (req.ips || []).map(normalizeClientIp).find(Boolean);
    if (proxyResolvedIp) return proxyResolvedIp;

    const forwardedClientIp = (req.header('x-forwarded-for') || '').split(',')[0];
    return normalizeClientIp(forwardedClientIp) || remoteIp;
};

const isLocalDevelopmentIp = (ip: string) => {
    return process.env.NODE_ENV !== 'production' && (ip === '127.0.0.1' || ip === '::1');
};

export const isAdminIpAllowed = (req: Request) => {
    const allowedIps = getAllowedAdminIps();
    if (!allowedIps.length) return false;
    const clientIp = resolveAdminClientIp(req);
    if (isLocalDevelopmentIp(clientIp)) {
        return true;
    }
    return allowedIps.includes(clientIp);
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
