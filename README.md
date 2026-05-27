# NexCV - AI CV Builder

NexCV is a full-stack CV builder for creating, saving, previewing, and exporting professional resumes. The project combines a React/Vite frontend, an Express/TypeScript API, MongoDB persistence, AI-assisted writing through Gemini, PayHere billing, S3-backed custom templates, and a separate Lambda-ready PDF renderer.

Current release focus: production hardening, admin operations, template reliability, payment/PDF readiness, and launch preparation.

## Features

### CV Builder
- Guest-first editing flow with live preview.
- Authenticated dashboard for saved CV documents.
- Built-in and admin-managed templates with free/premium metadata.
- Profile image crop, position, zoom, and template-specific rendering.
- AI import, summary generation, and text refinement with Gemini.
- PDF export with quota and plan checks.

### Templates
- Built-in templates in the frontend bundle.
- Admin-managed HTML/CSS templates stored in S3.
- Local template authoring flow under `Admin Templates/`.
- Template validation and release-map scripts.
- S3/local fallback rendering for preview and PDF generation.

### Admin Platform
- Protected admin dashboard for users, templates, billing, coupons, support, settings, roles, and audit logs.
- Role-based permission checks using `requireAdminPermission`.
- `SUPER_ADMIN_EMAILS` bootstrap list for initial owners.
- Optional production admin IP allowlist through `ADMIN_ALLOWED_IPS`.
- Maintenance mode and service-readiness checks.
- Admin audit logs for sensitive state changes.

### Security And Operations
- Express session cookies, Helmet, CORS controls, request-size limits, and route-level rate limiters.
- Email verification, password reset, Google OAuth, and local email/password auth.
- PayHere checkout and IPN verification helpers.
- PDF rendering via Lambda when configured, with local Puppeteer fallback.

## Documentation

Main documentation lives in [Free CV Builder/docs](Free%20CV%20Builder/docs/README.md).

- [Architecture](Free%20CV%20Builder/docs/ARCHITECTURE.md)
- [API Docs](Free%20CV%20Builder/docs/API_DOCS.md)
- [Admin Panel](Free%20CV%20Builder/docs/ADMIN_PANEL.md)
- [Deployment](Free%20CV%20Builder/docs/DEPLOYMENT.md)
- [Operations Runbook](Free%20CV%20Builder/docs/OPERATIONS_RUNBOOK.md)
- [PDF Rendering](Free%20CV%20Builder/docs/PDF_RENDERING.md)
- [Template System](Free%20CV%20Builder/docs/TEMPLATES.md)
- [Template Authoring Guide](Free%20CV%20Builder/docs/template-authoring-guide.md)
- [Contributing](Free%20CV%20Builder/docs/CONTRIBUTING.md)
- [Roadmap](Free%20CV%20Builder/docs/ROADMAP.md)

## Repository Layout

```text
AI-CV-Builder/
  README.md
  render.yaml
  docker-compose.yml
  Admin Templates/             # Local source folders for admin templates
  sample templates/            # Static preview samples
  Free CV Builder/             # Main React + Express application
    src/                       # React frontend
    routes/                    # Express route modules
    middlewares/               # Session, auth, security, and rate limits
    server-models/             # Mongoose models
    server-utils/              # Shared backend helpers
    services/                  # Email, PDF, and S3 services
    scripts/                   # Build, validation, and template release scripts
    docs/                      # Project documentation
    tests/                     # Vitest server and frontend tests
    lambda-pdf/                # AWS Lambda PDF renderer
```

## Local Development

```bash
cd "Free CV Builder"
npm install
npm run dev:all
```

Default local URLs:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3002`

## Environment Variables

Create `.env` inside `Free CV Builder/`. Do not commit real secrets.

```env
NODE_ENV=development
PORT=3002
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGIN=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/nexcv
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
SESSION_SECRET=replace_with_a_long_random_secret
SESSION_COOKIE_NAME=nexcv.sid
SESSION_STORE_MAX_POOL_SIZE=5

GEMINI_API_KEY=your_gemini_key

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

EMAIL_USER=your_smtp_user
EMAIL_PASS=your_smtp_password
EMAIL_FROM="NexCV <support@nexcv.com>"
ADMIN_NOTIFICATION_EMAIL=admin@example.com

PAYHERE_MERCHANT_ID=your_payhere_merchant_id
PAYHERE_MERCHANT_SECRET=your_payhere_secret
PAYHERE_NOTIFY_URL=https://your-api.example.com/api/payhere/ipn

S3_TEMPLATE_BUCKET_NAME=your_template_bucket
S3_TEMPLATE_PREFIX=templates
AWS_REGION=eu-north-1

PDF_LAMBDA_URL=https://your-lambda-url.example.com
PDF_LAMBDA_TIMEOUT_MS=45000

SENTRY_DSN=https://your-backend-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
VITE_SENTRY_DSN=https://your-frontend-dsn@sentry.io/project-id
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1

SUPER_ADMIN_EMAILS=owner@example.com
ADMIN_ALLOWED_IPS=
```

Optional quota variables:
- `DAILY_CV_CREATION_LIMIT`
- `DAILY_UNVERIFIED_DOWNLOAD_LIMIT`
- `PAYG_DAILY_DOWNLOAD_LIMIT`
- `MONTHLY_DAILY_DOWNLOAD_LIMIT`

## Useful Commands

Run commands from `Free CV Builder/`.

```bash
npm run dev:all                     # Run frontend and backend together
npm run dev                         # Run Vite frontend only
npm run server                      # Run Express backend only
npm run lint                        # TypeScript compile check
npm run test:run                    # Run Vitest once
npm run build                       # Production frontend build
npm run launch:check                # Run launch readiness checks
npm run build:pdf-lambda            # Build Lambda ZIP
npm run validate:templates          # Validate Admin Templates folders
npm run templates:release:dry-run   # Validate and dry-run template release
npm run templates:release           # Validate and release admin templates
```

## Production Notes

- Set `SESSION_SECRET` to a long random value before production.
- Set `ALLOWED_ORIGIN` to the public frontend origin in production.
- Set `ADMIN_ALLOWED_IPS` to trusted public IPs if admin IP hiding is required.
- Use a MongoDB replica set or managed cluster; PayHere IPN processing uses MongoDB transactions.
- Use `/api/ready` for autoscaling/load-balancer readiness checks and `/api/health` for monitoring.
- Configure `PAYHERE_NOTIFY_URL` to the deployed `/api/payhere/ipn` endpoint.
- Use `PDF_LAMBDA_URL` for production PDF generation; local Puppeteer fallback is intended for development and backup.
