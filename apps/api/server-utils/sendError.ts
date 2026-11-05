import type { Response } from 'express';
import { defaultApiErrorCode, type ApiErrorCode } from './apiErrors';
import { logError } from './logger';

// Helper to provide private error responses
export const sendError = (res: Response, status: number, clientMessage: string, internalError?: any, code?: ApiErrorCode) => {
    const errorCode = code || defaultApiErrorCode(status);
    const errorId = logError('http.request_failed', internalError, { status, clientMessage, code: errorCode });

    return res.status(status).json({
        error: clientMessage,
        code: errorCode,
        errorId: process.env.NODE_ENV !== 'production' ? errorId : undefined
    });
};
