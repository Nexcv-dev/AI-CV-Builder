# NexCV - AI CV Builder

NexCV is a full-stack AI-powered CV builder for creating, managing, previewing, and exporting professional resumes. The app supports guest-first CV creation, authenticated cloud saving, premium templates, AI-assisted writing, PayHere payments, PDF generation, and an expanding admin platform for operations.

Current release focus: production hardening, admin operations, CMS-driven templates, and launch readiness.

## Key Features

### CV Builder
- Guest-first builder flow with live preview.
- Authenticated dashboard for saved CVs.
- Template selector with free and premium badges.
- Profile image crop and adjustment support.
- PDF download flow with free-user quotas and premium unlocks.
- AI CV parsing and summary generation through Gemini.

### Templates
- Built-in curated CV templates.
- Admin-managed custom templates.
- S3-backed HTML/CSS template rendering pipeline.
- Dashboard thumbnails use live template metadata.
- Custom templates support profile image positioning values.

### Admin Platform
- Modular admin platform with dashboard, analytics, users, templates, billing, promotions, CMS, notifications, support, settings, roles, and audit sections.
- Role-based admin permissions.
- Admin audit logs for sensitive changes with 30-day database retention.
- Analytics dashboard for signups, CV saves, downloads, checkout conversion, and template usage.
- CMS management for public landing content, FAQs, pricing copy, legal pages, and announcements.
- Email notification management for transactional template copy and delivery testing.
- CMS-style template management for adding, updating, publishing, and archiving templates.
- Settings panel for launch controls, maintenance mode, quotas, support email, PayHere mode, default template, runtime readiness, and service checks.

### Security And Operations
- Admin IP allowlist support through `ADMIN_ALLOWED_IPS`.
- Production admin route hiding for non-allowed IPs.
- Maintenance mode for public traffic while keeping admin access available.
- Rate limiting, Helmet, CORS controls, input sanitization, and secure session configuration.
- Email service readiness checks and admin test-email endpoint.

### Payments And Email
- PayHere checkout integration.
- Billing plan and coupon management in admin.
- Nodemailer-based system email delivery.
- Email provider detection for Gmail API, Resend, and SMTP-style credentials.

## Repository Layout

```text
AI-CV-Builder/
  README.md
  Free CV Builder/            # Main React + Express application
    src/                      # React frontend
    routes/                   # Express route modules
    services/                 # Email, PDF, S3, and business services
    middlewares/              # Auth, session, security, rate limits
    server-models/            # Mongoose models
    tests/                    # Vitest server/frontend tests
    lambda-pdf/               # AWS Lambda PDF renderer
```

## Local Development

```bash
cd "Free CV Builder"
npm install
npm run dev:all
```

Default local URLs:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3002`

## Important Environment Variables

Create `.env` inside `Free CV Builder/`.

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

PDF_LAMBDA_URL=your_lambda_pdf_url

SUPER_ADMIN_EMAILS=owner@example.com
ADMIN_ALLOWED_IPS=203.0.113.10
```

Notes:
- Leave `ADMIN_ALLOWED_IPS` empty in local development unless you are testing IP restrictions.
- In production, set `ADMIN_ALLOWED_IPS` to your trusted public IPv4/IPv6 addresses.
- Do not commit real secrets.

## Useful Commands

```bash
npm run dev:all        # Run frontend and backend together
npm run dev            # Run Vite frontend only
npm run server         # Run Express backend only
npm run lint           # TypeScript compile check
npm run test:run       # Run Vitest once
npm run build          # Production frontend build
npm run build:pdf-lambda
```

## Verification Status

Recent verification:
- TypeScript check passes.
- Production build passes.

Recent codebase cleanup:
- Fixed admin summary TypeScript lint failures.
- Added template print/page-break safeguards for custom template layout stability.
- Prevented the builder auth-loading state from briefly showing the login CTA while an existing user session is being restored.
- Added route-level lazy loading for the main frontend pages.
- Split heavy builder surfaces so `CVForm`, `CVPreview`, form sections, design controls, and import modals load in smaller chunks.
- Replaced the third-party date picker with a native date input, removing duplicate date icons and unused date-picker dependencies.
- Split the admin dashboard into shell, overview/analytics sections, lazy admin modules, and first-pass data hooks.
- Added `useAdminBootstrap` and `useAdminUsers` to move auth/summary and user-management data logic out of the dashboard page.

Recommended next implementation plan:
1. Continue admin dashboard decomposition with `useAdminTemplates`, then `useAdminBilling`, `useAdminSupport`, settings/email, roles, and audit hooks.
2. Audit the user dashboard load path, then split dashboard data into hooks and lazy-load heavy panels.
3. Clean the CV preview/template-rendering layer next, because print/export and page-break issues usually start there.
4. Keep `npm run lint` and `npm run build` passing after each structural step.

## Production Readiness Gaps

This list is based on the current app structure: React/Vite frontend, Express route modules, MongoDB models, PayHere checkout/IPN, S3-backed custom templates, Lambda/local PDF generation, email delivery, admin modules, and the existing Vitest/security/PDF tests.

### Must Have Before Launch

1. Observability and alerts: structured JSON server logs, CloudWatch or hosting log shipping, uptime checks, error tracking, and alerts for failed payments, failed PDF generation, failed email delivery, and MongoDB connection problems.
2. Payment hardening: PayHere IPN replay/idempotency review, reconciliation job between `CheckoutSession` and `PaymentTransaction`, admin-visible failed payment reasons, receipt history, refund tracking, and a cleanup job for expired pending checkouts.
3. Admin security: optional 2FA for admin roles, session/device management, suspicious-login alerts, documented `ADMIN_ALLOWED_IPS` runbook, and long-term audit export outside MongoDB before the 30-day TTL removes records.
4. Data lifecycle: account export, account deletion verification, CV deletion retention policy, S3 orphan cleanup for custom template files/thumbnails, backup/restore drills, and MongoDB index review.
5. Production QA: end-to-end tests for signup/login, email verification, builder save, PDF download, checkout sandbox/live flow, admin permissions, CMS edits, template publish/archive, support replies, and maintenance mode.

### Should Have Soon After Launch

1. Analytics improvements: date filters for 7/30/90 days, exportable reports, checkout funnel by plan, template conversion tracking, retention metrics, and revenue by coupon/promotion.
2. Template operations: visual preview before publish, version history, rollback to previous template versions, PDF/mobile validation previews, and thumbnail regeneration tooling.
3. Support workflow: ticket assignment, reply history, internal notes timeline, canned replies, SLA state, email thread correlation, and support analytics.
4. Performance polish: continue route/component splitting already started, tune bundles, optimize images/thumbnails, review cache headers/CDN strategy, and measure Core Web Vitals.
5. Launch operations: environment checklist, secret rotation process, production smoke tests, release checklist, rollback plan, incident response notes, and post-launch monitoring dashboard.

### Code Optimization Plan

Optimization should happen in two passes: keep the current feature work stable first, then optimize before launch, and repeat after real production metrics are available.

1. Split large frontend routes: keep lazy-loaded admin, builder, checkout, profile, and public content/legal pages out of the first bundle.
2. Break down oversized components: continue splitting `AdminDashboard`, `Home`, user dashboard, and large admin sections into route-level containers, data hooks, and focused presentational components.
3. Move repeated admin UI patterns into shared components: cards, filters, status badges, empty states, loading states, section headers, and save bars.
4. Reduce duplicate API loading logic: continue extracting reusable hooks for admin templates, billing, support, settings, audit logs, analytics, and user dashboard data.
5. Optimize backend route modules: move large shared dependency binding into smaller service helpers, keep route handlers thin, and isolate billing, templates, audit, and settings business logic.
6. Review database indexes and query shapes: admin lists, analytics aggregations, audit logs, payments, templates, and user search should have intentional indexes and bounded result sizes.
7. Improve PDF/template performance: cache custom template HTML/CSS safely, warm Lambda PDF generation where useful, and keep local fallback observable.
8. Add bundle and runtime checks to CI: `npm run lint`, `npm run test:run`, `npm run build`, bundle size review, and smoke tests for critical production flows.
9. Clean dead or stale code after launch readiness is stable: remove unused helpers, old commented logic, duplicate constants, and temporary debug logs.
10. Use production data for final tuning: optimize slow API endpoints, large client chunks, and PDF/email/payment bottlenecks based on logs and metrics, not guesswork.

