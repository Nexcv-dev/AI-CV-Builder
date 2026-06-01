import { sanitizeCvData } from './pdfService';

const CV_SECTION_KEYS = ['summary', 'personalDetails', 'experience', 'education', 'skills', 'projects', 'courses', 'awards', 'languages', 'references'];
const CV_STRING_FIELDS = {
    personalInfo: ['fullName', 'email', 'phone', 'address', 'summary', 'dob', 'nic', 'gender', 'nationality', 'religion', 'maritalStatus'],
    experience: ['company', 'position', 'startDate', 'endDate', 'description'],
    education: ['institution', 'degree', 'startDate', 'endDate', 'description'],
    skills: ['name', 'category'],
    courses: ['name', 'institution', 'startDate', 'endDate'],
    languages: ['name', 'proficiency'],
    projects: ['name', 'description', 'link'],
    awards: ['name', 'date', 'issuer'],
    references: ['name', 'position', 'company', 'email', 'phone'],
} as const;
const MAX_STORED_CV_ITEMS = 50;
export const DEFAULT_SECTION_ORDER = ['summary', 'personalDetails', 'experience', 'education', 'skills', 'projects', 'courses', 'awards', 'languages', 'references'];

const cleanStoredString = (value: unknown) => typeof value === 'string' ? sanitizeCvData(value).trim() : '';

const cleanStoredNumber = (value: unknown, fallback: number, min: number, max: number) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(Math.max(number, min), max) : fallback;
};

const cleanStoredHexColor = (value: unknown, fallback: string) => {
    const color = cleanStoredString(value);
    return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
};

const cleanStoredColorMap = (value: unknown) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const colors = Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>((acc, [key, color]) => {
        if (!/^[a-z0-9_-]{1,80}$/i.test(key)) return acc;
        const safeColor = cleanStoredHexColor(color, '');
        if (safeColor) acc[key] = safeColor;
        return acc;
    }, {});
    return Object.keys(colors).length ? colors : undefined;
};

const cleanStoredStringArray = (value: unknown, allowedValues?: readonly string[]) => {
    if (!Array.isArray(value)) return [];
    const allowed = allowedValues ? new Set(allowedValues) : null;
    return Array.from(new Set(value
        .map((item) => cleanStoredString(item))
        .filter((item) => item && (!allowed || allowed.has(item)))))
        .slice(0, MAX_STORED_CV_ITEMS);
};

const cleanStoredItems = (items: unknown, fields: readonly string[], options: { withSkillLevel?: boolean } = {}) => {
    if (!Array.isArray(items)) return [];

    return items.slice(0, MAX_STORED_CV_ITEMS)
        .map((item) => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
            const input = item as Record<string, unknown>;
            const output: Record<string, unknown> = {};

            const id = cleanStoredString(input.id);
            if (id) output.id = id;

            for (const field of fields) {
                output[field] = cleanStoredString(input[field]);
            }

            if (options.withSkillLevel) {
                output.level = cleanStoredNumber(input.level, 3, 1, 5);
            }

            const hasMeaningfulValue = fields.some((field) => Boolean(output[field]));
            return hasMeaningfulValue ? output : null;
        })
        .filter(Boolean);
};

export function sanitizeCvDataForStorage(cvData: any) {
    const safe = sanitizeCvData(cvData || {});
    const personalInfo = CV_STRING_FIELDS.personalInfo.reduce<Record<string, string>>((acc, field) => {
        acc[field] = cleanStoredString(safe?.personalInfo?.[field]);
        return acc;
    }, {});

    const templateThemeColors = cleanStoredColorMap(safe.templateThemeColors);
    const templateSurfaceColors = cleanStoredColorMap(safe.templateSurfaceColors);

    return {
        personalInfo,
        experience: cleanStoredItems(safe.experience, CV_STRING_FIELDS.experience),
        education: cleanStoredItems(safe.education, CV_STRING_FIELDS.education),
        skills: cleanStoredItems(safe.skills, CV_STRING_FIELDS.skills, { withSkillLevel: true }),
        courses: cleanStoredItems(safe.courses, CV_STRING_FIELDS.courses),
        languages: cleanStoredItems(safe.languages, CV_STRING_FIELDS.languages),
        projects: cleanStoredItems(safe.projects, CV_STRING_FIELDS.projects),
        awards: cleanStoredItems(safe.awards, CV_STRING_FIELDS.awards),
        references: cleanStoredItems(safe.references, CV_STRING_FIELDS.references),
        themeColor: cleanStoredHexColor(safe.themeColor, '#000000'),
        ...(templateThemeColors ? { templateThemeColors } : {}),
        fontFamily: cleanStoredString(safe.fontFamily) || 'Inter',
        profileImage: cleanStoredString(safe.profileImage),
        imageZoom: cleanStoredNumber(safe.imageZoom, 1, 0.5, 3),
        imageX: cleanStoredNumber(safe.imageX, 0, -120, 120),
        imageY: cleanStoredNumber(safe.imageY, 0, -120, 120),
        sidebarColor: cleanStoredHexColor(safe.sidebarColor, '#1e293b'),
        templateSurfaceColor: cleanStoredHexColor(safe.templateSurfaceColor, ''),
        ...(templateSurfaceColors ? { templateSurfaceColors } : {}),
        sectionOrder: cleanStoredStringArray(safe.sectionOrder, CV_SECTION_KEYS).length
            ? cleanStoredStringArray(safe.sectionOrder, CV_SECTION_KEYS)
            : DEFAULT_SECTION_ORDER,
        lineSpacing: cleanStoredNumber(safe.lineSpacing, 1.5, 1, 2.5),
        sectionGap: cleanStoredNumber(safe.sectionGap, 2, 0.5, 4),
        textScale: cleanStoredNumber(safe.textScale, 1, 0.85, 1.2),
        hiddenSections: cleanStoredStringArray(safe.hiddenSections, CV_SECTION_KEYS),
    };
}
