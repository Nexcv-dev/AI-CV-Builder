import express, { Router, Request, Response } from 'express';
import { bindDeps } from './_shared';
import type { BillingPlan } from '../server-models/userPlan';
import { getOrSetCachedValue, parseCacheTtlMs } from '../server-utils/ttlCache';

type RouteDeps = Record<string, any>;

export function registerPaymentRoutes(router: Router, deps: RouteDeps) {
    const {
        CheckoutSession,
        Coupon,
        PaymentTransaction,
        PAYHERE_PLAN_PRICES,
        User,
        buildPayHereCheckoutHash,
        createPlanExpiry,
        currentUserId,
        generateTransactionId,
        getApiOrigin,
        getCvCreationQuota,
        getDownloadQuota,
        getFrontendOrigin,
        getPayHereCheckoutUrl,
        getPayHereMerchantConfig,
        getPublicBillingPlans,
        isMongoDuplicateKeyError,
        logError,
        logEvent,
        mongoose,
        normalizeEmail,
        payHereAmountToCents,
        planDisplayName,
        publicUser,
        quoteCheckout,
        requireAuth,
        requireVerifiedEmail,
        resolvePayHerePaymentContext,
        sanitizeProfileField,
        sendBillingAlertNotification,
        sendBillingSuccessNotifications,
        sendError,
        verifyPayHereMd5Signature,
    } = bindDeps(deps);

    const markExpiredPendingCheckouts = async () => {
        await CheckoutSession.updateMany(
            { status: 'pending', expiresAt: { $lt: new Date() } },
            { $set: { status: 'expired', billingReviewStatus: 'resolved', expiredAt: new Date() } }
        );
    };

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

    router.get('/api/billing/plans', async (_req: Request, res: Response) => {
        try {
            const plans = await getOrSetCachedValue(
                'public:billing:plans',
                parseCacheTtlMs(process.env.BILLING_PLANS_CACHE_TTL_MS, 60_000),
                getPublicBillingPlans
            );
            res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=60');
            return res.json({ plans });
        } catch (error) {
            return sendError(res, 500, 'Could not load billing plans.', error);
        }
    });

    router.post('/api/billing/quote', async (req: Request, res: Response) => {
        try {
            const plan = req.body.plan as BillingPlan;
            if (plan !== 'payg' && plan !== 'monthly') {
                return res.status(400).json({ error: 'Choose a valid paid plan.' });
            }
            const quote = await quoteCheckout(plan, req.body.couponCode);
            if ('error' in quote) return res.status(400).json({ error: quote.error });
            return res.json({ quote });
        } catch (error) {
            return sendError(res, 500, 'Could not calculate checkout total.', error);
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

            await markExpiredPendingCheckouts();

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
                await PaymentTransaction.findOneAndUpdate(
                    transactionFilter,
                    {
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
                        processed: false,
                        rawPayload: payload,
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
                if (checkoutSession && checkoutSession.status === 'pending') {
                    checkoutSession.status = 'failed';
                    await checkoutSession.save();
                }
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
            const baseTransaction = {
                provider: 'payhere',
                paymentId: payload.payment_id,
                orderId: payload.order_id,
                userId: user._id,
                plan: purchasedPlan,
                amount: payload.payhere_amount,
                currency: payload.payhere_currency,
                baseAmountCents: checkoutSession?.baseAmountCents,
                discountCents: checkoutSession?.discountCents,
                finalAmountCents: checkoutSession?.finalAmountCents || paidCents || undefined,
                couponCode: checkoutSession?.couponCode,
                statusCode: payload.status_code,
                rawPayload: payload,
            };
            const upsertReceivedTransaction = async () => {
                try {
                    return await PaymentTransaction.findOneAndUpdate(
                        transactionFilter,
                        {
                            $setOnInsert: {
                                ...baseTransaction,
                                processed: false,
                            },
                            $set: {
                                statusCode: payload.status_code,
                                rawPayload: payload,
                            },
                        },
                        { upsert: true, new: true, setDefaultsOnInsert: true }
                    );
                } catch (error) {
                    if (!isMongoDuplicateKeyError(error)) throw error;
                    const transaction = await PaymentTransaction.findOne(transactionFilter);
                    if (!transaction) throw error;
                    return transaction;
                }
            };
            const receivedTransaction = await upsertReceivedTransaction();
            if (receivedTransaction.processed) {
                logEvent('info', 'payment.payhere_ipn_duplicate_processed', {
                    orderId: payload.order_id,
                    paymentId: payload.payment_id,
                });
                return res.status(200).send('OK');
            }

            const staleProcessingBefore = new Date(Date.now() - 10 * 60 * 1000);
            const processingStartedAt = new Date();
            const claimedTransaction = await PaymentTransaction.findOneAndUpdate(
                {
                    ...transactionFilter,
                    processed: false,
                    $or: [
                        { processingStartedAt: { $exists: false } },
                        { processingStartedAt: { $lt: staleProcessingBefore } },
                    ],
                },
                { $set: { processingStartedAt } },
                { new: true }
            );
            if (!claimedTransaction) {
                logEvent('info', 'payment.payhere_ipn_duplicate_in_progress', {
                    orderId: payload.order_id,
                    paymentId: payload.payment_id,
                });
                return res.status(200).send('OK');
            }

            let processedUser = user;
            const session = await mongoose.startSession();
            try {
                await session.withTransaction(async () => {
                    const planStartedAt = new Date();
                    const planExpiresAt = createPlanExpiry(purchasedPlan);
                    const userUpdate: Record<string, unknown> = {
                        $set: {
                            plan: purchasedPlan,
                            planStartedAt,
                            planExpiresAt,
                        },
                    };
                    if (purchasedPlan === 'payg') {
                        userUpdate.$inc = { paygCvSaveCredits: 1 };
                    }

                    const updatedUser = await User.findByIdAndUpdate(
                        user._id,
                        userUpdate,
                        { new: true, session }
                    );
                    if (!updatedUser) {
                        throw new Error('User not found while processing payment transaction.');
                    }
                    processedUser = updatedUser;

                    if (checkoutSession) {
                        await CheckoutSession.updateOne(
                            { _id: checkoutSession._id },
                            { $set: { status: 'paid' } },
                            { session }
                        );
                    }
                    if (checkoutSession?.couponCode) {
                        await Coupon.updateOne(
                            { code: checkoutSession.couponCode },
                            { $inc: { redeemedCount: 1 } },
                            { session }
                        );
                    }

                    await PaymentTransaction.findOneAndUpdate(
                        transactionFilter,
                        {
                            ...baseTransaction,
                            userId: updatedUser._id,
                            processed: true,
                            processedAt: new Date(),
                        },
                        { upsert: true, new: true, setDefaultsOnInsert: true, session }
                    );
                });
            } finally {
                await session.endSession();
            }

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
                finalAmountCents: checkoutSession?.finalAmountCents || paidCents || undefined,
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
                return res.status(503).json({ error: 'Online checkout is temporarily disabled.' });
            }

            const plan = req.body.plan as BillingPlan;
            if (plan !== 'payg' && plan !== 'monthly') {
                return res.status(400).json({ error: 'Choose a valid paid plan.' });
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
                return res.status(400).json({ error: 'Please complete your customer details.' });
            }

            const { merchantId, merchantSecret } = getPayHereMerchantConfig();
            if (!merchantId || !merchantSecret) {
                return res.status(500).json({ error: 'PayHere checkout is not configured.' });
            }

            const userId = currentUserId(req).toString();
            const quote = await quoteCheckout(plan, req.body.couponCode);
            if ('error' in quote) return res.status(400).json({ error: quote.error });
            await markExpiredPendingCheckouts();
            const orderId = `${generateTransactionId()}-${userId}-${plan}`;
            await CheckoutSession.create({
                orderId,
                userId,
                plan,
                currency: quote.currency,
                baseAmountCents: quote.baseAmountCents,
                discountCents: quote.discountCents,
                finalAmountCents: quote.finalAmountCents,
                couponCode: quote.couponCode || undefined,
                status: 'pending',
                expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            });
            const frontendOrigin = getFrontendOrigin(req);
            const notifyUrl = process.env.PAYHERE_NOTIFY_URL?.trim() || `${getApiOrigin(req)}/api/payhere/ipn`;
            const checkoutPayload = {
                merchant_id: merchantId,
                order_id: orderId,
                amount: quote.amount,
                currency: quote.currency,
            };

            return res.json({
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
            });
        } catch (error) {
            return sendError(res, 500, 'Could not start PayHere checkout.', error);
        }
    });

    router.post('/api/billing/checkout/:orderId/cancel', requireAuth, async (req: Request, res: Response) => {
        try {
            const orderId = typeof req.params.orderId === 'string' ? req.params.orderId.trim() : '';
            if (!orderId) return res.status(400).json({ error: 'Missing checkout order.' });

            const checkoutSession = await CheckoutSession.findOne({
                orderId,
                userId: currentUserId(req),
                status: 'pending',
            });
            if (!checkoutSession) {
                return res.json({ status: 'ignored' });
            }

            checkoutSession.status = 'cancelled';
            checkoutSession.billingReviewStatus = 'resolved';
            checkoutSession.cancelledAt = new Date();
            await checkoutSession.save();
            logEvent('info', 'payment.checkout_cancelled_by_user', {
                orderId,
                userId: currentUserId(req),
                plan: checkoutSession.plan,
            });
            return res.json({ status: checkoutSession.status });
        } catch (error) {
            return sendError(res, 500, 'Could not cancel checkout.', error);
        }
    });

    router.post('/api/billing/activate', requireAuth, async (req: Request, res: Response) => {
        try {
            if (!requireVerifiedEmail(req, res)) {
                return;
            }

            const plan = req.body.plan as BillingPlan;
            if (plan !== 'payg' && plan !== 'monthly') {
                return res.status(400).json({ error: 'Choose a valid paid plan.' });
            }

            const user = await User.findById(currentUserId(req));
            if (!user) {
                return res.status(404).json({ error: 'User not found.' });
            }

            user.plan = plan;
            user.planStartedAt = new Date();
            user.planExpiresAt = createPlanExpiry(plan);
            if (plan === 'payg') {
                user.paygCvSaveCredits = (user.paygCvSaveCredits || 0) + 1;
            }
            await user.save();

            const transactionId = typeof req.body.transactionId === 'string' && req.body.transactionId.trim()
                ? sanitizeProfileField(req.body.transactionId, 80)
                : generateTransactionId();
            await sendBillingSuccessNotifications({
                user,
                plan,
                transactionId,
                planExpiresAt: user.planExpiresAt,
            });

            const quota = await getCvCreationQuota(user);
            const downloadQuota = await getDownloadQuota(user);
            return res.json({ user: publicUser(user), quota, downloadQuota, transactionId });
        } catch (error) {
            return sendError(res, 500, 'Could not activate this plan.', error);
        }
    });
}
