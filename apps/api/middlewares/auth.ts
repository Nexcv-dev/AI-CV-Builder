import type { Request, Response, NextFunction } from 'express';
import { hasAdminPermission, type AdminPermission } from '@nexcv/shared/admin';
import { isPaidPlan } from '../server-models/userPlan';
import { isSuperAdmin } from '../server-models/userRole';
import { API_ERROR_CODES } from '../server-utils/apiErrors';
import { isEmailVerified } from '../server-utils/userAuth';

// Every guard response carries an API error code, so the web app can react by code
// (see isAuthRequiredError / isEmailVerificationRequiredError / isUpgradeRequiredError in apps/web/src/utils/api.ts).

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: 'Not authenticated', code: API_ERROR_CODES.AUTH_REQUIRED });
    }
    next();
};

export const requireVerifiedEmail = (req: Request, res: Response) => {
    if ((req as any).appSettings?.emailVerificationRequired === false) {
        return true;
    }

    if (!isEmailVerified(req.user)) {
        res.status(403).json({ error: 'Verify your email to save CVs.', code: API_ERROR_CODES.EMAIL_VERIFICATION_REQUIRED });
        return false;
    }

    return true;
};

export const currentUserId = (req: Request) => (req.user as any)._id || (req.user as any).id;

export const requirePaidPlan = (req: Request, res: Response) => {
    if (!isPaidPlan(req.user as any)) {
        res.status(403).json({
            error: 'AI features are available on paid plans.',
            code: API_ERROR_CODES.FORBIDDEN,
            upgradeRequired: true,
        });
        return false;
    }

    return true;
};

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: 'Not authenticated', code: API_ERROR_CODES.AUTH_REQUIRED });
    }

    if (!isSuperAdmin(req.user as any)) {
        return res.status(403).json({ error: 'Admin access required.', code: API_ERROR_CODES.FORBIDDEN });
    }

    next();
};

export const requireAdminPermission = (permission: AdminPermission) => (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: 'Not authenticated', code: API_ERROR_CODES.AUTH_REQUIRED });
    }

    if (!hasAdminPermission(req.user as any, permission)) {
        return res.status(403).json({ error: 'Admin permission required.', code: API_ERROR_CODES.FORBIDDEN });
    }

    next();
};
