# NexCV Web App

This folder contains the NexCV React/Vite frontend, public assets, documentation, and template/admin build scripts. The Express API lives in `../api`, and Lambda/SQS workers live in `../workers`.

## Quick Start

From the repository root:

```bash
corepack pnpm install
corepack pnpm dev:all
```

Default local URLs:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3002`

To run only the frontend from this package:

```bash
corepack pnpm --filter @nexcv/web dev
```

Create `.env` in the repository root or in the package that needs it before running features that require MongoDB, sessions, Gemini, PayHere, S3, Lambda workers, SQS queues, or email. The root [README](../../README.md) has a short example, [Environment Variables](docs/ENVIRONMENT.md) has the complete reference, and [AWS Services](docs/AWS_SERVICES.md) has the full AWS setup.

## Common Commands

```bash
corepack pnpm dev:all
corepack pnpm lint
corepack pnpm test:run
corepack pnpm build
corepack pnpm launch:check
corepack pnpm validate:templates
corepack pnpm build:pdf-lambda
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
