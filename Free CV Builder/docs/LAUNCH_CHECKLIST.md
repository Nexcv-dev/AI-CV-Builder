# Launch Checklist

Use this checklist before moving NexCV to live traffic. Keep evidence links or screenshots outside the repo if they contain secrets, customer data, or provider account details.

## Code And Build

- `npm run launch:check` passes.
- `npm run templates:release:dry-run` passes before any template release.

## Environment

- `NODE_ENV=production`.
- `SESSION_SECRET` is long, random, and not reused from development.
- `FRONTEND_URL`, `ALLOWED_ORIGIN`, and public API/host URLs match the live domains.
- `MONGODB_URI` points to a production replica set or managed cluster with backups enabled.
- `SUPER_ADMIN_EMAILS` contains only launch owners.
- `ADMIN_ALLOWED_IPS` is set to trusted public admin IPs so `/api/admin/*` routes can be used by admins.
- `GEMINI_API_KEY`, email provider credentials, PayHere credentials, Lemon Squeezy credentials, S3 bucket, and PDF Lambda URL are configured.
- `CV_IMPORT_QUEUE_URL`, `CV_IMPORT_QUEUE_REGION`, `OCR_LAMBDA_FUNCTION_NAME` or `OCR_LAMBDA_URL`, and `CV_IMPORT_LOCAL_WORKER_DISABLED=true` are configured for production imports.
- `LEMON_SQUEEZY_STORE_ID`, `LEMON_SQUEEZY_PAYG_VARIANT_ID`, `LEMON_SQUEEZY_MONTHLY_VARIANT_ID`, and `LEMON_SQUEEZY_QUARTERLY_VARIANT_ID` are numeric IDs from the same test/live store.

## Payments

- PayHere sandbox checkout has been tested end to end.
- PayHere live checkout URL and merchant credentials are configured only after sandbox validation.
- `PAYHERE_NOTIFY_URL` points to the deployed `/api/payhere/ipn` endpoint.
- PayHere LKR checkout amounts show whole-rupee totals such as `3749.00`, and IPN amount validation still passes.
- Lemon Squeezy test checkout has been tested end to end for global/USD users.
- Lemon Squeezy webhook points to `/api/lemonsqueezy/webhook` and webhook resend works after a simulated failure.
- Lemon Squeezy dashboard has variants for Single CV Pass, Monthly Pro, and Pro Quarterly.
- Any public coupon used for global/USD checkout has a matching Lemon Squeezy discount code with the same value and eligible variants.
- Admin Dashboard and Admin Billing show processed payments, pending checkouts, expired checkouts, and failed/unprocessed payment notifications with LKR PayHere and USD Lemon Squeezy revenue separated.
- Duplicate PayHere IPNs do not create duplicate user credits or duplicate coupon redemptions.
- Duplicate Lemon Squeezy webhooks do not create duplicate user credits or duplicate coupon redemptions.
- A failed/cancelled PayHere notification appears as unprocessed for admin review.
- PayHere cancel/back flow shows one cancellation toast and leaves the user on checkout with loading state reset.
- Public landing and pricing pages show the featured monthly/quarterly coupon only while it is active and under its max redemption count.

## PDF And Templates

- Built-in free template PDF export works for a normal user.
- Premium template access blocks free users and works for paid users.
- Custom/admin template preview and PDF output are checked on desktop and mobile widths.
- PDF Lambda logs are reachable, and the app fallback behavior is understood.
- S3 template bucket permissions are scoped to the app's required read/write actions.

## Auth, Admin, And Data

- Signup, login, logout, email verification, forgot password, and reset password work on the live domain.
- Guest CV import click opens login before the file picker/import processing starts.
- Authenticated CV import works with a readable PDF/LinkedIn PDF, and unclear or image-only files show a friendly retry message.
- Verification OTP, reset-password, payment receipt, and support reply emails render correctly as branded HTML and still have readable plain-text fallbacks.
- Account deletion removes the user's saved CV documents and user record.
- Saved CV deletion works from dashboard/profile flows.
- Admin roles are reviewed for least privilege.
- `/admin` and unknown public paths render the branded React 404 page instead of plain server text.
- Paid users do not see the dashboard upgrade card while dashboard user state is still loading.
- Admin audit logs are created for sensitive billing, role, template, support, and settings changes.
- Long-term audit export is arranged if compliance or business policy requires it.

## Observability And Recovery

- `/api/health` is monitored by the hosting provider or uptime service.
- Alerts exist for app downtime, MongoDB connection failures, failed PDF generation, failed email delivery, and payment/IPN errors.
- MongoDB automated backups are enabled and a restore drill has been performed.
- A rollback target exists for the main app deploy and the PDF Lambda ZIP.
- Maintenance mode has been tested and can be turned off again.
- Support/admin contact emails are monitored during launch.

## Launch Smoke Test

Run this after deploy, before public announcement:

Use [QA Test Cases](QA_TEST_CASES.md) for the detailed manual test matrix.

1. Open `/api/health`.
2. Sign up as a new user and verify email.
3. Create, save, reopen, and delete a CV.
4. As a guest, click CV import and confirm login opens before file processing.
5. As a signed-in user, import a readable PDF or LinkedIn PDF and confirm parsed data appears.
6. Upload an unclear/empty document and confirm the error message is friendly.
7. Generate one free PDF.
8. Complete one local/LKR paid checkout through PayHere.
9. Complete one global/USD paid checkout through Lemon Squeezy.
10. Confirm Single CV Pass, Monthly Pro, and Pro Quarterly each unlock premium export.
11. Open admin summary, settings, users, templates, billing, support, and audit pages.
12. Confirm admin Dashboard and Billing show separate LKR and USD revenue, including date-wise rows.
13. Send a support/contact message and confirm notification delivery.
14. Toggle maintenance mode in a controlled window, verify public behavior, then disable it.
