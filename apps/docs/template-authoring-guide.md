# NexCV Template Authoring Guide

Use this guide when creating or updating templates in `Admin Templates/` before uploading them through Admin or syncing to S3.

## Folder Shape

Each template should live in its own folder:

```text
Admin Templates/
  my-template-key/
    index.html
    style.css
    thumbnail.webp
```

Rules:
- Folder name should be the template key, for example `compact-timeline`.
- Use lowercase letters, numbers, and hyphens.
- Prefer `index.html`, not `index (1).html`.
- Prefer files at the template folder root, not nested inside another folder.
- Thumbnail should be `thumbnail.webp` generated from the rendered template. The validator still accepts `.svg`, `.png`, `.jpg`, and `.jpeg` for compatibility, but WebP is the release format users should see.

## Required Files

`index.html` contains the markup and template placeholders.

`style.css` contains the visual layout and print rules.

`thumbnail.webp` is shown in template cards/admin lists. Generate it with `corepack pnpm templates:thumbnails`; the file is saved beside the template source as `Admin Templates/<template-folder>/thumbnail.webp`.

## Mustache Syntax

NexCV templates use simple Mustache-style placeholders.

Plain escaped value:

```html
<h1>{{personalInfo.fullName}}</h1>
```

Rich sanitized HTML:

```html
<div class="rich">{{{personalInfo.summary}}}</div>
```

Conditional block:

```html
{{#hasExperience}}
  ...
{{/hasExperience}}
```

Loop:

```html
{{#experience}}
  <article>
    {{#position}}<h3>{{position}}</h3>{{/position}}
    <p>{{company}}</p>
  </article>
{{/experience}}
```

Inverted block:

```html
{{^position}}
  <h3>{{company}}</h3>
{{/position}}
```

## Common Data

Personal:
- `personalInfo.fullName`
- `personalInfo.email`
- `personalInfo.phone`
- `personalInfo.address`
- `personalInfo.summary`
- `personalInfo.dob`
- `personalInfo.nic`
- `personalInfo.gender`
- `personalInfo.maritalStatus`
- `personalInfo.nationality`
- `personalInfo.religion`

Sections:
- `experience`
- `education`
- `skills`
- `projects`
- `courses`
- `awards`
- `languages`
- `references`
- `sections`

Experience item fields:
- `position`
- `company`
- `startDate`
- `endDate`
- `formattedDate`
- `formattedDateStacked`
- `description`

Reference item fields:
- `name`
- `position`
- `company`
- `sub`
- `email`
- `phone`

Use `{{sub}}` for reference subtitle. Do not write `{{position}}, {{company}}`, because it can render a leading comma when position is empty.

## Computed Values

Colors and font:
- `{{themeColor}}`
- `{{sidebarColor}}`
- `{{templateSurfaceColor}}`
- `{{fontFamily}}`
- `{{computed.themeColor}}`
- `{{computed.templateSurfaceColor}}`
- `{{computed.fontFamilyCSS}}`

Profile image:
- `{{profileImageUrl}}`
- `{{profileImageStyle}}`
- `{{profileImageTransform}}`
- `{{computed.hasProfileImage}}`

Layout:
- `{{computed.sectionGapRem}}`
- `{{computed.lineSpacing}}`

Startup/header helpers:
- `{{{computed.startupHeaderBackground}}}`
- `{{computed.startupHeaderTextColor}}`
- `{{{computed.startupHeaderMutedColor}}}`
- `{{computed.startupHeadlineTitle}}`

## Color Rules

Use `{{themeColor}}` for accent colors that should follow the Design panel.

Example:

```css
.section-title {
  color: {{themeColor}};
  border-bottom: 2px solid {{themeColor}};
}
```

If a template has its own accent color, add it to `TEMPLATE_DEFAULT_THEME_COLORS` in `src/utils/templateData.ts`. Then:
- default black `#000000` becomes the template accent
- user-selected Design panel colors still override it

Avoid hardcoding `#000000`, `#000`, or `black` for accents unless it is truly part of the design.

## Position Fields

The app has `experience.position` and `references.position`, but users may leave them empty.

Good:

```html
{{#position}}<h3>{{position}}</h3>{{/position}}
```

Good fallback to company:

```html
<h3>{{#position}}{{position}}{{/position}}{{^position}}{{company}}{{/position}}</h3>
```

Bad:

```html
<h3>{{position}}</h3>
```

Bad:

```html
<p>{{position}}{{#company}}, {{company}}{{/company}}</p>
```

Use `{{sub}}` for references:

```html
{{#sub}}<p>{{sub}}</p>{{/sub}}
```

## CSS And Print Rules

Every template should include:

```css
@page {
  size: A4;
  margin: 0;
}

.page {
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  overflow: visible;
}
```

Avoid:
- `height: 297mm` on `.page`
- `overflow: hidden` on `html` or `body`
- fixed viewport-width layouts
- scripts or iframes

`overflow: hidden` is okay on local decorative elements like photos, badges, or cards.

## Safety Rules

Do not include:
- `<script>`
- `<iframe>`
- remote tracking pixels
- JavaScript URLs
- unsupported form controls

Rich text is sanitized, but the template itself should still stay simple.

## Validation Before Upload

Run:

```bash
corepack pnpm templates:thumbnails
corepack pnpm validate:templates
```

Or on Windows:

```powershell
corepack pnpm templates:thumbnails
corepack pnpm validate:templates
```

Meaning:
- `0 errors` means the templates are safe to upload.
- warnings are review items.
- errors must be fixed before upload.

Also run:

```powershell
corepack pnpm lint
corepack pnpm test:run
```

## Thumbnail Workflow

The thumbnail generator renders each template with sample CV data in Chrome and screenshots the A4 page as WebP. It generates:

- Built-in previews in `public/templates/*.webp`.
- Admin template previews in `../Admin Templates/<template-folder>/thumbnail.webp`.

For a new admin template, create:

```text
Admin Templates/
  my-template-key/
    index.html
    style.css
```

Then run:

```powershell
cd "apps/web"
corepack pnpm templates:thumbnails
```

Run the command from `apps/web/`, not from inside `Admin Templates/my-template-key/`.

The command currently regenerates every thumbnail: all built-in templates plus every folder under `Admin Templates/`. Your new template's output will be saved as:

```text
Admin Templates/my-template-key/thumbnail.webp
```

To regenerate only one template, pass its built-in key or admin folder name:

```powershell
corepack pnpm templates:thumbnails -- --template my-template-key
```

You can upload the generated `thumbnail.webp` manually in the admin panel. To upload through the command line, add the template to `config/template-release-map.json`, then run:

```powershell
corepack pnpm templates:release
corepack pnpm templates:sync-thumbnails
```

`templates:release` uploads `index.html`, `style.css`, and `thumbnail.webp` to S3.

`templates:sync-thumbnails` updates MongoDB template metadata so the app uses the current WebP thumbnail path.

Admin thumbnails should use each template's default color. The generator keeps `themeColor` at `#000000`, which tells the renderer to use `defaultThemeColor` from `config/template-release-map.json`.

## Upload Flow

Recommended flow:

1. Create or update the local template folder.
2. Run `corepack pnpm templates:thumbnails` and `corepack pnpm validate:templates`.
3. Preview locally in desktop and mobile.
4. Test Design panel color changes.
5. Add/update `config/template-release-map.json` if using command-line S3 release.
6. Run `corepack pnpm templates:release`.
7. Run `corepack pnpm templates:sync-thumbnails`.
8. Verify preview and PDF.

For manual upload, use the admin panel file picker with the generated `thumbnail.webp`. For batch S3 sync, use the release script only after validation passes.

## Quick Checklist

- `index.html` exists.
- `style.css` exists.
- `thumbnail.webp` exists.
- `@page size: A4` exists.
- `.page` uses `min-height: 297mm`, not fixed `height`.
- No `Position` or `Professional Title` ghost text.
- References use `{{sub}}`.
- Template accent uses `{{themeColor}}` or documented computed color.
- Mobile preview does not horizontally overflow.
- PDF export does not clip content.
