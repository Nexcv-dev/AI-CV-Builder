# QA Test Cases

This is the manual QA checklist for NexCV releases. Run it before production releases, payment changes, auth changes, template releases, PDF renderer changes, and CV import changes.

## Test Environment

- Use a clean browser profile or incognito window for guest flows.
- Use one free user, one paid user, and one admin user.
- Use sandbox/test payment providers unless this is a controlled production smoke test.
- Use small PDF/DOCX CV samples, one image-heavy CV, and one invalid or empty file.
- Record browser, device size, user email, template, payment provider, and result for failed tests.

## Release Smoke Test

| ID | Area | Scenario | Expected Result |
| --- | --- | --- | --- |
| QA-001 | Landing | Open `/` as guest | Landing page loads, login/signup show, hero CTAs work. |
| QA-002 | Landing | Log in, then browser-back to `/` | Login/signup do not show to logged-in user; dashboard/builder actions show. |
| QA-003 | Auth | Sign up with new email | OTP flow completes and user lands in the app. |
| QA-004 | Auth | Login with valid user | User session persists after refresh. |
| QA-005 | Auth | Logout | Protected pages require login again. |
| QA-006 | Navigation | Visit dashboard, My CVs, profile, pricing, templates | Pages load without blank screens or console-breaking errors. |
| QA-007 | Auth Cache | Log in or log out while multiple authenticated UI areas are mounted | Header, account menu, route guards, and pages update from the shared current-user cache without a stale user or duplicate fetch loop. |

## CV Builder

| ID | Area | Scenario | Expected Result |
| --- | --- | --- | --- |
| QA-101 | Builder | Create CV manually | Preview updates as fields change. |
| QA-102 | Builder | Save draft as logged-in user | Draft appears in dashboard/My CVs. |
| QA-103 | Builder | Edit saved CV | Existing data loads and saves without data loss. |
| QA-104 | Builder | Reorder or hide sections | Preview and saved document preserve order/hidden state. |
| QA-105 | Design | Change color, spacing, font, template | Preview updates and settings persist after save/reload. |
| QA-106 | Mobile | Use builder on mobile width | Form, import card, preview controls, and buttons remain usable without overlap. |

## CV Import

| ID | Area | Scenario | Expected Result |
| --- | --- | --- | --- |
| QA-201 | Guest Import | Click import as guest | Login/signup modal opens before file picker/import starts. |
| QA-202 | Import | Upload valid PDF/DOCX | Import completes and fills structured CV fields. |
| QA-203 | Import | Upload empty or unclear document | User-friendly error appears; raw parser/AI error is not shown. |
| QA-204 | Import | Upload unsupported or large file | Clear validation error appears. |
| QA-205 | Import Queue | Start queued import | Job reaches completed or failed with safe error and quota rollback when needed. |

## Templates And PDF

| ID | Area | Scenario | Expected Result |
| --- | --- | --- | --- |
| QA-301 | Templates | Switch through built-in templates | Preview renders each template. |
| QA-302 | Admin Templates | Publish S3/admin template | Template appears in builder/templates if active. |
| QA-303 | Template Assets | Run `corepack pnpm templates:verify-s3` | Missing `index.html`, `style.css`, or thumbnail issues are reported before release. |
| QA-304 | PDF | Generate PDF from built-in template | PDF downloads and matches preview closely. |
| QA-305 | PDF | Generate PDF from admin/S3 template | PDF uses custom template assets, colors, and selected font. |
| QA-306 | PDF | Missing template key/assets | Generation fails safely with user-friendly error and no quota leak. |
| QA-307 | Fonts | Test each available font in preview and PDF | Selected font is accepted, preview renders, PDF renders without fallback errors. |
| QA-308 | Watermark | Free-plan download | Watermark appears where required. |
| QA-309 | Paid PDF | Paid-plan download | Watermark is removed and quota updates correctly. |
| QA-310 | HTML PDF | Upload valid self-contained CV HTML | Preview renders, job queues, PDF downloads, and quota updates correctly. |
| QA-311 | HTML PDF Overrides | Change preview font and header color before generating PDF | Preview updates immediately, generated PDF uses the same font/header color override CSS, and missing fonts fall back safely. |

## Billing

| ID | Area | Scenario | Expected Result |
| --- | --- | --- | --- |
| QA-401 | Pricing | Open pricing as guest/free/paid user | Correct plan state and CTAs show. |
| QA-402 | PayHere | Local-market checkout | Sandbox payment creates transaction and activates selected plan. |
| QA-403 | Lemon Squeezy | Global-market checkout | Test checkout/webhook activates selected plan. |
| QA-404 | Coupons | Apply valid coupon | Discount appears and final amount is correct. |
| QA-405 | Coupons | Apply expired/maxed/invalid coupon | Clear error appears and price remains safe. |
| QA-406 | Quotas | Reach free download/save limits | Upgrade prompt appears and blocked action does not proceed. |

## Admin Panel

| ID | Area | Scenario | Expected Result |
| --- | --- | --- | --- |
| QA-501 | Admin Auth | Open `/admin` as guest/non-admin/admin | Guest gets login, non-admin forbidden, admin sees panel. |
| QA-502 | Users | Search user and change plan | Plan updates and audit behavior remains correct. |
| QA-503 | Templates | Create, publish, archive template | State changes are reflected in public/builder views. |
| QA-504 | Billing | Review payments and coupons | Lists load and actions are restricted to admin. |
| QA-505 | Email | Send test email | Email sends or shows actionable configuration error. |
| QA-506 | Settings | Toggle maintenance/admin settings | Public/admin behavior matches setting. |

## Security And Recovery

| ID | Area | Scenario | Expected Result |
| --- | --- | --- | --- |
| QA-601 | Protected Routes | Open dashboard/profile/My CVs as guest | Login modal/page appears; protected data is not visible. |
| QA-602 | Password Reset | Request reset and set new password | Token flow works and old token cannot be reused. |
| QA-603 | Email Verify | Request/enter OTP | Email verification updates user state. |
| QA-604 | CSRF/Auth | Submit sensitive action after logout | Request fails safely. |
| QA-605 | Upload Safety | Upload invalid image/CV data | Request is rejected with clear error. |
| QA-606 | Session Revocation | Invalidate a user's sessions, then reuse an older session | The old session is rejected while a newly established session remains valid. |
| QA-607 | API Timeout | Hold a normal API request beyond its configured timeout | The API returns `503` with the safe timeout message and does not send a second response after completion. |
| QA-608 | Cached Settings | Update cached settings/template data and trigger invalidation | Exact-key or prefix invalidation removes stale data; disabled or expired cache entries reload from the source. |

## Automated Critical Coverage

Keep these focused regression suites current when changing authentication caching, session security, request reliability, or backend caching:

| Test File | Covered Behavior |
| --- | --- |
| `apps/web/src/hooks/useCurrentUserQuery.test.tsx` | Initial current-user fetch, fresh-cache reuse, login/logout event synchronization, and direct authenticated-flow cache updates. |
| `apps/api/services/sessionService.test.ts` | Session-version normalization, marking a session current, invalidating older sessions, and legacy-user behavior. |
| `apps/api/middlewares/requestTimeout.test.ts` | Non-API bypass, route-specific timeout response, timer cleanup on finish/close, and protection after headers are sent. |
| `apps/api/server-utils/ttlCache.test.ts` | TTL parsing, expiry, cache-hit loader reuse, exact/prefix invalidation, and disabled-cache behavior. |

Run the focused app suites with:

```powershell
corepack pnpm --filter @nexcv/web test:run
corepack pnpm --filter @nexcv/api test:run
```

## Regression Commands

Run the automated checks that match the change:

```powershell
corepack pnpm lint
corepack pnpm test:run
corepack pnpm build
corepack pnpm validate:template-map
corepack pnpm validate:templates
corepack pnpm templates:verify-s3
```

For PDF Lambda changes:

```powershell
corepack pnpm test:run --filter @nexcv/pdf-lambda
corepack pnpm build:pdf-lambda
corepack pnpm validate:lambda-artifacts
```

For API queue, auth/security, billing, or checkout changes:

```powershell
corepack pnpm test:run --filter @nexcv/api --filter @nexcv/web
```

Auth-cache, session-version, cache-TTL, and request-timeout changes must keep the focused suites in **Automated Critical Coverage** passing in addition to the full app/API run.

For payment path changes, include PayHere/Lemon Squeezy helper coverage for signatures, amount/currency validation, market routing, coupon math, return confirmation, and cancellation cleanup.

For PDF download runtime changes, include API tests that cover failed generation, failed S3 upload, not-ready jobs, and invalid S3 download bodies.
For builder download UI changes, include web tests that verify the browser download link is created, clicked, and cleaned up.

For worker changes:

```powershell
corepack pnpm test:run --filter @nexcv/pdf-lambda --filter @nexcv/email-worker --filter @nexcv/cv-import-worker --filter @nexcv/ocr-lambda
corepack pnpm build:pdf-worker-lambda
corepack pnpm build:cv-import-worker-lambda
corepack pnpm build:email-worker-lambda
corepack pnpm build:ocr-lambda
corepack pnpm validate:lambda-artifacts
```

## QA Sign-Off Template

```text
Release/Change:
Environment:
Tester:
Date:

Passed:
Failed:
Blocked:
Not Run:

High-risk areas checked:
- Auth:
- Builder/import:
- Templates/PDF:
- Billing:
- Admin:

Notes:
```
