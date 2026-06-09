# Template System

NexCV supports built-in templates and admin-managed HTML/CSS templates. The same normalized CV data model is used for live preview and PDF rendering.

## Template Sources

### Built-In Templates

Built-in templates are shipped with the frontend code and public assets. They provide reliable defaults and fallback behavior when S3/admin templates are unavailable.

Relevant files:

- `src/templates.ts`
- `src/utils/templateData.ts`
- `src/utils/templateRenderer.ts`
- `public/templates/`

### Admin Templates

Admin templates are authored locally under `Admin Templates/` and can be released into the app/S3 flow after validation.

Expected folder shape:

```text
Admin Templates/
  template-key/
    index.html
    style.css
    thumbnail.webp
```

Template folders should use lowercase letters, numbers, and hyphens.

## Rendering Model

Each custom template contains:

- `index.html` - Mustache-style placeholders and layout.
- `style.css` - screen and print styling.
- `thumbnail.webp` - card/admin thumbnail generated from the rendered template so users see the real CV layout.
- Metadata - name, key, premium status, status, profile-image settings, and colors.

Data is normalized before rendering, then injected into the template HTML. CSS is loaded alongside the HTML for preview and export.

## Thumbnail Generation

Template thumbnails are generated locally by rendering real CV HTML in Chrome and saving WebP screenshots. This is faster and more accurate than hand-drawing SVG previews.

```bash
cd "Free CV Builder"
corepack pnpm templates:thumbnails
```

Run this command from the `Free CV Builder/` project folder, not from inside an individual template folder.

Output locations:

- Built-in template thumbnails are saved to `public/templates/*.webp`.
- Admin template thumbnails are saved to `../Admin Templates/<template-folder>/thumbnail.webp`.

The command currently regenerates every thumbnail: all built-in templates plus every folder under `Admin Templates/`. For example, a template at `Admin Templates/my-new-template/` gets its thumbnail at `Admin Templates/my-new-template/thumbnail.webp`.

To regenerate only one template, pass its built-in key or admin folder name:

```bash
corepack pnpm templates:thumbnails -- --template my-new-template
```

The generator uses sample CV data and the template renderer. For admin/S3 templates, keep `themeColor` at the default `#000000` sentinel so the thumbnail uses the template's `defaultThemeColor` from `config/template-release-map.json`. This keeps thumbnails aligned with each template's default color palette.

You can upload the generated `thumbnail.webp` manually through the admin panel, or use the S3 release command below.

## Admin Lifecycle

Typical flow:

1. Create or edit a folder in `Admin Templates/`.
2. Generate `thumbnail.webp`.
3. Run validation.
4. Preview desktop/mobile and PDF behavior.
5. Dry-run template release.
6. Release to the managed template system.
7. Sync thumbnail metadata.
8. Publish from admin when ready.

Commands:

```bash
cd "Free CV Builder"
corepack pnpm templates:thumbnails
corepack pnpm validate:template-map
corepack pnpm validate:templates
corepack pnpm templates:release:dry-run
corepack pnpm templates:release
corepack pnpm templates:verify-s3
corepack pnpm templates:sync-thumbnails
```

`templates:release` uploads `index.html`, `style.css`, and `thumbnail.webp` for templates listed in `config/template-release-map.json`.

`templates:verify-s3` checks that each released template has `index.html`, `style.css`, and a thumbnail object in S3. Run it after command-line release and before syncing/publishing metadata. To check one key:

```bash
corepack pnpm templates:verify-s3 -- --key=modular-card
```

`templates:sync-thumbnails` updates MongoDB `TemplateSetting` records so public template cards point at the current WebP thumbnails. Run it after S3 upload, especially when replacing old PNG/SVG thumbnails or changing cache-bust URLs.

## S3 Storage

Managed template assets use:

```env
S3_TEMPLATE_BUCKET_NAME=your_template_bucket
S3_TEMPLATE_PREFIX=templates
AWS_REGION=eu-north-1
S3_TEMPLATE_CACHE_TTL_MS=300000
```

`TEMPLATE_BUCKET_NAME` is also supported as a fallback name for the bucket in backend services.

With `S3_TEMPLATE_PREFIX=admin-cv-templates`, uploaded custom template assets use keys like:

```text
admin-cv-templates/modular-card/index.html
admin-cv-templates/modular-card/style.css
admin-cv-templates/modular-card/thumbnail.webp
```

## Safety Rules

Admin templates should not include:

- `<script>`
- `<iframe>`
- JavaScript URLs
- remote tracking pixels
- unsupported form controls

Rich text is sanitized by the app, but templates should still remain simple and printable.

## Authoring Details

For placeholder syntax, computed values, color rules, profile image fields, print CSS, and the upload checklist, use [Template Authoring Guide](template-authoring-guide.md).
