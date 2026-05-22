# NexCV App

This folder contains the main NexCV application: a React 18 frontend, Express backend, MongoDB models, admin platform, PDF rendering services, email delivery, PayHere payment integration, and S3-backed CV template pipeline.

## Stack

- React 18, TypeScript, Vite, Tailwind CSS
- Node.js, Express, TypeScript
- MongoDB and Mongoose
- Passport local auth and Google OAuth
- PayHere payments
- Nodemailer email delivery
- AWS S3 templates
- AWS Lambda PDF renderer
- Vitest and Testing Library

## Main Areas

```text
Free CV Builder/
  src/
    components/               # Shared frontend components
    pages/                    # App pages and admin dashboard
    pages/admin/              # Admin modules
    utils/                    # Frontend helpers and API wrapper
  routes/                     # Express route modules
  services/                   # Email, S3, PDF, and business services
  middlewares/                # Security, auth, session, rate limits
  server-models/              # MongoDB models
  tests/                      # Server and integration tests
  lambda-pdf/                 # Lambda PDF renderer package
  scripts/                    # Build helpers
  server.ts                   # Express entry point
```

## Admin Features

- Users and plan management
- Template CMS
- Billing plans and coupons
- Promotions
- Support tickets
- Admin roles and permissions
- Global settings
- Maintenance mode
- Email service readiness and test email
- Audit log
- Admin IP allowlist via `ADMIN_ALLOWED_IPS`

## Environment Setup

Create `.env` in this folder.

```env
PORT=3002
ALLOWED_ORIGIN=http://localhost:3000
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret

GEMINI_API_KEY=your_gemini_key

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

EMAIL_USER=your_smtp_user
EMAIL_PASS=your_smtp_password
EMAIL_FROM="NexCV <support@nexcv.com>"
ADMIN_NOTIFICATION_EMAIL=admin@nexcv.com

PAYHERE_MERCHANT_ID=your_payhere_merchant_id
PAYHERE_MERCHANT_SECRET=your_payhere_secret

S3_TEMPLATE_BUCKET_NAME=your_template_bucket
S3_TEMPLATE_PREFIX=templates
S3_TEMPLATE_CACHE_TTL_MS=300000

PDF_LAMBDA_URL=your_lambda_pdf_url
PDF_LAMBDA_TIMEOUT_MS=45000

SUPER_ADMIN_EMAILS=owner@example.com
ADMIN_ALLOWED_IPS=
```

### Admin IP Allowlist

`ADMIN_ALLOWED_IPS` accepts comma-separated IP addresses.

```env
ADMIN_ALLOWED_IPS=203.0.113.10,198.51.100.25
```

When enabled:
- `/api/admin/*` is blocked for non-allowed IPs.
- Production `/admin` pages are hidden from non-allowed IPs.
- Local development loopback access remains available.

## Commands

```bash
npm install
npm run dev:all
npm run lint
npm run test:run
npm run build
npm run build:pdf-lambda
```

## Local URLs

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3002`
- Admin: `http://localhost:3000/admin`

## Current Operational Notes

- Global app settings are stored in MongoDB through `AppSetting`.
- Maintenance mode should be managed from Admin Settings.
- Email secrets stay in environment variables; admin UI only shows readiness state and supports sending a test email.
- CMS-created templates should include thumbnail metadata and profile image placeholders when profile photo support is needed.
- Free templates show a Free badge; premium templates show a crown badge.

## Recommended Next Work

1. Build CMS pages for landing page content, FAQs, legal copy, and announcement banners.
2. Add email template settings for branded transactional emails.
3. Add draft, preview, publish, and rollback states for custom templates.
4. Add admin analytics for user growth, downloads, payments, and template usage.
5. Optimize frontend chunks with lazy routes and admin module code splitting.
6. Complete final launch QA across admin IP rules, maintenance mode, emails, payments, and PDF rendering.

