# Launch Checklist

Use this checklist before moving NexCV to live traffic. Keep evidence links or screenshots outside the repo if they contain secrets, customer data, or provider account details.

## Code And Build

- `npm run launch:check` passes.
- `npm run templates:release:dry-run` passes before any template release.

## Environment

- `NODE_ENV=production`.
- `SESSION_SECRET` is long, random, and not reused from development.
- `FRONTEND_URL`, `ALLOWED_ORIGIN`, and public API/host URLs match the live domains.
- `MONGODB_URI` points to the production cluster with backups enabled.
- `SUPER_ADMIN_EMAILS` contains only launch owners.
- `ADMIN_ALLOWED_IPS` is set to trusted public admin IPs if admin access should be network-restricted.
- `GEMINI_API_KEY`, email provider credentials, PayHere credentials, S3 bucket, and PDF Lambda URL are configured.

## Payments

- PayHere sandbox checkout has been tested end to end.
- PayHere live checkout URL and merchant credentials are configured only after sandbox validation.
- `PAYHERE_NOTIFY_URL` points to the deployed `/api/payhere/ipn` endpoint.
- Admin Billing shows processed payments, pending checkouts, expired checkouts, and failed/unprocessed payment notifications.
- Duplicate PayHere IPNs do not create duplicate user credits or duplicate coupon redemptions.
- A failed/cancelled PayHere notification appears as unprocessed for admin review.

## PDF And Templates

- Built-in free template PDF export works for a normal user.
- Premium template access blocks free users and works for paid users.
- Custom/admin template preview and PDF output are checked on desktop and mobile widths.
- PDF Lambda logs are reachable, and the app fallback behavior is understood.
- S3 template bucket permissions are scoped to the app's required read/write actions.

## Auth, Admin, And Data

- Signup, login, logout, email verification, forgot password, and reset password work on the live domain.
- Account deletion removes the user's saved CV documents and user record.
- Saved CV deletion works from dashboard/profile flows.
- Admin roles are reviewed for least privilege.
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

1. Open `/api/health`.
2. Sign up as a new user and verify email.
3. Create, save, reopen, and delete a CV.
4. Generate one free PDF.
5. Complete one paid checkout in the intended PayHere mode.
6. Confirm the paid plan unlocks premium export.
7. Open admin summary, settings, users, templates, billing, support, and audit pages.
8. Confirm admin Billing has no unexpected failed payments or old pending checkouts.
9. Send a support/contact message and confirm notification delivery.
10. Toggle maintenance mode in a controlled window, verify public behavior, then disable it.
