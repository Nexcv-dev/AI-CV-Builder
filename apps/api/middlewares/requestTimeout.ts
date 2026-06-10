import type { Express, Request, Response, NextFunction } from 'express';

const parsePositiveInt = (value: string | undefined, fallback: number) => {
    const parsed = Number.parseInt(value || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const routeTimeoutMs = (path: string) => {
    if (path === '/api/generate-pdf') {
        return parsePositiveInt(process.env.PDF_REQUEST_TIMEOUT_MS, 75_000);
    }
    if (path === '/api/parse-cv') {
        return parsePositiveInt(process.env.CV_IMPORT_REQUEST_TIMEOUT_MS, 90_000);
    }
    if (path === '/api/generate-summary' || path === '/api/refine-text') {
        return parsePositiveInt(process.env.AI_REQUEST_TIMEOUT_MS, 45_000);
    }
    return parsePositiveInt(process.env.API_REQUEST_TIMEOUT_MS, 30_000);
};

export const configureRequestTimeout = (app: Express) => {
    app.use((req: Request, res: Response, next: NextFunction) => {
        if (!req.path.startsWith('/api')) return next();

        const timeoutMs = routeTimeoutMs(req.path);
        const timer = setTimeout(() => {
            if (!res.headersSent) {
                res.status(503).json({ error: 'Request timed out. Please try again.' });
            }
        }, timeoutMs);

        res.on('finish', () => clearTimeout(timer));
        res.on('close', () => clearTimeout(timer));

        next();
    });
};
