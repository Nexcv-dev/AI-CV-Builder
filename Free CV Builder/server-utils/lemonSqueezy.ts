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
        custom?: Record<string, string>;
        redirectUrl?: string;
    };
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
    },
});

export const getMissingLemonSqueezyConfigKeys = (config = getLemonSqueezyConfig()) => {
    const missing: string[] = [];
    if (!config.apiKey) missing.push('LEMON_SQUEEZY_API_KEY');
    if (!config.storeId) missing.push('LEMON_SQUEEZY_STORE_ID');
    if (!config.webhookSecret) missing.push('LEMON_SQUEEZY_WEBHOOK_SECRET');
    if (!config.variantIds.payg) missing.push('LEMON_SQUEEZY_PAYG_VARIANT_ID');
    if (!config.variantIds.monthly) missing.push('LEMON_SQUEEZY_MONTHLY_VARIANT_ID');
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

export const verifyLemonSqueezySignature = (rawBody: Buffer, signature: unknown, config = getLemonSqueezyConfig()) => {
    if (!config.webhookSecret || typeof signature !== 'string' || !signature.trim()) return false;
    const digest = Buffer.from(createHmac('sha256', config.webhookSecret).update(rawBody).digest('hex'), 'utf8');
    const provided = Buffer.from(signature.trim(), 'utf8');
    return digest.length === provided.length && timingSafeEqual(digest, provided);
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
