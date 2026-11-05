import express, { Router, Request, Response } from 'express';
import type { BillingPlan } from '../server-models/userPlan';
import {
    cancelPendingCheckout,
    failPendingCheckout,
    LEMON_SQUEEZY_CHECKOUT_EXPIRY_MS,
    markExpiredPendingCheckouts,
    PAYHERE_CHECKOUT_EXPIRY_MS,
    startPendingCheckout,
} from '../services/checkoutSessionService';
import {
    processVerifiedPayment,
    recordUnprocessedPayment,
    type PaymentTransactionRecord,
} from '../services/paymentProcessingService';
import type {
    BillingPlansResponse,
    CheckoutCancelResponse,
    CheckoutQuoteResponse,
    CheckoutStatusResponse,
    FeaturedCouponResponse,
    LemonSqueezyCheckoutResponse,
    PayHereCheckoutResponse,
} from '@nexcv/api-contracts/billing';
import { API_ERROR_CODES } from '../server-utils/apiErrors';
import type { AppRouteDeps } from '../routeDeps';

export type PaymentRouteDeps = Pick<AppRouteDeps,
    | 'billingQuoteLimiter'
    | 'buildPayHereCheckoutHash'
    | 'CheckoutSession'
    | 'Coupon'
    | 'createLemonSqueezyCheckout'
    | 'currentUserId'
    | 'generateTransactionId'
    | 'getApiOrigin'
    | 'getFrontendOrigin'
    | 'getLemonSqueezyConfigIssues'
    | 'getMissingLemonSqueezyConfigKeys'
    | 'getPayHereCheckoutUrl'
    | 'getPayHereMerchantConfig'
    | 'getPublicBillingPlans'
    | 'isLemonSqueezyConfigured'
    | 'isPaidBillingPlan'
    | 'logError'
    | 'logEvent'
    | 'mongoose'
    | 'normalizeEmail'
    | 'PAYHERE_PLAN_PRICES'
    | 'payHereAmountToCents'
    | 'PaymentTransaction'
    | 'planDisplayName'
    | 'publicUser'
    | 'quoteCheckout'
    | 'requireAdminPermission'
    | 'requireAuth'
    | 'requireVerifiedEmail'
    | 'resolveBillingMarket'
    | 'resolvePayHerePaymentContext'
    | 'sanitizeProfileField'
    | 'sendBillingAlertNotification'
    | 'sendBillingSuccessNotifications'
    | 'sendError'
    | 'User'
    | 'verifyLemonSqueezySignature'
    | 'verifyPayHereMd5Signature'
>;

export function registerPaymentRoutes(router: Router, deps: PaymentRouteDeps) {
    const {
        CheckoutSession,
        Coupon,
        PaymentTransaction,
        PAYHERE_PLAN_PRICES,
        billingQuoteLimiter,
        User,
        buildPayHereCheckoutHash,
        currentUserId,
        generateTransactionId,
        createLemonSqueezyCheckout,
        getApiOrigin,
        getFrontendOrigin,
        getLemonSqueezyConfigIssues,
        getMissingLemonSqueezyConfigKeys,
        getPayHereCheckoutUrl,
        getPayHereMerchantConfig,
        getPublicBillingPlans,
        isPaidBillingPlan,
        logError,
        logEvent,
        mongoose,
        normalizeEmail,
        payHereAmountToCents,
        planDisplayName,
        publicUser,
        isLemonSqueezyConfigured,
        quoteCheckout,
        requireAdminPermission,
        requireAuth,
        requireVerifiedEmail,
        resolveBillingMarket,
        resolvePayHerePaymentContext,
        sanitizeProfileField,
        sendBillingAlertNotification,
        sendBillingSuccessNotifications,
        sendError,
        verifyLemonSqueezySignature,
        verifyPayHereMd5Signature,
    } = deps;

    const checkoutModels = { CheckoutSession, Coupon };
    const paymentProcessingDeps = { mongoose, User, CheckoutSession, PaymentTransaction };
    const couponLimitReached = (res: Response) => res.status(409).json({
        error: 'Coupon redemption limit reached. Please refresh checkout and try again.',
        code: API_ERROR_CODES.COUPON_LIMIT_REACHED,
    });

    const alertPayHereIpnFailure = async (
        event: string,
        reason: string,
        payload: Record<string, string>,
        extra: Record<string, unknown> = {}
    ) => {
        await sendBillingAlertNotification({
            event,
            reason,
            orderId: payload.order_id,
            paymentId: payload.payment_id,
            statusCode: payload.status_code,
            amount: payload.payhere_amount,
            currency: payload.payhere_currency,
            ...extra,
        });
    };

    router.get('/api/billing/plans', async (req: Request, res: Response) => {
        try {
            const billingContext = resolveBillingMarket(req.query.country, req);
            const plans = await getPublicBillingPlans(billingContext.market);
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Vary', 'CF-IPCountry, X-Vercel-IP-Country, X-Country-Code, X-AppEngine-Country');
            const response = { ...billingContext, plans } satisfies BillingPlansResponse;
            return res.json(response);
        } catch (error) {
            return sendError(res, 500, 'Could not load billing plans.', error, API_ERROR_CODES.PAYMENT_SERVICE_FAILED);
        }
    });

    router.get('/api/billing/featured-coupon', async (_req: Request, res: Response) => {
        try {
            const now = new Date();
            const coupon = await Coupon.findOne({
                active: true,
                appliesTo: { $in: ['monthly', 'quarterly'] },
                $and: [
                    { $or: [{ startsAt: { $exists: false } }, { startsAt: { $lte: now } }] },
                    { $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gte: now } }] },
                    {
                        $or: [
                            { maxRedemptions: { $exists: false } },
                            { $expr: { $lt: ['$redeemedCount', '$maxRedemptions'] } },
                        ],
                    },
                ],
            }).sort({ updatedAt: -1 });

            if (!coupon) {
                const response = { coupon: null } satisfies FeaturedCouponResponse;
                return res.json(response);
            }

            const response = {
                coupon: {
                    code: coupon.code,
                    label: coupon.label,
                    discountType: coupon.discountType,
                    discountValue: coupon.discountValue,
                    appliesTo: coupon.appliesTo,
                    redeemedCount: coupon.redeemedCount || 0,
                    maxRedemptions: coupon.maxRedemptions || null,
                },
            } satisfies FeaturedCouponResponse;
            return res.json(response);
        } catch (error) {
            return sendError(res, 500, 'Could not load featured coupon.', error, API_ERROR_CODES.PAYMENT_SERVICE_FAILED);
        }
    });

    router.post('/api/billing/quote', billingQuoteLimiter, async (req: Request, res: Response) => {
        try {
            const plan = req.body.plan as BillingPlan;
            if (!isPaidBillingPlan(plan)) {
                return res.status(400).json({
                    error: 'Choose a valid paid plan.',
                    code: API_ERROR_CODES.VALIDATION_FAILED,
                });
            }
            const billingContext = resolveBillingMarket(req.body.country, req);
            const quote = await quoteCheckout(plan, req.body.couponCode, billingContext.market);
            if ('error' in quote) {
                return res.status(400).json({
                    error: quote.error,
                    code: API_ERROR_CODES.COUPON_INVALID,
                });
            }
            const response = { quote: { ...quote, country: billingContext.country, countrySource: billingContext.source } } satisfies CheckoutQuoteResponse;
            return res.json(response);
        } catch (error) {
            return sendError(res, 500, 'Could not calculate checkout total.', error, API_ERROR_CODES.PAYMENT_SERVICE_FAILED);
        }
    });

    router.post('/api/payhere/ipn', express.urlencoded({ extended: false }), async (req: Request, res: Response) => {
        try {
            const payload = req.body as Record<string, string>;
            const requiredFields = ['merchant_id', 'order_id', 'payment_id', 'payhere_amount', 'payhere_currency', 'status_code', 'md5sig'];
            const missingField = requiredFields.find((field) => typeof payload[field] !== 'string' || !payload[field].trim());
            if (missingField) {
                logEvent('warn', 'payment.payhere_ipn_missing_field', {
                    missingField,
                    orderId: payload.order_id,
                    paymentId: payload.payment_id,
                    statusCode: payload.status_code,
                });
                return res.status(400).send('Missing payment notification field.');
            }

            const { merchantId, merchantSecret } = getPayHereMerchantConfig();
            if (!merchantId || !merchantSecret) {
                logEvent('error', 'payment.payhere_ipn_config_missing', {
                    orderId: payload.order_id,
                    paymentId: payload.payment_id,
                });
                await alertPayHereIpnFailure(
                    'payment.payhere_ipn_config_missing',
                    'PayHere merchant id or merchant secret is missing.',
                    payload
                );
                return res.status(500).send('Payment notification is not configured.');
            }

            if (payload.merchant_id !== merchantId) {
                logEvent('warn', 'payment.payhere_ipn_merchant_mismatch', {
                    orderId: payload.order_id,
                    paymentId: payload.payment_id,
                });
                await alertPayHereIpnFailure(
                    'payment.payhere_ipn_merchant_mismatch',
                    'IPN merchant id did not match the configured merchant.',
                    payload
                );
                return res.status(400).send('Invalid merchant.');
            }

            const signaturePayload = {
                merchant_id: payload.merchant_id,
                order_id: payload.order_id,
                payhere_amount: payload.payhere_amount,
                payhere_currency: payload.payhere_currency,
                status_code: payload.status_code,
                md5sig: payload.md5sig,
            };

            if (!verifyPayHereMd5Signature(signaturePayload, merchantSecret)) {
                logEvent('warn', 'payment.payhere_ipn_signature_failed', {
                    orderId: payload.order_id,
                    paymentId: payload.payment_id,
                    statusCode: payload.status_code,
                });
                await alertPayHereIpnFailure(
                    'payment.payhere_ipn_signature_failed',
                    'IPN signature verification failed.',
                    payload
                );
                return res.status(400).send('Invalid payment signature.');
            }

            await markExpiredPendingCheckouts(CheckoutSession, Coupon);

            const context = resolvePayHerePaymentContext(payload);
            const checkoutSession = await CheckoutSession.findOne({ orderId: payload.order_id });
            const transactionFilter = { provider: 'payhere' as const, paymentId: payload.payment_id };
            const existingTransaction = await PaymentTransaction.findOne(transactionFilter);
            if (existingTransaction?.processed) {
                logEvent('info', 'payment.payhere_ipn_duplicate_processed', {
                    orderId: payload.order_id,
                    paymentId: payload.payment_id,
                });
                return res.status(200).send('OK');
            }

            if (payload.status_code !== '2') {
                await recordUnprocessedPayment(PaymentTransaction, {
                    provider: 'payhere',
                    paymentId: payload.payment_id,
                    orderId: payload.order_id,
                    ...(checkoutSession?.userId ? { userId: checkoutSession.userId } : (context.userId ? { userId: context.userId } : {})),
                    ...(checkoutSession?.plan ? { plan: checkoutSession.plan } : (context.plan ? { plan: context.plan } : {})),
                    amount: payload.payhere_amount,
                    currency: payload.payhere_currency,
                    baseAmountCents: checkoutSession?.baseAmountCents,
                    discountCents: checkoutSession?.discountCents,
                    finalAmountCents: checkoutSession?.finalAmountCents,
                    couponCode: checkoutSession?.couponCode,
                    statusCode: payload.status_code,
                    rawPayload: payload,
                });
                await failPendingCheckout(checkoutModels, checkoutSession);
                logEvent('warn', 'payment.payhere_ipn_unprocessed_status', {
                    orderId: payload.order_id,
                    paymentId: payload.payment_id,
                    statusCode: payload.status_code,
                    userId: checkoutSession?.userId || context.userId || undefined,
                    plan: checkoutSession?.plan || context.plan || undefined,
                });
                return res.status(200).send('OK');
            }

            if (!checkoutSession && (!context.userId || !context.plan)) {
                logEvent('warn', 'payment.payhere_ipn_context_missing', {
                    orderId: payload.order_id,
                    paymentId: payload.payment_id,
                });
                await alertPayHereIpnFailure(
                    'payment.payhere_ipn_context_missing',
                    'Successful IPN did not include a resolvable checkout session, user id, or plan.',
                    payload
                );
                return res.status(400).send('Invalid payment context.');
            }

            const expectedPrice = checkoutSession
                ? { currency: checkoutSession.currency, cents: checkoutSession.finalAmountCents }
                : PAYHERE_PLAN_PRICES[context.plan!];
            const paidCents = payHereAmountToCents(payload.payhere_amount);
            if (paidCents === null) {
                logEvent('warn', 'payment.payhere_ipn_amount_invalid', {
                    orderId: payload.order_id,
                    paymentId: payload.payment_id,
                    plan: checkoutSession?.plan || context.plan,
                    paidAmount: payload.payhere_amount,
                    paidCurrency: payload.payhere_currency,
                    expectedCurrency: expectedPrice.currency,
                    expectedCents: expectedPrice.cents,
                });
                await alertPayHereIpnFailure(
                    'payment.payhere_ipn_amount_invalid',
                    'IPN payhere_amount could not be parsed as a decimal amount.',
                    payload,
                    { plan: checkoutSession?.plan || context.plan }
                );
                return res.status(400).send('Invalid payment amount.');
            }
            if (payload.payhere_currency.toUpperCase() !== expectedPrice.currency || paidCents !== expectedPrice.cents) {
                logEvent('warn', 'payment.payhere_ipn_amount_mismatch', {
                    orderId: payload.order_id,
                    paymentId: payload.payment_id,
                    plan: checkoutSession?.plan || context.plan,
                    paidAmount: payload.payhere_amount,
                    paidCurrency: payload.payhere_currency,
                    expectedCurrency: expectedPrice.currency,
                    expectedCents: expectedPrice.cents,
                });
                await alertPayHereIpnFailure(
                    'payment.payhere_ipn_amount_mismatch',
                    `Paid amount did not match expected ${expectedPrice.cents} ${expectedPrice.currency} cents.`,
                    payload,
                    { plan: checkoutSession?.plan || context.plan }
                );
                return res.status(400).send('Invalid payment amount.');
            }

            const user = await User.findById(checkoutSession?.userId || context.userId);
            if (!user) {
                logEvent('warn', 'payment.payhere_ipn_user_missing', {
                    orderId: payload.order_id,
                    paymentId: payload.payment_id,
                    userId: checkoutSession?.userId || context.userId,
                });
                await alertPayHereIpnFailure(
                    'payment.payhere_ipn_user_missing',
                    'Successful IPN referenced a user that does not exist.',
                    payload,
                    {
                        userId: checkoutSession?.userId || context.userId,
                        plan: checkoutSession?.plan || context.plan,
                    }
                );
                return res.status(404).send('User not found.');
            }

            const purchasedPlan = checkoutSession?.plan || context.plan!;
            const transaction: PaymentTransactionRecord = {
                provider: 'payhere',
                paymentId: payload.payment_id,
                orderId: payload.order_id,
                userId: user._id,
                plan: purchasedPlan,
                amount: payload.payhere_amount,
                currency: payload.payhere_currency,
                baseAmountCents: checkoutSession?.baseAmountCents,
                discountCents: checkoutSession?.discountCents,
                finalAmountCents: checkoutSession?.finalAmountCents ?? paidCents,
                couponCode: checkoutSession?.couponCode,
                statusCode: payload.status_code,
                rawPayload: payload,
            };
            const result = await processVerifiedPayment(paymentProcessingDeps, {
                transaction,
                refreshOnReceive: { statusCode: payload.status_code, rawPayload: payload },
                user,
                plan: purchasedPlan,
                checkoutSession,
            });
            if (result.status === 'duplicate_processed') {
                logEvent('info', 'payment.payhere_ipn_duplicate_processed', {
                    orderId: payload.order_id,
                    paymentId: payload.payment_id,
                });
                return res.status(200).send('OK');
            }
            if (result.status === 'duplicate_in_progress') {
                logEvent('info', 'payment.payhere_ipn_duplicate_in_progress', {
                    orderId: payload.order_id,
                    paymentId: payload.payment_id,
                });
                return res.status(200).send('OK');
            }

            const processedUser = result.user;
            await sendBillingSuccessNotifications({
                user: processedUser,
                plan: purchasedPlan,
                transactionId: payload.payment_id,
                planExpiresAt: processedUser.planExpiresAt,
            });
            logEvent('info', 'payment.payhere_ipn_processed', {
                orderId: payload.order_id,
                paymentId: payload.payment_id,
                userId: processedUser._id,
                plan: purchasedPlan,
                finalAmountCents: checkoutSession?.finalAmountCents ?? paidCents,
            });

            return res.status(200).send('OK');
        } catch (error) {
            logError('payment.payhere_ipn_failed', error, {
                orderId: req.body?.order_id,
                paymentId: req.body?.payment_id,
                statusCode: req.body?.status_code,
            });
            return sendError(res, 500, 'Could not process payment notification.', error);
        }
    });

    router.post('/api/billing/payhere-checkout', requireAuth, async (req: Request, res: Response) => {
        try {
            if (!requireVerifiedEmail(req, res)) {
                return;
            }

            if ((req as any).appSettings?.payhereEnabled === false) {
                return res.status(503).json({
                    error: 'Online checkout is temporarily disabled.',
                    code: API_ERROR_CODES.CHECKOUT_DISABLED,
                });
            }

            const plan = req.body.plan as BillingPlan;
            if (!isPaidBillingPlan(plan)) {
                return res.status(400).json({
                    error: 'Choose a valid paid plan.',
                    code: API_ERROR_CODES.VALIDATION_FAILED,
                });
            }
            const billingContext = resolveBillingMarket(req.body.country || req.body.customer?.countryCode, req);
            if (billingContext.market !== 'local') {
                return res.status(501).json({
                    error: 'International checkout is not connected yet. Please switch to Sri Lanka for PayHere checkout.',
                    code: API_ERROR_CODES.CHECKOUT_MARKET_UNSUPPORTED,
                });
            }

            const customer = req.body.customer || {};
            const firstName = sanitizeProfileField(customer.firstName, 80);
            const lastName = sanitizeProfileField(customer.lastName, 80);
            const email = normalizeEmail(customer.email);
            const phone = sanitizeProfileField(customer.phone, 40);
            const address = sanitizeProfileField(customer.address, 220);
            const city = sanitizeProfileField(customer.city, 80);
            const country = sanitizeProfileField(customer.country, 80) || 'Sri Lanka';
            if (!firstName || !lastName || !email || !phone || !address || !city) {
                return res.status(400).json({
                    error: 'Please complete your customer details.',
                    code: API_ERROR_CODES.CHECKOUT_CUSTOMER_INVALID,
                });
            }

            const { merchantId, merchantSecret } = getPayHereMerchantConfig();
            if (!merchantId || !merchantSecret) {
                return res.status(503).json({
                    error: 'PayHere checkout is not configured.',
                    code: API_ERROR_CODES.CHECKOUT_PROVIDER_UNAVAILABLE,
                });
            }

            const userId = currentUserId(req).toString();
            const quote = await quoteCheckout(plan, req.body.couponCode, billingContext.market);
            if ('error' in quote) {
                return res.status(400).json({
                    error: quote.error,
                    code: API_ERROR_CODES.COUPON_INVALID,
                });
            }
            const orderId = `${generateTransactionId()}-${userId}-${plan}`;
            const started = await startPendingCheckout(checkoutModels, {
                orderId,
                userId,
                plan,
                quote,
                expiresInMs: PAYHERE_CHECKOUT_EXPIRY_MS,
            });
            if (!started.ok) return couponLimitReached(res);
            const frontendOrigin = getFrontendOrigin(req);
            const notifyUrl = process.env.PAYHERE_NOTIFY_URL?.trim() || `${getApiOrigin(req)}/api/payhere/ipn`;
            const checkoutPayload = {
                merchant_id: merchantId,
                order_id: orderId,
                amount: quote.amount,
                currency: quote.currency,
            };

            const response = {
                actionUrl: getPayHereCheckoutUrl(),
                orderId,
                fields: {
                    merchant_id: merchantId,
                    return_url: `${frontendOrigin}/checkout?plan=${plan}&payment=return&order=${encodeURIComponent(orderId)}`,
                    cancel_url: `${frontendOrigin}/checkout?plan=${plan}&payment=cancel&order=${encodeURIComponent(orderId)}`,
                    notify_url: notifyUrl,
                    first_name: firstName,
                    last_name: lastName,
                    email,
                    phone,
                    address,
                    city,
                    country,
                    order_id: orderId,
                    items: `NexCV ${planDisplayName(plan)} Plan`,
                    currency: quote.currency,
                    amount: quote.amount,
                    custom_1: userId,
                    custom_2: plan,
                    hash: buildPayHereCheckoutHash(checkoutPayload, merchantSecret),
                },
                quote,
            } satisfies PayHereCheckoutResponse;
            return res.json(response);
        } catch (error) {
            return sendError(res, 500, 'Could not start PayHere checkout.', error, API_ERROR_CODES.PAYMENT_SERVICE_FAILED);
        }
    });

    router.post('/api/billing/lemonsqueezy-checkout', requireAuth, async (req: Request, res: Response) => {
        try {
            if (!requireVerifiedEmail(req, res)) {
                return;
            }

            const plan = req.body.plan as BillingPlan;
            if (!isPaidBillingPlan(plan)) {
                return res.status(400).json({
                    error: 'Choose a valid paid plan.',
                    code: API_ERROR_CODES.VALIDATION_FAILED,
                });
            }

            const billingContext = resolveBillingMarket(req.body.country || req.body.customer?.countryCode, req);
            if (billingContext.market !== 'global') {
                return res.status(400).json({
                    error: 'Lemon Squeezy checkout is only available for global USD pricing.',
                    code: API_ERROR_CODES.CHECKOUT_MARKET_UNSUPPORTED,
                });
            }

            if (!isLemonSqueezyConfigured()) {
                const issues = getLemonSqueezyConfigIssues();
                logEvent('error', 'payment.lemonsqueezy_config_invalid', { issues });
                return res.status(503).json({
                    error: 'Lemon Squeezy checkout is not configured.',
                    code: API_ERROR_CODES.CHECKOUT_PROVIDER_UNAVAILABLE,
                    missing: getMissingLemonSqueezyConfigKeys(),
                    issues,
                });
            }

            const userId = currentUserId(req).toString();
            const user = req.user as any;
            const customer = req.body.customer || {};
            const email = normalizeEmail(customer.email || user?.email);
            const firstName = sanitizeProfileField(customer.firstName, 80);
            const lastName = sanitizeProfileField(customer.lastName, 80);
            const displayName = sanitizeProfileField([firstName, lastName].filter(Boolean).join(' ') || user?.displayName, 120);
            const quote = await quoteCheckout(plan, req.body.couponCode, billingContext.market);
            if ('error' in quote) {
                return res.status(400).json({
                    error: quote.error,
                    code: API_ERROR_CODES.COUPON_INVALID,
                });
            }

            const orderId = `${generateTransactionId()}-${userId}-${plan}-ls`;
            const started = await startPendingCheckout(checkoutModels, {
                orderId,
                userId,
                plan,
                quote,
                expiresInMs: LEMON_SQUEEZY_CHECKOUT_EXPIRY_MS,
            });
            if (!started.ok) return couponLimitReached(res);
            const frontendOrigin = getFrontendOrigin(req);
            const checkout = await createLemonSqueezyCheckout({
                plan,
                checkoutData: {
                    email,
                    name: displayName,
                    discountCode: quote.couponCode || undefined,
                    redirectUrl: `${frontendOrigin}/checkout?plan=${plan}&payment=return&provider=lemonsqueezy&order=${encodeURIComponent(orderId)}`,
                    custom: {
                        user_id: userId,
                        plan,
                        order_id: orderId,
                        country: billingContext.country,
                        detected_country: billingContext.detectedCountry,
                    },
                },
            });

            const checkoutUrl = checkout.data?.attributes?.url;
            if (!checkoutUrl) {
                return res.status(502).json({
                    error: 'Lemon Squeezy did not return a checkout URL.',
                    code: API_ERROR_CODES.CHECKOUT_PROVIDER_UNAVAILABLE,
                });
            }

            const response = {
                checkoutId: checkout.data?.id || '',
                checkoutUrl,
                orderId,
                quote,
            } satisfies LemonSqueezyCheckoutResponse;
            return res.json(response);
        } catch (error) {
            return sendError(res, 500, 'Could not start Lemon Squeezy checkout.', error, API_ERROR_CODES.PAYMENT_SERVICE_FAILED);
        }
    });

    router.post('/api/lemonsqueezy/webhook', express.raw({ type: 'application/json', limit: '1mb' }), async (req: Request, res: Response) => {
        const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
        let eventName = String(req.get('X-Event-Name') || '');
        try {
            if (!verifyLemonSqueezySignature(rawBody, req.get('X-Signature'))) {
                logEvent('warn', 'payment.lemonsqueezy_webhook_signature_failed', { eventName });
                return res.status(400).send('Invalid signature.');
            }

            const payload = JSON.parse(rawBody.toString('utf8'));
            eventName = eventName || String(payload?.meta?.event_name || '');
            const customData = payload?.meta?.custom_data || {};
            const orderId = String(customData.order_id || '');
            const userId = String(customData.user_id || '');
            const plan = customData.plan as BillingPlan;
            const lemonId = String(payload?.data?.id || payload?.data?.attributes?.identifier || '');
            const attributes = payload?.data?.attributes || {};
            const paymentId = lemonId || `${eventName}-${orderId}`;

            if (eventName !== 'order_created') {
                logEvent('info', 'payment.lemonsqueezy_webhook_ignored', { eventName, orderId, paymentId });
                return res.status(200).send('OK');
            }

            if (!orderId || !userId || !isPaidBillingPlan(plan) || !paymentId) {
                logEvent('warn', 'payment.lemonsqueezy_webhook_context_missing', { eventName, orderId, userId, plan, paymentId });
                return res.status(400).send('Invalid payment context.');
            }

            await markExpiredPendingCheckouts(CheckoutSession, Coupon);
            const checkoutSession = await CheckoutSession.findOne({ orderId });
            const expectedCents = checkoutSession?.finalAmountCents;
            const paidCents = Number(attributes.total || attributes.total_usd || 0);
            const currency = String(attributes.currency || checkoutSession?.currency || 'USD').toUpperCase();
            if (checkoutSession && (currency !== checkoutSession.currency || paidCents !== expectedCents)) {
                logEvent('warn', 'payment.lemonsqueezy_webhook_amount_mismatch', {
                    orderId,
                    paymentId,
                    paidCents,
                    currency,
                    expectedCents,
                    expectedCurrency: checkoutSession.currency,
                });
                return res.status(400).send('Invalid payment amount.');
            }

            const user = await User.findById(checkoutSession?.userId || userId);
            if (!user) {
                logEvent('warn', 'payment.lemonsqueezy_webhook_user_missing', { orderId, paymentId, userId, plan });
                return res.status(404).send('User not found.');
            }

            const purchasedPlan = checkoutSession?.plan || plan;
            const transaction: PaymentTransactionRecord = {
                provider: 'lemonsqueezy',
                paymentId,
                orderId,
                userId: user._id,
                plan: purchasedPlan,
                amount: (paidCents / 100).toFixed(2),
                currency,
                baseAmountCents: checkoutSession?.baseAmountCents,
                discountCents: checkoutSession?.discountCents,
                finalAmountCents: checkoutSession?.finalAmountCents ?? paidCents,
                couponCode: checkoutSession?.couponCode,
                statusCode: eventName,
                rawPayload: payload,
            };
            const result = await processVerifiedPayment(paymentProcessingDeps, {
                transaction,
                user,
                plan: purchasedPlan,
                checkoutSession,
            });
            if (result.status === 'duplicate_processed') {
                logEvent('info', 'payment.lemonsqueezy_webhook_duplicate_processed', { orderId, paymentId });
                return res.status(200).send('OK');
            }
            if (result.status === 'duplicate_in_progress') {
                logEvent('info', 'payment.lemonsqueezy_webhook_duplicate_in_progress', { orderId, paymentId });
                return res.status(200).send('OK');
            }

            const processedUser = result.user;
            await sendBillingSuccessNotifications({
                user: processedUser,
                plan: checkoutSession?.plan || plan,
                transactionId: paymentId,
                planExpiresAt: processedUser.planExpiresAt,
            });
            logEvent('info', 'payment.lemonsqueezy_webhook_processed', { orderId, paymentId, userId: processedUser._id, plan });
            return res.status(200).send('OK');
        } catch (error) {
            logError('payment.lemonsqueezy_webhook_failed', error, { eventName });
            return sendError(res, 500, 'Could not process Lemon Squeezy webhook.', error);
        }
    });

    router.get('/api/billing/checkout/:orderId/status', requireAuth, async (req: Request, res: Response) => {
        try {
            const orderId = typeof req.params.orderId === 'string' ? req.params.orderId.trim() : '';
            if (!orderId) {
                return res.status(400).json({
                    error: 'Missing checkout order.',
                    code: API_ERROR_CODES.VALIDATION_FAILED,
                });
            }

            const checkoutSession = await CheckoutSession.findOne({
                orderId,
                userId: currentUserId(req),
            });

            if (!checkoutSession) {
                return res.status(404).json({
                    error: 'Checkout session not found.',
                    code: API_ERROR_CODES.CHECKOUT_SESSION_NOT_FOUND,
                });
            }

            const user = await User.findById(currentUserId(req));
            const planActive = Boolean(
                user &&
                // NOTE: the User schema's plan enum has no 'unlimited', so the second check never matches.
                // Kept as-is during the Phase 3 refactor; decide separately whether it should use getEffectivePlan().
                (user.plan === checkoutSession.plan || (user.plan as string) === 'unlimited') &&
                (!user.planExpiresAt || user.planExpiresAt > new Date())
            );

            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.setHeader('Pragma', 'no-cache');
            const response = {
                status: checkoutSession.status,
                plan: checkoutSession.plan,
                planActive,
                user: user ? publicUser(user) : undefined,
            } satisfies CheckoutStatusResponse;
            return res.json(response);
        } catch (error) {
            return sendError(res, 500, 'Could not load checkout status.', error, API_ERROR_CODES.PAYMENT_SERVICE_FAILED);
        }
    });

    router.post('/api/billing/checkout/:orderId/cancel', requireAuth, async (req: Request, res: Response) => {
        try {
            const orderId = typeof req.params.orderId === 'string' ? req.params.orderId.trim() : '';
            if (!orderId) {
                return res.status(400).json({
                    error: 'Missing checkout order.',
                    code: API_ERROR_CODES.VALIDATION_FAILED,
                });
            }

            const checkoutSession = await cancelPendingCheckout(checkoutModels, { orderId, userId: currentUserId(req) });
            if (!checkoutSession) {
                const response = { status: 'ignored' } satisfies CheckoutCancelResponse;
                return res.json(response);
            }

            logEvent('info', 'payment.checkout_cancelled_by_user', {
                orderId,
                userId: currentUserId(req),
                plan: checkoutSession.plan,
            });
            const response = { status: checkoutSession.status } satisfies CheckoutCancelResponse;
            return res.json(response);
        } catch (error) {
            return sendError(res, 500, 'Could not cancel checkout.', error, API_ERROR_CODES.PAYMENT_SERVICE_FAILED);
        }
    });

    router.post('/api/billing/activate', requireAuth, requireAdminPermission('billing.write'), async (req: Request, res: Response) => {
        logEvent('warn', 'payment.client_activation_blocked', {
            userId: currentUserId(req),
            requestedPlan: req.body?.plan,
        });
        return res.status(410).json({
            error: 'Client-side plan activation is disabled. Paid plans are activated only after a verified PayHere IPN.',
            code: API_ERROR_CODES.FORBIDDEN,
        });
    });
}
