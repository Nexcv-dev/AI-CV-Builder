import type { Express, Request, Response, NextFunction } from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { isSessionCurrent, sessionCookieName } from '../services/sessionService';

const parsePositiveInt = (value: string | undefined, fallback: number) => {
    const parsed = Number.parseInt(value || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const assertSessionSecret = () => {
    if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
        throw new Error('SESSION_SECRET must be set in production.');
    }
};

export const configureSessionMiddleware = (app: Express) => {
    const mongoUrl = process.env.MONGO_URI || process.env.MONGODB_URI;
    const store = mongoUrl
        ? MongoStore.create({
            mongoUrl,
            mongoOptions: {
                maxPoolSize: parsePositiveInt(process.env.SESSION_STORE_MAX_POOL_SIZE, 5),
                minPoolSize: 0,
            },
            collectionName: 'sessions',
            ttl: 24 * 60 * 60,
            crypto: {
                secret: process.env.SESSION_SECRET || 'development_session_secret',
            },
            autoRemove: 'native',
        })
        : undefined;

    app.use(session({
        secret: process.env.SESSION_SECRET || 'development_session_secret',
        resave: false,
        saveUninitialized: false,
        ...(store ? { store } : {}),
        name: sessionCookieName(),
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000,
        },
    }));
};

// Signs out sessions that predate the user's current sessionVersion (bumped on password change and reset).
export const configureSessionVersionCheck = (app: Express) => {
    app.use((req: Request, res: Response, next: NextFunction) => {
        if (!req.path.startsWith('/api') || !req.isAuthenticated?.() || !req.user) return next();
        if (isSessionCurrent(req, req.user)) return next();

        req.logout((logoutError) => {
            if (logoutError) return next(logoutError);
            req.session.destroy(() => {
                res.clearCookie(sessionCookieName());
                return res.status(401).json({ error: 'Session expired. Please sign in again.' });
            });
        });
    });
};
