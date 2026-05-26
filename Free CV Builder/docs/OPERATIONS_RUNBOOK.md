# Operations Runbook

This runbook is for production support, launch checks, and incident response.

## First Checks

When something is wrong:

1. Check `/api/health`.
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
- Confirm PayHere can reach the deployed public URL.
- Confirm `PAYHERE_MERCHANT_ID` and `PAYHERE_MERCHANT_SECRET`.
- Confirm `PAYHERE_NOTIFY_URL` points to `/api/payhere/ipn`.

Resolution:

- Manually correct affected users from admin if payment is verified.
- Fix merchant credentials or notify URL.
- Review failed/pending transactions in admin billing.
- Keep a reconciliation note for later cleanup.

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
- Check `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`, SMTP variables, `RESEND_API_KEY`, or Gmail OAuth variables.
- Check provider rate limits and spam/bounce logs.

Resolution:

- Fix credentials or sender domain setup.
- Rotate app passwords/API keys if exposed or expired.
- Use a verified sender domain before launch.

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
- Take a manual snapshot before risky data operations.
- Review failed PayHere transactions.
- Review failed email/PDF logs.
- Validate templates before release.
- Export audit logs externally if longer retention is required.
- Rotate secrets on a planned schedule.
- Keep a rollback target for both the main app and PDF Lambda.
