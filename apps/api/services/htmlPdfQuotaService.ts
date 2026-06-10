import HtmlPdfQuota from '../server-models/HtmlPdfQuotaModel';
import HtmlPdfGuestQuota from '../server-models/HtmlPdfGuestQuotaModel';
import { buildHtmlPdfQuota, getUtcDayKey } from '../server-models/htmlPdfQuota';

export type HtmlPdfQuotaOwner = {
    user?: any;
    guestKey?: string;
};

const ownerContext = (owner: HtmlPdfQuotaOwner) => {
    if (owner.user) return {
        model: HtmlPdfQuota as any,
        filter: { userId: owner.user._id || owner.user.id },
    };
    if (owner.guestKey) return {
        model: HtmlPdfGuestQuota as any,
        filter: { guestKey: owner.guestKey },
    };
    throw Object.assign(new Error('HTML PDF owner is required.'), { status: 400 });
};

export const getHtmlPdfQuota = async (ownerOrUser: HtmlPdfQuotaOwner | any) => {
    const owner: HtmlPdfQuotaOwner = ownerOrUser?.user || ownerOrUser?.guestKey
        ? ownerOrUser
        : { user: ownerOrUser };
    const day = getUtcDayKey();
    const { model, filter } = ownerContext(owner);
    const record = await model.findOne({ ...filter, day });
    return buildHtmlPdfQuota(owner.user, record?.count || 0);
};

export const consumeHtmlPdfQuota = async (ownerOrUser: HtmlPdfQuotaOwner | any) => {
    const owner: HtmlPdfQuotaOwner = ownerOrUser?.user || ownerOrUser?.guestKey
        ? ownerOrUser
        : { user: ownerOrUser };
    const { model, filter } = ownerContext(owner);
    const currentQuota = await getHtmlPdfQuota(owner);
    if (currentQuota.limit === null) return { ...currentQuota, reserved: true };
    if (currentQuota.reached) return { ...currentQuota, reserved: false };

    const day = getUtcDayKey();
    try {
        await model.updateOne(
            { ...filter, day },
            { $setOnInsert: { ...filter, day, count: currentQuota.used } },
            { upsert: true }
        );
    } catch (error: any) {
        if (error?.code !== 11000) throw error;
    }

    const reserved = await model.findOneAndUpdate(
        { ...filter, day, count: { $lt: currentQuota.limit } },
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

    return { ...(await getHtmlPdfQuota(owner)), reserved: true };
};

export const rollbackHtmlPdfQuota = async (ownerOrUser: HtmlPdfQuotaOwner | any) => {
    const owner: HtmlPdfQuotaOwner = ownerOrUser?.user || ownerOrUser?.guestKey
        ? ownerOrUser
        : { user: ownerOrUser };
    const { model, filter } = ownerContext(owner);
    await model.updateOne(
        { ...filter, day: getUtcDayKey(), count: { $gt: 0 } },
        { $inc: { count: -1 } }
    );
};
