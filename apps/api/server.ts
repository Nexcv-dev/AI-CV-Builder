import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'node:dns';
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import { DEFAULT_SITE_URL, normalizeSiteUrl } from '@nexcv/shared/seo';
import connectDB from './server-models/db';
import { configureAppSettingsMiddleware } from './middlewares/appSettings';
import { configureDefaultJsonParser } from './middlewares/bodyParsers';
import { configureErrorHandler } from './middlewares/errorHandler';
import { configureMaintenanceMode } from './middlewares/maintenance';
import { configurePassportAuth } from './middlewares/passportAuth';
import { configureRateLimiters } from './middlewares/rateLimiters';
import { configureRequestTimeout } from './middlewares/requestTimeout';
import { configureSecurityMiddleware } from './middlewares/security';
import { assertSessionSecret, configureSessionMiddleware, configureSessionVersionCheck } from './middlewares/session';
import { routeDeps } from './routeDeps';
import { registerAdminRoutes } from './routes/admin';
import { registerAuthRoutes } from './routes/auth';
import { registerCvRoutes } from './routes/cv';
import { registerFrontendRoutes } from './routes/frontend';
import { registerHtmlPdfRoutes } from './routes/htmlPdf';
import { registerPaymentRoutes } from './routes/payment';
import { registerPublicRoutes } from './routes/public';
import { requireAdminAllowedIp } from './server-utils/adminIpAllowlist';
import { logError, logEvent } from './server-utils/logger';
import { initSentry, setupSentryExpressErrorHandler } from './server-utils/sentry';

// Re-exported for tests that import helpers from the app entry point.
export type { AppRouteDeps } from './routeDeps';
export { integrityCheck } from './middlewares/security';
export { requireAdminPermission } from './middlewares/auth';
export {
    CV_IMPORT_LIMIT,
    CV_IMPORT_WINDOW_MS,
    EMAIL_VERIFICATION_ATTEMPT_LIMIT,
    EMAIL_VERIFICATION_ATTEMPT_WINDOW_MS,
    EMAIL_VERIFICATION_RESEND_LIMIT,
    EMAIL_VERIFICATION_RESEND_WINDOW_MS,
    getAuthenticatedRateLimitKey,
    getEmailVerificationAttemptRateLimitKey,
} from './middlewares/rateLimiters';
export { sanitizeCvDataForStorage } from './services/cvDataService';
export { buildPasswordResetTransportOptions } from './services/emailService';
export { generateCVHTML } from './services/pdfService';
export { renderCvTemplateString } from './services/s3Service';
export {
    buildPayHereCheckoutHash,
    buildPayHereMd5Signature,
    PAYHERE_PLAN_PRICES,
    payHereAmountToCents,
    resolvePayHerePaymentContext,
    verifyPayHereMd5Signature,
} from './server-utils/payHere';
export { getPublicCvBaseUrl, publicCvShareUrl } from './server-utils/publicUrls';
export { sanitizeContextField, sanitizeTextForPrompt } from './server-utils/requestValidation';
export { sendError } from './server-utils/sendError';

dns.setDefaultResultOrder('ipv4first');

// Load environment variables from .env
dotenv.config();
initSentry();

// Connect to MongoDB
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
if (mongoUri) {
    connectDB().catch((error) => {
        logError('mongodb.startup_connection_failed', error);
        process.exit(1);
    });
} else {
    logEvent('warn', 'mongodb.config_missing', { message: 'MongoDB URI not found. MongoDB connection skipped.' });
}

const app = express();
const PORT = process.env.PORT || 3002;
app.set('trust proxy', 1);

// Middleware order matters: session and auth first, then body parsing, settings, and the request gates.
assertSessionSecret();
configureSessionMiddleware(app);
configurePassportAuth(app);
configureSecurityMiddleware(app);
configureRateLimiters(app);
configureRequestTimeout(app);
configureDefaultJsonParser(app);
configureAppSettingsMiddleware(app);
configureSessionVersionCheck(app);
configureMaintenanceMode(app);

// ─── API Routes ──────────────────────────────────────────────────────

const publicRouter = express.Router();
registerPublicRoutes(publicRouter, routeDeps);
app.use(publicRouter);

const adminRouter = express.Router();
registerAdminRoutes(adminRouter, routeDeps);
app.use('/api/admin', requireAdminAllowedIp);
app.use(adminRouter);

const paymentRouter = express.Router();
registerPaymentRoutes(paymentRouter, routeDeps);
app.use(paymentRouter);

const authRouter = express.Router();
registerAuthRoutes(authRouter, routeDeps);
app.use(authRouter);

const cvRouter = express.Router();
registerCvRoutes(cvRouter, routeDeps);
app.use(cvRouter);

const htmlPdfRouter = express.Router();
registerHtmlPdfRoutes(htmlPdfRouter, routeDeps);
app.use(htmlPdfRouter);

setupSentryExpressErrorHandler(app);

// --- Serve frontend static files in production ---
// Computed here, after dotenv.config(), so values from .env apply.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRootPath = path.resolve(__dirname, '../..');
const distPath = process.env.WEB_DIST_DIR
    ? path.resolve(process.env.WEB_DIST_DIR)
    : path.join(repoRootPath, 'apps', 'web', 'dist');
const siteUrl = normalizeSiteUrl(process.env.FRONTEND_URL || process.env.ALLOWED_ORIGIN || DEFAULT_SITE_URL);

registerFrontendRoutes(app, { distPath, siteUrl });

configureErrorHandler(app);

if (process.env.NODE_ENV !== 'test') {
    const server = app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
    });
    server.requestTimeout = Number.parseInt(process.env.SERVER_REQUEST_TIMEOUT_MS || '95000', 10) || 95000;
    server.headersTimeout = Number.parseInt(process.env.SERVER_HEADERS_TIMEOUT_MS || '15000', 10) || 15000;
    server.keepAliveTimeout = Number.parseInt(process.env.SERVER_KEEP_ALIVE_TIMEOUT_MS || '65000', 10) || 65000;

    let shutdownStarted = false;
    const shutdown = (signal: string, exitCode = 0) => {
        if (shutdownStarted) return;
        shutdownStarted = true;
        logEvent('info', 'server.shutdown_started', { signal, exitCode });

        const forceExitTimer = setTimeout(() => {
            logEvent('error', 'server.shutdown_timeout', { signal, exitCode });
            process.exit(exitCode || 1);
        }, Number.parseInt(process.env.GRACEFUL_SHUTDOWN_TIMEOUT_MS || '10000', 10) || 10000);
        forceExitTimer.unref();

        server.close((serverCloseError) => {
            if (serverCloseError) {
                logError('server.http_close_failed', serverCloseError, { signal });
            }

            mongoose.connection.close(false)
                .then(() => {
                    clearTimeout(forceExitTimer);
                    logEvent('info', 'server.shutdown_completed', { signal, exitCode });
                    process.exit(exitCode);
                })
                .catch((error) => {
                    clearTimeout(forceExitTimer);
                    logError('server.shutdown_failed', error, { signal });
                    process.exit(1);
                });
        });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('unhandledRejection', (reason) => {
        logError('server.unhandled_rejection', reason);
        shutdown('unhandledRejection', 1);
    });
    process.on('uncaughtException', (error) => {
        logError('server.uncaught_exception', error);
        shutdown('uncaughtException', 1);
    });
}
