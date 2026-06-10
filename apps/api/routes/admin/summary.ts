import { Router, Request, Response } from 'express';
import { bindDeps, type RouteDeps } from '../_shared';

type DailyCount = {
    _id: string;
    count: number;
};

type DailyCheckoutCount = {
    _id: string;
    started: number;
    paid: number;
};

export function registerAdminSummaryRoutes(router: Router, deps: RouteDeps) {
    const { User, CVDocument, DownloadQuota, PaymentTransaction, CheckoutSession, SupportTicket, requireAdminPermission, sendError, getEffectivePlan, startOfUtcDay, formatUtcDay, parsePaymentAmountCents } = bindDeps(deps);

    router.get('/api/admin/summary', requireAdminPermission('dashboard.read'), async (_req: Request, res: Response) => {
        try {
            const now = new Date();
            const todayStart = startOfUtcDay(now);
            const sevenDaysAgo = new Date(todayStart);
            sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);
    
            const [
                totalUsers,
                activeUsersToday,
                premiumSubscribers,
                totalCvsCreated,
                recentUsers,
                templateUsage,
                userGrowth,
                cvSaves,
                cvDownloads,
                checkoutSessions,
                payments,
                supportStatusCounts,
            ] = await Promise.all([
                User.countDocuments(),
                User.countDocuments({ updatedAt: { $gte: todayStart } }),
                User.countDocuments({ plan: { $in: ['payg', 'monthly', 'quarterly'] }, planExpiresAt: { $gt: now } }),
                CVDocument.countDocuments(),
                User.find().sort({ createdAt: -1 }).limit(6).select('email displayName role plan createdAt'),
                CVDocument.aggregate([
                    { $group: { _id: '$template', count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                    { $limit: 6 },
                ]),
                User.aggregate([
                    { $match: { createdAt: { $gte: sevenDaysAgo } } },
                    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } },
                ]),
                CVDocument.aggregate([
                    { $match: { createdAt: { $gte: sevenDaysAgo } } },
                    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
                    { $sort: { _id: 1 } },
                ]),
                DownloadQuota.aggregate([
                    { $match: { updatedAt: { $gte: sevenDaysAgo } } },
                    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } }, count: { $sum: '$count' } } },
                    { $sort: { _id: 1 } },
                ]),
                CheckoutSession.aggregate([
                    { $match: { createdAt: { $gte: sevenDaysAgo } } },
                    {
                        $group: {
                            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                            started: { $sum: 1 },
                            paid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
                        },
                    },
                    { $sort: { _id: 1 } },
                ]),
                PaymentTransaction.find({ processed: true }).sort({ createdAt: -1 }).limit(200).select('amount currency provider plan createdAt'),
                SupportTicket.aggregate([
                    { $group: { _id: '$status', count: { $sum: 1 } } },
                ]),
            ]);
    
            const revenueByCurrency: Record<string, { cents: number; count: number }> = {};
            const revenueByDay = new Map<string, number>();
            const revenueByDayCurrency = new Map<string, Record<string, number>>();
            const resolvePaymentCurrency = (payment: any) => (
                String(payment.currency || (payment.provider === 'lemonsqueezy' ? 'USD' : 'LKR')).toUpperCase()
            );
            payments.forEach((payment) => {
                const cents = parsePaymentAmountCents(payment.amount);
                const currency = resolvePaymentCurrency(payment);
                revenueByCurrency[currency] = revenueByCurrency[currency] || { cents: 0, count: 0 };
                revenueByCurrency[currency].cents += cents;
                revenueByCurrency[currency].count += 1;

                if (!payment.createdAt || payment.createdAt < sevenDaysAgo) return;
                const day = formatUtcDay(payment.createdAt);
                if (currency === 'LKR') revenueByDay.set(day, (revenueByDay.get(day) || 0) + cents);
                const dayCurrencies = revenueByDayCurrency.get(day) || {};
                dayCurrencies[currency] = (dayCurrencies[currency] || 0) + cents;
                revenueByDayCurrency.set(day, dayCurrencies);
            });
    
            const growthByDay = new Map<string, number>(userGrowth.map((item: DailyCount) => [item._id, item.count]));
            const savesByDay = new Map<string, number>(cvSaves.map((item: DailyCount) => [item._id, item.count]));
            const downloadsByDay = new Map<string, number>(cvDownloads.map((item: DailyCount) => [item._id, item.count]));
            const checkoutByDay = new Map<string, { started: number; paid: number }>(
                checkoutSessions.map((item: DailyCheckoutCount) => [item._id, { started: item.started, paid: item.paid }])
            );
            const supportCounts = new Map<string, number>(supportStatusCounts.map((item: DailyCount) => [item._id, item.count]));
            const dailySeries = Array.from({ length: 7 }, (_, index) => {
                const date = new Date(sevenDaysAgo);
                date.setUTCDate(sevenDaysAgo.getUTCDate() + index);
                const day = formatUtcDay(date);
                const checkout = checkoutByDay.get(day) || { started: 0, paid: 0 };
                return {
                    day,
                    users: growthByDay.get(day) || 0,
                    saves: savesByDay.get(day) || 0,
                    revenue: revenueByDay.get(day) || 0,
                    revenueByCurrency: revenueByDayCurrency.get(day) || {},
                    downloads: downloadsByDay.get(day) || 0,
                    checkoutStarted: checkout.started || 0,
                    checkoutPaid: checkout.paid || 0,
                };
            });
            const analyticsTotals = dailySeries.reduce(
                (totals, item) => ({
                    signups: totals.signups + item.users,
                    cvSaves: totals.cvSaves + item.saves,
                    downloads: totals.downloads + item.downloads,
                    checkoutStarted: totals.checkoutStarted + item.checkoutStarted,
                    checkoutPaid: totals.checkoutPaid + item.checkoutPaid,
                }),
                { signups: 0, cvSaves: 0, downloads: 0, checkoutStarted: 0, checkoutPaid: 0 }
            );
            const checkoutConversionRate = analyticsTotals.checkoutStarted > 0
                ? Math.round((analyticsTotals.checkoutPaid / analyticsTotals.checkoutStarted) * 1000) / 10
                : 0;
    
            return res.json({
                widgets: {
                    totalUsers,
                    activeUsersToday,
                    premiumSubscribers,
                    totalCvsCreated,
                    revenue: {
                        cents: revenueByCurrency.LKR?.cents || 0,
                        currency: 'LKR',
                    },
                    revenueByCurrency,
                    supportTickets: {
                        open: supportCounts.get('open') || 0,
                        pending: supportCounts.get('pending') || 0,
                        resolved: supportCounts.get('resolved') || 0,
                        closed: supportCounts.get('closed') || 0,
                    },
                },
                recentRegistrations: recentUsers.map((user: any) => ({
                    id: user._id.toString(),
                    email: user.email,
                    displayName: user.displayName,
                    role: user.role,
                    plan: getEffectivePlan(user),
                    createdAt: user.createdAt,
                })),
                templateUsage: templateUsage.map((item: any) => ({
                    template: item._id || 'unknown',
                    count: item.count,
                })),
                charts: {
                    userGrowth: dailySeries.map(({ day, users }) => ({ day, count: users })),
                    cvSavesPerDay: dailySeries.map(({ day, saves }) => ({ day, count: saves })),
                    subscriptionRevenue: dailySeries.map(({ day, revenue }) => ({ day, cents: revenue })),
                    subscriptionRevenueByCurrency: dailySeries.map(({ day, revenueByCurrency }) => ({ day, currencies: revenueByCurrency })),
                    cvDownloadsPerDay: dailySeries.map(({ day, downloads }) => ({ day, count: downloads })),
                    checkoutConversion: dailySeries.map(({ day, checkoutStarted, checkoutPaid }) => ({ day, started: checkoutStarted, paid: checkoutPaid })),
                    templateUsage: templateUsage.map((item: any) => ({ template: item._id || 'unknown', count: item.count })),
                },
                analytics: {
                    signups: analyticsTotals.signups,
                    cvSaves: analyticsTotals.cvSaves,
                    downloads: analyticsTotals.downloads,
                    checkoutStarted: analyticsTotals.checkoutStarted,
                    checkoutPaid: analyticsTotals.checkoutPaid,
                    checkoutConversionRate,
                },
            });
        } catch (error) {
            return sendError(res, 500, 'Could not load admin summary.', error);
        }
    });

}

