import { Router, Request, Response } from 'express';
import { bindDeps, type RouteDeps } from '../_shared';
import { mergeTemplateValidationResults, validateAdminTemplateMetadata, validateAdminTemplateSource } from '@nexcv/templates/templateValidation';
import type { AdminTemplateItem, AdminTemplateValidationResult } from '@nexcv/api-contracts/admin';

export function registerAdminTemplateRoutes(router: Router, deps: RouteDeps) {
    const { CVDocument, TemplateSetting, CV_TEMPLATES, requireAdminPermission, sendError, adminTemplateJsonParser, clearS3TemplateCache, fetchS3Text, putS3Object, S3_TEMPLATE_BUCKET, S3_TEMPLATE_PREFIX, currentUserId, adminTemplateSummary, customTemplateSummary, templateThumbnailPath, validateCustomTemplateKey, defaultTemplateCategory, sanitizeTemplateSource, validateTemplateHtml, validateTemplateCss, parseThumbnailUpload, TEMPLATE_CATEGORIES, TEMPLATE_SURFACE_COLOR_ROLES, TEMPLATE_STATUSES, MAX_TEMPLATE_HTML_LENGTH, MAX_TEMPLATE_CSS_LENGTH, sanitizeProfileField, recordAdminAuditLog } = bindDeps(deps);

    router.get('/api/admin/templates', requireAdminPermission('templates.read'), async (_req: Request, res: Response) => {
        try {
            const [settings, usage] = await Promise.all([
                TemplateSetting.find(),
                CVDocument.aggregate([
                    { $group: { _id: '$template', count: { $sum: 1 } } },
                ]),
            ]);
            const settingMap = new Map(settings.map((setting) => [setting.key, setting]));
            const usageMap = new Map(usage.map((item: any) => [item._id, item.count]));
            const builtInKeys = new Set<string>(CV_TEMPLATES.map((template) => template.key));
            const customTemplates = settings
                .filter((setting) => setting.source === 'custom' && !builtInKeys.has(setting.key))
                .map((setting) => customTemplateSummary(setting, usageMap.get(setting.key) || 0));

            const response = {
                categories: TEMPLATE_CATEGORIES,
                statuses: TEMPLATE_STATUSES,
                surfaceColorRoles: TEMPLATE_SURFACE_COLOR_ROLES,
                templates: [
                    ...CV_TEMPLATES.map((template) => adminTemplateSummary(
                        template,
                        settingMap.get(template.key),
                        usageMap.get(template.key) || 0
                    )),
                    ...customTemplates,
                ],
            } satisfies {
                categories: string[];
                statuses: AdminTemplateItem['status'][];
                surfaceColorRoles: AdminTemplateItem['surfaceColorRole'][];
                templates: AdminTemplateItem[];
            };
            return res.json(response);
        } catch (error) {
            return sendError(res, 500, 'Could not load admin templates.', error);
        }
    });


    router.post('/api/admin/templates', requireAdminPermission('templates.write'), adminTemplateJsonParser, async (req: Request, res: Response) => {
        try {
            const key = validateCustomTemplateKey(req.body.key);
            if (!key) return res.status(400).json({ error: 'Use a lowercase slug key like modern-2026.' });
            if (CV_TEMPLATES.some((template) => template.key === key) || await TemplateSetting.exists({ key })) {
                return res.status(409).json({ error: 'A template with this key already exists.' });
            }
            if (!S3_TEMPLATE_BUCKET) {
                return res.status(400).json({ error: 'S3 template bucket is not configured.' });
            }

            const label = sanitizeProfileField(req.body.label, 80) || key;
            const category = typeof req.body.category === 'string' && TEMPLATE_CATEGORIES.includes(req.body.category as any)
                ? req.body.category
                : defaultTemplateCategory(key);
            const access = req.body.access === 'free' ? 'free' : 'paid';
            const surfaceColorRole = TEMPLATE_SURFACE_COLOR_ROLES.includes(req.body.surfaceColorRole)
                ? req.body.surfaceColorRole
                : 'none';
            const surfaceColorLabel = sanitizeProfileField(req.body.surfaceColorLabel, 80);
            const defaultThemeColor = typeof req.body.defaultThemeColor === 'string' ? req.body.defaultThemeColor.trim() : '#000000';
            const indexHtml = sanitizeTemplateSource(req.body.indexHtml, MAX_TEMPLATE_HTML_LENGTH);
            const styleCss = sanitizeTemplateSource(req.body.styleCss, MAX_TEMPLATE_CSS_LENGTH);
            const thumbnailUpload = parseThumbnailUpload(req.body.thumbnailDataUrl);
            const htmlError = validateTemplateHtml(indexHtml);
            const cssError = validateTemplateCss(styleCss);
            if (htmlError || cssError) return res.status(400).json({ error: htmlError || cssError });
            if (!thumbnailUpload) return res.status(400).json({ error: 'Upload a PNG, JPG, WebP, or SVG thumbnail under 900 KB.' });
            const validation = mergeTemplateValidationResults(
                validateAdminTemplateMetadata({ key, label, category, access, surfaceColorRole, surfaceColorLabel, defaultThemeColor }),
                validateAdminTemplateSource({
                indexHtml,
                styleCss,
                thumbnailPresent: Boolean(thumbnailUpload),
                })
            );
            if (validation.errors.length) {
                return res.status(400).json({ error: 'Fix template validation errors before saving.', validation });
            }

            const s3Prefix = S3_TEMPLATE_PREFIX ? `${S3_TEMPLATE_PREFIX}/${key}` : key;
            const indexS3Key = `${s3Prefix}/index.html`;
            const styleS3Key = `${s3Prefix}/style.css`;
            const thumbnailS3Key = `${s3Prefix}/thumbnail.${thumbnailUpload.extension}`;
            await Promise.all([
                putS3Object(indexS3Key, indexHtml, 'text/html; charset=utf-8'),
                putS3Object(styleS3Key, styleCss, 'text/css; charset=utf-8'),
                putS3Object(thumbnailS3Key, thumbnailUpload.buffer, thumbnailUpload.contentType),
            ]);

            const setting = await TemplateSetting.create({
                key,
                label,
                category,
                access,
                thumbnail: templateThumbnailPath(key, Date.now()),
                surfaceColorRole,
                surfaceColorLabel,
                defaultThemeColor,
                source: 'custom',
                status: req.body.status === 'active' ? 'active' : 'draft',
                s3Prefix,
                indexS3Key,
                styleS3Key,
                thumbnailS3Key,
                createdBy: currentUserId(req),
                updatedBy: currentUserId(req),
            });

            clearS3TemplateCache(key);
            await recordAdminAuditLog({
                actorId: currentUserId(req),
                action: 'template.created',
                targetType: 'template',
                targetId: key,
                targetLabel: label,
                metadata: { category, access, status: setting.status, source: 'custom' },
                ip: req.ip,
                userAgent: req.get('user-agent'),
            });
            const response = { template: customTemplateSummary(setting, 0), validation } satisfies {
                template: AdminTemplateItem;
                validation: AdminTemplateValidationResult;
            };
            return res.status(201).json(response);
        } catch (error) {
            return sendError(res, 500, 'Could not create template.', error);
        }
    });


    router.patch('/api/admin/templates/:key', requireAdminPermission('templates.write'), adminTemplateJsonParser, async (req: Request, res: Response) => {
        try {
            const key = req.params.key;
            const template = CV_TEMPLATES.find((item) => item.key === key);
            const existingCustom = !template ? await TemplateSetting.findOne({ key, source: 'custom' }) : null;
            const previousTemplate = template ? await TemplateSetting.findOne({ key }) : existingCustom;
            if (!template && !existingCustom) {
                return res.status(404).json({ error: 'Template not found.' });
            }

            const label = sanitizeProfileField(req.body.label, 80) || template?.label || existingCustom?.label || key;
            const category = typeof req.body.category === 'string' && TEMPLATE_CATEGORIES.includes(req.body.category as any)
                ? req.body.category
                : defaultTemplateCategory(key);
            const access = req.body.access === 'free' ? 'free' : 'paid';
            const surfaceColorRole = TEMPLATE_SURFACE_COLOR_ROLES.includes(req.body.surfaceColorRole)
                ? req.body.surfaceColorRole
                : (template?.surfaceColorRole || existingCustom?.surfaceColorRole || 'none');
            const surfaceColorLabel = sanitizeProfileField(req.body.surfaceColorLabel, 80) || (template && 'surfaceColorLabel' in template ? template.surfaceColorLabel : '') || existingCustom?.surfaceColorLabel || '';
            const defaultThemeColor = typeof req.body.defaultThemeColor === 'string'
                ? req.body.defaultThemeColor.trim()
                : previousTemplate?.defaultThemeColor || '#000000';
            let thumbnail = sanitizeProfileField(req.body.thumbnail, 500) || template?.image || existingCustom?.thumbnail || templateThumbnailPath(key, Date.now());
            const metadataValidation = validateAdminTemplateMetadata({ key, label, category, access, surfaceColorRole, surfaceColorLabel, defaultThemeColor, thumbnail }, { requireThumbnailPath: true });
            if (metadataValidation.errors.length) {
                return res.status(400).json({ error: 'Fix template validation errors before saving.', validation: metadataValidation });
            }
            const update: any = {
                key,
                label,
                category,
                access,
                thumbnail,
                surfaceColorRole,
                surfaceColorLabel,
                defaultThemeColor,
                source: template ? 'built_in' : 'custom',
                updatedBy: currentUserId(req),
            };

            if (!template) {
                const indexHtml = typeof req.body.indexHtml === 'string' ? sanitizeTemplateSource(req.body.indexHtml, MAX_TEMPLATE_HTML_LENGTH) : '';
                const styleCss = typeof req.body.styleCss === 'string' ? sanitizeTemplateSource(req.body.styleCss, MAX_TEMPLATE_CSS_LENGTH) : '';
                const thumbnailUpload = parseThumbnailUpload(req.body.thumbnailDataUrl);
                const s3Prefix = existingCustom?.s3Prefix || (S3_TEMPLATE_PREFIX ? `${S3_TEMPLATE_PREFIX}/${key}` : key);
                update.s3Prefix = s3Prefix;
                const currentIndexHtml = indexHtml || (existingCustom?.indexS3Key ? await fetchS3Text(existingCustom.indexS3Key) : '');
                const currentStyleCss = styleCss || (existingCustom?.styleS3Key ? await fetchS3Text(existingCustom.styleS3Key) : '');
                const validation = mergeTemplateValidationResults(metadataValidation, validateAdminTemplateSource({
                    indexHtml: currentIndexHtml,
                    styleCss: currentStyleCss,
                    thumbnailPresent: Boolean(thumbnailUpload || existingCustom?.thumbnailS3Key),
                }));
                if (validation.errors.length) {
                    return res.status(400).json({ error: 'Fix template validation errors before saving.', validation });
                }

                if (indexHtml) {
                    const htmlError = validateTemplateHtml(indexHtml);
                    if (htmlError) return res.status(400).json({ error: htmlError });
                    update.indexS3Key = `${s3Prefix}/index.html`;
                    await putS3Object(update.indexS3Key, indexHtml, 'text/html; charset=utf-8');
                }
                if (styleCss) {
                    const cssError = validateTemplateCss(styleCss);
                    if (cssError) return res.status(400).json({ error: cssError });
                    update.styleS3Key = `${s3Prefix}/style.css`;
                    await putS3Object(update.styleS3Key, styleCss, 'text/css; charset=utf-8');
                }
                if (thumbnailUpload) {
                    update.thumbnailS3Key = `${s3Prefix}/thumbnail.${thumbnailUpload.extension}`;
                    await putS3Object(update.thumbnailS3Key, thumbnailUpload.buffer, thumbnailUpload.contentType);
                    thumbnail = templateThumbnailPath(key, Date.now());
                    update.thumbnail = thumbnail;
                }
                update.status = TEMPLATE_STATUSES.includes(req.body.status) ? req.body.status : existingCustom?.status || 'draft';
            }

            const setting = await TemplateSetting.findOneAndUpdate(
                { key },
                update,
                { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
            );
            const usageCount = await CVDocument.countDocuments({ template: key });

            clearS3TemplateCache(key);
            await recordAdminAuditLog({
                actorId: currentUserId(req),
                action: 'template.updated',
                targetType: 'template',
                targetId: key,
                targetLabel: label,
                metadata: {
                    previous: previousTemplate ? {
                        label: previousTemplate.label,
                        category: previousTemplate.category,
                        access: previousTemplate.access,
                        status: previousTemplate.status,
                    } : null,
                    next: { label, category, access, status: setting.status, source: setting.source },
                },
                ip: req.ip,
                userAgent: req.get('user-agent'),
            });
            return res.json({ template: template ? adminTemplateSummary(template, setting, usageCount) : customTemplateSummary(setting, usageCount), validation: !template ? mergeTemplateValidationResults(validateAdminTemplateMetadata({ key, label, category, access, surfaceColorRole, surfaceColorLabel, defaultThemeColor, thumbnail }, { requireThumbnailPath: true }), validateAdminTemplateSource({
                indexHtml: setting.indexS3Key ? await fetchS3Text(setting.indexS3Key) : '',
                styleCss: setting.styleS3Key ? await fetchS3Text(setting.styleS3Key) : '',
                thumbnailPresent: Boolean(setting.thumbnailS3Key),
            })) : metadataValidation });
        } catch (error) {
            return sendError(res, 500, 'Could not update template.', error);
        }
    });


    router.post('/api/admin/templates/:key/publish', requireAdminPermission('templates.publish'), adminTemplateJsonParser, async (req: Request, res: Response) => {
        try {
            const key = validateCustomTemplateKey(req.params.key);
            const setting = key ? await TemplateSetting.findOne({ key, source: 'custom' }) : null;
            if (!setting) return res.status(404).json({ error: 'Template not found.' });
            const indexHtml = setting.indexS3Key ? await fetchS3Text(setting.indexS3Key) : null;
            const styleCss = setting.styleS3Key ? await fetchS3Text(setting.styleS3Key) : null;
            if (!indexHtml || !styleCss || !setting.thumbnailS3Key) {
                return res.status(400).json({ error: 'Template needs HTML, CSS, and thumbnail files before publishing.' });
            }
            const validation = mergeTemplateValidationResults(
                validateAdminTemplateMetadata({
                    key,
                    label: setting.label || key,
                    category: setting.category,
                    access: setting.access,
                    surfaceColorRole: setting.surfaceColorRole,
                    surfaceColorLabel: setting.surfaceColorLabel,
                    defaultThemeColor: setting.defaultThemeColor || '#000000',
                    thumbnail: setting.thumbnail,
                }, { requireThumbnailPath: true }),
                validateAdminTemplateSource({
                indexHtml,
                styleCss,
                thumbnailPresent: Boolean(setting.thumbnailS3Key),
                })
            );
            if (validation.errors.length) {
                return res.status(400).json({ error: 'Fix template validation errors before publishing.', validation });
            }
            setting.status = 'active';
            setting.updatedBy = currentUserId(req);
            await setting.save();
            clearS3TemplateCache(key);
            const usageCount = await CVDocument.countDocuments({ template: key });
            await recordAdminAuditLog({
                actorId: currentUserId(req),
                action: 'template.published',
                targetType: 'template',
                targetId: key,
                targetLabel: setting.label || key,
                metadata: { status: setting.status },
                ip: req.ip,
                userAgent: req.get('user-agent'),
            });
            return res.json({ template: customTemplateSummary(setting, usageCount), validation });
        } catch (error) {
            return sendError(res, 500, 'Could not publish template.', error);
        }
    });


    router.post('/api/admin/templates/:key/archive', requireAdminPermission('templates.publish'), adminTemplateJsonParser, async (req: Request, res: Response) => {
        try {
            const key = validateCustomTemplateKey(req.params.key);
            const setting = key ? await TemplateSetting.findOne({ key, source: 'custom' }) : null;
            if (!setting) return res.status(404).json({ error: 'Template not found.' });
            setting.status = 'archived';
            setting.updatedBy = currentUserId(req);
            await setting.save();
            clearS3TemplateCache(key);
            const usageCount = await CVDocument.countDocuments({ template: key });
            await recordAdminAuditLog({
                actorId: currentUserId(req),
                action: 'template.archived',
                targetType: 'template',
                targetId: key,
                targetLabel: setting.label || key,
                metadata: { status: setting.status },
                ip: req.ip,
                userAgent: req.get('user-agent'),
            });
            return res.json({ template: customTemplateSummary(setting, usageCount) });
        } catch (error) {
            return sendError(res, 500, 'Could not archive template.', error);
        }
    });

}

