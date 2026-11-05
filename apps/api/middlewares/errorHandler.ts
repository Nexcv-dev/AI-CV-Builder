import type { Express, Request, Response, NextFunction } from 'express';
import { logError } from '../server-utils/logger';

// Final error handler: logs the error and returns a safe message.
export const configureErrorHandler = (app: Express) => {
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
        if (res.headersSent) return next(err);

        const rawStatus = Number(err?.status || err?.statusCode);
        const status = Number.isInteger(rawStatus) && rawStatus >= 400 && rawStatus < 600
            ? rawStatus
            : err?.message === 'Cross-Origin Request Blocked by Security Policy'
                ? 403
                : 500;
        const requestId = req.header('x-request-id') || undefined;
        logError('server.unhandled_request_error', err, {
            path: req.path,
            method: req.method,
            status,
            requestId,
        });

        const message = status === 403
            ? 'Request blocked by security policy.'
            : status === 404
                ? 'Not found.'
                : 'Something went wrong. Please try again later.';

        if (req.path.startsWith('/api/') || req.accepts(['json', 'html']) === 'json') {
            return res.status(status).json({ error: message, ...(requestId ? { requestId } : {}) });
        }

        return res.status(status).type('text/plain').send(message);
    });
};
