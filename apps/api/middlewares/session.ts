import type { Express } from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';

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
        name: process.env.SESSION_COOKIE_NAME || 'nexcv.sid',
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000,
        },
    }));
};
