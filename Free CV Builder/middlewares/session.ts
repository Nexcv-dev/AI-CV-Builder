import type { Express } from 'express';
import session from 'express-session';

export const assertSessionSecret = () => {
    if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
        throw new Error('SESSION_SECRET must be set in production.');
    }
};

export const configureSessionMiddleware = (app: Express) => {
    app.use(session({
        secret: process.env.SESSION_SECRET || 'development_session_secret',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000,
        },
    }));
};
