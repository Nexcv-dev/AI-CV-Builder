import type { Request } from 'express';
import { getRequestOrigin, isAllowedOrigin } from '../middlewares/security';

export const getApiOrigin = (req: Request) => {
    const configured = process.env.API_PUBLIC_URL || process.env.BACKEND_PUBLIC_URL;
    if (configured?.trim()) return configured.trim().replace(/\/+$/, '');
    return `${req.protocol}://${req.get('host')}`;
};

export const getFrontendOrigin = (req: Request) => {
    const requestOrigin = getRequestOrigin(req);
    if (requestOrigin && isAllowedOrigin(requestOrigin)) return requestOrigin;
    const configured = process.env.FRONTEND_URL || process.env.ALLOWED_ORIGIN;
    if (configured?.trim()) return configured.trim().replace(/\/+$/, '');
    return getApiOrigin(req);
};

export const getPublicCvBaseUrl = (req?: Request) => {
    const configured = process.env.PUBLIC_CV_BASE_URL || process.env.FRONTEND_URL || process.env.ALLOWED_ORIGIN;
    if (configured?.trim()) return configured.trim().replace(/\/+$/, '');
    return req ? getApiOrigin(req) : '';
};

export const publicCvShareUrl = (shareSlug: unknown, req?: Request) => {
    if (typeof shareSlug !== 'string' || !shareSlug.trim()) return null;
    const path = `/cv/${encodeURIComponent(shareSlug.trim())}`;
    const baseUrl = getPublicCvBaseUrl(req);
    return baseUrl ? `${baseUrl}${path}` : path;
};
