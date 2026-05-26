# Contributing

Thanks for contributing to NexCV. This project is a React/Vite frontend with an Express/TypeScript backend, MongoDB models, S3-backed templates, PayHere billing, and a Lambda PDF renderer.

## Prerequisites

- Node.js 20 or newer recommended.
- npm.
- MongoDB local instance or Atlas URI.
- Git.

Optional, depending on the feature:

- AWS credentials/S3 bucket for template work.
- PayHere sandbox account for billing work.
- SMTP, Gmail OAuth, or Resend credentials for email work.
- Gemini API key for AI features.

## Local Setup

```bash
cd "Free CV Builder"
npm install
```

Create `.env` in `Free CV Builder/`. The root README contains the current environment variable list.

Start the app:

```bash
npm run dev:all
```

Default URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3002`

## Development Workflow

- Keep changes scoped to the feature or fix.
- Prefer existing route/service/model patterns.
- Avoid committing secrets, generated logs, or local build output.
- Update docs when routes, env vars, deployment steps, templates, or admin workflows change.
- Add or update tests for behavioral changes.

## Quality Checks

Run from `Free CV Builder/`:

```bash
npm run lint
npm run test:run
npm run build
```

Template changes should also run:

```bash
npm run validate:template-map
npm run validate:templates
```

PDF Lambda changes should run:

```bash
npm run build:pdf-lambda
```

## Branches And Pull Requests

- Branch from the current integration branch.
- Use clear branch names such as `feature/admin-template-preview` or `fix/payhere-ipn`.
- Keep pull requests focused.
- In the PR description, include:
  - What changed.
  - Why it changed.
  - How it was tested.
  - Any new environment variables or deployment steps.

## Bug Reports

Include:

- Steps to reproduce.
- Expected and actual behavior.
- Browser/OS if frontend-related.
- Relevant API response or server log excerpt.
- Whether the issue affects local, staging, production, or all environments.
