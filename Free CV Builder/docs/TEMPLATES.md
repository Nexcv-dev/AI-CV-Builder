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
    thumbnail.svg
```

Template folders should use lowercase letters, numbers, and hyphens.

## Rendering Model

Each custom template contains:

- `index.html` - Mustache-style placeholders and layout.
- `style.css` - screen and print styling.
- `thumbnail.*` - card/admin thumbnail.
- Metadata - name, key, premium status, status, profile-image settings, and colors.

Data is normalized before rendering, then injected into the template HTML. CSS is loaded alongside the HTML for preview and export.

## Admin Lifecycle

Typical flow:

1. Create or edit a folder in `Admin Templates/`.
2. Run validation.
3. Preview desktop/mobile and PDF behavior.
4. Dry-run template release.
5. Release to the managed template system.
6. Publish from admin when ready.

Commands:

```bash
cd "Free CV Builder"
npm run validate:template-map
npm run validate:templates
npm run templates:release:dry-run
npm run templates:release
```

## S3 Storage

Managed template assets use:

```env
S3_TEMPLATE_BUCKET_NAME=your_template_bucket
S3_TEMPLATE_PREFIX=templates
AWS_REGION=eu-north-1
S3_TEMPLATE_CACHE_TTL_MS=300000
```

`TEMPLATE_BUCKET_NAME` is also supported as a fallback name for the bucket in backend services.

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
