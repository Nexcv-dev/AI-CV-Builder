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

Dashboard split:

- `DashboardUpgradeCard`
- `DashboardStatsGrid`
- `EmailVerificationBanner`
- `PlanExpiryBanner`
- `RecentCvList`
- `DeleteCvDialog`

Builder cleanup candidates:

- Save/download flow hooks.
- Upgrade prompt component.
- Template selection state.
- Import/PDF flow helpers.

Expected result:

- Dashboard changes remain small.
- Builder page becomes safer to improve after launch.

## Phase 7: Shared Types, Constants, And DTOs

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

## Phase 8: Tests To Add

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

## Recommended Order

1. Payment and checkout service extraction.
2. Checkout page frontend split.
3. Admin billing section split.
4. Auth modal and auth route cleanup.
5. Dashboard split.
6. Builder page cleanup.
7. Shared types/constants cleanup.
8. Additional tests around the critical flows.

This order protects the highest-risk business flows first while keeping each step small enough to verify.
