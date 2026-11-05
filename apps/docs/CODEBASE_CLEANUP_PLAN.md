# Codebase Cleanup And Scale Plan

This plan keeps the app launchable while making the codebase easier to scale, debug, and extend. The goal is not to chase a perfect rewrite before launch. The goal is to reduce operational risk, isolate complex business rules, and make future changes safer.

## Launch Principle

Before launch, optimize for confidence, not beauty.

Do:

- Keep payment, auth, admin, and PDF flows stable.
- Extract obvious duplicated logic into helpers.
- Centralize important constants and status rules.
- Add focused tests around payment/auth edge cases.
- Keep `corepack pnpm lint`, `corepack pnpm test:run`, and `corepack pnpm launch:check` green.

Avoid before launch:

- Full payment flow rewrite.
- Full admin dashboard rewrite.
- Large database migrations.
- Design system rewrites.
- Broad folder restructuring with no direct launch value.

## What "Done" Means

These cleanup phases do not make the product permanently "100% finished." They make the app launch-ready with a maintainable foundation.

After launch, the app still needs real-user bug fixes, payment monitoring, template improvements, SEO/content work, analytics, and UX refinements.

## Current Status (2026-11-05)

Snapshot taken from the `test/overview` branch. Re-measure before starting each phase.

Already done:

- Checkout page split: `apps/web/src/pages/checkout/` holds `CheckoutCustomerForm`, `CheckoutSummaryPanel`, `useCheckoutPricing`, and `useCheckoutReturnHandler`. `CheckoutPage.tsx` is down to about 390 lines.
- Builder page components: `apps/web/src/pages/home/` holds the header, banners, overlays, and modals. The builder hooks are still missing.
- CV form sections: `apps/web/src/components/form/` holds one component per section. The form hooks are still missing.
- Auth modal steps: `apps/web/src/components/auth/` holds one component per step, plus `authValidation.ts`.
- Admin hooks (partial): `useAdminBootstrap`, `useAdminTemplates`, `useAdminUsers`.
- Checkout timing constants live in `apps/api/services/checkoutSessionService.ts`: PayHere expiry, Lemon Squeezy expiry, and the payment processing lock timeout.
- Backend auth validation lives in `apps/api/services/authValidationService.ts`.

Main structural problems:

| Area | Finding |
| --- | --- |
| Route dependency wiring | `server.ts` builds one `routeDeps` object with about 200 entries. `bindDeps()` returns its input unchanged, so it adds no typing or checks. `routes/cv.ts` destructures 169 names: 107 are unused and 14 do not exist in `routeDeps`, so they are always `undefined`. `routes/public.ts` destructures 139 names, and 98 of those are unused. Fixed in Phase 3. |
| `apps/api/server.ts` | 1307 lines with about 90 helper definitions: quota, session, auth guards, sanitizing, DTO builders, and SEO rendering. Down to 185 lines after Phase 4. |
| Large API routes | `auth.ts` (1246 lines), `cv.ts` (1243), `payment.ts` (1036), `public.ts` (1023), `admin/billing.ts` (566). |
| Large web files | `LandingPage.tsx` (1142 lines), `Home.tsx` (1087), `CVForm.tsx` (1080), `HtmlToPdf.tsx` (894), `AdminDashboard.tsx` (779), `index.css` (1589). |
| Workers | `apps/workers/pdf-lambda/src/handler.ts` is 1860 lines. |
| Type safety | About 480 `any` usages in `apps/api` (574 by the ESLint rule, which counts every occurrence, including generics such as `Record<string, any>`). TypeScript `strict` is off. ESLint was added in Phase 2. |
| Repo root | `Admin Templates/`, `sample templates/`, `Free CV Builder/`, and `nexcv-template-previews.zip` sit outside `apps/` and `packages/`. Together they have 75 tracked files. |

## Phase 1: Launch Safety Cleanup

Safe to do before launch.

Status: partly done. The checkout timing constants are centralized in `checkoutSessionService.ts`. The 30-day cleanup is a TTL index in `server-models/CheckoutSession.ts`, still written as an inline number. Still to confirm: the review queue rules and the signup validation parity.

- Centralize checkout status rules:
  - `pending`: payment started and still in progress.
  - `paid`: PayHere success IPN processed.
  - `failed`: PayHere failed notification or real payment issue.
  - `cancelled`: user returned through cancel/back flow.
  - `expired`: abandoned checkout reached timeout.
- Centralize review queue rules:
  - Cancelled and expired abandoned checkouts should not enter Needs Review.
  - Failed checkouts and unprocessed payment notifications should enter Needs Review.
- Move magic numbers into constants:
  - checkout expiry: 15 minutes.
  - cancelled/expired checkout cleanup: 30 days.
  - payment processing lock timeout: 10 minutes.
- Keep signup validation consistent:
  - name required.
  - email valid.
  - password strong.
  - contact number required.
  - terms/privacy agreement required.
- Keep docs updated:
  - launch checklist.
  - operations runbook.
  - payment edge-case behavior.

## Phase 2: Baseline And Tooling

Do this first. Every later phase depends on it.

Status: done (2026-11-05).

- Baseline before the ESLint change: `corepack pnpm lint`, `corepack pnpm test:run` (278 tests across 9 workspaces), and `corepack pnpm build` all passed.
- ESLint 9 with `typescript-eslint` and `eslint-plugin-react-hooks` is installed at the repo root. One shared flat config, `eslint.config.mjs`, covers every workspace.
- Root scripts: `corepack pnpm lint:eslint` (check) and `corepack pnpm lint:eslint:fix` (auto-fix). CI runs `lint:eslint` right after `lint`.
- `no-explicit-any`, `no-unused-vars`, and `react-hooks/exhaustive-deps` are warnings. Every other recommended rule is an error, so new problems of those kinds fail CI.
- `no-control-regex` is off, because the input sanitizers match control characters on purpose.
- The initial run had 10 small errors, all fixed without behavior changes: a redundant `Boolean()` call, two empty `catch` blocks now explained by a comment, two `let` changed to `const`, and four `@ts-ignore` replaced with `@ts-expect-error` in `PrintView.tsx`.

Warning baseline (2026-11-05): 1011 warnings across 303 files, 0 errors.

| Workspace | `no-explicit-any` | `no-unused-vars` | Other |
| --- | --- | --- | --- |
| `apps/api` | 574 | 225 | 0 |
| `apps/workers/pdf-lambda` | 74 | 4 | 0 |
| `apps/web` | 42 | 14 | 9 (`exhaustive-deps`) |
| `packages/templates` | 21 | 0 | 0 |
| `apps/workers/pdf-worker` | 19 | 0 | 0 |
| `apps/workers/ocr-lambda` | 17 | 0 | 0 |
| `apps/workers/cv-import-worker` | 5 | 0 | 0 |
| `packages/api-contracts` | 4 | 0 | 0 |
| `apps/workers/email-worker` | 3 | 0 | 0 |

Most of the `apps/api` unused-variable warnings came from the route dependency destructuring. Phase 3 removed it, and the count dropped from 225 to 16 (795 warnings in total after Phase 3).

Next step for this phase: once a workspace reaches zero warnings for a rule, raise that rule to `error` for that workspace, so the count cannot grow back.

Expected result:

- Unused code and new `any` usages show up in review instead of piling up.

## Phase 3: Route Dependency Wiring

Low risk and high value: the later API phases are much easier once this is done.

Status: done (2026-11-05).

- Every router exports its own deps type, for example `CvRouteDeps = Pick<AppRouteDeps, ...>`, and `routes/admin.ts` combines the admin ones into `AdminRouteDeps`. `bindDeps` and `routes/_shared.ts` are gone.
- Destructured names removed: 108 from `cv.ts` (61 kept), 98 from `public.ts` (41 kept), 2 from `auth.ts`, and 1 from `htmlPdf.ts`. The 14 names in `cv.ts` that were missing from `routeDeps` are gone too. None was used as a value, so they never caused a runtime bug.
- `CvRouteDeps` also lists the keys that `processCvImportJob` and `processPdfJob` read, because `cv.ts` passes its whole `deps` object to them. Those two services still take `Record<string, any>`; typing them belongs to Phase 12.
- Route tests wrap their mocks in `stubRouteDeps<XRouteDeps>({ ... })` (`tests/helpers/routeDeps.ts`), so stub key names are type-checked and the earlier `as any` casts are gone.
- Typing the deps exposed 14 type mismatches that `Record<string, any>` had hidden. All were fixed without changing API responses: readonly template constants, the `source` literals in `templateAdmin.ts`, the HTML PDF `plan` type, the `planStartedAt` serialization, dropping the internal `reserved` field from quota responses, and adding `'billing.review.resolved'` to `AdminAuditAction` (the schema has no enum, so it was already being saved).
- Left for later, marked in code:
  - `routes/admin/billing.ts`: the review handler casts the payment/checkout model union to `Model<any>` (TODO for Phase 12).
  - `routes/payment.ts`: the checkout status check compares `user.plan === 'unlimited'`, but the User schema's plan enum has no `'unlimited'`, so it never matches. It is kept as-is. Decide separately whether it should use `getEffectivePlan()`, which returns `'unlimited'` for super admins.

Target files:

- `apps/api/server.ts` (`routeDeps`)
- `apps/api/routes/_shared.ts` (`bindDeps`, `RouteDeps`)
- All files in `apps/api/routes/` and `apps/api/routes/admin/`
- Route tests that build their own deps object (`tests/server.test.ts`, `tests/profileImageServing.test.ts`)

Steps:

1. Export `AppRouteDeps = typeof routeDeps` from `server.ts`, and type every route's `deps` with it instead of `Record<string, any>`.
2. Delete the destructured names each route never uses, and the names that do not exist in `routeDeps`.
3. Give each router its own narrow type, for example `type CvRouteDeps = Pick<AppRouteDeps, 'User' | 'CVDocument' | ...>`. Then tests can pass a small typed object instead of using `as any`.
4. Remove `bindDeps` and `_shared.ts` once no route imports them.

Expected result:

- Each route declares exactly what it needs.
- A misspelled or removed dependency fails `tsc` instead of becoming `undefined` at runtime.
- Test fixtures are typed.

## Phase 4: Slim `server.ts`

Goal: `apps/api/server.ts` keeps only bootstrap code (env, middleware, router mounting, listen) and gets under about 250 lines.

Status: done (2026-11-05). `server.ts` went from 1307 lines to 185.

- `routeDeps.ts` is the new composition root. It holds the `routeDeps` object and exports `AppRouteDeps`, and the routes import that type from it.
- Helpers moved without changes:
  - `middlewares/auth.ts`: auth guards and `currentUserId`.
  - `server-utils/sendError.ts`.
  - `server-utils/requestValidation.ts`: sanitizers, ID and Mongo error checks, upload limits.
  - `server-utils/publicUrls.ts`: API, frontend, and public CV URLs.
  - `server-utils/dates.ts`.
  - `server-utils/dto/documents.ts` and `server-utils/dto/admin.ts`.
  - `services/quotaService.ts` (now including the CV import quota), `services/sessionService.ts`, `services/cvDataService.ts`, and `services/geminiService.ts`.
- Startup middleware moved into `middlewares/bodyParsers.ts`, `middlewares/appSettings.ts`, `middlewares/maintenance.ts`, `middlewares/errorHandler.ts`, and `configureSessionVersionCheck` in `middlewares/session.ts`. `server.ts` registers them in the original order.
- robots.txt, sitemap.xml, static files, asset redirects, and the SEO index catch-all moved to `routes/frontend.ts` (not `routes/seo.ts`, because it serves the whole built web app). `distPath` and `siteUrl` are still computed in `server.ts` after `dotenv.config()` and passed in, so `.env` values keep applying.
- Earlier attempts had left unused copies of these helpers in `services/` that had drifted from the live code. They are now replaced by the live versions, and `services/serverHelpers.ts` is deleted. Differences found in the dead copies, still to decide as separate changes:
  - `services/cvDataService.ts` kept `textScale` when saving a CV. The live version dropped it, so the text-size setting was lost on every cloud save (`POST`/`PUT` in `routes/cv.ts`). The commit that added the text-size slider had only updated the dead copy. **Fixed right after Phase 4** in its own commit: `textScale` is saved again, clamped to 0.85–1.2 with a default of 1, and covered by a regression test in `tests/server.test.ts`. CVs saved before the fix still have no stored `textScale`, so they open at the default size until the user sets it again.
  - The dead auth guards added `code` fields (`AUTH_REQUIRED`, `EMAIL_VERIFICATION_REQUIRED`, `FORBIDDEN`) to their error responses, and the live guards sent none. The frontend falls back to the 401 and 403 statuses for sign-in and upgrade errors, but `isEmailVerificationRequiredError()` only matches the code. As a result, checkout (`routes/payment.ts`) never showed its "Verify your email before completing checkout." message. **Fixed after Phase 4** in its own commit: every guard in `middlewares/auth.ts` now sends its code, and `tests/authGuards.test.ts` covers each guard.
  - The dead copy set `MAX_BASE64_LENGTH` to 15 MiB. The live value is about 13.3 MiB (10 MiB file as base64).
- Verification: every top-level statement of the old `server.ts` was checked against its new location, and the old and new servers were started side by side. Status, headers, and bodies matched for robots, sitemap, health, auth, documents, admin, SPA routes, asset redirects, and unknown API paths.
- `server.ts` still re-exports the helpers that tests import from it.

Moves (original plan):

- Session helpers (`markSessionCurrent`, `invalidateUserSessions`, `isSessionCurrent`) → `services/sessionService.ts`.
- Quota helpers (`get`/`increment`/`consume`/`rollback` for CV creation, CV import, and downloads) → `services/quotaService.ts`.
- Auth guards (`requireAuth`, `requireSuperAdmin`, `requireVerifiedEmail`, `requirePaidPlan`) → `middlewares/auth.ts`.
- `sanitizeCvDataForStorage` and the `cleanStored*` helpers → `services/cvDataService.ts`.
- DTO builders (`documentSummary`, `documentDetails`, `adminUserSummary`, `adminPaymentSummary`, `adminSupportTicketSummary`) → `server-utils/dto/`.
- Gemini helper (`generateGeminiText`) → `services/geminiService.ts`.
- Sitemap, robots, and SEO index rendering → `routes/seo.ts`.
- Keep re-exporting anything the tests import from `server.ts` until the tests are updated to import from the new modules.

Expected result:

- `server.ts` is easy to read in one pass.
- Helpers can be unit-tested without starting the whole app.

## Phase 5: Payment And Billing Structure

Highest-priority business cleanup, because this code handles money.

Status: started. Checkout timing constants live in `checkoutSessionService.ts`. PayHere and Lemon Squeezy helpers live in `server-utils/`. `routes/payment.ts` is still about 1036 lines.

Target files:

- `apps/api/routes/payment.ts`
- `apps/api/routes/admin/billing.ts`
- `apps/api/services/checkoutSessionService.ts`
- `apps/api/server-utils/payHere.ts`
- `apps/api/server-utils/lemonSqueezy.ts`
- `apps/api/server-models/CheckoutSession.ts`
- `apps/api/server-models/PaymentTransaction.ts`

Suggested split:

- `services/payhereService.ts` (or keep growing `server-utils/payHere.ts`; pick one home)
  - PayHere config.
  - hash/signature helpers.
  - amount parsing.
  - checkout payload building.
- `services/checkoutService.ts`
  - create checkout session.
  - cancel checkout.
  - expire stale pending sessions.
  - cleanup policy constants.
- `services/paymentProcessingService.ts`
  - IPN processing.
  - duplicate IPN handling.
  - processing locks.
  - plan activation.
- `services/billingReviewService.ts`
  - Needs Review rules.
  - review summary builders.
  - mark review resolved.

Expected result:

- Routes become thinner.
- Future refunds/reconciliation/subscriptions are easier to add.
- Admin billing counts are easier to trust.

## Phase 6: Checkout Frontend Split

Status: mostly done. `CheckoutCustomerForm`, `CheckoutSummaryPanel`, `useCheckoutPricing`, and `useCheckoutReturnHandler` exist under `apps/web/src/pages/checkout/`. What is left: decide whether `CheckoutPlanSelector`, `CheckoutPaymentMethod`, and `useCheckoutCustomerForm` are still worth extracting from the 390-line page.

Target file:

- `apps/web/src/pages/CheckoutPage.tsx`

Suggested split (original plan):

- `CheckoutPlanSelector`
- `CheckoutCustomerForm` (done)
- `CheckoutQuoteSummary` (done as `CheckoutSummaryPanel`)
- `CheckoutPaymentMethod`
- `useCheckoutQuote` (done as `useCheckoutPricing`)
- `usePayHereReturnHandler` (done as `useCheckoutReturnHandler`)
- `useCheckoutCustomerForm`

Expected result:

- PayHere return/cancel handling is isolated.
- Customer form validation is easier to change.
- Plan/coupon UI does not mix with payment redirection logic.

## Phase 7: Admin Panel Cleanup

Status: started. `useAdminBootstrap`, `useAdminTemplates`, and `useAdminUsers` exist, and shared pieces live in `AdminSharedComponents.tsx` and `AdminShellComponents.tsx`. Billing, promotions, support, settings, and audit hooks are still missing. `AdminDashboard.tsx` is about 779 lines.

Target files:

- `src/features/admin/AdminDashboard.tsx`
- `src/features/admin/BillingManagementSection.tsx`
- `src/features/admin/SettingsManagementSection.tsx`
- `src/features/admin/TemplateManagementSection.tsx`

Suggested hooks:

- `useAdminBilling`
- `useAdminPromotions`
- `useAdminSupport`
- `useAdminSettings`
- `useAdminAudit`

Suggested billing components:

- `BillingStatsGrid`
- `BillingFilters`
- `BillingPaymentsTable`
- `BillingReviewDrawer`
- `DailyRevenueStrip`

Suggested shared admin components:

- `AdminDrawer`
- `AdminEmptyState`
- `AdminLoadingState`
- `AdminFilterBar`
- `AdminPermissionNotice`

Expected result:

- `AdminDashboard.tsx` becomes a shell: navigation, permissions, active section.
- Section logic becomes easier to test and maintain.
- Billing review changes become safer.

## Phase 8: Auth Cleanup

Status: frontend mostly done, backend started. `AuthModal.tsx` is split into step components under `apps/web/src/components/auth/`, with `authValidation.ts`. On the backend, `services/authValidationService.ts` exists, but `routes/auth.ts` is still about 1246 lines.

Target files:

- `routes/auth.ts`
- `src/components/AuthModal.tsx`
- `server-utils/userAuth.ts`

Backend split:

- `authValidation.ts`
- `emailVerificationService.ts`
- `passwordResetService.ts`
- `userSessionService.ts`

Frontend split:

- `LoginForm`
- `SignupForm`
- `SignupAgreementFields`
- `OtpVerificationForm`
- `PasswordField`

Expected result:

- Signup/login/OTP code becomes easier to reason about.
- Agreement and phone requirements stay consistent between UI and API.
- Password reset and email verification logic is easier to update.

## Phase 9: Dashboard And Builder Cleanup

Status: components done, hooks not started. Builder UI pieces live in `apps/web/src/pages/home/` and CV form sections in `apps/web/src/components/form/`. `Home.tsx` (about 1087 lines) and `CVForm.tsx` (about 1080 lines) still hold the state and side-effect logic that the hooks below should own.

Also in scope: `LandingPage.tsx` (about 1142 lines) and `HtmlToPdf.tsx` (about 894 lines) should be split into section components, and `index.css` (about 1589 lines) should be split by feature.

Target files:

- `src/pages/Dashboard.tsx`
- `src/pages/Home.tsx`
- CV builder components under `src/components/`
- `src/components/CVForm.tsx`
- `src/components/CVPreview.tsx`
- template rendering utilities under `src/utils/`

Dashboard split:

- `DashboardUpgradeCard`
- `DashboardStatsGrid`
- `EmailVerificationBanner`
- `PlanExpiryBanner`
- `RecentCvList`
- `DeleteCvDialog`

Builder cleanup candidates:

- `useBuilderAuth` for current-user loading, auth modal redirects, verification state, and auth-gated actions.
- `useBuilderSave` for local draft persistence, cloud save, autosave status, document title, and document ID transitions.
- `useBuilderDownload` for quota checks, PDF job creation/polling, direct download fallback, download errors, and upgrade prompts.
- `useBuilderPreviewLayout` for preview sizing, resizer state, mobile edit/preview mode, and scale calculations.
- `useBuilderTheme` for dark-mode persistence and transition overlay state.
- `useBuilderDraft` for local-storage draft restore, meaningful-content detection, and debounce logic.

CV form cleanup candidates:

- `useCvImport` for upload modal state, file reads, import job creation/polling, abort handling, and friendly import errors.
- `useCvAiActions` for summary generation, text refinement, rate-limit handling, and per-field loading state.
- `useCvSectionHandlers` for add/remove/reorder/update handlers across experience, education, skills, courses, projects, awards, languages, and references.
- `useCvTemplateSelection` for paid-template checks, pending template state, template default colors, and confirmation flow.
- `useProfileImageUpload` for image compression, S3/profile-image upload, crop state, and image error handling.
- Keep `CVForm.tsx` focused on tab/wizard composition and section rendering.

CV preview and template rendering cleanup candidates:

- Keep `CVPreview.tsx` as a thin preview boundary.
- Keep browser preview rendering and PDF/server rendering behavior aligned through shared template data helpers.
- Add focused tests around page-break rules, custom template placeholders, profile image positioning, text scale, template colors, and print/export layout regressions.
- Avoid broad visual rewrites without screenshot/manual PDF checks because preview and PDF behavior are user-facing and easy to regress.

Expected result:

- Dashboard changes remain small.
- Builder page becomes safer to improve after launch.
- `Home.tsx` becomes an orchestration shell for auth, save/download, layout, theme, and modal composition.
- `CVForm.tsx` becomes easier to test because import, AI, template, image, and section mutations are isolated.

## Phase 10: CV API Route Cleanup

Target files:

- `apps/api/routes/cv.ts`
- `apps/api/services/pdfJobService.ts`
- `apps/api/services/cvImportJobService.ts`
- `apps/api/services/quotaService.ts`
- `apps/api/services/pdfService.ts`

Suggested split:

- `services/cvDocumentService.ts`
  - list, load, create, update, delete CV documents.
  - quota reservation/rollback for document creation.
  - document title and storage sanitization.
- `services/cvAssetService.ts`
  - profile image data URL validation.
  - S3 key generation and upload.
  - local/S3 storage behavior.
- `services/cvAiService.ts`
  - summary generation.
  - text refinement.
  - prompt construction and sanitization.
  - AI rate-limit friendly errors.
- `services/cvImportRouteService.ts`
  - synchronous import compatibility endpoint.
  - queued import request validation.
  - job status response mapping.
- `services/pdfDownloadService.ts`
  - template access checks.
  - download quota reservation/rollback.
  - PDF job creation and direct PDF fallback.
  - PDF filename and response headers.

Expected result:

- `routes/cv.ts` becomes a thin router: validate request, call service, map response.
- PDF, import, AI, and document CRUD bugs become easier to isolate.
- Route tests can focus on HTTP behavior while service tests cover business rules.

## Phase 11: PDF And Template Rendering Cleanup

Target files:

- `apps/workers/pdf-lambda/src/handler.ts` (about 1860 lines: split request parsing, rendering, and S3 I/O, and reuse `packages/templates` for template logic)
- `apps/api/services/pdfService.ts`
- `apps/api/services/s3Service.ts`
- `packages/templates/src/templateData.ts`
- `packages/templates/src/cvTemplateRules.ts`
- `apps/web/src/utils/templateRenderer.ts`
- `apps/web/src/components/cv-preview/CustomPreview.tsx`

Suggested split:

- `pdfHtmlService.ts`
  - built-in CV HTML generation.
  - reusable section rendering helpers.
  - template-specific layout selection.
- `pdfBrowserService.ts`
  - browser launch options.
  - warm browser lifecycle.
  - one-shot browser fallback.
  - page setup and PDF render settings.
- `pdfLambdaService.ts`
  - Lambda request/response handling.
  - Lambda circuit breaker behavior.
  - template source headers.
- `templateRenderShared` helpers in `packages/templates`
  - data normalization.
  - profile image CSS.
  - text scaling.
  - pagination/page-break rules.

Expected result:

- Server PDF rendering, Lambda rendering, and frontend preview share more assumptions.
- Page-break and print regressions are easier to test.
- New templates require less duplicated logic.

## Phase 12: Shared Types, Constants, And DTOs

Centralize repeated contracts, then tighten the compiler.

Strict mode rollout:

- Turn on `strict` one folder at a time in `apps/api`: `server-utils` → `services` → `server-models` → `routes`. A per-folder `tsconfig` that extends the base config makes this possible.
- Replace `any` as each folder is converted. About 480 `any` usages in `apps/api` are the starting count.
- Repeat for `apps/web`, which has far fewer `any` usages.

Suggested folders:

- `src/shared/types`
- `src/shared/constants`
- `server-utils/dto`
- `server-utils/validation`

Candidates:

- checkout statuses.
- payment review statuses.
- billing plan names.
- service health statuses.
- public user DTO.
- admin payment DTO.
- document summary DTO.

Expected result:

- Frontend/backend naming drift is reduced.
- Admin and API response changes are easier to track.

## Phase 13: Repo Hygiene

- Decide a home for the root-level template material: `Admin Templates/`, `sample templates/`, and `nexcv-template-previews.zip`. Either move it under `templates/` or an app's `scripts/` fixtures, or remove it if the release scripts no longer read it.
- Make sure nothing under `Free CV Builder/` (logs, `node_modules`) is tracked, and add it to `.gitignore` if it is only a local leftover.
- Update this document's status lines whenever a phase lands.

## Phase 14: Tests To Add

Priority tests:

- Signup requires phone and agreement.
- Signup saves phone and agreement timestamp.
- Checkout cancel marks session `cancelled`.
- Cancelled checkout does not enter Needs Review.
- Abandoned checkout expires after 15 minutes.
- Expired checkout does not enter Needs Review.
- Failed PayHere IPN enters Needs Review.
- Successful PayHere IPN upgrades the user.
- Duplicate PayHere IPN does not double-upgrade or double-count revenue.
- Billing review can be marked resolved with an admin note.
- CV import upload rejects unsupported/oversized files with friendly messages.
- CV import queued job polling maps pending, ready, failed, and expired states correctly.
- PDF download quota rolls back when PDF job creation fails.
- Premium template access is enforced for queued and direct PDF flows.
- Template rendering preserves page-break rules for long experience/education sections.
- Profile image crop/zoom/position render consistently in preview and PDF.
- Admin billing/support/settings/audit hooks handle loading, success, and error states.

## Recommended Order

1. Baseline and tooling (Phase 2).
2. Route dependency wiring (Phase 3).
3. Slim `server.ts` (Phase 4).
4. Payment and checkout service extraction (Phase 5), with the payment tests from Phase 14 written first.
5. Admin billing section split and admin hook extraction (Phase 7).
6. Auth route cleanup (Phase 8).
7. Builder page and CVForm hook cleanup, then the dashboard split (Phase 9).
8. CV API route cleanup (Phase 10).
9. PDF/template rendering and PDF Lambda cleanup (Phase 11).
10. Shared types/constants and strict mode rollout (Phase 12).
11. Repo hygiene (Phase 13).
12. Remaining tests around the critical flows (Phase 14).

Phase 6 (checkout frontend) is mostly done, so it is not in this list. Finish its leftovers whenever the checkout page is touched next.

Phases 2 to 4 come first because they are low risk and make every later API phase smaller: once each route declares its own typed dependencies and the helpers live in modules, moving logic into services is mostly mechanical. After that, the order protects the highest-risk business flows first while keeping each step small enough to verify.

PR rules:

- One area per PR. Do not mix a refactor with a feature or a behavior change.
- Lint, tests, and build must pass before and after each PR.
- Write tests for payment, auth, and PDF behavior before refactoring that code.

## What 100% Clean Needs

The codebase is clean enough when these are true:

- Large route/page files are shells around services/hooks, not homes for business logic.
- Payment, auth, admin, CV import, PDF export, and template rendering each have focused service or hook boundaries.
- Shared constants and DTOs live in `packages/` or backend/frontend shared helper modules instead of being redefined.
- Critical flows have tests before and after refactors.
- Production build, worker ZIP builds, lint, tests, template validation, and markdown link checks pass.
- Documentation points to current paths and describes the actual operational shape.

Do not treat "100% clean" as "no future work." It means the code is easy to change safely, not that the product will never need improvements.

### 100% Clean Checklist

Architecture boundaries:

- `apps/web` contains frontend UI, frontend hooks, frontend utilities, public assets, tests, and build/template scripts only.
- `apps/docs` contains project, feature, deployment, and operations documentation.
- `apps/api` contains Express routes, backend services, middleware, models, backend utilities, and API tests only.
- `apps/workers` contains deployable worker/Lambda packages only.
- `packages/shared`, `packages/templates`, and `packages/api-contracts` contain cross-app contracts and logic that must stay consistent.
- No new source code should be added to the legacy pre-monorepo app folder.

Frontend boundaries:

- `src/pages/*` files should mostly compose feature components and hooks.
- `src/features/admin/` owns all admin panel UI, hooks, permissions, and admin-specific frontend types.
- Builder orchestration in `Home.tsx` should be split into focused hooks for auth, save, download, preview layout, theme, and draft persistence.
- `CVForm.tsx` should be split so import, AI actions, section mutations, template selection, and profile image upload are not embedded in one component.
- Preview/template rendering should keep browser preview behavior aligned with PDF/server rendering behavior.

Backend boundaries:

- Route files should validate requests, call services, and map responses.
- Business rules should live in services, not directly inside route handlers.
- Database model files should define schemas and small model helpers, not large request workflows.
- Auth, payment, CV document, CV import, PDF, quota, template, support, and admin workflows should each have focused service boundaries.
- Worker handlers should stay thin and reuse shared parsing/contracts where possible.

Data and contract hygiene:

- Repeated status names, plan keys, billing review states, quota names, and service-health labels should be centralized.
- API response DTOs used by both frontend and backend should live in `packages/api-contracts` or another shared package.
- Shared domain rules should not be duplicated separately in frontend and backend files.
- Template metadata and rendering rules should live in `packages/templates` when both web and API need them.

Testing requirements:

- Every high-risk refactor should keep existing tests green before and after the change.
- Payment/IPN/webhook rules need tests for success, cancel, expire, fail, duplicate, and review states.
- Auth needs tests for signup validation, phone/agreement requirements, password reset, email verification, and OAuth edge cases.
- Builder needs tests for save, import, AI actions, template selection, premium gating, and download quota behavior.
- PDF/template rendering needs focused tests for long content, page breaks, custom placeholders, profile image positioning, colors, and text scaling.
- Admin hooks need tests or component coverage for loading, success, empty, forbidden, and error states.

Operational requirements:

- `corepack pnpm -w lint` passes.
- `corepack pnpm -w test:run` passes.
- `corepack pnpm -w build` passes.
- `corepack pnpm -w build:workers` passes when worker code changes.
- `corepack pnpm -w build:pdf-lambda` passes when PDF/template rendering changes.
- `corepack pnpm -w validate:template-map` and `corepack pnpm -w validate:templates` pass when template code or assets change.
- Markdown link checks pass after docs changes.
- Generated artifacts, logs, local build output, `node_modules`, and real `.env` files stay out of commits.

Review requirements:

- Each refactor should have a small blast radius and a clear rollback path.
- UI refactors should keep screenshots or manual notes for affected user-facing flows.
- API refactors should preserve response shapes unless the contract is intentionally versioned and documented.
- Worker/Lambda refactors should verify ZIP generation and handler names.
- Deployment docs should be updated whenever scripts, paths, env vars, Lambda ZIP locations, or Render commands change.
