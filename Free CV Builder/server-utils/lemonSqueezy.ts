import type { BillingPlan } from '../server-models/userPlan';
import { createHmac, timingSafeEqual } from 'crypto';

const LEMON_API_BASE_URL = 'https://api.lemonsqueezy.com/v1';

export type LemonSqueezyPaidPlan = Exclude<BillingPlan, 'free'>;

export interface LemonSqueezyConfig {
    apiKey: string;
    storeId: string;
    webhookSecret: string;
    variantIds: Record<LemonSqueezyPaidPlan, string>;
}

export interface LemonSqueezyConfigIssue {
    key: string;
    reason: string;
}

export interface LemonSqueezyCheckoutOptions {
    plan: LemonSqueezyPaidPlan;
    checkoutData?: {
        email?: string;
        name?: string;
        discountCode?: string;
        custom?: Record<string, string>;
        redirectUrl?: string;
    };
}

export interface LemonSqueezyDiscountSyncInput {
    lemonSqueezyDiscountId?: string;
    code: string;
    label: string;
    discountType: 'fixed' | 'percent';
    discountValue: number;
    active: boolean;
    appliesTo?: LemonSqueezyPaidPlan[];
    startsAt?: Date | string | null;
    expiresAt?: Date | string | null;
    maxRedemptions?: number | null;
}

const envValue = (...keys: string[]) => {
    for (const key of keys) {
        const value = process.env[key]?.trim();
        if (value) return value;
    }
    return '';
};

export const getLemonSqueezyConfig = (): LemonSqueezyConfig => ({
    apiKey: envValue('LEMON_SQUEEZY_API_KEY', 'LEMONSQUEEZY_API_KEY'),
    storeId: envValue('LEMON_SQUEEZY_STORE_ID', 'LEMONSQUEEZY_STORE_ID'),
    webhookSecret: envValue('LEMON_SQUEEZY_WEBHOOK_SECRET', 'LEMONSQUEEZY_WEBHOOK_SECRET'),
    variantIds: {
        payg: envValue('LEMON_SQUEEZY_PAYG_VARIANT_ID', 'LEMONSQUEEZY_PAYG_VARIANT_ID'),
        monthly: envValue('LEMON_SQUEEZY_MONTHLY_VARIANT_ID', 'LEMONSQUEEZY_MONTHLY_VARIANT_ID'),
        quarterly: envValue('LEMON_SQUEEZY_QUARTERLY_VARIANT_ID', 'LEMONSQUEEZY_QUARTERLY_VARIANT_ID'),
    },
});

export const getMissingLemonSqueezyConfigKeys = (config = getLemonSqueezyConfig()) => {
    const missing: string[] = [];
    if (!config.apiKey) missing.push('LEMON_SQUEEZY_API_KEY');
    if (!config.storeId) missing.push('LEMON_SQUEEZY_STORE_ID');
    if (!config.webhookSecret) missing.push('LEMON_SQUEEZY_WEBHOOK_SECRET');
    if (!config.variantIds.payg) missing.push('LEMON_SQUEEZY_PAYG_VARIANT_ID');
    if (!config.variantIds.monthly) missing.push('LEMON_SQUEEZY_MONTHLY_VARIANT_ID');
    if (!config.variantIds.quarterly) missing.push('LEMON_SQUEEZY_QUARTERLY_VARIANT_ID');
    return missing;
};

export const getLemonSqueezyConfigIssues = (config = getLemonSqueezyConfig()) => {
    const issues: LemonSqueezyConfigIssue[] = getMissingLemonSqueezyConfigKeys(config).map((key) => ({
        key,
        reason: 'missing',
    }));
    const numericIdPattern = /^\d+$/;

    if (config.storeId && !numericIdPattern.test(config.storeId)) {
        issues.push({
            key: 'LEMON_SQUEEZY_STORE_ID',
            reason: 'must be the numeric Lemon Squeezy store id, not the store domain or URL',
        });
    }
    if (config.variantIds.payg && !numericIdPattern.test(config.variantIds.payg)) {
        issues.push({
            key: 'LEMON_SQUEEZY_PAYG_VARIANT_ID',
            reason: 'must be a numeric Lemon Squeezy variant id',
        });
    }
    if (config.variantIds.monthly && !numericIdPattern.test(config.variantIds.monthly)) {
        issues.push({
            key: 'LEMON_SQUEEZY_MONTHLY_VARIANT_ID',
            reason: 'must be a numeric Lemon Squeezy variant id',
        });
    }
    if (config.variantIds.quarterly && !numericIdPattern.test(config.variantIds.quarterly)) {
        issues.push({
            key: 'LEMON_SQUEEZY_QUARTERLY_VARIANT_ID',
            reason: 'must be a numeric Lemon Squeezy variant id',
        });
    }

    return issues;
};

export const isLemonSqueezyConfigured = (config = getLemonSqueezyConfig()) => (
    getLemonSqueezyConfigIssues(config).length === 0
);

export const getLemonSqueezyVariantId = (plan: LemonSqueezyPaidPlan, config = getLemonSqueezyConfig()) => (
    config.variantIds[plan] || ''
);

export const buildLemonSqueezyHeaders = (config = getLemonSqueezyConfig()) => ({
    Accept: 'application/vnd.api+json',
    'Content-Type': 'application/vnd.api+json',
    Authorization: `Bearer ${config.apiKey}`,
});

const apiErrorMessage = (payload: any, fallback: string) => (
    Array.isArray(payload?.errors)
        ? payload.errors.map((error: any) => error?.detail || error?.title).filter(Boolean).join('; ') || fallback
        : fallback
);

const isoDateOrNull = (value: Date | string | null | undefined) => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
};

const plansForDiscount = (plans: LemonSqueezyPaidPlan[] | undefined): LemonSqueezyPaidPlan[] => {
    const allowed: LemonSqueezyPaidPlan[] = ['payg', 'monthly', 'quarterly'];
    const selected = Array.isArray(plans) && plans.length
        ? plans.filter((plan): plan is LemonSqueezyPaidPlan => allowed.includes(plan as LemonSqueezyPaidPlan))
        : allowed;
    return Array.from(new Set(selected));
};

const variantRelationshipsForPlans = (plans: LemonSqueezyPaidPlan[], config = getLemonSqueezyConfig()) => {
    const missing = plans.filter((plan) => !config.variantIds[plan]);
    if (missing.length) {
        throw new Error(`Lemon Squeezy variant ids missing for: ${missing.join(', ')}`);
    }
    return plans.map((plan) => ({
        type: 'variants',
        id: config.variantIds[plan],
    }));
};

export const verifyLemonSqueezySignature = (rawBody: Buffer, signature: unknown, config = getLemonSqueezyConfig()) => {
    if (!config.webhookSecret || typeof signature !== 'string' || !signature.trim()) return false;
    const digest = Buffer.from(createHmac('sha256', config.webhookSecret).update(rawBody).digest('hex'), 'utf8');
    const provided = Buffer.from(signature.trim(), 'utf8');
    return digest.length === provided.length && timingSafeEqual(digest, provided);
};

export const deleteLemonSqueezyDiscount = async (discountId?: string | null) => {
    if (!discountId) return false;
    const config = getLemonSqueezyConfig();
    if (!config.apiKey) throw new Error('LEMON_SQUEEZY_API_KEY missing');
    const response = await fetch(`${LEMON_API_BASE_URL}/discounts/${encodeURIComponent(discountId)}`, {
        method: 'DELETE',
        headers: buildLemonSqueezyHeaders(config),
    });
    if (response.status === 404) return false;
    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(apiErrorMessage(payload, 'Could not delete Lemon Squeezy discount.'));
    }
    return true;
};

export const findLemonSqueezyDiscountIdsByCode = async (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return [];
    const config = getLemonSqueezyConfig();
    if (!config.apiKey) throw new Error('LEMON_SQUEEZY_API_KEY missing');
    if (!config.storeId) throw new Error('LEMON_SQUEEZY_STORE_ID missing');
    const url = new URL(`${LEMON_API_BASE_URL}/discounts`);
    url.searchParams.set('filter[store_id]', config.storeId);
    url.searchParams.set('page[size]', '100');
    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: buildLemonSqueezyHeaders(config),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(apiErrorMessage(payload, 'Could not list Lemon Squeezy discounts.'));
    }
    const discounts = Array.isArray(payload?.data) ? payload.data : [];
    return discounts
        .filter((item: any) => String(item?.attributes?.code || '').trim().toUpperCase() === cleanCode)
        .map((item: any) => String(item?.id || '').trim())
        .filter(Boolean);
};

export const deleteLemonSqueezyDiscountsByCode = async (code: string) => {
    const ids = await findLemonSqueezyDiscountIdsByCode(code);
    await Promise.all(ids.map((id) => deleteLemonSqueezyDiscount(id)));
    return ids.length;
};

export const syncLemonSqueezyDiscount = async (discount: LemonSqueezyDiscountSyncInput) => {
    const config = getLemonSqueezyConfig();
    if (!config.apiKey) throw new Error('LEMON_SQUEEZY_API_KEY missing');
    if (!config.storeId) throw new Error('LEMON_SQUEEZY_STORE_ID missing');
    if (!/^\d+$/.test(config.storeId)) throw new Error('LEMON_SQUEEZY_STORE_ID must be numeric');

    if (discount.lemonSqueezyDiscountId) {
        await deleteLemonSqueezyDiscount(discount.lemonSqueezyDiscountId);
    }

    if (!discount.active) {
        return { discountId: '', status: 'deleted' as const };
    }

    const plans = plansForDiscount(discount.appliesTo);
    const variants = variantRelationshipsForPlans(plans, config);
    const isLimitedRedemptions = Number.isFinite(Number(discount.maxRedemptions)) && Number(discount.maxRedemptions) > 0;
    const attributes: Record<string, unknown> = {
        name: discount.label || discount.code,
        code: discount.code,
        amount: discount.discountType === 'percent' ? Math.round(discount.discountValue) : Math.round(discount.discountValue),
        amount_type: discount.discountType,
        is_limited_to_products: true,
        is_limited_redemptions: isLimitedRedemptions,
        max_redemptions: isLimitedRedemptions ? Math.round(Number(discount.maxRedemptions)) : 0,
        duration: 'once',
        starts_at: isoDateOrNull(discount.startsAt),
        expires_at: isoDateOrNull(discount.expiresAt),
    };

    const response = await fetch(`${LEMON_API_BASE_URL}/discounts`, {
        method: 'POST',
        headers: buildLemonSqueezyHeaders(config),
        body: JSON.stringify({
            data: {
                type: 'discounts',
                attributes,
                relationships: {
                    store: {
                        data: {
                            type: 'stores',
                            id: config.storeId,
                        },
                    },
                    variants: {
                        data: variants,
                    },
                },
            },
        }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(apiErrorMessage(payload, 'Could not create Lemon Squeezy discount.'));
    }
    return { discountId: String(payload?.data?.id || ''), status: 'synced' as const };
};

export const createLemonSqueezyCheckout = async (options: LemonSqueezyCheckoutOptions) => {
    const config = getLemonSqueezyConfig();
    const configIssues = getLemonSqueezyConfigIssues(config);
    if (configIssues.length) {
        throw new Error(`Lemon Squeezy is misconfigured: ${configIssues.map((issue) => `${issue.key} ${issue.reason}`).join('; ')}`);
    }

    const variantId = getLemonSqueezyVariantId(options.plan, config);
    const attributes: Record<string, unknown> = {
        checkout_data: {
            email: options.checkoutData?.email,
            name: options.checkoutData?.name,
            discount_code: options.checkoutData?.discountCode,
            custom: options.checkoutData?.custom,
        },
    };

    if (options.checkoutData?.redirectUrl) {
        attributes.product_options = {
            redirect_url: options.checkoutData.redirectUrl,
        };
    }

    const response = await fetch(`${LEMON_API_BASE_URL}/checkouts`, {
        method: 'POST',
        headers: buildLemonSqueezyHeaders(config),
        body: JSON.stringify({
            data: {
                type: 'checkouts',
                attributes,
                relationships: {
                    store: {
                        data: {
                            type: 'stores',
                            id: config.storeId,
                        },
                    },
                    variant: {
                        data: {
                            type: 'variants',
                            id: variantId,
                        },
                    },
                },
            },
        }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const detail = Array.isArray(payload?.errors)
            ? payload.errors.map((error: any) => error?.detail || error?.title).filter(Boolean).join('; ')
            : '';
        const configHint = detail.toLowerCase().includes('related resource does not exist')
            ? ' Check that the store id and both variant ids belong to the same Lemon Squeezy test/live store.'
            : '';
        throw new Error(`${detail || 'Could not create Lemon Squeezy checkout.'}${configHint}`);
    }

    return payload as {
        data?: {
            id?: string;
            attributes?: {
                url?: string;
            };
        };
    };
};
