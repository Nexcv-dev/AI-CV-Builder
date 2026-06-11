import express, { Router, Request, Response, NextFunction } from 'express';
import path from 'path';
import { readFile } from 'fs/promises';
import { bindDeps } from './_shared';
import type { BillingPlan } from '../server-models/userPlan';
import type { TemplateName } from '@nexcv/templates';
import type { PublicAppSettingsResponse, TemplateConfigResponse } from '@nexcv/api-contracts';
import { mergeCmsContent } from '@nexcv/shared/contentDefaults';
import { getOrSetCachedValue, parseCacheTtlMs } from '../server-utils/ttlCache';

type RouteDeps = Record<string, any>;

const repoRootPath = path.resolve(process.cwd(), '../..');
const webDistPath = process.env.WEB_DIST_DIR
    ? path.resolve(process.env.WEB_DIST_DIR)
    : path.join(repoRootPath, 'apps', 'web', 'dist');
const adminTemplatesPath = process.env.ADMIN_TEMPLATES_DIR
    ? path.resolve(process.env.ADMIN_TEMPLATES_DIR)
    : path.join(repoRootPath, 'Admin Templates');

const publicCacheControl = (browserMaxAgeSeconds: number, cdnMaxAgeSeconds = browserMaxAgeSeconds) => (
    `public, max-age=${browserMaxAgeSeconds}, s-maxage=${cdnMaxAgeSeconds}, stale-while-revalidate=${cdnMaxAgeSeconds}`
);

const publicCvDownloadHits = new Map<string, { count: number; resetAt: number }>();
const publicCvPreviewScript = `(() => {
  const mobileQuery = window.matchMedia('(max-width: 620px)');
  const findPreview = () => Array.from(document.body.children).find((element) => (
    !element.matches('.nexcv-public-toolbar, .nexcv-watermark, script, style')
  ));
  let preview = null;
  let resizeObserver = null;

  const syncPreviewHeight = () => {
    preview = preview || findPreview();
    if (!preview) return;
    if (!mobileQuery.matches) {
      preview.style.removeProperty('margin-bottom');
      return;
    }

    const transform = window.getComputedStyle(preview).transform;
    const matrix = transform && transform !== 'none' ? new DOMMatrixReadOnly(transform) : null;
    const scale = matrix ? Math.abs(matrix.a) : 1;
    const reservedHeight = preview.scrollHeight;
    const unusedHeight = Math.max(0, reservedHeight * (1 - scale));
    preview.style.setProperty('margin-bottom', \`-\${unusedHeight}px\`, 'important');
  };

  const start = () => {
    preview = findPreview();
    if (!preview) return;
    resizeObserver = new ResizeObserver(syncPreviewHeight);
    resizeObserver.observe(preview);
    syncPreviewHeight();
    window.addEventListener('resize', syncPreviewHeight, { passive: true });
    mobileQuery.addEventListener?.('change', syncPreviewHeight);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();`;

export function registerPublicRoutes(router: Router, deps: RouteDeps) {
    const { User, CVDocument, DownloadQuota, PaymentTransaction, BillingPlanSetting, Coupon, CheckoutSession, TemplateSetting, SupportTicket, CV_TEMPLATES, DEFAULT_TEMPLATE, TemplateName, templateRequiresPaidPlan, requireAuth, requireSuperAdmin, sendError, passport, adminTemplateJsonParser, cvImportJsonParser, pdfJsonParser, authLimiter, passwordResetLimiter, publicFormLimiter, emailVerificationAttemptLimiter, emailVerificationLimiter, getRequestOrigin, isAllowedOrigin, clearS3TemplateCache, fetchS3Text, generateS3CVHTML, getCvAssetObjectStream, getS3ObjectStream, putS3Object, cvAssetS3Key, S3_TEMPLATE_BUCKET, S3_TEMPLATE_PREFIX, renderCvTemplateString, generateCVHTML, generatePdfDocument, sanitizeCvData, getDownloadQuota, incrementDownloadQuota, getActiveTemplateForKey, sanitizeTextForPrompt, sanitizeContextField, sanitizeProfileField, sanitizeDisplayName, normalizeEmail, isValidEmail, validatePasswordStrength, hashPassword, verifyPassword, hashToken, generateEmailVerificationOtp, isEmailVerified, publicUser, isMongoDuplicateKeyError, isMongoValidationError, passwordPolicyMessage, sendEmailVerificationWithRetry, sendNewAccountNotification, sendContactNotification, sendBillingSuccessNotifications, getFrontendOrigin, getApiOrigin, currentUserId, isValidDocumentId, adminTemplateSummary, customTemplateSummary, templateThumbnailPath, validateCustomTemplateKey, defaultTemplateCategory, sanitizeTemplateSource, validateTemplateHtml, validateTemplateCss, parseThumbnailUpload, TEMPLATE_CATEGORIES, TEMPLATE_SURFACE_COLOR_ROLES, TEMPLATE_STATUSES, MAX_TEMPLATE_HTML_LENGTH, MAX_TEMPLATE_CSS_LENGTH, ensureDefaultBillingPlans, billingPlanSummary, normalizeCouponCode,  isPaidBillingPlan, calculateBillingQuote, parsePayherePlan, verifyPayhereMd5Signature, markPaymentProcessed, createCheckoutHash, createCheckoutOrderId, getPayhereConfig, buildPayhereCheckoutPayload, createPlanExpiry, getEffectivePlan, isPaidPlan, documentSummary, buildInitialCvData, parsePdfText, generateGeminiText, Type, ALLOWED_MIME_TYPES, ALLOWED_SECTION_TYPES, buildCvCreationQuota, consumeCvCreationQuota, buildDownloadQuota, sendAppEmail, sendSystemEmail, sendNotificationEmail, isEmailServiceConfigured, normalizeEmailFrom, roleForEmail, syncUserRoleFromAllowlist, isSuperAdmin, mongoose, randomBytes, randomInt, createHash, timingSafeEqual, startOfUtcDay, formatUtcDay, parsePaymentAmountCents, escapeRegex, adminUserSummary, getPublicBillingPlans, planDisplayName, getPlanPrice, adminPaymentSummary, SUPPORT_TICKET_STATUSES, SUPPORT_TICKET_TYPES, SUPPORT_TICKET_PRIORITIES, sanitizeContactMessage, adminSupportTicketSummary, emailGreetingName, getCvCreationQuota, incrementCvCreationQuota, documentDetails, requireVerifiedEmail, resolveRequestedTemplate, titleFromCvData, requirePaidPlan, MAX_BASE64_LENGTH, quoteCheckout, getPayHereMerchantConfig, verifyPayHereMd5Signature, resolvePayHerePaymentContext, PAYHERE_PLAN_PRICES, payHereAmountToCents, generateTransactionId, getPayHereCheckoutUrl, buildPayHereCheckoutHash, getReleasedTemplateDefinition, getReleasedTemplateSummaries } = bindDeps(deps);

    const localAdminTemplateFile = async (sourceFolder: string | undefined, fileName: string) => {
        if (!sourceFolder) return null;
        try {
            return await readFile(path.join(adminTemplatesPath, sourceFolder, fileName));
        } catch {
            return null;
        }
    };
    const htmlEscape = (value: string) => (
        value
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
    );
    const publicCvCacheControl = () => {
        const browserSeconds = Math.max(0, Number.parseInt(process.env.PUBLIC_CV_CACHE_BROWSER_SECONDS || '60', 10) || 60);
        const cdnSeconds = Math.max(0, Number.parseInt(process.env.PUBLIC_CV_CACHE_CDN_SECONDS || '300', 10) || 300);
        return `public, max-age=${browserSeconds}, s-maxage=${cdnSeconds}, stale-while-revalidate=600`;
    };
    const publicCvDownloadLimit = () => Math.max(1, Number.parseInt(process.env.PUBLIC_CV_DOWNLOAD_LIMIT_PER_HOUR || '5', 10) || 5);
    const publicCvDownloadRateLimit = (req: Request, shareSlug: string) => {
        const now = Date.now();
        const key = `${shareSlug}:${req.ip || req.socket.remoteAddress || 'unknown'}`;
        const current = publicCvDownloadHits.get(key);
        if (!current || current.resetAt <= now) {
            publicCvDownloadHits.set(key, { count: 1, resetAt: now + 60 * 60 * 1000 });
            return { allowed: true, remaining: publicCvDownloadLimit() - 1, resetAt: now + 60 * 60 * 1000 };
        }
        if (current.count >= publicCvDownloadLimit()) {
            return { allowed: false, remaining: 0, resetAt: current.resetAt };
        }
        current.count += 1;
        return { allowed: true, remaining: Math.max(publicCvDownloadLimit() - current.count, 0), resetAt: current.resetAt };
    };
    const contentDispositionFileName = (value: string) => {
        const safe = value.replace(/[^\w\s.-]+/g, '').trim().replace(/\s+/g, '_').slice(0, 80) || 'CV';
        return `${safe}_Resume.pdf`;
    };
    const injectPublicCvMeta = (html: string, title: string, description: string, canonicalUrl: string) => {
        const safeTitle = htmlEscape(title);
        const safeDescription = htmlEscape(description);
        const safeCanonicalUrl = htmlEscape(canonicalUrl);
        const publicPreviewCss = `
<style id="nexcv-public-cv-preview">
  @media screen {
    html {
      width: 100% !important;
      min-width: 0 !important;
      min-height: 100% !important;
      overflow-x: hidden !important;
      overscroll-behavior-x: none !important;
      background: #020617 !important;
    }
    body {
      box-sizing: border-box !important;
      width: 100% !important;
      max-width: 100vw !important;
      min-width: 0 !important;
      min-height: 100vh !important;
      margin: 0 !important;
      padding: 0 16px 32px !important;
      overflow-x: hidden !important;
      overscroll-behavior-x: none !important;
      touch-action: pan-y !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: flex-start !important;
      justify-content: flex-start !important;
      background:
        radial-gradient(circle at top left, rgba(124, 58, 237, 0.22), transparent 32rem),
        linear-gradient(135deg, #020617 0%, #111827 48%, #1e1b4b 100%) !important;
    }
    body > :not(.nexcv-watermark):not(.nexcv-public-toolbar):not(script):not(style) {
      flex: 0 0 auto !important;
      width: 210mm !important;
      max-width: 210mm !important;
      min-width: 210mm !important;
      min-height: 297mm !important;
      margin: 0 auto !important;
      background: #ffffff !important;
      box-shadow: 0 28px 80px rgba(0, 0, 0, 0.36) !important;
    }
    .nexcv-public-toolbar {
      position: sticky !important;
      z-index: 2147483640 !important;
      top: 0 !important;
      left: auto !important;
      transform: none !important;
      width: min(980px, calc(100vw - 24px)) !important;
      min-width: 0 !important;
      min-height: 0 !important;
      margin: 0 auto 16px !important;
      padding: 10px 12px !important;
      border: 1px solid rgba(255,255,255,0.12) !important;
      border-radius: 14px !important;
      background: rgba(15, 23, 42, 0.86) !important;
      color: #f8fafc !important;
      box-shadow: 0 16px 40px rgba(0,0,0,0.24) !important;
      backdrop-filter: blur(16px) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 12px !important;
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
    }
    .nexcv-public-toolbar strong {
      display: block !important;
      max-width: 52vw !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
      font-size: 14px !important;
      line-height: 1.2 !important;
      letter-spacing: 0 !important;
      color: #ffffff !important;
    }
    .nexcv-public-toolbar span {
      display: block !important;
      margin-top: 2px !important;
      font-size: 11px !important;
      line-height: 1.2 !important;
      color: #94a3b8 !important;
    }
    .nexcv-public-toolbar a {
      flex: 0 0 auto !important;
      min-width: auto !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      min-height: 40px !important;
      padding: 0 14px !important;
      border-radius: 10px !important;
      background: #7c3aed !important;
      color: #ffffff !important;
      font-size: 13px !important;
      font-weight: 800 !important;
      text-decoration: none !important;
      box-shadow: 0 10px 24px rgba(124, 58, 237, 0.28) !important;
    }
  }
  @media screen and (max-width: 840px) {
    body {
      justify-content: flex-start !important;
    }
  }
  @media screen and (max-width: 620px) {
    body {
      align-items: center !important;
      padding: 16px 12px calc(116px + env(safe-area-inset-bottom)) !important;
    }
    body > :not(.nexcv-watermark):not(.nexcv-public-toolbar):not(script):not(style) {
      margin: 0 !important;
      transform-origin: top center !important;
      transform: scale(0.75) !important;
    }
    .nexcv-public-toolbar {
      position: fixed !important;
      top: auto !important;
      bottom: max(12px, env(safe-area-inset-bottom)) !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      width: auto !important;
      margin: 0 !important;
      padding: 6px !important;
      border-radius: 14px !important;
    }
    .nexcv-public-toolbar > div {
      display: none !important;
    }
    .nexcv-public-toolbar a {
      width: auto !important;
      min-width: 150px !important;
      min-height: 44px !important;
      padding: 0 16px !important;
      font-size: 13px !important;
      border-radius: 10px !important;
    }
  }
  @media screen and (max-width: 540px) {
    body > :not(.nexcv-watermark):not(.nexcv-public-toolbar):not(script):not(style) {
      transform: scale(0.65) !important;
    }
  }
  @media screen and (max-width: 460px) {
    body > :not(.nexcv-watermark):not(.nexcv-public-toolbar):not(script):not(style) {
      transform: scale(0.54) !important;
    }
  }
  @media screen and (max-width: 400px) {
    body > :not(.nexcv-watermark):not(.nexcv-public-toolbar):not(script):not(style) {
      transform: scale(0.46) !important;
    }
  }
  @media screen and (max-width: 360px) {
    body > :not(.nexcv-watermark):not(.nexcv-public-toolbar):not(script):not(style) {
      transform: scale(0.42) !important;
    }
  }
  @media print {
    .nexcv-public-toolbar {
      display: none !important;
    }
  }
</style>`;
        const meta = [
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
            `<meta name="description" content="${safeDescription}">`,
            `<meta name="robots" content="noindex, nofollow">`,
            `<link rel="canonical" href="${safeCanonicalUrl}">`,
            '<meta property="og:type" content="profile">',
            `<meta property="og:title" content="${safeTitle}">`,
            `<meta property="og:description" content="${safeDescription}">`,
            `<meta property="og:url" content="${safeCanonicalUrl}">`,
            '<meta name="twitter:card" content="summary">',
            `<meta name="twitter:title" content="${safeTitle}">`,
            `<meta name="twitter:description" content="${safeDescription}">`,
            publicPreviewCss,
            '<script src="/assets/public-cv-preview.js" defer></script>',
        ].join('\n');

        const withTitle = /<title>[\s\S]*?<\/title>/i.test(html)
            ? html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`)
            : html.includes('</head>')
                ? html.replace('</head>', `<title>${safeTitle}</title>\n</head>`)
                : html;
        return withTitle.includes('</head>')
            ? withTitle.replace('</head>', `${meta}\n</head>`)
            : `<!doctype html><html><head><title>${safeTitle}</title>${meta}</head><body>${withTitle}</body></html>`;
    };
    const injectPublicCvToolbar = (html: string, title: string, shareSlug: string) => {
        const toolbar = `<div class="nexcv-public-toolbar" aria-label="Shared CV actions">
  <div><strong>${htmlEscape(title)}</strong><span>Shared live CV</span></div>
  <a href="/cv/${encodeURIComponent(shareSlug)}/download">Download PDF</a>
</div>`;
        return html.includes('<body')
            ? html.replace(/(<body\b[^>]*>)/i, `$1${toolbar}`)
            : `${toolbar}${html}`;
    };
    const linkifyPlainPublicCvUrls = (html: string) => {
        const linkedText = (text: string) => text.replace(
            /\bhttps?:\/\/[^\s<>"']+/gi,
            (rawUrl) => {
                const trailing = rawUrl.match(/[),.;:!?]+$/)?.[0] || '';
                const url = trailing ? rawUrl.slice(0, -trailing.length) : rawUrl;
                const safeUrl = htmlEscape(url);
                return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a>${trailing}`;
            }
        );

        const chunks = html.split(/(<a\b[\s\S]*?<\/a>|<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<[^>]+>)/gi);
        return chunks.map((chunk) => (
            /^<(?:a|script|style)\b/i.test(chunk) || /^<[^>]+>$/.test(chunk)
                ? chunk
                : linkedText(chunk)
        )).join('');
    };
    const renderSharedCvHtml = async (document: any, watermark: boolean) => {
        const template = document.template || DEFAULT_TEMPLATE;
        const isBuiltInTemplate = CV_TEMPLATES.some((item: any) => item.key === template);
        let s3Html: string | null = null;

        if (!isBuiltInTemplate) {
            const customTemplate = await TemplateSetting
                .findOne({ key: template, source: 'custom', status: 'active' })
                .select('indexS3Key styleS3Key');

            if (customTemplate?.indexS3Key) {
                const indexHtml = await fetchS3Text(customTemplate.indexS3Key);
                if (indexHtml) {
                    const css = customTemplate.styleS3Key ? await fetchS3Text(customTemplate.styleS3Key) : '';
                    const templateHtml = css
                        ? indexHtml.includes('</head>')
                            ? indexHtml.replace('</head>', `<style>\n${css}\n</style>\n</head>`)
                            : `<style>\n${css}\n</style>\n${indexHtml}`
                        : indexHtml;
                    s3Html = renderCvTemplateString(templateHtml, { ...document.cvData, template }, { watermark });
                }
            }
        }

        s3Html = s3Html || await generateS3CVHTML(document.cvData, template, { watermark }).catch(() => null);
        return s3Html || generateCVHTML(document.cvData, template, { watermark });
    };
    const findSharedDocument = async (shareSlug: string) => {
        if (!/^[A-Za-z0-9_-]{16,80}$/.test(shareSlug)) return null;
        return CVDocument
            .findOne({ shareEnabled: true, shareSlug })
            .populate('userId', 'role plan planExpiresAt');
    };

    router.get('/api/health', (req: Request, res: Response) => {
        if (req.accepts(['json', 'html']) === 'html') {
            return res.status(404).sendFile(path.join(webDistPath, 'index.html'));
        }

        const mongoConfigured = Boolean((process.env.MONGO_URI || process.env.MONGODB_URI || '').trim());
        const mongoReadyState = mongoose?.connection?.readyState;
        const payhereConfig = getPayHereMerchantConfig();
        const checks = {
            api: {
                ok: true,
                detail: 'API process is responding.',
            },
            mongodb: {
                ok: !mongoConfigured || mongoReadyState === 1,
                configured: mongoConfigured,
                state: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoReadyState] || 'unknown',
            },
            session: {
                ok: Boolean((process.env.SESSION_SECRET || '').trim()) || process.env.NODE_ENV !== 'production',
                configured: Boolean((process.env.SESSION_SECRET || '').trim()),
            },
            email: {
                ok: isEmailServiceConfigured(),
                configured: isEmailServiceConfigured(),
            },
            payhere: {
                ok: Boolean(payhereConfig.merchantId && payhereConfig.merchantSecret),
                configured: Boolean(payhereConfig.merchantId && payhereConfig.merchantSecret),
                checkoutUrl: getPayHereCheckoutUrl(),
                notifyUrlConfigured: Boolean((process.env.PAYHERE_NOTIFY_URL || '').trim()),
            },
            s3Templates: {
                ok: Boolean(S3_TEMPLATE_BUCKET),
                configured: Boolean(S3_TEMPLATE_BUCKET),
                prefix: S3_TEMPLATE_PREFIX || '',
            },
            pdfLambda: {
                ok: Boolean((process.env.PDF_LAMBDA_URL || '').trim()),
                configured: Boolean((process.env.PDF_LAMBDA_URL || '').trim()),
            },
        };
        const status = Object.values(checks).every((check: any) => check.ok) ? 'ok' : 'degraded';
        const canViewDetailedHealth = process.env.NODE_ENV !== 'production' || isSuperAdmin(req.user);
        if (!canViewDetailedHealth) {
            return res.json({
                status,
                timestamp: new Date().toISOString(),
            });
        }

        res.json({
            status,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            uptimeSeconds: Math.round(process.uptime()),
            checks,
        });
    });

    router.get('/api/ready', (_req: Request, res: Response) => {
        const mongoConfigured = Boolean((process.env.MONGO_URI || process.env.MONGODB_URI || '').trim());
        const mongoReady = !mongoConfigured || mongoose?.connection?.readyState === 1;
        if (!mongoReady) {
            return res.status(503).json({
                status: 'not_ready',
                mongodb: {
                    configured: mongoConfigured,
                    state: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose?.connection?.readyState] || 'unknown',
                },
            });
        }

        return res.json({ status: 'ready' });
    });

    router.get('/assets/public-cv-preview.js', (_req: Request, res: Response) => {
        res.setHeader('Cache-Control', publicCacheControl(3600, 86400));
        return res.type('application/javascript').send(publicCvPreviewScript);
    });

    router.get('/api/public/app-settings', (req: Request, res: Response) => {
        const settings = (req as any).appSettings;
        const cmsContent = mergeCmsContent(settings?.cmsContent);
        const response = {
            maintenanceMode: Boolean(settings?.maintenanceMode),
            announcementEnabled: Boolean(settings?.announcementEnabled || cmsContent.announcement.enabled),
            announcementText: settings?.announcementText || cmsContent.announcement.text || '',
            announcement: cmsContent.announcement,
            cmsContent,
            supportEmail: settings?.supportEmail || 'support@nexcv.com',
            adminAccessAllowed: typeof deps.isAdminIpAllowed === 'function' ? deps.isAdminIpAllowed(req) : true,
        } satisfies PublicAppSettingsResponse;
        return res.json(response);
    });

    router.get('/cv/:shareSlug', async (req: Request, res: Response) => {
        try {
            const shareSlug = String(req.params.shareSlug || '').trim();
            if (!/^[A-Za-z0-9_-]{16,80}$/.test(shareSlug)) {
                return res.status(404).type('text/plain').send('CV not found');
            }

            const document = await findSharedDocument(shareSlug);
            if (!document) return res.status(404).type('text/plain').send('CV not found');

            const owner = document.userId && typeof document.userId === 'object' ? document.userId : null;
            const watermark = !owner || !isPaidPlan(owner);
            const fullName = document.cvData?.personalInfo?.fullName || document.title || 'Public CV';
            const summary = document.cvData?.personalInfo?.summary || document.title || 'Public CV';
            const title = `${String(fullName).trim() || 'Public CV'} - CV`;
            const description = String(summary).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180) || title;
            const canonicalUrl = `${getApiOrigin(req).replace(/\/+$/, '')}/cv/${encodeURIComponent(shareSlug)}`;
            const html = linkifyPlainPublicCvUrls(
                injectPublicCvToolbar(
                    injectPublicCvMeta(await renderSharedCvHtml(document, watermark), title, description, canonicalUrl),
                    title,
                    shareSlug
                )
            );
            void CVDocument.updateOne(
                { _id: document._id },
                { $inc: { shareViewCount: 1 }, $set: { shareLastViewedAt: new Date() } }
            ).catch(() => undefined);

            res.setHeader('Cache-Control', publicCvCacheControl());
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.send(html);
        } catch (error) {
            return sendError(res, 500, 'Could not load this shared CV.', error);
        }
    });

    router.get('/cv/:shareSlug/download', async (req: Request, res: Response) => {
        try {
            const shareSlug = String(req.params.shareSlug || '').trim();
            const limit = publicCvDownloadRateLimit(req, shareSlug);
            res.setHeader('X-RateLimit-Limit', String(publicCvDownloadLimit()));
            res.setHeader('X-RateLimit-Remaining', String(limit.remaining));
            res.setHeader('X-RateLimit-Reset', String(Math.ceil(limit.resetAt / 1000)));
            if (!limit.allowed) {
                return res.status(429).json({ error: 'Download limit reached. Please try again later.' });
            }

            const document = await findSharedDocument(shareSlug);
            if (!document) return res.status(404).type('text/plain').send('CV not found');

            const owner = document.userId && typeof document.userId === 'object' ? document.userId : null;
            const watermark = !owner || !isPaidPlan(owner);
            const template = document.template || DEFAULT_TEMPLATE;
            const safeCvData = typeof sanitizeCvData === 'function' ? sanitizeCvData(document.cvData) : document.cvData;
            const html = await renderSharedCvHtml({ ...document.toObject?.() || document, cvData: safeCvData }, watermark);
            const pdf = await generatePdfDocument({
                cvData: safeCvData,
                template,
                watermark,
                html,
                templateSource: 'shared-cv',
                useWarmBrowser: false,
                useLambda: CV_TEMPLATES.some((item: any) => item.key === template),
            });

            await CVDocument.updateOne(
                { _id: document._id },
                { $inc: { shareDownloadCount: 1 }, $set: { shareLastDownloadedAt: new Date() } }
            ).catch(() => undefined);

            res.setHeader('Cache-Control', 'no-store');
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Length', pdf.buffer.length.toString());
            res.setHeader('Content-Disposition', `attachment; filename="${contentDispositionFileName(document.title || 'CV')}"`);
            return res.send(Buffer.from(pdf.buffer));
        } catch (error) {
            return sendError(res, 500, 'Could not download this shared CV.', error);
        }
    });


    router.get('/api/cv-assets/:userId/:fileName', async (req: Request, res: Response) => {
        try {
            const userId = String(req.params.userId || '');
            const fileName = String(req.params.fileName || '');
            if (!/^[a-f0-9]{24}$/i.test(userId) || !/^[a-f0-9]{32}\.(?:webp|png|jpe?g)$/i.test(fileName)) {
                return res.status(404).json({ error: 'Image not found.' });
            }

            const response = await getCvAssetObjectStream(cvAssetS3Key(userId, fileName));
            if (!response) return res.status(404).json({ error: 'Image not found.' });

            res.setHeader('Content-Type', response.ContentType || 'image/webp');
            res.setHeader('Cache-Control', publicCacheControl(3600, 86400));
            if (response.Body && typeof (response.Body as any).pipe === 'function') {
                return (response.Body as any).pipe(res);
            }
            const chunks: Buffer[] = [];
            for await (const chunk of response.Body as any) {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            return res.send(Buffer.concat(chunks));
        } catch (error: any) {
            const code = error?.name || error?.Code || error?.code;
            if (code === 'NoSuchKey' || code === 'NotFound' || error?.$metadata?.httpStatusCode === 404) {
                return res.status(404).json({ error: 'Image not found.' });
            }
            return sendError(res, 500, 'Could not load CV image.', error);
        }
    });


    router.get('/api/templates/config', async (_req: Request, res: Response) => {
        try {
            const data = await getOrSetCachedValue(
                'public:templates:config',
                parseCacheTtlMs(process.env.TEMPLATE_CONFIG_CACHE_TTL_MS, 5 * 60_000),
                async () => {
                    const settings = await TemplateSetting.find();
                    const settingMap = new Map(settings.map((setting) => [setting.key, setting]));
                    const builtInKeys = new Set<string>(CV_TEMPLATES.map((template) => template.key));
                    const builtIns = CV_TEMPLATES
                        .map((template) => adminTemplateSummary(template, settingMap.get(template.key), 0))
                        .filter((template) => template.status !== 'archived');
                    const releasedTemplates = getReleasedTemplateSummaries(settingMap, 0)
                        .filter((template: any) => !builtInKeys.has(template.key));
                    const customTemplates = settings
                        .filter((setting) => setting.source === 'custom' && setting.status === 'active' && !builtInKeys.has(setting.key))
                        .map((setting) => customTemplateSummary(setting, 0));
                    const releasedKeys = new Set(releasedTemplates.map((template: any) => template.key));
                    return { templates: [...builtIns, ...releasedTemplates, ...customTemplates.filter((template: any) => !releasedKeys.has(template.key))] } satisfies TemplateConfigResponse;
                }
            );
            res.setHeader('Cache-Control', publicCacheControl(60, 300));
            return res.json(data);
        } catch (error) {
            return sendError(res, 500, 'Could not load template configuration.', error);
        }
    });


    router.get('/api/templates/:key/html', async (req: Request, res: Response) => {
        try {
            const key = validateCustomTemplateKey(req.params.key);
            if (!key) return res.status(400).json({ error: 'Invalid template key.' });

            const html = await getOrSetCachedValue(
                `public:templates:html:${key}`,
                parseCacheTtlMs(process.env.TEMPLATE_HTML_CACHE_TTL_MS, 10 * 60_000),
                async () => {
                    const setting = await TemplateSetting.findOne({ key, source: 'custom' }).select('indexS3Key styleS3Key status');
                    const builtInTemplate = CV_TEMPLATES.find((template: any) => template.key === key);
                    const releasedTemplate = getReleasedTemplateDefinition(key);
                    if (setting && setting.status !== 'active') return '';
                    if (!setting && !builtInTemplate && !releasedTemplate) return '';
                    const s3Prefix = setting?.indexS3Key
                        ? ''
                        : builtInTemplate
                            ? (S3_TEMPLATE_PREFIX ? `${S3_TEMPLATE_PREFIX}/${key}` : key)
                            : releasedTemplate
                                ? (S3_TEMPLATE_PREFIX ? `${S3_TEMPLATE_PREFIX}/${key}` : key)
                                : '';
                    const indexS3Key = setting?.indexS3Key || (s3Prefix ? `${s3Prefix}/index.html` : '');
                    const styleS3Key = setting?.styleS3Key || (s3Prefix ? `${s3Prefix}/style.css` : '');
                    if (!indexS3Key && !releasedTemplate) return '';

                    const indexHtml = indexS3Key ? await fetchS3Text(indexS3Key) : '';
                    const localIndexHtml = indexHtml || (await localAdminTemplateFile(releasedTemplate?.sourceFolder, 'index.html'))?.toString('utf8') || '';
                    if (!localIndexHtml) return '';

                    const css = (styleS3Key ? await fetchS3Text(styleS3Key) : '') || (await localAdminTemplateFile(releasedTemplate?.sourceFolder, 'style.css'))?.toString('utf8') || '';
                    return css
                        ? localIndexHtml.includes('</head>')
                            ? localIndexHtml.replace('</head>', `<style>\n${css}\n</style>\n</head>`)
                            : `<style>\n${css}\n</style>\n${localIndexHtml}`
                        : localIndexHtml;
                }
            );
            if (!html) return res.status(404).json({ error: 'Template HTML not found.' });

            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Cache-Control', publicCacheControl(300, 600));
            return res.send(html);
        } catch (error) {
            return sendError(res, 500, 'Could not load template HTML.', error);
        }
    });


    router.get('/api/templates/:key/thumbnail', async (req: Request, res: Response) => {
        try {
            const key = validateCustomTemplateKey(req.params.key);
            if (!key) return res.status(400).json({ error: 'Invalid template key.' });
            const releasedTemplate = getReleasedTemplateDefinition(key);
            const setting = await TemplateSetting.findOne({ key, source: 'custom' });
            if (setting?.status === 'archived') return res.status(404).json({ error: 'Template thumbnail not found.' });
            if (!setting?.thumbnailS3Key && !releasedTemplate) return res.status(404).json({ error: 'Template thumbnail not found.' });
            const currentPrefix = S3_TEMPLATE_PREFIX ? `${S3_TEMPLATE_PREFIX}/${key}` : key;
            const storedPrefix = setting?.s3Prefix || '';
            const thumbnailKeys = [
                `${currentPrefix}/thumbnail.webp`,
                storedPrefix ? `${storedPrefix}/thumbnail.webp` : '',
                setting?.thumbnailS3Key,
            ].filter((item, index, list) => item && list.indexOf(item) === index);

            let response: any = null;
            for (const thumbnailKey of thumbnailKeys) {
                try {
                    response = await getS3ObjectStream(thumbnailKey);
                    if (response) break;
                } catch (error: any) {
                    const code = error?.name || error?.Code || error?.code;
                    if (code !== 'NoSuchKey' && code !== 'NotFound' && error?.$metadata?.httpStatusCode !== 404) throw error;
                }
            }
            if (!response) {
                const localThumbnail = await localAdminTemplateFile(releasedTemplate?.sourceFolder, 'thumbnail.webp')
                    || await localAdminTemplateFile(releasedTemplate?.sourceFolder, 'thumbnail.png')
                    || await localAdminTemplateFile(releasedTemplate?.sourceFolder, 'thumbnail.jpg')
                    || await localAdminTemplateFile(releasedTemplate?.sourceFolder, 'thumbnail.svg');
                if (!localThumbnail) return res.status(404).json({ error: 'Template thumbnail not configured.' });
                res.setHeader('Content-Type', 'image/webp');
                res.setHeader('Cache-Control', 'public, max-age=3600');
                return res.send(localThumbnail);
            }
            res.setHeader('Content-Type', response.ContentType || 'image/webp');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            if (response.Body && typeof (response.Body as any).pipe === 'function') {
                return (response.Body as any).pipe(res);
            }
            const chunks: Buffer[] = [];
            for await (const chunk of response.Body as any) {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            return res.send(Buffer.concat(chunks));
        } catch (error) {
            return sendError(res, 500, 'Could not load template thumbnail.', error);
        }
    });


    router.post('/api/support/tickets', publicFormLimiter, async (req: Request, res: Response) => {
        try {
            const fullName = sanitizeDisplayName(req.body.fullName || (req.user as any)?.displayName || '');
            const email = normalizeEmail(req.body.email || (req.user as any)?.email || '');
            const type = SUPPORT_TICKET_TYPES.includes(req.body.type) ? req.body.type : 'general';
            const subject = sanitizeProfileField(req.body.subject, 160) || 'Support request';
            const message = sanitizeContactMessage(req.body.message);
    
            if (!fullName) {
                return res.status(400).json({ error: 'Enter your name.' });
            }
            if (!isValidEmail(email)) {
                return res.status(400).json({ error: 'Enter a valid email address.' });
            }
            if (!message || message.length < 10) {
                return res.status(400).json({ error: 'Enter a message with at least 10 characters.' });
            }
    
            const ticket = await SupportTicket.create({
                userId: req.user ? currentUserId(req) : undefined,
                fullName,
                email,
                type,
                subject,
                message,
                priority: type === 'payment_issue' ? 'high' : 'normal',
            });
    
            if (isEmailServiceConfigured()) {
                void sendContactNotification({ fullName, email, message: `[${type}] ${subject}\n\n${message}` });
            }
    
            return res.status(201).json({
                ticket: adminSupportTicketSummary(ticket),
                message: 'Support ticket created. We will get back to you soon.',
            });
        } catch (error) {
            return sendError(res, 500, 'Could not create support ticket.', error);
        }
    });


    router.post('/api/contact', publicFormLimiter, async (req: Request, res: Response) => {
        try {
            const fullName = sanitizeDisplayName(req.body.fullName);
            const email = normalizeEmail(req.body.email);
            const message = sanitizeContactMessage(req.body.message);
    
            if (!fullName) {
                return res.status(400).json({ error: 'Enter your name.' });
            }
    
            if (!isValidEmail(email)) {
                return res.status(400).json({ error: 'Enter a valid email address.' });
            }
    
            if (!message || message.length < 10) {
                return res.status(400).json({ error: 'Enter a message with at least 10 characters.' });
            }
    
            if (!isEmailServiceConfigured()) {
                return res.status(500).json({ error: 'Email service is not configured.' });
            }
    
            await sendContactNotification({ fullName, email, message });
            return res.json({ message: 'Message sent. We will get back to you soon.' });
        } catch (error) {
            return sendError(res, 500, 'Could not send your message.', error);
        }
    });
    
    // â”€â”€â”€ Auth Routes (Placeholders) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

}
