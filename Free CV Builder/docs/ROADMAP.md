# NexCV Project Roadmap

This document outlines the recommended next steps, production readiness gaps, and code optimization plans for the NexCV platform.

## Recommended next implementation plan:

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

## Code Optimization Plan

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
