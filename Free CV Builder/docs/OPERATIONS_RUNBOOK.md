# Operations Runbook

This runbook is for production support, launch checks, and incident response.

## First Checks

When something is wrong:

1. Check `/api/health` and review any degraded readiness checks.
2. Check hosting logs for the Express app.
3. Check MongoDB Atlas health.
4. Check admin settings/service-readiness if admin is reachable.
5. Check recent deploys and environment variable changes.

## PDF Generation Failing

Symptoms:

- Users receive a 500 response from PDF export.
- PDF download hangs.
- PDF output is blank or clipped.

Diagnosis:

- Check Express logs for `/api/generate-pdf`.
- Search logs for `pdf.generate_failed`, `pdf.lambda_unavailable`, or `pdf.local_generation_failed`.
- Check whether `PDF_LAMBDA_URL` is configured.
- Check Lambda CloudWatch logs.
- Check Lambda memory/timeout.
- Confirm S3 template bucket/prefix if custom templates fail only.

Resolution:

- Increase Lambda memory to 2048 MB for heavy templates.
- Increase timeout to 60 seconds if needed.
- Verify Lambda Node runtime and Chromium package compatibility.
- Validate the affected template with `npm run validate:templates`.
- Use admin/support messaging if users are affected during recovery.

## PayHere Payments Not Activating

Symptoms:

- User paid but plan did not upgrade.
- Checkout transaction stays pending.
- IPN endpoint logs signature or merchant errors.

Diagnosis:

- Check logs for `POST /api/payhere/ipn`.
- Search logs for `payment.payhere_ipn_failed`, `payment.payhere_ipn_signature_failed`, `payment.payhere_ipn_amount_mismatch`, or `payment.payhere_ipn_unprocessed_status`.
- Confirm PayHere can reach the deployed public URL.
- Confirm `PAYHERE_MERCHANT_ID` and `PAYHERE_MERCHANT_SECRET`.
- Confirm `PAYHERE_NOTIFY_URL` points to `/api/payhere/ipn`.

Resolution:

- Manually correct affected users from admin if payment is verified.
- Fix merchant credentials or notify URL.
- Review failed/pending transactions in admin billing.
- Keep a reconciliation note for later cleanup.

## Lemon Squeezy Payments Not Activating

Symptoms:

- User paid through Lemon Squeezy but plan did not upgrade.
- User returns to checkout and sees payment confirmation pending.
- Sentry or logs show webhook errors.

Diagnosis:

- Check logs for `POST /api/lemonsqueezy/webhook`.
- Search logs for `payment.lemonsqueezy_webhook_failed`, `payment.lemonsqueezy_webhook_signature_failed`, `payment.lemonsqueezy_webhook_amount_mismatch`, or `payment.lemonsqueezy_webhook_context_missing`.
- Confirm the webhook URL is `https://your-domain.example/api/lemonsqueezy/webhook`.
- Confirm `LEMON_SQUEEZY_WEBHOOK_SECRET` matches the Lemon Squeezy webhook signing secret.
- Confirm `LEMON_SQUEEZY_STORE_ID` and variant IDs are numeric and from the same test/live store.
- Confirm the checkout was started from the same environment users return to. Localhost tests need `FRONTEND_URL=http://localhost:3000`; production tests need the production domain.

Resolution:

- Fix env values or webhook URL, then resend the webhook from Lemon Squeezy.
- Review the checkout session/payment transaction in admin billing.
- Manually correct affected users only after verifying the payment in Lemon Squeezy.
- Keep a reconciliation note with the Lemon Squeezy order/payment ID.

## Admin Panel Inaccessible

Symptoms:

- Admin receives 403/404.
- Admin pages do not load, but public site works.

Diagnosis:

- Confirm the user is logged in.
- Confirm the user's role and permissions.
- Check `SUPER_ADMIN_EMAILS` for bootstrap access.
- Check `ADMIN_ALLOWED_IPS` in production.
- Confirm the user's current public IP.
- Confirm the app is resolving real client IPs through the host/proxy. Render should work with Express `trust proxy`; the allowlist must contain the public client IP, not an internal container IP.

Resolution:

- Add the trusted IP to `ADMIN_ALLOWED_IPS` and redeploy/restart if needed.
- Restore owner access through `SUPER_ADMIN_EMAILS`.
- Use database-level correction only as a last resort and audit the change.

## Email Delivery Failing

Symptoms:

- Verification or reset emails do not arrive.
- Admin test-email fails.

Diagnosis:

- Use admin settings test-email.
- Search logs for `email.gmail_api_failed`, `email.resend_failed`, `email.smtp_failed`, or `email.notification_failed`.
- Check `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`, SMTP variables, `RESEND_API_KEY`, or Gmail OAuth variables.
- Check provider rate limits and spam/bounce logs.
- For HTML design issues, remember the app sends React Email generated `html` plus plain `text`. Resend delivers the HTML as provided; it does not automatically redesign plain text.

Resolution:

- Fix credentials or sender domain setup.
- Rotate app passwords/API keys if exposed or expired.
- Use a verified sender domain before launch.
- Keep plain text content sensible in admin email templates because it remains the fallback and is wrapped into the branded HTML design.

## Maintenance Mode

Use maintenance mode when public traffic should pause while admins verify a fix.

1. Log in as an admin.
2. Open Settings.
3. Enable maintenance mode.
4. Verify public users see the maintenance screen.
5. Keep admin access available for testing.
6. Disable maintenance mode after verification.

If the database is down, app-level maintenance mode may not be available. Use hosting/load-balancer controls in that case.

## Routine Maintenance

- Confirm MongoDB automated backups.
- Search logs for `mongodb.connection_failed` after deploys or environment changes.
- Take a manual snapshot before risky data operations.
- Review failed PayHere transactions.
- Review failed email/PDF logs.
- Validate templates before release.
- Export audit logs externally if longer retention is required.
- Rotate secrets on a planned schedule.
- Keep a rollback target for both the main app and PDF Lambda.
