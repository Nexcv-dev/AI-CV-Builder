# Deployment Guide

This guide covers deploying the main NexCV app and the separate PDF Lambda renderer.

## Infrastructure

Required services:

- Node.js host for the Express/Vite app, such as Render, Heroku, EC2, or a container platform.
- MongoDB, preferably MongoDB Atlas in production.
- S3 bucket for managed template HTML/CSS/thumbnail files.
- AWS Lambda or compatible function host for PDF generation.
- PayHere merchant account for paid plans.
- Lemon Squeezy account for global USD paid plans.
- SMTP, Gmail OAuth, or Resend for transactional email.

## Main App Deployment

The repository includes `render.yaml` for Render:

```yaml
rootDir: "Free CV Builder"
buildCommand: npm install && npm run build
startCommand: npm start
```

Manual deployment flow:

```bash
cd "Free CV Builder"
npm ci
npm run build
npm start
```

`npm start` runs `tsx server.ts`. Make sure the host installs production dependencies that include `tsx`, or change the start command to a compiled JavaScript entrypoint if you introduce a separate backend build step.

## Required Environment Variables

Minimum production values:

```env
NODE_ENV=production
PORT=3002
ALLOWED_ORIGIN=https://your-frontend-domain.example
FRONTEND_URL=https://your-frontend-domain.example
MONGODB_URI=your_mongodb_connection_string
MONGODB_MAX_POOL_SIZE=20
MONGODB_MIN_POOL_SIZE=2
MONGODB_MAX_IDLE_TIME_MS=30000
MONGODB_SERVER_SELECTION_TIMEOUT_MS=10000
MONGODB_SLOW_QUERY_MS=500
APP_SETTINGS_CACHE_TTL_MS=30000
TEMPLATE_CONFIG_CACHE_TTL_MS=300000
TEMPLATE_HTML_CACHE_TTL_MS=600000
BILLING_PLANS_CACHE_TTL_MS=60000
API_REQUEST_TIMEOUT_MS=30000
AI_REQUEST_TIMEOUT_MS=45000
GEMINI_REQUEST_TIMEOUT_MS=35000
PDF_REQUEST_TIMEOUT_MS=75000
CV_IMPORT_REQUEST_TIMEOUT_MS=90000
SERVER_REQUEST_TIMEOUT_MS=95000
SERVER_HEADERS_TIMEOUT_MS=15000
SERVER_KEEP_ALIVE_TIMEOUT_MS=65000
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_COOLDOWN_MS=60000
CIRCUIT_BREAKER_HALF_OPEN_MAX_CALLS=1
GEMINI_CIRCUIT_FAILURE_THRESHOLD=5
PDF_LAMBDA_CIRCUIT_FAILURE_THRESHOLD=3
SESSION_SECRET=long_random_secret
SESSION_COOKIE_NAME=nexcv.sid
SESSION_STORE_MAX_POOL_SIZE=5
SUPER_ADMIN_EMAILS=owner@example.com
```

`MONGODB_URI` must point to a MongoDB replica set or managed cluster. PayHere IPN and Lemon Squeezy webhook processing use MongoDB transactions for atomic payment, checkout, coupon, and user updates.

Feature-specific values:

```env
GEMINI_API_KEY=your_gemini_key

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

EMAIL_USER=your_smtp_user
EMAIL_PASS=your_smtp_password
EMAIL_FROM="NexCV <support@example.com>"
ADMIN_NOTIFICATION_EMAIL=admin@example.com
RESEND_API_KEY=optional_resend_key
GMAIL_REFRESH_TOKEN=optional_gmail_refresh_token

PAYHERE_MERCHANT_ID=your_payhere_merchant_id
PAYHERE_MERCHANT_SECRET=your_payhere_secret
PAYHERE_NOTIFY_URL=https://your-api-domain.example/api/payhere/ipn
PAYHERE_CHECKOUT_URL=https://www.payhere.lk/pay/checkout

LEMON_SQUEEZY_API_KEY=your_lemon_squeezy_api_key
LEMON_SQUEEZY_STORE_ID=123456
LEMON_SQUEEZY_PAYG_VARIANT_ID=123456
LEMON_SQUEEZY_MONTHLY_VARIANT_ID=123456
LEMON_SQUEEZY_QUARTERLY_VARIANT_ID=123456
LEMON_SQUEEZY_WEBHOOK_SECRET=your_webhook_secret

S3_TEMPLATE_BUCKET_NAME=your_template_bucket
S3_TEMPLATE_PREFIX=templates
AWS_REGION=eu-north-1

PDF_LAMBDA_URL=https://your-lambda-url.example
PDF_LAMBDA_TIMEOUT_MS=45000

OCR_LAMBDA_FUNCTION_NAME=OCR_data_Extract
OCR_LAMBDA_REGION=eu-central-1
OCR_LAMBDA_TIMEOUT_MS=45000
OCR_DOCUMENT_BUCKET=your-temp-ocr-bucket

SENTRY_DSN=https://your-backend-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
VITE_SENTRY_DSN=https://your-frontend-dsn@sentry.io/project-id
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1

ADMIN_ALLOWED_IPS=203.0.113.10,2001:db8::10
```

`FRONTEND_URL` controls checkout and password-reset redirects. For localhost payment testing, set it to `http://localhost:3000`; for production testing, start checkout from the production domain and keep `FRONTEND_URL` on that production domain.

`LEMON_SQUEEZY_STORE_ID` and variant IDs must be numeric IDs from the same Lemon Squeezy test or live store. Do not use the store domain as the store ID. The app expects three paid plan variants: Single CV Pass (`payg`), Monthly Pro (`monthly`), and Pro Quarterly (`quarterly`). Configure the Lemon Squeezy webhook URL as:

```text
https://your-domain.example/api/lemonsqueezy/webhook
```

Set the webhook signing secret in `LEMON_SQUEEZY_WEBHOOK_SECRET`. Global checkout activation depends on the webhook, not only the browser redirect.

If you use public app coupons for global/USD checkouts, create the same discount code in Lemon Squeezy with matching discount rules. The app can quote and store the coupon, but Lemon Squeezy must charge the discounted total for the webhook amount check to pass.

PayHere local/LKR checkout amounts are rounded to a whole rupee before sending to the gateway, then formatted with two decimals for PayHere signing, for example `3749.00`. Use matching live or sandbox merchant credentials and checkout URLs. Sandbox checkouts require PayHere sandbox test card numbers; live cards should be tested only against live credentials.

Transactional email supports both plain text and branded HTML generated with React Email. Resend is recommended for production; set a verified `EMAIL_FROM` domain before launch. SMTP fallback also sends the same HTML when configured.

Optional quota values:

```env
DAILY_CV_CREATION_LIMIT=10
DAILY_UNVERIFIED_DOWNLOAD_LIMIT=1
PAYG_DAILY_DOWNLOAD_LIMIT=10
MONTHLY_DAILY_DOWNLOAD_LIMIT=50
```

Quarterly plans currently use the monthly daily download limit.

## PDF Lambda Deployment

Build the Lambda artifact from the app folder:

```bash
cd "Free CV Builder"
npm run build:pdf-lambda
```

Deploy the generated ZIP from `lambda-pdf/dist/` to AWS Lambda.

Recommended Lambda settings:

- Runtime: Node.js 20.x
- Handler: `handler.handler`
- Architecture: x86_64
- Memory: 1024 MB minimum, 2048 MB for heavier templates
- Timeout: 30-60 seconds

Lambda environment variables:

```env
AWS_REGION=eu-north-1
S3_TEMPLATE_BUCKET_NAME=your_template_bucket
S3_TEMPLATE_PREFIX=templates
S3_TEMPLATE_CACHE_TTL_MS=300000
```

Expose the Lambda through a Function URL or API Gateway, then set the main app's `PDF_LAMBDA_URL` to that URL.

## OCR Lambda Deployment

Build the OCR Lambda artifact from the app folder:

```bash
npm run build:ocr-lambda
```

Deploy the generated ZIP from `lambda-ocr/dist/` to AWS Lambda as `OCR_data_Extract`.

Recommended Lambda settings:

- Runtime: Node.js 20.x
- Handler: `handler.handler`
- Memory: 512 MB or higher
- Timeout: 60 seconds or higher

Lambda environment variables:

```env
AWS_REGION=eu-north-1
OCR_DOCUMENT_BUCKET=your-temp-ocr-bucket
OCR_DOCUMENT_PREFIX=ocr-imports
OCR_TEXTRACT_TIMEOUT_MS=55000
OCR_TEXTRACT_MAX_PAGES=8
```

The OCR Lambda uploads each import file to S3 temporarily, runs AWS Textract, returns extracted line text, and deletes the S3 object. Keep the OCR bucket private, block public access, enable encryption, and add a short lifecycle cleanup rule.

## Template Deployment

Before releasing admin templates:

```bash
cd "Free CV Builder"
npm run validate:template-map
npm run validate:templates
npm run templates:release:dry-run
```

Release only after validation and preview checks pass:

```bash
npm run templates:release
```

## Production Smoke Test

Use the full [Launch Checklist](LAUNCH_CHECKLIST.md) for launch-day signoff. At minimum, after deployment:

After deployment:

- Open `/api/health`.
- Configure host/load-balancer readiness checks to use `/api/ready`.
- Sign up or log in.
- Verify email delivery or test reset email.
- Create and save a CV.
- Generate a PDF with a free built-in template.
- Test PayHere sandbox checkout/IPN before live mode.
- Test Lemon Squeezy test-mode checkout/webhook before live mode.
- Test all three paid plans: Single CV Pass, Monthly Pro, and Pro Quarterly.
- Test coupon application for monthly and quarterly plans, including max-redemption behavior.
- Open admin as a super admin.
- Verify admin summary, settings, users, templates, billing, support, and audit pages.
- Verify admin summary and billing show PayHere LKR revenue separately from Lemon Squeezy USD revenue.
- Toggle maintenance mode in a controlled window and turn it back off.

## Rollback

- Keep the previous deploy artifact available in the hosting provider.
- Keep the previous Lambda ZIP available.
- Avoid destructive database migrations without a MongoDB snapshot.
- If PayHere or PDF export breaks, use admin notices/support workflow while rolling back.
