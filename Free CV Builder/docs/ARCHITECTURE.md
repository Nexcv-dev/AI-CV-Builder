# NexCV Architecture

NexCV is a monolithic full-stack web application with a separate PDF-rendering worker. The main app serves the React frontend, exposes the Express API, manages sessions and MongoDB persistence, and delegates expensive PDF rendering to AWS Lambda when `PDF_LAMBDA_URL` is configured.

## Runtime Shape

```text
Browser
  -> React/Vite app
  -> Express API (server.ts)
  -> MongoDB via Mongoose
  -> External services:
       Gemini API
       PayHere
       SMTP/Gmail/Resend
       S3 templates
       PDF Lambda
```

## Frontend

The frontend lives in `src/`.

- `src/app/` contains route composition, guards, loading UI, and shell layout.
- `src/pages/` contains public pages, dashboard pages, checkout, profile, and admin screens.
- `src/components/` contains the CV form, preview, shared layout, auth modals, and form sections.
- `src/hooks/` contains template and public content hooks.
- `src/utils/templateData.ts` and `src/utils/templateRenderer.ts` prepare data for built-in and custom templates.

The app uses local React state and focused hooks rather than a global state library. Admin and dashboard modules are split into smaller sections and hooks to keep the initial bundle lighter.

## Backend

The backend entrypoint is `server.ts`. Route modules live under `routes/`.

- `routes/auth.ts` - signup, login, logout, Google OAuth, email verification, password reset, profile updates, and account deletion.
- `routes/cv.ts` - saved CV documents, AI parsing/generation/refinement, and PDF export.
- `routes/payment.ts` - billing plans, PayHere quote/checkout/IPN, and plan activation.
- `routes/public.ts` - health, public settings, templates, template HTML/thumbnail, support tickets, and contact form.
- `routes/admin/*` - admin dashboard, users, templates, support, billing, settings, roles, and audit logs.

Shared backend support is split into:

- `middlewares/` for sessions, Passport auth, security headers/CORS, and rate limiters.
- `server-models/` for Mongoose schemas and quota utilities.
- `server-utils/` for admin IP allowlisting, PayHere helpers, template admin helpers, validation, and user-auth helpers.
- `services/` for email, PDF, and S3 access.

## Data Model

MongoDB stores:

- Users, roles, email verification, password reset, and OAuth identity data.
- CV documents owned by authenticated users.
- Billing plans, checkout sessions, payment transactions, coupons, and quota state.
- Template settings and metadata.
- Support tickets.
- App settings and CMS-like public content.
- Admin audit logs with retention behavior.

## Template Architecture

NexCV supports two template sources:

- Built-in templates shipped with the frontend and public assets.
- Admin-managed templates stored as HTML/CSS/thumbnail files, normally backed by S3.

Template data is normalized before rendering so the same CV model can be used by built-in previews, custom template previews, and PDF export. Template validation scripts protect against missing files, unsafe markup, missing print rules, and common authoring mistakes.

## PDF Architecture

PDF export is initiated by `POST /api/generate-pdf`.

1. The route checks authentication, document/template access, plan state, and quotas.
2. The app prepares CV data, selected template metadata, and watermark state.
3. `services/pdfService.ts` tries the configured Lambda renderer when `PDF_LAMBDA_URL` exists.
4. If Lambda is unavailable or not configured, the service can use a local Puppeteer-based renderer.
5. The API returns the PDF buffer to the browser.

The Lambda implementation lives in `lambda-pdf/` and can fetch template assets from S3 using `S3_TEMPLATE_BUCKET_NAME` and `S3_TEMPLATE_PREFIX`.

## Security Posture

- Sessions use `express-session` with `httpOnly` cookies.
- Production requires a strong `SESSION_SECRET`.
- Helmet and CORS are configured in `middlewares/security.ts`.
- Authentication-sensitive routes use rate limiters.
- Admin routes are protected by role/permission checks.
- `ADMIN_ALLOWED_IPS` can hide admin routes from untrusted IPs in production.
- PayHere IPN verification is centralized in `server-utils/payHere.ts`.
- Admin state changes should be audit logged.

## Deployment Model

The main app can run on Render or another Node host:

- `npm run build` builds the Vite frontend.
- `npm start` runs the Express server through `tsx server.ts`.
- `render.yaml` points Render at the `Free CV Builder` root.

The PDF Lambda is built separately with `npm run build:pdf-lambda` and deployed to AWS Lambda or a compatible function URL/API Gateway setup.
