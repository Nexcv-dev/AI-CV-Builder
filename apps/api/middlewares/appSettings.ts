import type { Express, Request, Response, NextFunction } from 'express';
import { getAppSettings } from '../server-models/AppSetting';
import { getOrSetCachedValue, parseCacheTtlMs } from '../server-utils/ttlCache';

// Loads cached app settings onto every /api request as `req.appSettings`.
export const configureAppSettingsMiddleware = (app: Express) => {
    app.use(async (req: Request, _res: Response, next: NextFunction) => {
        if (!req.path.startsWith('/api')) return next();
        try {
            (req as any).appSettings = await getOrSetCachedValue(
                'app-settings',
                parseCacheTtlMs(process.env.APP_SETTINGS_CACHE_TTL_MS, 30_000),
                getAppSettings
            );
        } catch {
            (req as any).appSettings = null;
        }
        next();
    });
};
