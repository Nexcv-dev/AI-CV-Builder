import TemplateSetting from '../server-models/TemplateSetting';
import { CV_TEMPLATES, DEFAULT_TEMPLATE, isTemplateName, type TemplateName } from '@nexcv/templates';
import templateReleaseMap from '../config/template-release-map.json';

export const TEMPLATE_CATEGORIES = ['Modern', 'ATS Friendly', 'Minimal', 'Executive', 'Creative', 'Tech', 'Corporate'] as const;
export const TEMPLATE_STATUSES = ['draft', 'active', 'archived'] as const;
export const TEMPLATE_SURFACE_COLOR_ROLES = ['none', 'sidebar', 'header'] as const;
const CUSTOM_TEMPLATE_KEY_PATTERN = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
export const MAX_TEMPLATE_HTML_LENGTH = 240_000;
export const MAX_TEMPLATE_CSS_LENGTH = 160_000;
const MAX_TEMPLATE_THUMBNAIL_BYTES = 900_000;

const sanitizeProfileField = (value: unknown, maxLength = 160) => (
    typeof value === 'string'
        ? value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, maxLength)
        : ''
);

export const defaultTemplateCategory = (key: string) => {
    if (key === 'classic') return 'ATS Friendly';
    if (key === 'minimalist') return 'Minimal';
    if (key === 'professional') return 'Corporate';
    if (key === 'startup') return 'Creative';
    if (key === 'timeline') return 'Executive';
    return 'Modern';
};

export const templateThumbnailPath = (key: string, version?: unknown) => (
    `/api/templates/${encodeURIComponent(key)}/thumbnail${version ? `?v=${encodeURIComponent(String(version))}` : ''}`
);

const isLegacyTemplateThumbnailPath = (value: unknown) => (
    typeof value === 'string' && /\.(?:png|svg)(?:[?#].*)?$/i.test(value.trim())
);

const builtInThumbnail = (template: any, setting: any) => {
    const thumbnail = setting?.thumbnail;
    return thumbnail && !isLegacyTemplateThumbnailPath(thumbnail) ? thumbnail : template.image;
};

const customThumbnail = (setting: any) => {
    const version = setting.updatedAt?.getTime?.() || setting.updatedAt;
    if (setting.thumbnailS3Key || isLegacyTemplateThumbnailPath(setting.thumbnail)) {
        return templateThumbnailPath(setting.key, version);
    }
    return setting.thumbnail || templateThumbnailPath(setting.key, version);
};

const releaseTemplateMap = new Map(
    (templateReleaseMap as Array<{
        sourceFolder: string;
        targetKey: string;
        label: string;
        category: string;
        access: 'free' | 'paid';
        surfaceColorRole: 'none' | 'sidebar' | 'header';
        surfaceColorLabel?: string;
        defaultThemeColor?: string;
    }>).map((template) => [template.targetKey, template])
);

export const getReleasedTemplateDefinition = (key: string) => releaseTemplateMap.get(key) || null;

export const getReleasedTemplateSummaries = (settings: Map<string, any>, usageCount = 0) => (
    [...releaseTemplateMap.values()]
        .filter((template) => {
            const setting = settings.get(template.targetKey);
            return !setting || setting.status === 'active';
        })
        .map((template) => releasedTemplateSummary(template, settings.get(template.targetKey), usageCount))
);

const releasedTemplateSummary = (template: NonNullable<ReturnType<typeof releaseTemplateMap.get>>, setting: any = null, usageCount = 0) => ({
    key: template.targetKey,
    label: setting?.label || template.label,
    category: setting?.category || template.category || defaultTemplateCategory(template.targetKey),
    access: setting?.access || template.access || 'paid',
    thumbnail: customThumbnail({
        key: template.targetKey,
        thumbnail: setting?.thumbnail,
        thumbnailS3Key: setting?.thumbnailS3Key || `${process.env.S3_TEMPLATE_PREFIX || 'templates'}/${template.targetKey}/thumbnail.webp`,
        updatedAt: setting?.updatedAt,
    }),
    builtInThumbnail: customThumbnail({
        key: template.targetKey,
        thumbnail: setting?.thumbnail,
        thumbnailS3Key: setting?.thumbnailS3Key || `${process.env.S3_TEMPLATE_PREFIX || 'templates'}/${template.targetKey}/thumbnail.webp`,
        updatedAt: setting?.updatedAt,
    }),
    surfaceColorRole: setting?.surfaceColorRole || template.surfaceColorRole || 'none',
    surfaceColorLabel: setting?.surfaceColorLabel || template.surfaceColorLabel || null,
    defaultThemeColor: setting?.defaultThemeColor || template.defaultThemeColor || '#000000',
    source: 'custom',
    status: setting?.status || 'active',
    usageCount,
    updatedAt: setting?.updatedAt,
});

const builtInTemplateSummary = (template: any, setting: any, usageCount = 0) => ({
    key: template.key,
    label: setting?.label || template.label,
    category: setting?.category || defaultTemplateCategory(template.key),
    access: setting?.access || template.access,
    thumbnail: builtInThumbnail(template, setting),
    builtInThumbnail: template.image,
    surfaceColorRole: setting?.surfaceColorRole || template.surfaceColorRole,
    surfaceColorLabel: setting?.surfaceColorLabel || template.surfaceColorLabel || null,
    defaultThemeColor: setting?.defaultThemeColor || '#000000',
    source: 'built_in',
    status: setting?.status || 'active',
    usageCount,
    updatedAt: setting?.updatedAt,
});

export const customTemplateSummary = (setting: any, usageCount = 0) => ({
    key: setting.key,
    label: setting.label || setting.key,
    category: setting.category || defaultTemplateCategory(setting.key),
    access: setting.access || 'paid',
    thumbnail: customThumbnail(setting),
    builtInThumbnail: customThumbnail(setting),
    surfaceColorRole: setting.surfaceColorRole || 'none',
    surfaceColorLabel: setting.surfaceColorLabel || null,
    defaultThemeColor: setting.defaultThemeColor || '#000000',
    source: 'custom',
    status: setting.status || 'draft',
    usageCount,
    updatedAt: setting.updatedAt,
});

export const adminTemplateSummary = (template: any, setting: any, usageCount = 0) => ({
    ...builtInTemplateSummary(template, setting, usageCount),
});

export const getTemplateSettingForKey = async (key: string) => {
    const template = CV_TEMPLATES.find((item) => item.key === key);
    if (!template) {
        const setting = await TemplateSetting.findOne({ key, source: 'custom', status: { $ne: 'archived' } });
        const releasedTemplate = releaseTemplateMap.get(key);
        if (releasedTemplate) return releasedTemplateSummary(releasedTemplate, setting, 0);
        return setting ? customTemplateSummary(setting, 0) : null;
    }
    const setting = await TemplateSetting.findOne({ key });
    return adminTemplateSummary(template, setting, 0);
};

export const getActiveTemplateForKey = async (key: unknown) => {
    if (!isTemplateName(key)) return null;
    const builtIn = CV_TEMPLATES.find((item) => item.key === key);
    if (builtIn) {
        const setting = await TemplateSetting.findOne({ key });
        const summary = builtInTemplateSummary(builtIn, setting, 0);
        return summary.status === 'archived' ? null : summary;
    }
    const custom = await TemplateSetting.findOne({ key, source: 'custom', status: 'active' });
    const releasedTemplate = releaseTemplateMap.get(key);
    if (releasedTemplate) {
        if (custom && custom.status !== 'active') return null;
        return releasedTemplateSummary(releasedTemplate, custom, 0);
    }
    return custom ? customTemplateSummary(custom, 0) : null;
};

export const resolveRequestedTemplate = async (value: unknown): Promise<TemplateName> => {
    const template = await getActiveTemplateForKey(value);
    return (template?.key || DEFAULT_TEMPLATE) as TemplateName;
};

export const validateCustomTemplateKey = (value: unknown) => {
    const key = sanitizeProfileField(value, 60).toLowerCase();
    return CUSTOM_TEMPLATE_KEY_PATTERN.test(key) ? key : '';
};

export const sanitizeTemplateSource = (value: unknown, maxLength: number) => (
    typeof value === 'string'
        ? value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, maxLength)
        : ''
);

export const validateTemplateHtml = (html: string) => {
    if (!html.trim()) return 'Template HTML is required.';
    if (html.length > MAX_TEMPLATE_HTML_LENGTH) return 'Template HTML is too large.';
    if (/<\s*script\b/i.test(html)) return 'Template HTML cannot include script tags.';
    if (/\son[a-z]+\s*=/i.test(html)) return 'Template HTML cannot include inline event handlers.';
    if (/javascript:/i.test(html)) return 'Template HTML cannot include javascript URLs.';
    if (!/{{\s*personalInfo\.fullName\s*}}/.test(html) && !/{{\s*#/.test(html)) {
        return 'Template HTML must include NexCV template placeholders.';
    }
    return '';
};

export const validateTemplateCss = (css: string) => {
    if (!css.trim()) return 'Template CSS is required.';
    if (css.length > MAX_TEMPLATE_CSS_LENGTH) return 'Template CSS is too large.';
    if (/<\s*script\b/i.test(css) || /javascript:/i.test(css)) return 'Template CSS contains unsafe content.';
    return '';
};

export const parseThumbnailUpload = (value: unknown) => {
    if (typeof value !== 'string' || !value.trim()) return null;
    const match = value.match(/^data:image\/(png|jpe?g|webp|svg\+xml);base64,([a-z0-9+/=\s]+)$/i);
    if (!match) return null;
    const extension = match[1].toLowerCase().replace('jpeg', 'jpg').replace('svg+xml', 'svg');
    const buffer = Buffer.from(match[2].replace(/\s+/g, ''), 'base64');
    if (!buffer.length || buffer.length > MAX_TEMPLATE_THUMBNAIL_BYTES) return null;
    const contentType = extension === 'svg' ? 'image/svg+xml' : `image/${extension === 'jpg' ? 'jpeg' : extension}`;
    return { buffer, extension, contentType };
};
