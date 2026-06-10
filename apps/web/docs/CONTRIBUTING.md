# Contributing

Thanks for contributing to NexCV. This project combines a React/Vite frontend, an Express/TypeScript backend, MongoDB persistence, S3-backed templates, PayHere/Lemon Squeezy billing, and AWS Lambda/SQS workers for PDF export, CV import, OCR, and email.

Use this guide for local development, pull requests, reviews, and release-safe changes.

## Prerequisites

Required:

- Node.js 20 or newer. Node 24 is used in CI.
- pnpm through Corepack.
- Git.
- MongoDB local instance or MongoDB Atlas URI.

Optional, depending on the feature:

- Gemini API key for AI import, summaries, and text refinement.
- AWS credentials and S3 buckets for templates, PDF output, OCR temp files, and backups.
- AWS SQS/Lambda access for CV import, PDF, OCR, and email workers.
- PayHere sandbox/live merchant account for local LKR billing.
- Lemon Squeezy test/live store for global USD billing.
- SMTP, Gmail OAuth, or Resend credentials for email delivery.
- Sentry DSNs for observability work.

## Local Setup

Install dependencies from the repository root:

```bash
corepack enable
corepack pnpm install
```

Create `.env` in `apps/web/`. Do not commit real secrets.

Start both frontend and backend:

```bash
corepack pnpm dev:all
```

Default local URLs:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3002`

For environment variables, start with the root [README](../../../README.md), then use [Environment Variables](ENVIRONMENT.md) as the complete reference.

## Common Commands

Run these from the repository root.

```bash
corepack pnpm dev:all
corepack pnpm lint
corepack pnpm test:run
corepack pnpm build
corepack pnpm launch:check
```

Template work:

```bash
corepack pnpm validate:template-map
corepack pnpm validate:templates
corepack pnpm templates:release:dry-run
```

Worker/Lambda builds:

```bash
corepack pnpm build:pdf-lambda
corepack pnpm build:pdf-worker-lambda
corepack pnpm build:cv-import-worker-lambda
corepack pnpm build:ocr-lambda
corepack pnpm build:email-worker-lambda
```

Use `corepack pnpm launch:check` before release-oriented changes. It runs lint, tests, build, and template validation.

## Repository Map

Important paths:

- `packages/shared/` - shared domain constants, queue payload helpers, and admin role contracts.
- `packages/templates/` - built-in template metadata and access helpers.
- `packages/api-contracts/` - shared API response contracts used by frontend and backend.
- `apps/web/` - React app, public assets, docs, and template scripts.
- `apps/web/src/` - React pages, components, hooks, stores, and frontend utilities.
- `apps/web/src/features/admin/` - admin panel shell, sections, hooks, permissions, types, and shared admin UI.
- `apps/api/` - Express API, middleware, routes, services, models, backend utilities, and API tests.
- `apps/workers/` - Lambda source for PDF, PDF worker, CV import worker, OCR, and email worker.
- `apps/web/scripts/` - build, validation, template release, and metadata scripts.
- `apps/web/tests/` and `apps/web/src/**/*.test.*` - frontend Vitest tests.
- `apps/web/docs/` - operational, deployment, API, and feature documentation.

## Development Principles

- Keep changes scoped to the feature or fix.
- Prefer existing route/service/model/component patterns.
- Avoid unrelated refactors in bug-fix PRs.
- Keep generated output, local logs, real secrets, and screenshots with sensitive data out of commits.
- Update docs whenever routes, env vars, deployment steps, admin workflows, templates, billing, queues, or user-facing behavior changes.
- Add or update tests for behavior changes, especially around billing, auth, quotas, imports, PDFs, and admin permissions.
- Use friendly user-facing errors. Do not expose raw provider, parser, OCR, database, or stack-trace details to users.

## Frontend Guidelines

- Follow existing React/Vite patterns and component structure.
- Use `csrfFetch`/`apiFetch` helpers for API calls instead of ad hoc fetch wrappers.
- Keep guest/auth gates before expensive client work when possible. For example, CV import should open login before reading files or queueing jobs.
- Keep mobile layouts compact and verify text does not overflow buttons/cards/modals.
- Prefer existing styling conventions, Tailwind utilities, and lucide icons.
- Avoid adding large global state when local state or existing Zustand store state is enough.

Frontend changes should usually run:

```bash
corepack pnpm lint
corepack pnpm test:run
corepack pnpm build
```

## Backend Guidelines

- Put route-specific HTTP behavior in `apps/api/routes/` and reusable logic in `apps/api/services/` or `apps/api/server-utils/`.
- Validate request body shape and size before expensive work.
- Require auth, plan, quota, and admin permission checks before creating jobs or mutating data.
- Use existing logging helpers for operationally important failures.
- Keep errors safe for users and detailed for logs.
- Roll back quota reservations when job creation or processing fails.
- Clear uploaded base64 data from import/PDF jobs after completion or failure.

Backend changes should usually run:

```bash
corepack pnpm lint
corepack pnpm test:run
```

## CV Import, OCR, And PDF Jobs

CV import and PDF generation can run through queues:

- CV import: `POST /api/cv-import-jobs`, worker in `apps/workers/cv-import-worker/`, OCR in `apps/workers/ocr-lambda/`.
- PDF jobs: `POST /api/pdf-jobs`, worker in `apps/workers/pdf-worker/`, renderer in `apps/workers/pdf-lambda/`.

Production should use SQS workers for heavy work. If `CV_IMPORT_QUEUE_URL` is configured, keep `CV_IMPORT_LOCAL_WORKER_DISABLED=true` so OCR/import parsing does not run inside the main app host.

When touching these flows, verify:

- Guest import does not start before login.
- Authenticated import works with a readable PDF or LinkedIn PDF.
- Unclear/empty import files show a friendly retry message.
- Jobs move through expected statuses and clear large payloads.
- Queue worker env vars, regions, IAM permissions, and DLQs are documented.

## Billing Guidelines

Billing changes are high-risk. Read [Billing And Plans](BILLING.md), [Deployment](DEPLOYMENT.md), and [Operations Runbook](OPERATIONS_RUNBOOK.md) first.

When touching PayHere or Lemon Squeezy:

- Do not activate paid plans from browser-submitted payment data.
- Keep webhook/IPN signature checks strict.
- Preserve idempotency for duplicate IPNs/webhooks.
- Keep PayHere LKR and Lemon Squeezy USD amounts/currencies separate.
- Make sure coupon validation matches provider behavior.
- Update admin/reconciliation docs if transaction status behavior changes.

## Template Guidelines

For template work, read:

- [Template System](TEMPLATES.md)
- [Template Authoring Guide](template-authoring-guide.md)
- [PDF Rendering](PDF_RENDERING.md)

Before releasing template changes:

```bash
corepack pnpm validate:template-map
corepack pnpm validate:templates
corepack pnpm templates:release:dry-run
```

For PDF-affecting template changes, also test preview and PDF output on desktop and mobile widths.

## Environment And Secrets

- Never commit `.env` values, access keys, API keys, customer data, or private screenshots.
- Document new variables in [Environment Variables](ENVIRONMENT.md).
- Add deployment notes in [Deployment](DEPLOYMENT.md) when an env var is required for production.
- Add AWS/IAM notes in [AWS Services](AWS_SERVICES.md) when permissions, queues, buckets, or Lambdas change.
- Keep database backup credentials separate from app/template S3 credentials. The backup workflow expects `BACKUP_AWS_ACCESS_KEY_ID`, `BACKUP_AWS_SECRET_ACCESS_KEY`, and `BACKUP_AWS_REGION`.

## Documentation Guidelines

Update docs in the same PR when behavior changes. Useful targets:

- [API Docs](API_DOCS.md) for route changes.
- [Environment Variables](ENVIRONMENT.md) for env/secrets changes.
- [Deployment](DEPLOYMENT.md) for production setup changes.
- [AWS Services](AWS_SERVICES.md) for queues, IAM, Lambda, and S3 changes.
- [Operations Runbook](OPERATIONS_RUNBOOK.md) for failure modes and support steps.
- [Launch Checklist](LAUNCH_CHECKLIST.md) for launch-critical smoke tests.
- [Admin Panel](ADMIN_PANEL.md) for admin workflow changes.

Check markdown links after larger doc edits:

```powershell
$files = @('README.md','apps\\web\\README.md') + (Get-ChildItem 'apps\\web\\docs' -Filter *.md | ForEach-Object { $_.FullName })
$missing = @()
foreach ($file in $files) {
  $dir = Split-Path -Parent $file
  if (-not $dir) { $dir = (Get-Location).Path }
  $content = Get-Content -Raw -Path $file
  $matches = [regex]::Matches($content, '\[[^\]]+\]\(([^)#]+\.md)\)')
  foreach ($m in $matches) {
    $target = [System.Uri]::UnescapeDataString($m.Groups[1].Value)
    if ($target -match '^[a-z]+://') { continue }
    $path = Join-Path $dir $target
    if (-not (Test-Path $path)) { $missing += "$file -> $target" }
  }
}
if ($missing.Count) { $missing; exit 1 } else { 'markdown links ok' }
```

## Branches, Commits, And PRs

Branch names should be clear and scoped, for example:

```text
feature/cv-import-queue-status
fix/payhere-ipn-signature
docs/environment-reference
chore/template-validation
```

Use focused commits. Conventional-style prefixes are helpful:

- `feat:` for new behavior.
- `fix:` for bug fixes.
- `docs:` for documentation.
- `test:` for tests.
- `chore:` for maintenance.
- `refactor:` for structure changes without intended behavior change.

Pull request descriptions should include:

- What changed.
- Why it changed.
- How it was tested.
- Screenshots or short screen recordings for UI changes.
- Any new environment variables, migrations, IAM permissions, queues, buckets, or deployment steps.
- Any known risks or follow-up work.

## Review Checklist

Before requesting review:

- The change is scoped and understandable.
- `corepack pnpm lint` passes, or the reason it cannot run is documented.
- Relevant tests pass.
- `corepack pnpm build` passes for frontend or cross-cutting changes.
- Template validation passes for template changes.
- Worker ZIP builds pass for Lambda changes.
- Docs are updated for changed behavior, env vars, routes, or operations.
- User-facing messages are friendly and actionable.
- No real secrets or customer data are included.

## Bug Reports

Include:

- Steps to reproduce.
- Expected and actual behavior.
- Browser/OS/device for frontend issues.
- Relevant route/API response and status code.
- Relevant server, worker, CloudWatch, or Sentry log excerpt.
- Whether it affects local, staging, production, or all environments.
- Whether it involves guest users, authenticated users, admin users, free users, or paid users.

## Security Reports

Do not open public issues with exploitable details, secrets, private keys, customer data, or payment data. Share the details privately with the project owner/admin team, rotate exposed credentials immediately, and document only the safe remediation summary in public changelogs or PRs.
