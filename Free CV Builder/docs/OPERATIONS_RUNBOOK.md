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

## CV Import Failing

Symptoms:

- Guest users see the login modal when they try to import, and no import job should start until they sign in.
- Authenticated users see an import error after uploading a PDF/JPG/PNG/LinkedIn PDF.
- Import stays queued or processing for too long.
- Imported fields are empty or incomplete.

Diagnosis:

- Check Express logs for `POST /api/cv-import-jobs` and `GET /api/cv-import-jobs/:id`.
- Search logs for `cv_import.job_failed`, `cv_import.job_ai_fallback`, or `cv_import.job_expired_quota_rollback_failed`.
- Check the `cvimportjobs` collection. A healthy job moves from `queued` to `processing` to `ready`, and uploaded `base64Data` is cleared after completion or failure.
- If jobs remain queued, confirm `CV_IMPORT_QUEUE_URL`, `CV_IMPORT_QUEUE_REGION`, the SQS trigger, and the CV import worker Lambda logs.
- If OCR fails, confirm `OCR_LAMBDA_FUNCTION_NAME` or `OCR_LAMBDA_URL`, `OCR_LAMBDA_REGION`, Lambda timeout, and Textract/S3 temp bucket permissions.
- If paid AI parsing fails but basic extraction works, confirm `GEMINI_API_KEY` and Gemini logs/circuit breaker state.
- If users see "could not find clear resume details", ask them to retry with a text-based PDF, clearer image, or LinkedIn profile PDF.

Resolution:

- Fix queue/Lambda/IAM settings, then retry with a known readable resume file.
- Keep `CV_IMPORT_LOCAL_WORKER_DISABLED=true` in production when the SQS worker is active.
- Increase OCR/CV import timeouts only after confirming the file is valid and worker memory/timeouts are sufficient.
- Do not expose raw OCR, parser, or AI provider errors to end users; keep user-facing messages clear and actionable.

## PayHere Payments Not Activating

Symptoms:

- User paid but plan did not upgrade.
- Checkout transaction stays pending.
- IPN endpoint logs signature or merchant errors.
- PayHere shows "Unauthorized payment request" before card entry.
- PayHere card screen shows a decline such as "Unknown card".

Diagnosis:

- Check logs for `POST /api/payhere/ipn`.
- Search logs for `payment.payhere_ipn_failed`, `payment.payhere_ipn_signature_failed`, `payment.payhere_ipn_amount_mismatch`, or `payment.payhere_ipn_unprocessed_status`.
- Confirm PayHere can reach the deployed public URL.
- Confirm `PAYHERE_MERCHANT_ID` and `PAYHERE_MERCHANT_SECRET`.
- Confirm `PAYHERE_NOTIFY_URL` points to `/api/payhere/ipn`.
- Confirm sandbox checkouts use sandbox merchant credentials, sandbox checkout URL, and PayHere sandbox test cards. Sandbox rejects normal live cards.
- Confirm live checkouts use live merchant credentials and the live checkout URL.
- Confirm the checkout payload amount is a rounded LKR amount in PayHere's decimal format, for example `3749.00`.

Resolution:

- Manually correct affected users from admin if payment is verified.
- Fix merchant credentials or notify URL.
- Review failed/pending transactions in admin billing.
- Keep a reconciliation note for later cleanup.
- For "Unknown card", test with a PayHere-supported card or PayHere sandbox test card before changing app code.
- For duplicate cancel/back toasts, confirm the checkout URL is cleaned after handling `payment=cancel`.

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
- Confirm `LEMON_SQUEEZY_PAYG_VARIANT_ID`, `LEMON_SQUEEZY_MONTHLY_VARIANT_ID`, and `LEMON_SQUEEZY_QUARTERLY_VARIANT_ID` are all set.
- Confirm the checkout was started from the same environment users return to. Localhost tests need `FRONTEND_URL=http://localhost:3000`; production tests need the production domain.
- If the user used an app coupon, confirm the same discount code exists and is active in Lemon Squeezy with matching value and eligible variants. Otherwise Lemon Squeezy can charge the full variant price while the app expects a discounted amount.

Resolution:

- Fix env values or webhook URL, then resend the webhook from Lemon Squeezy.
- Review the checkout session/payment transaction in admin billing.
- Manually correct affected users only after verifying the payment in Lemon Squeezy.
- Keep a reconciliation note with the Lemon Squeezy order/payment ID.

## Admin Panel Inaccessible

Symptoms:

- Admin receives 403/404 from admin API calls.
- A public user sees the branded React 404 page for an unknown route.
- Admin pages do not load, but public site works.

Diagnosis:

- Confirm the user is logged in.
- Confirm the user's role and permissions.
- Check `SUPER_ADMIN_EMAILS` for bootstrap access.
- Check `ADMIN_ALLOWED_IPS` in production.
- Confirm the user's current public IP.
- Confirm the app is resolving real client IPs through the host/proxy. Render should work with Express `trust proxy`; the allowlist must contain the public client IP, not an internal container IP.
- Remember that `/admin` page serving and `/api/admin/*` data access are separate. The React page can load, while admin API calls can still return 403 if the IP allowlist is missing or does not include the caller.

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
- Confirm the GitHub Actions `MongoDB Daily Backup` workflow is passing and that S3 receives new objects under `s3://mongodb-database-backup1/mongodb/daily/`.
- Search logs for `mongodb.connection_failed` after deploys or environment changes.
- Take a manual snapshot before risky data operations.
- Review failed PayHere transactions.
- Reconcile Admin Dashboard and Billing revenue by currency. Older payment rows with missing `currency` should be inferred by provider: PayHere as LKR and Lemon Squeezy as USD.
- Review featured coupons for active dates, max redemptions, and monthly/quarterly scope.
- Review failed email/PDF logs.
- Validate templates before release.
- Export audit logs externally if longer retention is required.
- Rotate secrets on a planned schedule.
- Keep a rollback target for both the main app and PDF Lambda.

## Database Backup And Restore

Daily MongoDB archives are uploaded by GitHub Actions to `s3://mongodb-database-backup1/mongodb/daily/`. For setup, verification, and restore commands, use [Backup And Restore](BACKUP_RESTORE.md).

Before a production restore:

1. Take a fresh current backup.
2. Enable maintenance mode or otherwise stop writes.
3. Restore the selected archive to a staging or temporary database first.
4. Verify users, CV documents, templates, payments, coupons, and settings.
5. Restore production only during a maintenance window.
