import express, { Router, Request, Response } from 'express';
import { bindDeps } from './_shared';
import type { BillingPlan } from '../server-models/userPlan';

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
        normalizeEmail,
        payHereAmountToCents,
        planDisplayName,
        publicUser,
        quoteCheckout,
        requireAuth,
        requireVerifiedEmail,
        resolvePayHerePaymentContext,
        sanitizeProfileField,
        sendBillingSuccessNotifications,
        sendError,
        verifyPayHereMd5Signature,
    } = bindDeps(deps);

    router.get('/api/billing/plans', async (_req: Request, res: Response) => {
        try {
            const plans = await getPublicBillingPlans();
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
                console.warn('PayHere IPN missing field:', missingField);
                return res.status(400).send('Missing payment notification field.');
            }

            const { merchantId, merchantSecret } = getPayHereMerchantConfig();
            if (!merchantId || !merchantSecret) {
                console.error('PayHere IPN received but merchant configuration is missing.');
                return res.status(500).send('Payment notification is not configured.');
            }

            if (payload.merchant_id !== merchantId) {
                console.warn('PayHere IPN merchant mismatch:', payload.merchant_id);
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
                console.warn('PayHere IPN signature verification failed for order:', payload.order_id);
                return res.status(400).send('Invalid payment signature.');
            }

            const context = resolvePayHerePaymentContext(payload);
            const checkoutSession = await CheckoutSession.findOne({ orderId: payload.order_id });
            const transactionFilter = { provider: 'payhere' as const, paymentId: payload.payment_id };
            const existingTransaction = await PaymentTransaction.findOne(transactionFilter);
            if (existingTransaction?.processed) {
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
                return res.status(200).send('OK');
            }

            if (!checkoutSession && (!context.userId || !context.plan)) {
                console.warn('PayHere IPN could not resolve user or plan for order:', payload.order_id);
                return res.status(400).send('Invalid payment context.');
            }

            const expectedPrice = checkoutSession
                ? { currency: checkoutSession.currency, cents: checkoutSession.finalAmountCents }
                : PAYHERE_PLAN_PRICES[context.plan!];
            const paidCents = payHereAmountToCents(payload.payhere_amount);
            if (payload.payhere_currency.toUpperCase() !== expectedPrice.currency || paidCents !== expectedPrice.cents) {
                console.warn('PayHere IPN amount mismatch:', {
                    orderId: payload.order_id,
                    plan: checkoutSession?.plan || context.plan,
                    paidAmount: payload.payhere_amount,
                    paidCurrency: payload.payhere_currency,
                });
                return res.status(400).send('Invalid payment amount.');
            }

            const user = await User.findById(checkoutSession?.userId || context.userId);
            if (!user) {
                console.warn('PayHere IPN user not found:', checkoutSession?.userId || context.userId);
                return res.status(404).send('User not found.');
            }

            const purchasedPlan = checkoutSession?.plan || context.plan!;
            user.plan = purchasedPlan;
            user.planStartedAt = new Date();
            user.planExpiresAt = createPlanExpiry(purchasedPlan);
            if (purchasedPlan === 'payg') {
                user.paygCvSaveCredits = (user.paygCvSaveCredits || 0) + 1;
            }
            await user.save();

            if (checkoutSession) {
                checkoutSession.status = 'paid';
                await checkoutSession.save();
            }
            if (checkoutSession?.couponCode) {
                await Coupon.updateOne({ code: checkoutSession.couponCode }, { $inc: { redeemedCount: 1 } });
            }

            await PaymentTransaction.findOneAndUpdate(
                transactionFilter,
                {
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
                    processed: true,
                    rawPayload: payload,
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            await sendBillingSuccessNotifications({
                user,
                plan: purchasedPlan,
                transactionId: payload.payment_id,
                planExpiresAt: user.planExpiresAt,
            });

            return res.status(200).send('OK');
        } catch (error) {
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
                expiresAt: new Date(Date.now() + 60 * 60 * 1000),
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
