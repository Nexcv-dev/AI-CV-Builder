# Roadmap

This roadmap tracks recommended next work before and shortly after launch. Keep it aligned with the current architecture: React/Vite frontend, Express route modules, MongoDB models, PayHere checkout/IPN, Lemon Squeezy checkout/webhooks, S3-backed templates, Lambda/local PDF rendering, email delivery, and modular admin pages.

## Current Focus

1. Production hardening for payments, PDF export, email delivery, and admin access.
2. Template reliability across preview, mobile, and PDF output.
3. Admin workflow completion for billing, templates, support, roles, settings, and audit logs.
4. Documentation and launch-readiness checks.

## Must Have Before Launch

1. Observability: structured server logs, uptime checks, error tracking, and alerts for failed payments, failed PDFs, failed email, and MongoDB connection issues.
2. Payment hardening: PayHere IPN and Lemon Squeezy webhook idempotency/replay review, checkout reconciliation, failed-payment visibility, receipt history, currency-aware revenue reporting, and cleanup for expired pending checkouts.
3. Admin security: documented `ADMIN_ALLOWED_IPS` process, role audit, optional 2FA plan, suspicious-login alerting, and long-term audit export if required.
4. Data lifecycle: account export/delete verification, CV deletion policy, S3 orphan cleanup, MongoDB index review, and backup/restore drill.
5. Production QA: end-to-end coverage for signup/login, email verification, builder save, PDF download, checkout sandbox/live flow, admin permissions, template publish/archive, support replies, and maintenance mode.

## Should Have Soon After Launch

1. Analytics improvements: date filters, exports, checkout funnel by plan/provider/currency, template conversion tracking, retention metrics, and revenue by coupon.
2. Template operations: visual preview before publish, version history, rollback, thumbnail regeneration, and PDF/mobile validation previews.
3. Support workflow: ticket assignment, internal notes, reply history, canned replies, SLA state, email thread correlation, and support analytics.
4. Performance: route/component splitting, image optimization, cache/CDN strategy, Core Web Vitals, and bundle-size review.
5. Release operations: release checklist, rollback plan, smoke-test checklist, incident response notes, and launch monitoring dashboard.

## Code Optimization Plan

1. Keep large frontend routes lazy-loaded, especially admin, builder, checkout, profile, and legal/public content.
2. Continue splitting oversized page components into route containers, data hooks, and focused presentational components.
3. Consolidate repeated admin UI patterns such as filters, status badges, empty states, loading states, and save bars.
4. Reduce duplicate API loading logic with reusable hooks for admin templates, billing, support, settings, audit logs, analytics, and dashboard data.
5. Keep backend route handlers thin by moving billing, templates, audit, settings, and support behavior into services/helpers.
6. Review MongoDB indexes and query shapes for admin lists, analytics, audit logs, payments, templates, and user search.
7. Improve PDF/template performance with safe template caching, Lambda warmup where useful, and observable fallback behavior.
8. Add CI checks for `npm run lint`, `npm run test:run`, `npm run build`, template validation, and critical smoke tests.
9. Remove stale code after launch readiness is stable.
10. Tune based on production metrics instead of guesses.

## Documentation Maintenance

Update docs whenever any of these change:

- API route paths or request/response behavior.
- Environment variables.
- Deployment steps.
- Template authoring rules.
- Admin permission names or workflows.
- Payment/PDF/email operational behavior.
