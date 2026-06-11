# NexCV Architecture

NexCV is a pnpm/Turborepo monorepo with separate web, API, shared package, and worker workspaces. The web app serves the React frontend, the API app exposes Express routes and MongoDB-backed services, and expensive CV import parsing, PDF rendering, and optional email delivery are delegated to SQS/Lambda workers.

## Runtime Shape

```text
Browser
  -> React/Vite app
  -> Express API (server.ts)
  -> MongoDB via Mongoose
  -> External services:
       Gemini API
       PayHere
       SMTP/Gmail/Resend
       S3 templates
       PDF Lambda
       SQS queues
       Worker Lambdas
```

## Frontend

The frontend lives in `apps/web/src/`.

- `src/app/` contains route composition, guards, loading UI, and shell layout.
- `src/pages/` contains public pages, dashboard pages, checkout, and profile screens.
- `src/features/admin/` contains the protected admin panel shell, sections, hooks, types, permissions, and shared admin UI.
- `src/components/` contains the CV form, preview, shared layout, auth modals, and form sections.
- `src/hooks/` contains template and public content hooks.
- `src/utils/templateData.ts` and `src/utils/templateRenderer.ts` prepare data for built-in and custom templates.

The app uses local React state and focused hooks rather than a global state library. Admin code is isolated as a feature module under `src/features/admin/`, with lazy-loaded admin sections to keep the initial bundle lighter.

## Workspace Packages

Shared code that must stay consistent across frontend, backend, and workers lives under the root `packages/` folder:

- `@nexcv/shared` - domain constants, queue payload parsing, admin roles, and permissions.
- `@nexcv/templates` - built-in template metadata and template access helpers.
- `@nexcv/api-contracts` - shared API response contracts for public settings, templates, admin, billing, documents, and async jobs.

The main app keeps thin compatibility wrappers for some older local import paths while new code should prefer package imports where practical.

## Backend

The backend entrypoint is `apps/api/server.ts`. Route modules live under `apps/api/routes/`.

- `apps/api/routes/auth.ts` - signup, login, logout, Google OAuth, email verification, password reset, profile updates, and account deletion.
- `apps/api/routes/cv.ts` - saved CV documents, AI parsing/generation/refinement, and PDF export.
- `apps/api/routes/payment.ts` - billing plans, public featured coupons, PayHere quote/checkout/IPN, Lemon Squeezy checkout/webhook, checkout status, and plan activation.
- `apps/api/routes/public.ts` - health, public settings, templates, template HTML/thumbnail, support tickets, and contact form.
- `apps/api/routes/admin/*` - admin dashboard, users, templates, support, billing, settings, roles, and audit logs.

Shared backend support is split into:

- `apps/api/middlewares/` for sessions, Passport auth, security headers/CORS, and rate limiters.
- `apps/api/server-models/` for Mongoose schemas and quota utilities.
- `apps/api/server-utils/` for admin IP allowlisting, PayHere helpers, template admin helpers, validation, and user-auth helpers.
- `apps/api/services/` for email, PDF, CV import, SQS queue, and S3 access.

## Data Model

MongoDB stores:

- Users, roles, email verification, password reset, and OAuth identity data.
- CV documents owned by authenticated users.
- Billing plans, checkout sessions, payment transactions, coupons, promotions, and quota state.
- Template settings and metadata.
- Support tickets.
- App settings and CMS-like public content.
- Admin audit logs with retention behavior.

## Template Architecture

NexCV supports two template sources:

- Built-in templates shipped with the frontend and public assets.
- Admin-managed templates stored as HTML/CSS/thumbnail files, normally backed by S3.

Template data is normalized before rendering so the same CV model can be used by built-in previews, custom template previews, and PDF export. Template validation scripts protect against missing files, unsafe markup, missing print rules, and common authoring mistakes.

## CV Import Architecture

CV import is initiated by `POST /api/cv-import-jobs`.

1. The route validates the uploaded file payload and reserves import quota.
2. The app creates a `CvImportJob` document in MongoDB.
3. If `CV_IMPORT_QUEUE_URL` is configured, the app sends the job ID to SQS.
4. The CV import worker Lambda consumes the job, calls the OCR Lambda when configured, runs AI parsing when allowed, and stores the parsed result on the job.
5. The frontend polls `GET /api/cv-import-jobs/:id` until the result is ready.

The OCR Lambda lives in `apps/workers/ocr-lambda/`. The queue worker lives in `apps/workers/cv-import-worker/`. Production should set `CV_IMPORT_LOCAL_WORKER_DISABLED=true` so OCR and AI parsing do not run inside the main app process.

## PDF Architecture

PDF export is initiated by `POST /api/pdf-jobs`.

1. The route checks authentication, document/template access, plan state, and quotas.
2. The app creates a `PdfJob` document with CV data, selected template metadata, and watermark state.
3. If `PDF_QUEUE_URL` is configured, the app sends the job ID to SQS.
4. The PDF worker Lambda consumes the job, calls the PDF renderer Lambda, stores the generated PDF in S3, and marks the job ready.
5. The frontend polls `GET /api/pdf-jobs/:id`, then downloads through `GET /api/pdf-jobs/:id/download`.

The PDF renderer Lambda implementation lives in `apps/workers/pdf-lambda/` and can fetch template assets from S3 using `S3_TEMPLATE_BUCKET_NAME` and `S3_TEMPLATE_PREFIX`. The SQS worker lives in `apps/workers/pdf-worker/`.

## Security Posture

- Sessions use `express-session` with `httpOnly` cookies.
- Production requires a strong `SESSION_SECRET`.
- Helmet and CORS are configured in `apps/api/middlewares/security.ts`.
- Authentication-sensitive routes use rate limiters.
- Admin routes are protected by role/permission checks.
- `ADMIN_ALLOWED_IPS` restricts `/api/admin/*` routes from untrusted IPs in production. The React `/admin` page can still be served so unknown public paths use the branded app 404 instead of plain server text.
- PayHere amount formatting, hash/signature helpers, local LKR rounding, and IPN verification are centralized in `apps/api/server-utils/payHere.ts`.
- Lemon Squeezy checkout creation and webhook signature verification are centralized in `apps/api/server-utils/lemonSqueezy.ts`.
- Admin state changes should be audit logged.

## Deployment Model

The main app can run on Render or another Node host:

- `corepack pnpm install --frozen-lockfile` installs all workspace dependencies from the repository root.
- `corepack pnpm --filter @nexcv/web build` builds the Vite frontend.
- `corepack pnpm --filter @nexcv/api start` runs the Express server through `tsx server.ts`.
- `render.yaml` points Render at the repository root so workspace packages are linked.

The PDF Lambda and queue workers are built separately with root scripts such as `corepack pnpm build:pdf-lambda`, `corepack pnpm build:pdf-worker-lambda`, and `corepack pnpm build:cv-import-worker-lambda`. See [AWS Services Configuration](AWS_SERVICES.md) for the complete queue, Lambda, S3, and IAM setup.
