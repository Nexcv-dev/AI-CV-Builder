# NexCV - AI CV Builder

NexCV is a full-stack AI-powered CV builder for creating, managing, previewing, and exporting professional resumes. The app supports guest-first CV creation, authenticated cloud saving, premium templates, AI-assisted writing, PayHere payments, PDF generation, and an expanding admin platform for operations.

Current release focus: production hardening, admin operations, CMS-driven templates, and launch readiness.

## Key Features

### CV Builder
- Guest-first builder flow with live preview.
- Authenticated dashboard for saved CVs.
- Template selector with free and premium badges.
- Profile image crop and adjustment support.
- PDF download flow with free-user quotas and premium unlocks.
- AI CV parsing and summary generation through Gemini.

### Templates
- Built-in curated CV templates.
- Admin-managed custom templates.
- S3-backed HTML/CSS template rendering pipeline.
- Dashboard thumbnails use live template metadata.
- Custom templates support profile image positioning values.

### Admin Platform
- Modular admin platform with dashboard, analytics, users, templates, billing, promotions, CMS, notifications, support, settings, roles, and audit sections.
- Role-based admin permissions.
- Admin audit logs for sensitive changes with 30-day database retention.
- Analytics dashboard for signups, CV saves, downloads, checkout conversion, and template usage.
- CMS management for public landing content, FAQs, pricing copy, legal pages, and announcements.
- Email notification management for transactional template copy and delivery testing.
- CMS-style template management for adding, updating, publishing, and archiving templates.
- Settings panel for launch controls, maintenance mode, quotas, support email, PayHere mode, default template, runtime readiness, and service checks.

### Security And Operations
- Admin IP allowlist support through `ADMIN_ALLOWED_IPS`.
- Production admin route hiding for non-allowed IPs.
- Maintenance mode for public traffic while keeping admin access available.
- Rate limiting, Helmet, CORS controls, input sanitization, and secure session configuration.
- Email service readiness checks and admin test-email endpoint.


## Documentation

We have comprehensive documentation covering different aspects of the platform:

**Core Architecture & Development:**
- [Architecture Overview](docs/ARCHITECTURE.md)
- [API Documentation](docs/API_DOCS.md)
- [Contributing Guidelines](docs/CONTRIBUTING.md)

**System Deep Dives:**
- [Template System](docs/TEMPLATES.md)
- [PDF Rendering Pipeline](docs/PDF_RENDERING.md)

**Operations & Admin:**
- [Admin Panel Guide](docs/ADMIN_PANEL.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Operations Runbook](docs/OPERATIONS_RUNBOOK.md)
- [Project Roadmap](docs/ROADMAP.md)

## Repository Layout

```text
AI-CV-Builder/
  README.md
  Free CV Builder/            # Main React + Express application
    services/                 # Email, PDF, S3, and business services
    middlewares/              # Auth, session, security, rate limits
    server-models/            # Mongoose models
    tests/                    # Vitest server/frontend tests
    lambda-pdf/               # AWS Lambda PDF renderer
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

## Important Environment Variables

Create `.env` inside `Free CV Builder/`.

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

PDF_LAMBDA_URL=your_lambda_pdf_url

SUPER_ADMIN_EMAILS=owner@example.com
ADMIN_ALLOWED_IPS=203.0.113.10
```

Notes:
- Leave `ADMIN_ALLOWED_IPS` empty in local development unless you are testing IP restrictions.
- In production, set `ADMIN_ALLOWED_IPS` to your trusted public IPv4/IPv6 addresses.
- Do not commit real secrets.

## Useful Commands

```bash
npm run dev:all        # Run frontend and backend together
npm run dev            # Run Vite frontend only
npm run server         # Run Express backend only
npm run lint           # TypeScript compile check
npm run test:run       # Run Vitest once
npm run build          # Production frontend build
npm run build:pdf-lambda
```
