import { Router, Request, Response } from 'express';
import { bindDeps, type RouteDeps } from '../_shared';
import type { BillingPlan } from '../../server-models/userPlan';


export function registerAdminBillingRoutes(router: Router, deps: RouteDeps) {
    const { User, PaymentTransaction, BillingPlanSetting, Coupon, requireAdminPermission, sendError, sanitizeProfileField, currentUserId, startOfUtcDay, formatUtcDay, parsePaymentAmountCents, escapeRegex, getPublicBillingPlans, planDisplayName, getPlanPrice, adminPaymentSummary, normalizeCouponCode, recordAdminAuditLog } = bindDeps(deps);

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
        updatedAt: coupon.updatedAt,
    });


    router.get('/api/admin/billing/config', requireAdminPermission('billing.read'), async (_req: Request, res: Response) => {
        try {
            const [plans, coupons] = await Promise.all([
                getPublicBillingPlans(),
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
            if (plan !== 'payg' && plan !== 'monthly') return res.status(400).json({ error: 'Choose a valid paid plan.' });
            const amountCents = Math.round(Number(req.body.amountCents));
            if (!Number.isFinite(amountCents) || amountCents < 100) {
                return res.status(400).json({ error: 'Enter a valid price in cents.' });
            }
            const label = sanitizeProfileField(req.body.label, 80) || planDisplayName(plan);
            const previousSetting = await BillingPlanSetting.findOne({ plan });
            const setting = await BillingPlanSetting.findOneAndUpdate(
                { plan },
                {
                    plan,
                    label,
                    amountCents,
                    currency: 'LKR',
                    active: req.body.active !== false,
                    promotionActive: Boolean(req.body.promotionActive),
                    promotionLabel: sanitizeProfileField(req.body.promotionLabel, 80),
                    promotionDiscountType: req.body.promotionDiscountType === 'percent' ? 'percent' : 'fixed',
                    promotionDiscountValue: req.body.promotionDiscountType === 'percent'
                        ? Math.min(Math.max(Math.round(Number(req.body.promotionDiscountValue) || 0), 1), 100)
                        : Math.max(Math.round(Number(req.body.promotionDiscountValue) || 0), 1),
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
                    nextAmountCents: setting.amountCents,
                    promotionActive: setting.promotionActive,
                },
                ip: req.ip,
                userAgent: req.get('user-agent'),
            });
            return res.json({ plan: await getPlanPrice(setting.plan) });
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
                ? req.body.appliesTo.filter((item: unknown) => item === 'payg' || item === 'monthly')
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
            if (Array.isArray(req.body.appliesTo)) coupon.appliesTo = req.body.appliesTo.filter((item: unknown) => item === 'payg' || item === 'monthly');
            coupon.startsAt = req.body.startsAt ? new Date(req.body.startsAt) : undefined;
            coupon.expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : undefined;
            coupon.maxRedemptions = req.body.maxRedemptions ? Math.max(1, Math.round(Number(req.body.maxRedemptions))) : undefined;
            coupon.updatedBy = currentUserId(req);
            await coupon.save();
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


    router.get('/api/admin/payments', requireAdminPermission('billing.read'), async (req: Request, res: Response) => {
        try {
            const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
            const plan = typeof req.query.plan === 'string' ? req.query.plan.trim() : '';
            const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
            const provider = typeof req.query.provider === 'string' ? req.query.provider.trim() : '';
            const limit = Math.min(100, Math.max(10, Number.parseInt(String(req.query.limit || '50'), 10) || 50));
            const filter: any = {};
    
            if (['payg', 'monthly'].includes(plan)) {
                filter.plan = plan;
            }
            if (provider === 'payhere') {
                filter.provider = provider;
            }
            if (status === 'processed') {
                filter.processed = true;
            } else if (status === 'unprocessed') {
                filter.processed = false;
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
            const allProcessedPayments = await PaymentTransaction.find({ processed: true }).select('amount currency plan createdAt');
    
            const revenueCents = allProcessedPayments.reduce((sum, payment) => sum + parsePaymentAmountCents(payment.amount), 0);
            const revenueByPlan = allProcessedPayments.reduce((acc: Record<string, number>, payment) => {
                const key = payment.plan || 'unknown';
                acc[key] = (acc[key] || 0) + parsePaymentAmountCents(payment.amount);
                return acc;
            }, {});
            const sevenDaysAgo = startOfUtcDay();
            sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);
            const revenueByDay = new Map<string, number>();
            allProcessedPayments.forEach((payment) => {
                if (!payment.createdAt || payment.createdAt < sevenDaysAgo) return;
                const day = formatUtcDay(payment.createdAt);
                revenueByDay.set(day, (revenueByDay.get(day) || 0) + parsePaymentAmountCents(payment.amount));
            });
            const dailyRevenue = Array.from({ length: 7 }, (_, index) => {
                const date = new Date(sevenDaysAgo);
                date.setUTCDate(sevenDaysAgo.getUTCDate() + index);
                const day = formatUtcDay(date);
                return { day, cents: revenueByDay.get(day) || 0 };
            });
    
            return res.json({
                payments: payments.map(adminPaymentSummary),
                summary: {
                    totalRevenueCents: revenueCents,
                    currency: 'LKR',
                    processedCount: allProcessedPayments.length,
                    revenueByPlan,
                    dailyRevenue,
                },
            });
        } catch (error) {
            return sendError(res, 500, 'Could not load admin payments.', error);
        }
    });

}

