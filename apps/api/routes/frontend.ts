import express, { type Express, type Request, type Response } from 'express';
import path from 'path';
import { createHash } from 'crypto';
import { readFile, readdir } from 'fs/promises';
import {
    buildAssetUrl,
    buildCanonicalUrl,
    buildJsonLd,
    getSeoRoute,
    isPublicSeoPath,
    PUBLIC_SEO_ROUTES,
    shouldNoIndexPath,
    SITE_NAME,
} from '@nexcv/shared/seo';
import { requireAdminPageAllowedIp } from '../server-utils/adminIpAllowlist';
import { logError } from '../server-utils/logger';

export type FrontendRouteOptions = {
    /** Built web app folder (apps/web/dist unless WEB_DIST_DIR is set). */
    distPath: string;
    /** Public site origin used for canonical URLs, the sitemap, and robots.txt. */
    siteUrl: string;
};

const getStableAssetName = (file: string) => {
    const match = file.match(/^(.+)-[A-Za-z0-9_-]{8,}\.(css|js)$/i);
    return match ? `${match[1]}.${match[2].toLowerCase()}` : '';
};

function escapeHtml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function escapeXml(value: string) {
    return escapeHtml(value).replace(/'/g, '&apos;');
}

function escapeScriptJson(value: string) {
    return value.replace(/</g, '\\u003c');
}

// Serves robots.txt, sitemap.xml, the built web app, and the SEO-rendered index.html catch-all.
// Register this after all API routers so it never shadows an API path.
export function registerFrontendRoutes(app: Express, { distPath, siteUrl }: FrontendRouteOptions) {
    const distAssetsPath = path.join(distPath, 'assets');

    function buildSitemapXml() {
        const now = new Date().toISOString();
        const urls = PUBLIC_SEO_ROUTES.map((route) => {
            const loc = escapeXml(buildCanonicalUrl(route.path, siteUrl));
            const priority = route.path === '/' ? '1.0' : route.path === '/templates' || route.path === '/tips' || route.path === '/html-to-pdf' ? '0.8' : '0.6';
            return [
                '  <url>',
                `    <loc>${loc}</loc>`,
                `    <lastmod>${now}</lastmod>`,
                '    <changefreq>weekly</changefreq>',
                `    <priority>${priority}</priority>`,
                '  </url>',
            ].join('\n');
        }).join('\n');

        return [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
            urls,
            '</urlset>',
            '',
        ].join('\n');
    }

    function buildRobotsTxt() {
        return [
            'User-agent: *',
            'Allow: /',
            'Disallow: /admin',
            'Disallow: /builder',
            'Disallow: /checkout',
            'Disallow: /dashboard',
            'Disallow: /forgot-password',
            'Disallow: /my-cvs',
            'Disallow: /print',
            'Disallow: /profile',
            'Disallow: /reset-password',
            'Disallow: /settings',
            'Disallow: /verify-email',
            `Sitemap: ${siteUrl}/sitemap.xml`,
            '',
        ].join('\n');
    }

    let indexHtmlPromise: Promise<string> | null = null;
    type CurrentAssetManifest = {
        css?: string;
        js?: string;
        byStableName: Map<string, string>;
    };

    let currentAssetManifestPromise: Promise<CurrentAssetManifest> | null = null;

    const getIndexHtml = () => {
        if (!indexHtmlPromise) {
            indexHtmlPromise = readFile(path.join(distPath, 'index.html'), 'utf-8');
        }
        return indexHtmlPromise;
    };

    const getCurrentAssetManifest = async () => {
        if (!currentAssetManifestPromise) {
            currentAssetManifestPromise = readdir(distAssetsPath)
                .then((files) => {
                    const byStableName = new Map<string, string>();

                    for (const file of files) {
                        const match = file.match(/^(.+)-[A-Za-z0-9_-]{8,}\.(css|js)$/i);
                        if (match) {
                            byStableName.set(`${match[1]}.${match[2].toLowerCase()}`, file);
                        }
                    }

                    return {
                        css: files.find((file) => /^index-.*\.css$/i.test(file)),
                        js: files.find((file) => /^index-.*\.js$/i.test(file)),
                        byStableName,
                    };
                })
                .catch(() => ({ byStableName: new Map() }));
        }
        return currentAssetManifestPromise;
    };

    async function renderSeoIndexHtml(req: Request) {
        const html = await getIndexHtml();
        const route = getSeoRoute(req.path);
        const noIndex = shouldNoIndexPath(req.path) || !isPublicSeoPath(req.path);
        const canonicalPath = isPublicSeoPath(req.path) ? route.path : '/';
        const canonicalUrl = buildCanonicalUrl(canonicalPath, siteUrl);
        const imageUrl = buildAssetUrl(route.image, siteUrl);
        const jsonLd = JSON.stringify(buildJsonLd(route, siteUrl));
        const jsonLdHash = createHash('sha256').update(jsonLd).digest('base64');
        const meta = [
            `<meta name="description" content="${escapeHtml(route.description)}">`,
            `<meta name="keywords" content="${escapeHtml(route.keywords.join(', '))}">`,
            `<meta name="robots" content="${noIndex ? 'noindex, nofollow' : 'index, follow'}">`,
            `<link rel="canonical" href="${escapeHtml(canonicalUrl)}">`,
            `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}">`,
            '<meta property="og:type" content="website">',
            `<meta property="og:title" content="${escapeHtml(route.title)}">`,
            `<meta property="og:description" content="${escapeHtml(route.description)}">`,
            `<meta property="og:url" content="${escapeHtml(canonicalUrl)}">`,
            `<meta property="og:image" content="${escapeHtml(imageUrl)}">`,
            '<meta name="twitter:card" content="summary_large_image">',
            `<meta name="twitter:title" content="${escapeHtml(route.title)}">`,
            `<meta name="twitter:description" content="${escapeHtml(route.description)}">`,
            `<meta name="twitter:image" content="${escapeHtml(imageUrl)}">`,
            `<script type="application/ld+json">${escapeScriptJson(jsonLd)}</script>`,
        ].join('\n  ');

        return html
            .replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(route.title)}</title>`)
            .replace(/(script-src[^;"]*)/, `$1 'sha256-${jsonLdHash}'`)
            .replace('</head>', `  ${meta}\n</head>`);
    }

    app.get('/robots.txt', (_req: Request, res: Response) => {
        res.type('text/plain').setHeader('Cache-Control', 'public, max-age=3600');
        res.send(buildRobotsTxt());
    });

    app.get('/sitemap.xml', (_req: Request, res: Response) => {
        res.type('application/xml').setHeader('Cache-Control', 'public, max-age=3600');
        res.send(buildSitemapXml());
    });

    app.use(express.static(distPath, {
        setHeaders: (res, filePath) => {
            if (filePath.includes(`${path.sep}assets${path.sep}`)) {
                res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
                return;
            }
            if (/\.(png|jpe?g|webp|svg|ico|woff2?)$/i.test(filePath)) {
                res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
            }
        },
    }));

    app.use('/admin', requireAdminPageAllowedIp);

    app.get('/assets/*', async (req: Request, res: Response) => {
        const requested = path.basename(req.path);
        const manifest = await getCurrentAssetManifest();
        const currentAsset = manifest.byStableName.get(getStableAssetName(requested));

        if (currentAsset && currentAsset !== requested) {
            res.setHeader('Cache-Control', 'no-store');
            return res.redirect(302, `/assets/${currentAsset}`);
        }

        if (/^index-.*\.css$/i.test(requested) && manifest.css) {
            res.setHeader('Cache-Control', 'no-store');
            return res.redirect(302, `/assets/${manifest.css}`);
        }
        if (/^index-.*\.js$/i.test(requested) && manifest.js) {
            res.setHeader('Cache-Control', 'no-store');
            return res.redirect(302, `/assets/${manifest.js}`);
        }

        return res.status(404).type('text/plain').send('Asset not found');
    });

    // Catch-all: serve index.html for any non-API route (React Router support)
    app.get('*', async (req: Request, res: Response) => {
        try {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.setHeader('Pragma', 'no-cache');
            res.type('html').send(await renderSeoIndexHtml(req));
        } catch (error) {
            logError('server.seo_index_render_failed', error, { path: req.path });
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.setHeader('Pragma', 'no-cache');
            res.sendFile(path.join(distPath, 'index.html'));
        }
    });
}
