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

## Phase 1: Launch Safety Cleanup

Safe to do before launch.

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

## Phase 2: Payment And Billing Structure

Highest priority cleanup because it is business-critical.

Target files:

- `routes/payment.ts`
- `routes/admin/billing.ts`
- `server-models/CheckoutSession.ts`
- `server-models/PaymentTransaction.ts`

Suggested split:

- `services/payhereService.ts`
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

## Phase 3: Checkout Frontend Split

Target file:

- `src/pages/CheckoutPage.tsx`

Suggested split:

- `CheckoutPlanSelector`
- `CheckoutCustomerForm`
- `CheckoutQuoteSummary`
- `CheckoutPaymentMethod`
- `useCheckoutQuote`
- `usePayHereReturnHandler`
- `useCheckoutCustomerForm`

Expected result:

- PayHere return/cancel handling is isolated.
- Customer form validation is easier to change.
- Plan/coupon UI does not mix with payment redirection logic.

## Phase 4: Admin Panel Cleanup

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

## Phase 5: Auth Cleanup

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

## Phase 6: Dashboard And Builder Cleanup

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

## Phase 7: CV API Route Cleanup

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

## Phase 8: PDF And Template Rendering Cleanup

Target files:

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

## Phase 9: Shared Types, Constants, And DTOs

Centralize repeated contracts.

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

## Phase 10: Tests To Add

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

1. Payment and checkout service extraction.
2. Checkout page frontend split.
3. Admin billing section split.
4. Auth modal and auth route cleanup.
5. Admin dashboard hook extraction.
6. Dashboard split.
7. Builder page and CVForm hook cleanup.
8. CV API route cleanup.
9. PDF/template rendering cleanup.
10. Shared types/constants cleanup.
11. Additional tests around the critical flows.

This order protects the highest-risk business flows first while keeping each step small enough to verify.

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
