# NexCV App

This folder contains the main NexCV application: a React/Vite frontend, an Express/TypeScript API, MongoDB models, admin tooling, and AWS Lambda/SQS worker sources for PDF export, CV import, OCR, and email.

## Quick Start

```bash
corepack pnpm install
corepack pnpm dev
```

Default local URLs:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3002`

Create `.env` in this folder before running backend features that need MongoDB, sessions, Gemini, PayHere, S3, Lambda workers, SQS queues, or email. The root [README](../README.md) has a short example, [Environment Variables](docs/ENVIRONMENT.md) has the complete reference, and [AWS Services](docs/AWS_SERVICES.md) has the full AWS setup.

## Common Commands

```bash
corepack pnpm dev
corepack pnpm lint
corepack pnpm test:run
corepack pnpm build
corepack pnpm --filter @nexcv/main launch:check
corepack pnpm --filter @nexcv/main validate:templates
corepack pnpm --filter @nexcv/main build:pdf-lambda
corepack pnpm build:pdf-worker-lambda
corepack pnpm build:cv-import-worker-lambda
corepack pnpm build:ocr-lambda
corepack pnpm build:email-worker-lambda
```

## Documentation

- [Docs index](docs/README.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API Docs](docs/API_DOCS.md)
- [Environment Variables](docs/ENVIRONMENT.md)
- [Deployment](docs/DEPLOYMENT.md)
- [AWS Services](docs/AWS_SERVICES.md)
- [Template Authoring Guide](docs/template-authoring-guide.md)
