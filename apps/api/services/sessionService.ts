import type { NextFunction, Request } from 'express';

export const sessionCookieName = () => process.env.SESSION_COOKIE_NAME || 'nexcv.sid';

export const sessionVersionForUser = (user: any) => Math.max(0, Math.floor(Number(user?.sessionVersion || 0)));

export const markSessionCurrent = (req: Request, user: any) => {
    if (req.session) {
        (req.session as any).authSessionVersion = sessionVersionForUser(user);
    }
};

export const invalidateUserSessions = (user: any) => {
    user.sessionVersion = sessionVersionForUser(user) + 1;
};

export const isSessionCurrent = (req: Request, user: any) => {
    const currentVersion = sessionVersionForUser(user);
    if (currentVersion <= 0) return true;
    return (req.session as any)?.authSessionVersion === currentVersion;
};

/**
 * Signs the user in on a new session id, so a session id set before login
 * cannot be reused after it (session fixation). Everything stored in the old
 * session is dropped except the pending post-login redirect.
 */
export const loginWithRegeneratedSession = (
    req: Request,
    user: any,
    next: NextFunction,
    onSuccess: () => void,
) => {
    const authRedirect = (req.session as any)?.authRedirect;

    req.session.regenerate((regenerateErr) => {
        if (regenerateErr) return next(regenerateErr);

        if (authRedirect) {
            (req.session as any).authRedirect = authRedirect;
        }

        req.login(user, (loginErr) => {
            if (loginErr) return next(loginErr);
            return onSuccess();
        });
    });
};
