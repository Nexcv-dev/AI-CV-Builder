# NexCV App

This folder contains the main NexCV application: a React 18 frontend, Express backend, MongoDB models, admin platform, PDF rendering services, email delivery, PayHere payment integration, and S3-backed CV template pipeline.

## Stack

- React 18, TypeScript, Vite, Tailwind CSS
- Node.js, Express, TypeScript
- MongoDB and Mongoose
- Passport local auth and Google OAuth
- PayHere payments
- Nodemailer email delivery
- AWS S3 templates
- AWS Lambda PDF renderer
- Vitest and Testing Library

## Main Areas

```text
Free CV Builder/
  src/
    components/               # Shared frontend components
    pages/                    # App pages and admin dashboard
    pages/admin/              # Admin modules
    utils/                    # Frontend helpers and API wrapper
  routes/                     # Express route modules
  services/                   # Email, S3, PDF, and business services
  middlewares/                # Security, auth, session, rate limits
  server-models/              # MongoDB models
  tests/                      # Server and integration tests
  lambda-pdf/                 # Lambda PDF renderer package
  scripts/                    # Build helpers
  server.ts                   # Express entry point
```

## Admin Features

- Users and plan management
- Analytics dashboard for signups, CV saves, downloads, checkout conversion, and template usage
- Template CMS
- Billing plans and coupons
- Promotions
- CMS content management for landing sections, FAQs, pricing copy, legal pages, and announcements
- Email notification template management
- Support tickets
- Admin roles and permissions
- Global settings
- Maintenance mode
- Email service readiness and test email
- Audit log with 30-day MongoDB retention
- Admin IP allowlist via `ADMIN_ALLOWED_IPS`

## Environment Setup

Create `.env` in this folder.

```env
PORT=3002
ALLOWED_ORIGIN=http://localhost:3000
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret

GEMINI_API_KEY=your_gemini_key

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

EMAIL_USER=your_smtp_user
EMAIL_PASS=your_smtp_password
EMAIL_FROM="NexCV <support@nexcv.com>"
ADMIN_NOTIFICATION_EMAIL=admin@nexcv.com

PAYHERE_MERCHANT_ID=your_payhere_merchant_id
PAYHERE_MERCHANT_SECRET=your_payhere_secret

S3_TEMPLATE_BUCKET_NAME=your_template_bucket
S3_TEMPLATE_PREFIX=templates
S3_TEMPLATE_CACHE_TTL_MS=300000

PDF_LAMBDA_URL=your_lambda_pdf_url
PDF_LAMBDA_TIMEOUT_MS=45000

SUPER_ADMIN_EMAILS=owner@example.com
ADMIN_ALLOWED_IPS=
```

### Admin IP Allowlist

`ADMIN_ALLOWED_IPS` accepts comma-separated IP addresses.

```env
ADMIN_ALLOWED_IPS=203.0.113.10,198.51.100.25
```

When enabled:
- `/api/admin/*` is blocked for non-allowed IPs.
- Production `/admin` pages are hidden from non-allowed IPs.
- Local development loopback access remains available.

## Commands

```bash
npm install
npm run dev:all
npm run lint
npm run test:run
npm run build
npm run build:pdf-lambda
```

## Local URLs

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3002`
- Admin: `http://localhost:3000/admin`

## Current Operational Notes

- Global app settings are stored in MongoDB through `AppSetting`.
- Maintenance mode should be managed from Admin Settings.
- Email secrets stay in environment variables; admin UI only shows readiness state and supports sending a test email.
- CMS-created templates should include thumbnail metadata and profile image placeholders when profile photo support is needed.
- Free templates show a Free badge; premium templates show a crown badge.

## Current Codebase Status

Recent cleanup and verification:
- `npm run lint` passes.
- `npm run build` passes.
- Main routes are lazy-loaded from `src/App.tsx`.
- Builder-heavy components are split: `Home` lazy-loads `CVForm` and `CVPreview`, while `CVForm` lazy-loads form sections, design controls, and import modals.
- Personal details now uses the native browser date input, so the duplicate date-picker icon and unused date-picker dependencies are removed.
- Admin sections are lazy-loaded.
- `AdminDashboard` has been split into shell components, overview/analytics components, and first-pass hooks:
  - `src/pages/admin/AdminShellComponents.tsx`
  - `src/pages/admin/AdminOverviewSections.tsx`
  - `src/pages/admin/hooks/useAdminBootstrap.ts`
  - `src/pages/admin/hooks/useAdminUsers.ts`
- Custom template print/page-break CSS has safeguards to reduce broken print/export layout when new templates are added.
- Builder session restore waits for auth loading before showing login-only UI.

Next cleanup plan:
1. Extract `useAdminTemplates` for template list loading, filters, file reads, create, update, publish, and archive actions.
2. Extract `useAdminBilling` for payments, plans, coupon creation, and coupon toggles.
3. Extract `useAdminSupport` for support ticket filters, selected ticket state, ticket updates, and replies.
4. Move settings/email, roles, and audit log data loading into focused hooks.
5. Audit `Dashboard` and `MyCvs` load performance, then split user dashboard data hooks and lazy-load heavy panels.
6. Clean the CV preview/template rendering layer before adding many more templates.

## Production Readiness Gaps

This list is based on the current app code: Express route modules, MongoDB models, PayHere checkout/IPN, S3 template storage, Lambda/local PDF generation, email delivery, admin modules, and the existing Vitest/security/PDF coverage.

### Must Have Before Launch

1. Observability and alerts: structured JSON server logs, CloudWatch or hosting log shipping, uptime checks, error tracking, and alerts for failed payments, failed PDFs, failed email delivery, and MongoDB connection problems.
2. Payment hardening: PayHere IPN replay/idempotency review, reconciliation job between `CheckoutSession` and `PaymentTransaction`, admin-visible failed payment reasons, receipt history, refund tracking, and expired checkout cleanup.
3. Admin security: optional 2FA for admin roles, session/device management, suspicious-login alerts, documented `ADMIN_ALLOWED_IPS` runbook, and long-term audit export before 30-day MongoDB TTL cleanup.
4. Data lifecycle: user account export, account deletion verification, CV deletion retention policy, S3 orphan cleanup for custom templates/thumbnails, database backup/restore drills, and MongoDB index review.
5. Production QA: end-to-end tests for signup/login, email verification, builder save, PDF download, checkout sandbox/live flow, admin permissions, CMS edits, template publish/archive, support replies, and maintenance mode.

### Should Have Soon After Launch

1. Analytics improvements: 7/30/90 day filters, exportable reports, checkout funnel by plan, template conversion tracking, retention metrics, and revenue by coupon/promotion.
2. Template operations: visual preview before publish, version history, rollback to previous template versions, PDF/mobile validation previews, thumbnail regeneration, and safer HTML/CSS validation reports.
3. Support workflow: ticket assignment, reply history, internal notes timeline, canned replies, SLA state, email thread correlation, and support analytics.
4. Performance polish: continue route/component splitting already started, tune bundles, optimize images/thumbnails, review cache headers/CDN strategy, and measure Core Web Vitals.
5. Launch operations: environment checklist, secret rotation process, production smoke tests, release/rollback plan, incident response notes, and post-launch monitoring dashboard.

### Code Optimization Plan

Optimization should be done in two passes: first after the launch-critical features are stable, then again after real production metrics show the slowest pages, APIs, and PDF/payment/email paths.

1. Split large frontend routes: keep admin modules, builder-only components, checkout, profile, and public content/legal pages lazy-loaded outside the first bundle.
2. Break down oversized components: continue splitting `AdminDashboard`, `Home`, user dashboard, and large admin sections into page containers, data hooks, and smaller presentational components.
3. Extract repeated admin UI patterns: cards, filters, status badges, loading states, empty states, headers, tables, detail drawers, and save bars.
4. Reduce duplicate API loading logic: continue extracting hooks for templates, billing, support, settings, audit logs, analytics, summary data, and user dashboard data.
5. Keep backend route handlers thin: move billing, template, audit, settings, email, and analytics business logic into service modules with focused tests.
6. Review database indexes and aggregation costs: user search, payments, audit logs, template usage, analytics, checkout sessions, and support tickets need bounded queries and intentional indexes.
7. Optimize PDF and template paths: cache custom template HTML/CSS safely, reduce repeated S3 fetches, monitor Lambda fallback, and surface slow PDF failures in logs.
8. Add CI gates for quality and size: `npm run lint`, `npm run test:run`, `npm run build`, bundle size review, and production smoke tests.
9. Remove stale code after feature freeze: unused helpers, duplicated constants, commented experiments, and temporary debug logs.
10. Tune from real metrics: use logs, error reports, API timings, and frontend bundle analysis before doing deeper refactors.

