import type { Request } from 'express';

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
