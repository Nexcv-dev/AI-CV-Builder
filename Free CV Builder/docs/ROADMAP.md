# Roadmap

This roadmap tracks recommended next work for NexCV before launch and shortly after launch. Keep it aligned with the current architecture: React/Vite frontend, Express route modules, MongoDB models, PayHere checkout/IPN, Lemon Squeezy checkout/webhooks, S3-backed templates, queued CV import, OCR Lambda, queued PDF rendering, email delivery, and modular admin pages.

Use this as a planning guide, not a promise of dates. The launch checklist remains the source of truth for release signoff.

Related docs:

- [Launch Checklist](LAUNCH_CHECKLIST.md)
- [Operations Runbook](OPERATIONS_RUNBOOK.md)
- [Environment Variables](ENVIRONMENT.md)
- [AWS Services](AWS_SERVICES.md)
- [Codebase Cleanup And Scale Plan](CODEBASE_CLEANUP_PLAN.md)

## Current Product State

NexCV is close to launch shape:

- Core builder, templates, preview, save, import, and PDF export flows exist.
- PayHere handles local/LKR plans, and Lemon Squeezy handles global/USD plans.
- Admin modules cover users, roles, billing, templates, support, settings, and audit logs.
- CV import and PDF work can run through queue-backed workers.
- Docs now cover deployment, environment variables, AWS services, backup/restore, operations, and contribution workflow.

The remaining work is mostly launch confidence, operational reliability, QA depth, and post-launch polish.

## Priority 0: Launch Blockers

These must be closed before live public traffic.

| Area | Work | Done Signal |
| --- | --- | --- |
| Build confidence | `npm run launch:check` passes on the release branch. | CI and local release check are green. |
| Environment | Production env values match [Environment Variables](ENVIRONMENT.md). | `/api/health` shows required services configured. |
| Database backup | MongoDB backup workflow uses `BACKUP_AWS_*` credentials and writes to S3. | Manual GitHub Actions backup succeeds and restore drill is documented. |
| Auth | Signup, login, logout, email verification, forgot/reset password, and account deletion work. | Launch smoke test passes on production/staging domain. |
| CV import | Guest import opens login before file processing; authenticated import works; unclear docs show friendly errors. | Import smoke tests pass for readable PDF/LinkedIn PDF and unclear file. |
| PDF export | Free template export works; premium template gating works; queued PDF jobs work. | PDF smoke test passes for free and paid user paths. |
| Payments | PayHere and Lemon Squeezy sandbox/test flows activate plans only through verified IPN/webhook. | Duplicate webhook/IPN tests do not double-credit users or coupons. |
| Admin access | Admin role permissions and `ADMIN_ALLOWED_IPS` are verified. | Admin modules load and API calls succeed only for allowed admins. |
| Email | Verification, reset, receipts, and support replies send branded HTML plus readable text fallback. | Admin test email and real transactional emails are verified. |

## Priority 1: Launch Hardening

These are high-value before launch if time allows; otherwise, schedule immediately after launch.

## Observability

- Add or confirm uptime monitoring for `/api/health`.
- Add alerts for MongoDB connection failures, payment/IPN errors, failed PDF jobs, failed CV import jobs, and email delivery failures.
- Confirm Sentry release/environment values for frontend and backend.
- Standardize log event names for import, PDF, billing, admin, and email failures.
- Create a simple launch monitoring dashboard with deploy time, payment activity, failed jobs, and support volume.

Done signal:

- A production incident can be triaged from health check, app logs, worker logs, Sentry, and admin panels without guessing.

## Payment Safety

- Re-run PayHere sandbox checkout and Lemon Squeezy test checkout after final env changes.
- Review failed, cancelled, expired, and pending checkout states in Admin Billing.
- Confirm app coupons used for Lemon Squeezy have matching provider-side discount codes.
- Confirm local LKR and global USD revenue remain separated in dashboard/admin reports.
- Add regression tests for payment duplicate notifications and coupon redemption boundaries where missing.

Done signal:

- Admin can reconcile every checkout/payment state without database shell access.

## Import/PDF Worker Reliability

- Confirm CV import SQS trigger, DLQ, worker timeout, OCR Lambda permissions, and OCR temp S3 lifecycle.
- Confirm PDF SQS trigger, DLQ, output bucket permissions, PDF Lambda timeout, and download URL behavior.
- Run worker builds:

```bash
npm run build:cv-import-worker-lambda
npm run build:ocr-lambda
npm run build:pdf-worker-lambda
npm run build:pdf-lambda
```

- Verify failed jobs clear large payload fields and roll back quotas when needed.

Done signal:

- A stuck import or PDF job has a clear status, log trail, DLQ path, and support resolution.

## Template Reliability

- Run template validation before every release.
- Test admin-created templates in preview and PDF output on desktop and mobile widths.
- Confirm thumbnails are current and stored under the expected S3 prefix.
- Document rollback steps for a broken published template.

Done signal:

- A broken template can be detected before publish or rolled back quickly after publish.

## Priority 2: Post-Launch Product Improvements

These improve user experience and business operations after the core launch is stable.

## Builder And Import UX

- Add clearer import progress states for queued, processing, OCR, AI parsing, and completed states.
- Add examples of good upload formats near the import modal without making the card taller on mobile.
- Improve imported-data review by highlighting newly filled fields.
- Add save conflict handling if users edit the same CV in multiple tabs.
- Improve empty-state guidance for first-time users without blocking the builder.

Done signal:

- Users understand what is happening during import/PDF jobs and can recover from bad files without support.

## Dashboard And My CVs

- Add stronger document search/filter/sort if users accumulate many CVs.
- Add clearer plan/quota status for free, payg, monthly, quarterly, and unlimited users.
- Add last exported/downloaded metadata if useful for support.
- Add graceful states for quota refresh failures.

Done signal:

- Users can manage multiple CVs and understand plan limits without contacting support.

## Admin Workflow

- Add support ticket assignment, internal notes, canned replies, and SLA states.
- Add template version history and rollback from admin.
- Add audit-log export if retention/compliance requires it.
- Add payment reconciliation exports by provider/currency/date.
- Add admin dashboard filters for date ranges, provider, currency, plan, and coupon.

Done signal:

- Routine support, billing, and template operations can be handled from admin UI without manual DB edits.

## Analytics And Growth

- Track checkout funnel by plan, provider, country/market, and coupon.
- Track template selection, import completion, PDF export conversion, and account verification conversion.
- Add retention metrics for returning users and saved CV count.
- Improve SEO content around resume/CV templates, LinkedIn PDF import, and ATS-friendly CVs.
- Add A/B-test-ready structure for pricing/landing content if marketing ramps up.

Done signal:

- Product decisions can be made from real usage and revenue data instead of anecdotal feedback.

## Priority 3: Scale And Maintainability

Use [Codebase Cleanup And Scale Plan](CODEBASE_CLEANUP_PLAN.md) for detailed technical phases. Keep this roadmap focused on outcomes.

## Backend Structure

- Continue thinning large route modules into service/helper layers.
- Centralize checkout status, import status, PDF status, quota, and review-state rules.
- Review MongoDB indexes for admin lists, audit logs, payments, templates, jobs, and user search.
- Add targeted tests for high-risk service behavior.

Done signal:

- Complex business rules live in tested services instead of being scattered across route handlers.

## Frontend Structure

- Keep large routes lazy-loaded.
- Split oversized route components into route containers, hooks, and focused UI components.
- Consolidate repeated admin filters, badges, empty states, loading states, and save bars.
- Reduce duplicate API loading and error handling with reusable hooks.

Done signal:

- Adding an admin workflow or builder panel does not require editing a giant component in multiple unrelated places.

## Infrastructure

- Add release/rollback runbooks for main app and Lambda ZIPs.
- Confirm DLQ replay procedure for import, PDF, and email queues.
- Add scheduled cleanup for expired jobs, stale checkouts, old PDF outputs, and OCR temp files where provider lifecycle rules are not enough.
- Review AWS IAM policies quarterly and after every integration change.

Done signal:

- Operational cleanup and recovery are routine, documented, and least-privilege.

## Future Bets

These are optional ideas after the product has real usage.

- Multi-language CV import and template support.
- Resume scoring or ATS checks with explainable suggestions.
- Cover letter generation tied to a CV and job description.
- Version history for saved CVs.
- Team/recruiter/admin workspace features if the market asks for it.
- More payment providers or subscription billing only after current provider flows are stable.
- Export formats beyond PDF, such as DOCX, only if demand is clear.

## Decision Rules

When deciding what to do next:

- Prefer launch confidence over visual polish before public launch.
- Prefer fixing paid-user, payment, import, PDF, auth, and admin issues before adding new features.
- Prefer observable, recoverable systems over hidden automation.
- Prefer small scoped PRs with tests/docs over broad rewrites.
- Use production data after launch to prioritize UX and growth work.

## Documentation Maintenance

Update docs whenever any of these change:

- API route paths or request/response behavior.
- Environment variables or GitHub secrets.
- Deployment steps, queues, Lambdas, S3 buckets, or IAM policies.
- Template authoring rules, release flow, or rollback steps.
- Admin permission names or workflows.
- Payment, PDF, CV import, OCR, email, backup, or restore operational behavior.

