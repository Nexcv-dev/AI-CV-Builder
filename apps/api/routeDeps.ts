// Composition root for the API routers: every dependency a route module can use is wired here.
// Each router narrows this with its own Pick<AppRouteDeps, ...> type (see routes/*.ts).
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import mongoose from 'mongoose';
import { CV_TEMPLATES, DEFAULT_TEMPLATE, templateRequiresPaidPlan } from '@nexcv/templates';
import { isUserRole } from '@nexcv/shared/admin';
import { mergeEmailTemplates, renderEmailTemplate } from '@nexcv/shared/emailTemplateDefaults';
import User from './server-models/User';
import CVDocument from './server-models/CVDocument';
import CvCreationQuota from './server-models/CvCreationQuotaModel';
import DownloadQuota from './server-models/DownloadQuotaModel';
import PaymentTransaction from './server-models/PaymentTransaction';
import BillingPlanSetting from './server-models/BillingPlanSetting';
import Coupon from './server-models/Coupon';
import CheckoutSession from './server-models/CheckoutSession';
import TemplateSetting from './server-models/TemplateSetting';
import SupportTicket from './server-models/SupportTicket';
import AppSetting from './server-models/AppSetting';
import AdminAuditLog, { adminAuditLogSummary, recordAdminAuditLog } from './server-models/AdminAuditLog';
import { buildCvCreationQuota } from './server-models/cvQuota';
import { buildDownloadQuota } from './server-models/downloadQuotaUtils';
import { createPlanExpiry, createRenewedPlanExpiry, getEffectivePlan, isPaidPlan } from './server-models/userPlan';
import { isSuperAdmin, roleForEmail, syncUserRoleFromAllowlist } from './server-models/userRole';
import {
    currentUserId,
    requireAdminPermission,
    requireAuth,
    requirePaidPlan,
    requireSuperAdmin,
    requireVerifiedEmail,
} from './middlewares/auth';
import {
    adminTemplateJsonParser,
    cvImportJsonParser,
    htmlPdfJsonParser,
    imageUploadJsonParser,
    pdfJsonParser,
} from './middlewares/bodyParsers';
import { passport } from './middlewares/passportAuth';
import {
    aiLimiter,
    authLimiter,
    billingQuoteLimiter,
    cvImportLimiter,
    emailVerificationAttemptLimiter,
    emailVerificationLimiter,
    passwordResetDailyLimiter,
    passwordResetLimiter,
    pdfLimiter,
    publicFormLimiter,
} from './middlewares/rateLimiters';
import { getRequestOrigin, isAllowedOrigin } from './middlewares/security';
import { buildBrandedEmailHtml } from './services/brandedEmail';
import { sanitizeCvDataForStorage } from './services/cvDataService';
import { extractCvText, parseCvTextToStructuredData, withImportMeta } from './services/cvImportService';
import {
    getAppEmailFrom,
    isEmailServiceConfigured,
    normalizeEmailFrom,
    sendAppEmail,
    sendNotificationEmail,
    sendSystemEmail,
} from './services/emailService';
import { generateGeminiText, Type } from './services/geminiService';
import { consumeHtmlPdfQuota, getHtmlPdfQuota, rollbackHtmlPdfQuota } from './services/htmlPdfQuotaService';
import { generateCVHTML, generatePdfDocument, sanitizeCvData } from './services/pdfService';
import {
    consumeCvImportQuota,
    consumeDownloadQuota,
    getCvCreationQuota,
    getCvImportQuota,
    getDownloadQuota,
    incrementCvCreationQuota,
    incrementDownloadQuota,
    rollbackCvCreationQuota,
    rollbackCvImportQuota,
    rollbackDownloadQuota,
} from './services/quotaService';
import {
    clearS3TemplateCache,
    cvAssetS3Key,
    fetchS3Text,
    generateS3CVHTML,
    getCvAssetObjectStream,
    getS3ObjectStream,
    isCvAssetStorageConfigured,
    putCvAssetObject,
    putS3Object,
    renderCvTemplateString,
    S3_CV_ASSET_BUCKET,
    S3_CV_ASSET_PREFIX,
    S3_TEMPLATE_BUCKET,
    S3_TEMPLATE_PREFIX,
} from './services/s3Service';
import { invalidateUserSessions, markSessionCurrent } from './services/sessionService';
import { isAdminIpAllowed } from './server-utils/adminIpAllowlist';
import { formatUtcDay, startOfUtcDay } from './server-utils/dates';
import {
    adminPaymentSummary,
    adminSupportTicketSummary,
    adminUserSummary,
    parsePaymentAmountCents,
    SUPPORT_TICKET_PRIORITIES,
    SUPPORT_TICKET_STATUSES,
    SUPPORT_TICKET_TYPES,
} from './server-utils/dto/admin';
import { documentDetails, documentSummary, titleFromCvData } from './server-utils/dto/documents';
import {
    createLemonSqueezyCheckout,
    deleteLemonSqueezyDiscount,
    deleteLemonSqueezyDiscountsByCode,
    getLemonSqueezyConfigIssues,
    getMissingLemonSqueezyConfigKeys,
    isLemonSqueezyConfigured,
    syncLemonSqueezyDiscount,
    verifyLemonSqueezySignature,
} from './server-utils/lemonSqueezy';
import { logError, logEvent } from './server-utils/logger';
import {
    buildPayHereCheckoutHash,
    generateTransactionId,
    getAdminBillingPlans,
    getPayHereCheckoutUrl,
    getPayHereMerchantConfig,
    getPlanPrice,
    getPublicBillingPlans,
    isPaidBillingPlan,
    normalizeCouponCode,
    PAYHERE_PLAN_PRICES,
    payHereAmountToCents,
    planDisplayName,
    quoteCheckout,
    resolveBillingMarket,
    resolvePayHerePaymentContext,
    verifyPayHereMd5Signature,
} from './server-utils/payHere';
import { getApiOrigin, getFrontendOrigin, getPublicCvBaseUrl, publicCvShareUrl } from './server-utils/publicUrls';
import {
    ALLOWED_MIME_TYPES,
    ALLOWED_SECTION_TYPES,
    escapeRegex,
    isMongoDuplicateKeyError,
    isMongoValidationError,
    isValidDocumentId,
    MAX_BASE64_LENGTH,
    sanitizeContactMessage,
    sanitizeContextField,
    sanitizeTextForPrompt,
} from './server-utils/requestValidation';
import { sendError } from './server-utils/sendError';
import {
    adminTemplateSummary,
    customTemplateSummary,
    defaultTemplateCategory,
    getActiveTemplateForKey,
    getReleasedTemplateDefinition,
    getReleasedTemplateSummaries,
    MAX_TEMPLATE_CSS_LENGTH,
    MAX_TEMPLATE_HTML_LENGTH,
    parseThumbnailUpload,
    resolveRequestedTemplate,
    sanitizeTemplateSource,
    TEMPLATE_CATEGORIES,
    TEMPLATE_STATUSES,
    TEMPLATE_SURFACE_COLOR_ROLES,
    templateThumbnailPath,
    validateCustomTemplateKey,
    validateTemplateCss,
    validateTemplateHtml,
} from './server-utils/templateAdmin';
import {
    emailGreetingName,
    generateEmailVerificationOtp,
    hashPassword,
    hashToken,
    isEmailVerified,
    isValidEmail,
    normalizeEmail,
    passwordPolicyMessage,
    publicUser,
    sanitizeDisplayName,
    sanitizeProfileField,
    sendBillingAlertNotification,
    sendBillingSuccessNotifications,
    sendContactNotification,
    sendEmailVerificationWithRetry,
    sendNewAccountNotification,
    validatePasswordStrength,
    verifyPassword,
} from './server-utils/userAuth';

export const routeDeps = {
    User, CVDocument, CvCreationQuota, DownloadQuota, PaymentTransaction, BillingPlanSetting, Coupon, CheckoutSession, TemplateSetting, SupportTicket, AppSetting, AdminAuditLog,
    CV_TEMPLATES, DEFAULT_TEMPLATE, templateRequiresPaidPlan,
    requireAuth, requireSuperAdmin, requireAdminPermission, sendError, passport,
    adminTemplateJsonParser, cvImportJsonParser, pdfJsonParser, imageUploadJsonParser, htmlPdfJsonParser,
    authLimiter, aiLimiter, billingQuoteLimiter, cvImportLimiter, pdfLimiter, passwordResetLimiter, passwordResetDailyLimiter, publicFormLimiter, emailVerificationAttemptLimiter, emailVerificationLimiter,
    getRequestOrigin, isAllowedOrigin,
    clearS3TemplateCache, fetchS3Text, generateS3CVHTML, getCvAssetObjectStream, getS3ObjectStream, isCvAssetStorageConfigured, cvAssetS3Key, putCvAssetObject, putS3Object, renderCvTemplateString, S3_CV_ASSET_BUCKET, S3_CV_ASSET_PREFIX, S3_TEMPLATE_BUCKET, S3_TEMPLATE_PREFIX,
    generateCVHTML, generatePdfDocument, sanitizeCvData,
    getDownloadQuota, incrementDownloadQuota, consumeDownloadQuota, rollbackDownloadQuota, getActiveTemplateForKey,
    sanitizeTextForPrompt, sanitizeContextField, sanitizeProfileField, sanitizeDisplayName, normalizeEmail, isValidEmail,
    validatePasswordStrength, hashPassword, verifyPassword, hashToken, generateEmailVerificationOtp, isEmailVerified, publicUser,
    isMongoDuplicateKeyError, isMongoValidationError, passwordPolicyMessage,
    sendEmailVerificationWithRetry, sendNewAccountNotification, sendContactNotification, sendBillingSuccessNotifications, sendBillingAlertNotification,
    getFrontendOrigin, getApiOrigin, currentUserId, isValidDocumentId,
    adminTemplateSummary, customTemplateSummary, templateThumbnailPath, validateCustomTemplateKey, defaultTemplateCategory, getReleasedTemplateDefinition, getReleasedTemplateSummaries,
    sanitizeTemplateSource, validateTemplateHtml, validateTemplateCss, parseThumbnailUpload,
    TEMPLATE_CATEGORIES, TEMPLATE_SURFACE_COLOR_ROLES, TEMPLATE_STATUSES, MAX_TEMPLATE_HTML_LENGTH, MAX_TEMPLATE_CSS_LENGTH,
    normalizeCouponCode, isPaidBillingPlan, getPublicBillingPlans, getAdminBillingPlans, quoteCheckout, getPlanPrice, resolveBillingMarket,
    PAYHERE_PLAN_PRICES, payHereAmountToCents, getPayHereMerchantConfig, getPayHereCheckoutUrl,
    buildPayHereCheckoutHash, verifyPayHereMd5Signature, resolvePayHerePaymentContext,
    createLemonSqueezyCheckout, deleteLemonSqueezyDiscount, deleteLemonSqueezyDiscountsByCode, getLemonSqueezyConfigIssues, getMissingLemonSqueezyConfigKeys, isLemonSqueezyConfigured, syncLemonSqueezyDiscount, verifyLemonSqueezySignature,
    generateTransactionId, planDisplayName, createPlanExpiry, createRenewedPlanExpiry, getEffectivePlan, isPaidPlan,
    markSessionCurrent, invalidateUserSessions,
    documentSummary, documentDetails, titleFromCvData, sanitizeCvDataForStorage, getPublicCvBaseUrl, publicCvShareUrl, resolveRequestedTemplate, generateGeminiText, Type, ALLOWED_MIME_TYPES, ALLOWED_SECTION_TYPES, MAX_BASE64_LENGTH,
    extractCvText, parseCvTextToStructuredData, withImportMeta,
    getCvCreationQuota, incrementCvCreationQuota, rollbackCvCreationQuota, getCvImportQuota, consumeCvImportQuota, rollbackCvImportQuota, getHtmlPdfQuota, consumeHtmlPdfQuota, rollbackHtmlPdfQuota, buildCvCreationQuota, buildDownloadQuota,
    requireVerifiedEmail, requirePaidPlan,
    startOfUtcDay, formatUtcDay, parsePaymentAmountCents, escapeRegex, adminUserSummary, adminPaymentSummary,
    SUPPORT_TICKET_TYPES, SUPPORT_TICKET_STATUSES, SUPPORT_TICKET_PRIORITIES, sanitizeContactMessage, adminSupportTicketSummary,
    recordAdminAuditLog, adminAuditLogSummary,
    logEvent, logError,
    emailGreetingName, mergeEmailTemplates, renderEmailTemplate, buildBrandedEmailHtml,
    sendAppEmail, sendSystemEmail, sendNotificationEmail, isEmailServiceConfigured, normalizeEmailFrom, getAppEmailFrom,
    roleForEmail, syncUserRoleFromAllowlist, isSuperAdmin, isUserRole, isAdminIpAllowed,
    mongoose, randomBytes, randomInt, createHash, timingSafeEqual,
};

export type AppRouteDeps = typeof routeDeps;
