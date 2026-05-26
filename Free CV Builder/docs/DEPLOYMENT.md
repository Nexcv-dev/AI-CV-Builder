# Deployment Guide

This guide covers deploying the main NexCV app and the separate PDF Lambda renderer.

## Infrastructure

Required services:

- Node.js host for the Express/Vite app, such as Render, Heroku, EC2, or a container platform.
- MongoDB, preferably MongoDB Atlas in production.
- S3 bucket for managed template HTML/CSS/thumbnail files.
- AWS Lambda or compatible function host for PDF generation.
- PayHere merchant account for paid plans.
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
SESSION_SECRET=long_random_secret
SUPER_ADMIN_EMAILS=owner@example.com
```

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

S3_TEMPLATE_BUCKET_NAME=your_template_bucket
S3_TEMPLATE_PREFIX=templates
AWS_REGION=eu-north-1

PDF_LAMBDA_URL=https://your-lambda-url.example
PDF_LAMBDA_TIMEOUT_MS=45000

ADMIN_ALLOWED_IPS=203.0.113.10,2001:db8::10
```

Optional quota values:

```env
DAILY_CV_CREATION_LIMIT=10
DAILY_UNVERIFIED_DOWNLOAD_LIMIT=1
PAYG_DAILY_DOWNLOAD_LIMIT=10
MONTHLY_DAILY_DOWNLOAD_LIMIT=50
```

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
- Sign up or log in.
- Verify email delivery or test reset email.
- Create and save a CV.
- Generate a PDF with a free built-in template.
- Test PayHere sandbox checkout/IPN before live mode.
- Open admin as a super admin.
- Verify admin summary, settings, users, templates, billing, support, and audit pages.
- Toggle maintenance mode in a controlled window and turn it back off.

## Rollback

- Keep the previous deploy artifact available in the hosting provider.
- Keep the previous Lambda ZIP available.
- Avoid destructive database migrations without a MongoDB snapshot.
- If PayHere or PDF export breaks, use admin notices/support workflow while rolling back.
