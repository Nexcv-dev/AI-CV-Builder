import HtmlPdfQuota from '../server-models/HtmlPdfQuotaModel';
import { buildHtmlPdfQuota, getUtcDayKey } from '../server-models/htmlPdfQuota';

export const getHtmlPdfQuota = async (user: any) => {
    const userId = user._id || user.id;
    const day = getUtcDayKey();
    const record = await HtmlPdfQuota.findOne({ userId, day });
    return buildHtmlPdfQuota(user, record?.count || 0);
};

export const consumeHtmlPdfQuota = async (user: any) => {
    const userId = user._id || user.id;
    const currentQuota = await getHtmlPdfQuota(user);
    if (currentQuota.limit === null) return { ...currentQuota, reserved: true };
    if (currentQuota.reached) return { ...currentQuota, reserved: false };

    const day = getUtcDayKey();
    try {
        await HtmlPdfQuota.updateOne(
            { userId, day },
            { $setOnInsert: { userId, day, count: currentQuota.used } },
            { upsert: true }
        );
    } catch (error: any) {
        if (error?.code !== 11000) throw error;
    }

    const reserved = await HtmlPdfQuota.findOneAndUpdate(
        { userId, day, count: { $lt: currentQuota.limit } },
        { $inc: { count: 1 } },
        { new: true }
    );

    if (!reserved) {
        return {
            ...currentQuota,
            used: currentQuota.limit,
            remaining: 0,
            reached: true,
            reserved: false,
        };
    }

    return { ...(await getHtmlPdfQuota(user)), reserved: true };
};

export const rollbackHtmlPdfQuota = async (user: any) => {
    await HtmlPdfQuota.updateOne(
        { userId: user._id || user.id, day: getUtcDayKey(), count: { $gt: 0 } },
        { $inc: { count: -1 } }
    );
};
