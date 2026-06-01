import { Router, Request, Response } from 'express';
import { bindDeps, type RouteDeps } from '../_shared';
import type { BillingPlan } from '../../server-models/userPlan';


export function registerAdminBillingRoutes(router: Router, deps: RouteDeps) {
    const { User, PaymentTransaction, CheckoutSession, BillingPlanSetting, Coupon, requireAdminPermission, sendError, sanitizeProfileField, currentUserId, isValidDocumentId, startOfUtcDay, formatUtcDay, parsePaymentAmountCents, escapeRegex, getAdminBillingPlans, planDisplayName, getPlanPrice, adminPaymentSummary, normalizeCouponCode, isPaidBillingPlan, PAYHERE_PLAN_PRICES, recordAdminAuditLog, syncLemonSqueezyDiscount, deleteLemonSqueezyDiscount } = bindDeps(deps);

    const markExpiredPendingCheckouts = async () => {
        await CheckoutSession.updateMany(
            { status: 'pending', expiresAt: { $lt: new Date() } },
            { $set: { status: 'expired', billingReviewStatus: 'resolved', expiredAt: new Date() } }
        );
    };

    const adminCouponSummary = (coupon: any) => ({
        id: coupon._id?.toString?.() || coupon.id,
        code: coupon.code,
        label: coupon.label,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        active: Boolean(coupon.active),
        appliesTo: coupon.appliesTo || [],
        startsAt: coupon.startsAt,
        expiresAt: coupon.expiresAt,
        maxRedemptions: coupon.maxRedemptions || null,
        redeemedCount: coupon.redeemedCount || 0,
        lemonSqueezyDiscountId: coupon.lemonSqueezyDiscountId || '',
        lemonSqueezySyncStatus: coupon.lemonSqueezySyncStatus || 'not_synced',
        lemonSqueezySyncError: coupon.lemonSqueezySyncError || '',
        lemonSqueezyLastSyncedAt: coupon.lemonSqueezyLastSyncedAt,
        updatedAt: coupon.updatedAt,
    });

    const syncCouponDiscount = async (coupon: any) => {
        try {
            const result = await syncLemonSqueezyDiscount({
                lemonSqueezyDiscountId: coupon.lemonSqueezyDiscountId,
                code: coupon.code,
                label: coupon.label,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
                active: Boolean(coupon.active),
                appliesTo: coupon.appliesTo || [],
                startsAt: coupon.startsAt,
                expiresAt: coupon.expiresAt,
                maxRedemptions: coupon.maxRedemptions,
            });
            coupon.lemonSqueezyDiscountId = result.discountId || undefined;
            coupon.lemonSqueezySyncStatus = result.status;
            coupon.lemonSqueezySyncError = '';
            coupon.lemonSqueezyLastSyncedAt = new Date();
            await coupon.save();
            return coupon;
        } catch (error) {
            coupon.lemonSqueezySyncStatus = 'not_synced';
            coupon.lemonSqueezySyncError = error instanceof Error ? error.message : 'Lemon Squeezy sync failed.';
            coupon.lemonSqueezyLastSyncedAt = new Date();
            await coupon.save();
            throw error;
        }
    };

    const adminCheckoutReviewSummary = (checkout: any) => {
        const user = checkout.userId && typeof checkout.userId === 'object' ? checkout.userId : null;
        const currency = String(checkout.currency || 'LKR').toUpperCase();
        return {
            id: checkout._id?.toString?.() || checkout.id,
            provider: currency === 'USD' ? 'lemonsqueezy' : 'payhere',
            paymentId: checkout.status === 'failed' ? 'Failed checkout' : 'Checkout review',
            orderId: checkout.orderId,
            reviewType: 'checkout',
            reviewStatus: checkout.status,
            billingReviewStatus: checkout.billingReviewStatus || 'open',
            reviewedAt: checkout.reviewedAt,
            reviewNote: checkout.reviewNote || '',
            user: user ? {
                id: user._id?.toString?.() || user.id,
                email: user.email,
                displayName: user.displayName,
            } : null,
            plan: checkout.plan || null,
            amount: (Math.max(0, checkout.finalAmountCents || 0) / 100).toFixed(2),
            amountCents: checkout.finalAmountCents || 0,
            baseAmountCents: checkout.baseAmountCents || 0,
            discountCents: checkout.discountCents || 0,
            finalAmountCents: checkout.finalAmountCents || 0,
            couponCode: checkout.couponCode || '',
            currency,
            statusCode: checkout.status,
            processed: false,
            rawPayload: {
                checkoutStatus: checkout.status,
                expiresAt: checkout.expiresAt,
                couponCode: checkout.couponCode || '',
            },
            createdAt: checkout.createdAt,
            updatedAt: checkout.updatedAt,
        };
    };

    router.patch('/api/admin/billing/review/:type/:id', requireAdminPermission('billing.write'), async (req: Request, res: Response) => {
        try {
            const reviewType = req.params.type;
            if (reviewType !== 'payment' && reviewType !== 'checkout') {
                return res.status(400).json({ error: 'Choose a valid billing review type.' });
            }
            if (!isValidDocumentId(req.params.id)) {
                return res.status(400).json({ error: 'Invalid review item id.' });
            }

            const reviewNote = sanitizeProfileField(req.body?.note, 500);
            const reviewUpdate = {
                billingReviewStatus: 'resolved',
                reviewedAt: new Date(),
                reviewedBy: currentUserId(req),
                reviewNote,
            };
            const model = reviewType === 'payment' ? PaymentTransaction : CheckoutSession;
            const item = await model.findByIdAndUpdate(req.params.id, { $set: reviewUpdate }, { new: true, runValidators: true }).populate('userId', 'email displayName');
            if (!item) return res.status(404).json({ error: 'Review item not found.' });

            await recordAdminAuditLog({
                actorId: currentUserId(req),
                action: 'billing.review.resolved',
                targetType: reviewType === 'payment' ? 'payment_transaction' : 'checkout_session',
                targetId: item._id?.toString?.() || req.params.id,
                targetLabel: reviewType === 'payment' ? item.paymentId : item.orderId,
                metadata: {
                    reviewType,
                    orderId: item.orderId,
                    noteProvided: Boolean(reviewNote),
                },
                ip: req.ip,
                userAgent: req.get('user-agent'),
            });

            return res.json({
                payment: reviewType === 'payment'
                    ? {
                        ...adminPaymentSummary(item),
                        reviewType: 'payment',
                        reviewStatus: item.processed ? 'processed' : 'unprocessed',
                    }
                    : adminCheckoutReviewSummary(item),
            });
        } catch (error) {
            return sendError(res, 500, 'Could not resolve billing review.', error);
        }
    });


    router.get('/api/admin/billing/config', requireAdminPermission('billing.read'), async (_req: Request, res: Response) => {
        try {
            const [plans, coupons] = await Promise.all([
                getAdminBillingPlans(),
                Coupon.find().sort({ createdAt: -1 }),
            ]);
            return res.json({ plans, coupons: coupons.map(adminCouponSummary) });
        } catch (error) {
            return sendError(res, 500, 'Could not load billing configuration.', error);
        }
    });


    router.patch('/api/admin/billing/plans/:plan', requireAdminPermission('billing.write'), async (req: Request, res: Response) => {
        try {
            const plan = req.params.plan as BillingPlan;
            if (!isPaidBillingPlan(plan)) return res.status(400).json({ error: 'Choose a valid paid plan.' });
            const market = req.body.market === 'global' ? 'global' : 'local';
            const amountCents = Math.round(Number(req.body.amountCents));
            if (!Number.isFinite(amountCents) || amountCents < 100) {
                return res.status(400).json({ error: 'Enter a valid price in cents.' });
            }
            const label = sanitizeProfileField(req.body.label, 80) || planDisplayName(plan);
            const previousSetting = await BillingPlanSetting.findOne({ plan });
            const previousPrices = Array.isArray(previousSetting?.prices) ? previousSetting.prices : [];
            const promotionDiscountType = req.body.promotionDiscountType === 'percent' ? 'percent' : 'fixed';
            const promotionDiscountValue = promotionDiscountType === 'percent'
                ? Math.min(Math.max(Math.round(Number(req.body.promotionDiscountValue) || 0), 1), 100)
                : Math.max(Math.round(Number(req.body.promotionDiscountValue) || 0), 1);
            const nextPrice = {
                market,
                amountCents,
                currency: market === 'local' ? 'LKR' : 'USD',
                provider: market === 'local' ? 'payhere' : 'lemonsqueezy',
                active: req.body.active !== false,
                promotionActive: Boolean(req.body.promotionActive),
                promotionLabel: sanitizeProfileField(req.body.promotionLabel, 80),
                promotionDiscountType,
                promotionDiscountValue,
            };
            const prices = [
                ...previousPrices.filter((price: any) => price.market !== market).map((price: any) => ({
                    market: price.market,
                    amountCents: price.amountCents,
                    currency: price.currency,
                    provider: price.provider,
                    active: price.active !== false,
                    promotionActive: Boolean(price.promotionActive),
                    promotionLabel: price.promotionLabel,
                    promotionDiscountType: price.promotionDiscountType,
                    promotionDiscountValue: price.promotionDiscountValue,
                })),
                nextPrice,
            ];
            const setting = await BillingPlanSetting.findOneAndUpdate(
                { plan },
                {
                    plan,
                    label,
                    amountCents: market === 'local' ? amountCents : (previousSetting?.amountCents || PAYHERE_PLAN_PRICES[plan].cents),
                    currency: 'LKR',
                    prices,
                    active: req.body.active !== false,
                    promotionActive: market === 'local' ? Boolean(req.body.promotionActive) : Boolean(previousSetting?.promotionActive),
                    promotionLabel: market === 'local'
                        ? sanitizeProfileField(req.body.promotionLabel, 80)
                        : previousSetting?.promotionLabel,
                    promotionDiscountType: market === 'local'
                        ? promotionDiscountType
                        : previousSetting?.promotionDiscountType,
                    promotionDiscountValue: market === 'local'
                        ? promotionDiscountValue
                        : previousSetting?.promotionDiscountValue,
                    updatedBy: currentUserId(req),
                },
                { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
            );
            await recordAdminAuditLog({
                actorId: currentUserId(req),
                action: 'billing.plan.updated',
                targetType: 'billing_plan',
                targetId: plan,
                targetLabel: label,
                metadata: {
                    previousAmountCents: previousSetting?.amountCents,
                    nextAmountCents: amountCents,
                    market,
                    promotionActive: setting.promotionActive,
                },
                ip: req.ip,
                userAgent: req.get('user-agent'),
            });
            return res.json({ plan: await getPlanPrice(setting.plan, market) });
        } catch (error) {
            return sendError(res, 500, 'Could not update plan price.', error);
        }
    });


    router.post('/api/admin/billing/coupons', requireAdminPermission('billing.write'), async (req: Request, res: Response) => {
        try {
            const code = normalizeCouponCode(req.body.code);
            if (!code) return res.status(400).json({ error: 'Enter a coupon code.' });
            const discountType = req.body.discountType === 'percent' ? 'percent' : 'fixed';
            const rawValue = Number(req.body.discountValue);
            const discountValue = discountType === 'percent' ? Math.min(Math.max(Math.round(rawValue), 1), 100) : Math.round(rawValue);
            if (!Number.isFinite(discountValue) || discountValue <= 0) return res.status(400).json({ error: 'Enter a valid discount.' });
            const appliesTo = Array.isArray(req.body.appliesTo)
                ? req.body.appliesTo.filter(isPaidBillingPlan)
                : [];
            const previousCoupon = await Coupon.findOne({ code });
            const coupon = await Coupon.findOneAndUpdate(
                { code },
                {
                    code,
                    label: sanitizeProfileField(req.body.label, 100) || code,
                    discountType,
                    discountValue,
                    active: req.body.active !== false,
                    appliesTo,
                    startsAt: req.body.startsAt ? new Date(req.body.startsAt) : undefined,
                    expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
                    maxRedemptions: req.body.maxRedemptions ? Math.max(1, Math.round(Number(req.body.maxRedemptions))) : undefined,
                    updatedBy: currentUserId(req),
                },
                { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
            );
            await syncCouponDiscount(coupon);
            await recordAdminAuditLog({
                actorId: currentUserId(req),
                action: 'billing.coupon.saved',
                targetType: 'coupon',
                targetId: coupon.code,
                targetLabel: coupon.label,
                metadata: {
                    existed: Boolean(previousCoupon),
                    active: coupon.active,
                    discountType: coupon.discountType,
                    discountValue: coupon.discountValue,
                    appliesTo: coupon.appliesTo,
                },
                ip: req.ip,
                userAgent: req.get('user-agent'),
            });
            return res.status(201).json({ coupon: adminCouponSummary(coupon) });
        } catch (error) {
            return sendError(res, 500, 'Could not save coupon.', error);
        }
    });


    router.patch('/api/admin/billing/coupons/:code', requireAdminPermission('billing.write'), async (req: Request, res: Response) => {
        try {
            const code = normalizeCouponCode(req.params.code);
            const coupon = code ? await Coupon.findOne({ code }) : null;
            if (!coupon) return res.status(404).json({ error: 'Coupon not found.' });
            const previousCoupon = {
                active: coupon.active,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
                appliesTo: [...(coupon.appliesTo || [])],
            };
            if (typeof req.body.label === 'string') coupon.label = sanitizeProfileField(req.body.label, 100) || coupon.label;
            if (req.body.discountType === 'fixed' || req.body.discountType === 'percent') coupon.discountType = req.body.discountType;
            if (req.body.discountValue !== undefined) coupon.discountValue = Math.max(1, Math.round(Number(req.body.discountValue)));
            if (typeof req.body.active === 'boolean') coupon.active = req.body.active;
            if (Array.isArray(req.body.appliesTo)) coupon.appliesTo = req.body.appliesTo.filter(isPaidBillingPlan);
            coupon.startsAt = req.body.startsAt ? new Date(req.body.startsAt) : undefined;
            coupon.expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : undefined;
            coupon.maxRedemptions = req.body.maxRedemptions ? Math.max(1, Math.round(Number(req.body.maxRedemptions))) : undefined;
            coupon.updatedBy = currentUserId(req);
            await coupon.save();
            await syncCouponDiscount(coupon);
            await recordAdminAuditLog({
                actorId: currentUserId(req),
                action: 'billing.coupon.updated',
                targetType: 'coupon',
                targetId: coupon.code,
                targetLabel: coupon.label,
                metadata: {
                    previous: previousCoupon,
                    next: {
                        active: coupon.active,
                        discountType: coupon.discountType,
                        discountValue: coupon.discountValue,
                        appliesTo: coupon.appliesTo,
                    },
                },
                ip: req.ip,
                userAgent: req.get('user-agent'),
            });
            return res.json({ coupon: adminCouponSummary(coupon) });
        } catch (error) {
            return sendError(res, 500, 'Could not update coupon.', error);
        }
    });


    router.delete('/api/admin/billing/coupons/:code', requireAdminPermission('billing.write'), async (req: Request, res: Response) => {
        try {
            const code = normalizeCouponCode(req.params.code);
            const coupon = code ? await Coupon.findOne({ code }) : null;
            if (!coupon) return res.status(404).json({ error: 'Coupon not found.' });
            if (coupon.lemonSqueezyDiscountId) {
                await deleteLemonSqueezyDiscount(coupon.lemonSqueezyDiscountId);
            }
            await Coupon.deleteOne({ _id: coupon._id });
            await recordAdminAuditLog({
                actorId: currentUserId(req),
                action: 'billing.coupon.deleted',
                targetType: 'coupon',
                targetId: coupon.code,
                targetLabel: coupon.label,
                metadata: {
                    lemonSqueezyDiscountId: coupon.lemonSqueezyDiscountId || '',
                    appliesTo: coupon.appliesTo || [],
                },
                ip: req.ip,
                userAgent: req.get('user-agent'),
            });
            return res.status(204).send();
        } catch (error) {
            return sendError(res, 500, 'Could not delete coupon.', error);
        }
    });


    router.get('/api/admin/payments', requireAdminPermission('billing.read'), async (req: Request, res: Response) => {
        try {
            await markExpiredPendingCheckouts();
            const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
            const plan = typeof req.query.plan === 'string' ? req.query.plan.trim() : '';
            const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
            const provider = typeof req.query.provider === 'string' ? req.query.provider.trim() : '';
            const limit = Math.min(100, Math.max(10, Number.parseInt(String(req.query.limit || '50'), 10) || 50));
            const filter: any = {};
    
            if (isPaidBillingPlan(plan)) {
                filter.plan = plan;
            }
            if (provider === 'payhere' || provider === 'lemonsqueezy') {
                filter.provider = provider;
            }
            if (status === 'processed') {
                filter.processed = true;
            } else if (status === 'unprocessed') {
                filter.processed = false;
            } else if (status === 'review') {
                filter.processed = false;
                filter.billingReviewStatus = { $ne: 'resolved' };
            }
    
            if (search) {
                const pattern = new RegExp(escapeRegex(search), 'i');
                const matchedUsers = await User.find({ $or: [{ email: pattern }, { displayName: pattern }] }).select('_id');
                filter.$or = [
                    { paymentId: pattern },
                    { orderId: pattern },
                    ...(matchedUsers.length ? [{ userId: { $in: matchedUsers.map((user) => user._id) } }] : []),
                ];
            }
    
            const payments = await PaymentTransaction.find(filter)
                .sort({ createdAt: -1 })
                .limit(limit)
                .populate('userId', 'email displayName');
            let checkoutReviewItems: any[] = [];
            if (status === 'review') {
                const checkoutFilter: any = { status: 'failed', billingReviewStatus: { $ne: 'resolved' } };
                if (isPaidBillingPlan(plan)) checkoutFilter.plan = plan;
                if (provider === 'payhere') checkoutFilter.currency = 'LKR';
                if (provider === 'lemonsqueezy') checkoutFilter.currency = 'USD';
                if (search) {
                    const pattern = new RegExp(escapeRegex(search), 'i');
                    const matchedUsers = await User.find({ $or: [{ email: pattern }, { displayName: pattern }] }).select('_id');
                    checkoutFilter.$or = [
                        { orderId: pattern },
                        { couponCode: pattern },
                        ...(matchedUsers.length ? [{ userId: { $in: matchedUsers.map((user) => user._id) } }] : []),
                    ];
                }
                checkoutReviewItems = await CheckoutSession.find(checkoutFilter)
                    .sort({ updatedAt: -1 })
                    .limit(limit)
                    .populate('userId', 'email displayName');
            }
            const [
                allProcessedPayments,
                pendingCheckoutCount,
                checkoutReviewCount,
                failedPaymentCount,
            ] = await Promise.all([
                PaymentTransaction.find({ processed: true }).select('amount currency provider plan createdAt'),
                CheckoutSession.countDocuments({ status: 'pending' }),
                CheckoutSession.countDocuments({ status: 'failed', billingReviewStatus: { $ne: 'resolved' } }),
                PaymentTransaction.countDocuments({ processed: false, billingReviewStatus: { $ne: 'resolved' } }),
            ]);
    
            const revenueByCurrency: Record<string, { cents: number; count: number }> = {};
            const revenueByProvider: Record<string, { count: number; byCurrency: Record<string, { cents: number; count: number }> }> = {};
            const revenueByPlanCurrency: Record<string, Record<string, number>> = {};
            const addCurrencyRevenue = (bucket: Record<string, { cents: number; count: number }>, currency: string, cents: number) => {
                bucket[currency] = bucket[currency] || { cents: 0, count: 0 };
                bucket[currency].cents += cents;
                bucket[currency].count += 1;
            };
            const resolvePaymentCurrency = (payment: any) => (
                String(payment.currency || (payment.provider === 'lemonsqueezy' ? 'USD' : 'LKR')).toUpperCase()
            );

            allProcessedPayments.forEach((payment: any) => {
                const cents = parsePaymentAmountCents(payment.amount);
                const currency = resolvePaymentCurrency(payment);
                const providerKey = payment.provider || (currency === 'USD' ? 'lemonsqueezy' : 'payhere');
                const planKey = payment.plan || 'unknown';

                addCurrencyRevenue(revenueByCurrency, currency, cents);
                revenueByProvider[providerKey] = revenueByProvider[providerKey] || { count: 0, byCurrency: {} };
                revenueByProvider[providerKey].count += 1;
                addCurrencyRevenue(revenueByProvider[providerKey].byCurrency, currency, cents);
                revenueByPlanCurrency[planKey] = revenueByPlanCurrency[planKey] || {};
                revenueByPlanCurrency[planKey][currency] = (revenueByPlanCurrency[planKey][currency] || 0) + cents;
            });

            const localProcessedPayments = allProcessedPayments.filter((payment: any) => resolvePaymentCurrency(payment) === 'LKR');
            const revenueCents = revenueByCurrency.LKR?.cents || 0;
            const revenueByPlan = localProcessedPayments.reduce((acc: Record<string, number>, payment: any) => {
                const key = payment.plan || 'unknown';
                acc[key] = (acc[key] || 0) + parsePaymentAmountCents(payment.amount);
                return acc;
            }, {});
            const sevenDaysAgo = startOfUtcDay();
            sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);
            const revenueByDay = new Map<string, number>();
            const revenueByDayCurrency = new Map<string, Record<string, number>>();
            allProcessedPayments.forEach((payment: any) => {
                if (!payment.createdAt || payment.createdAt < sevenDaysAgo) return;
                const day = formatUtcDay(payment.createdAt);
                const cents = parsePaymentAmountCents(payment.amount);
                const currency = resolvePaymentCurrency(payment);
                if (currency === 'LKR') revenueByDay.set(day, (revenueByDay.get(day) || 0) + cents);
                const dayCurrencies = revenueByDayCurrency.get(day) || {};
                dayCurrencies[currency] = (dayCurrencies[currency] || 0) + cents;
                revenueByDayCurrency.set(day, dayCurrencies);
            });
            const dailyRevenue = Array.from({ length: 7 }, (_, index) => {
                const date = new Date(sevenDaysAgo);
                date.setUTCDate(sevenDaysAgo.getUTCDate() + index);
                const day = formatUtcDay(date);
                return { day, cents: revenueByDay.get(day) || 0 };
            });
            const dailyRevenueByCurrency = Array.from({ length: 7 }, (_, index) => {
                const date = new Date(sevenDaysAgo);
                date.setUTCDate(sevenDaysAgo.getUTCDate() + index);
                const day = formatUtcDay(date);
                return { day, currencies: revenueByDayCurrency.get(day) || {} };
            });
    
            return res.json({
                payments: [
                    ...payments.map((payment: any) => ({
                        ...adminPaymentSummary(payment),
                        reviewType: 'payment',
                        reviewStatus: payment.processed ? 'processed' : 'unprocessed',
                    })),
                    ...checkoutReviewItems.map(adminCheckoutReviewSummary),
                ]
                    .sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
                    .slice(0, limit),
                summary: {
                    totalRevenueCents: revenueCents,
                    currency: 'LKR',
                    processedCount: allProcessedPayments.length,
                    pendingCheckoutCount,
                    checkoutReviewCount,
                    failedPaymentCount,
                    revenueByPlan,
                    dailyRevenue,
                    revenueByCurrency,
                    revenueByProvider,
                    revenueByPlanCurrency,
                    dailyRevenueByCurrency,
                },
            });
        } catch (error) {
            return sendError(res, 500, 'Could not load admin payments.', error);
        }
    });

}

