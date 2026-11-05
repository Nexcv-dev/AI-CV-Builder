import type { Express, Request, Response, NextFunction } from 'express';
import { isAdminRole } from '@nexcv/shared/admin';

const isMaintenanceBypassRoute = (req: Request) => {
    if (req.path === '/api/health' || req.path === '/api/public/app-settings') return true;
    if (req.path.startsWith('/api/admin')) return true;
    if (req.path === '/api/auth/current-user' || req.path === '/api/auth/login' || req.path === '/api/auth/logout') return true;
    if (req.path === '/api/auth/forgot-password' || req.path === '/api/auth/validate-reset-token' || req.path === '/api/auth/reset-password') return true;
    if (req.path === '/api/auth/google' || req.path === '/api/auth/google/callback') return true;
    if (req.path === '/api/auth/github' || req.path === '/api/auth/github/callback') return true;
    if (req.path === '/api/auth/linkedin' || req.path === '/api/auth/linkedin/callback') return true;
    return false;
};

export const configureMaintenanceMode = (app: Express) => {
    app.use((req: Request, res: Response, next: NextFunction) => {
        const settings = (req as any).appSettings;
        if (!req.path.startsWith('/api') || !settings?.maintenanceMode) return next();
        if (req.user && isAdminRole((req.user as any).role)) return next();
        if (isMaintenanceBypassRoute(req)) return next();

        return res.status(503).json({
            error: 'NexCV is temporarily down for maintenance.',
            maintenanceMode: true,
            supportEmail: settings.supportEmail || 'support@nexcv.com',
        });
    });
};
