import CvCreationQuota from '../server-models/CvCreationQuotaModel';
import CVDocument from '../server-models/CVDocument';
import DownloadQuota from '../server-models/DownloadQuotaModel';
import { getAppSettings } from '../server-models/AppSetting';
import { buildCvCreationQuota } from '../server-models/cvQuota';
import { buildDownloadQuota, getNextUtcDayResetAt, getUtcDayKey } from '../server-models/downloadQuotaUtils';
import { getEffectivePlan } from '../server-models/userPlan';

export const getCvCreationQuota = async (user: any) => {
    const userId = user._id || user.id;
    const quotaRecord = await CvCreationQuota.findOne({ userId, day: 'lifetime' });
    const documentCount = await CVDocument.countDocuments({ userId });
    const used = Math.max(quotaRecord?.count || 0, documentCount);
    const quota = buildCvCreationQuota(user, used);
    const settings = await getAppSettings().catch(() => null);
    if (quota.plan !== 'free' || !settings) return quota;
    const limit = Math.max(0, Math.floor(settings.freeCvCreationLimit));
    return {
        ...quota,
        limit,
        remaining: Math.max(limit - used, 0),
        reached: limit - used <= 0,
    };
};

export const incrementCvCreationQuota = async (user: any) => {
    const userId = user._id || user.id;
    const currentQuota = await getCvCreationQuota(user);
    if (currentQuota.limit === null) return { ...currentQuota, reserved: true };
    if (currentQuota.reached) return { ...currentQuota, reserved: false };

    const existingUsed = currentQuota.used;
    try {
        await CvCreationQuota.updateOne(
            { userId, day: 'lifetime' },
            { $setOnInsert: { userId, day: 'lifetime', count: existingUsed } },
            { upsert: true }
        );
    } catch (error: any) {
        if (error?.code !== 11000) throw error;
    }

    const reserved = await CvCreationQuota.findOneAndUpdate(
        { userId, day: 'lifetime', count: { $lt: currentQuota.limit } },
        { $inc: { count: 1 } },
        { new: true }
    );

    if (!reserved) {
        return { ...currentQuota, remaining: 0, reached: true, reserved: false };
    }

    return { ...(await getCvCreationQuota(user)), reserved: true };
};

export const rollbackCvCreationQuota = async (user: any) => {
    await CvCreationQuota.updateOne(
        { userId: user._id || user.id, day: 'lifetime', count: { $gt: 0 } },
        { $inc: { count: -1 } }
    );
};

export const getDownloadQuota = async (user: any) => {
    const plan = getEffectivePlan(user);
    const usesDailyDownloadQuota = plan === 'payg' || plan === 'monthly' || plan === 'quarterly';
    const day = usesDailyDownloadQuota ? getUtcDayKey() : 'free-lifetime';
    const record = await DownloadQuota.findOne({ userId: user._id || user.id, day });
    const used = record?.count || 0;
    const quota = {
        ...buildDownloadQuota(user, used),
        ...(usesDailyDownloadQuota ? { resetAt: getNextUtcDayResetAt() } : {}),
    };
    const settings = await getAppSettings().catch(() => null);
    if (quota.plan !== 'free' || !settings) return quota;
    const limit = Math.max(0, Math.floor(settings.freePdfDownloadLimit));
    return {
        ...quota,
        limit,
        remaining: Math.max(limit - used, 0),
        reached: limit - used <= 0,
    };
};

export const incrementDownloadQuota = async (user: any) => {
    const plan = getEffectivePlan(user);
    const day = plan === 'payg' || plan === 'monthly' || plan === 'quarterly' ? getUtcDayKey() : 'free-lifetime';
    await DownloadQuota.findOneAndUpdate(
        { userId: user._id || user.id, day },
        { $inc: { count: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return getDownloadQuota(user);
};

export const consumeDownloadQuota = async (user: any) => {
    const userId = user._id || user.id;
    const currentQuota = await getDownloadQuota(user);
    if (currentQuota.limit === null) return { ...currentQuota, reserved: true };
    if (currentQuota.reached) return { ...currentQuota, reserved: false };

    const plan = getEffectivePlan(user);
    const usesDailyDownloadQuota = plan === 'payg' || plan === 'monthly' || plan === 'quarterly';
    const day = usesDailyDownloadQuota ? getUtcDayKey() : 'free-lifetime';

    try {
        await DownloadQuota.updateOne(
            { userId, day },
            { $setOnInsert: { userId, day, count: currentQuota.used } },
            { upsert: true }
        );
    } catch (error: any) {
        if (error?.code !== 11000) throw error;
    }

    const reserved = await DownloadQuota.findOneAndUpdate(
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

    return { ...(await getDownloadQuota(user)), reserved: true };
};

export const rollbackDownloadQuota = async (user: any) => {
    const plan = getEffectivePlan(user);
    const day = plan === 'payg' || plan === 'monthly' || plan === 'quarterly' ? getUtcDayKey() : 'free-lifetime';
    await DownloadQuota.updateOne(
        { userId: user._id || user.id, day, count: { $gt: 0 } },
        { $inc: { count: -1 } }
    );
};
