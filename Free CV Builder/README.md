# NexCV App

This folder contains the main NexCV application: a React/Vite frontend, an Express/TypeScript API, MongoDB models, admin tooling, and AWS Lambda/SQS worker sources for PDF export, CV import, OCR, and email.

## Quick Start

```bash
npm install
npm run dev:all
```

Default local URLs:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3002`

Create `.env` in this folder before running backend features that need MongoDB, sessions, Gemini, PayHere, S3, Lambda workers, SQS queues, or email. The root [README](../README.md) has a short example, [Environment Variables](docs/ENVIRONMENT.md) has the complete reference, and [AWS Services](docs/AWS_SERVICES.md) has the full AWS setup.

## Common Commands

```bash
npm run dev:all
npm run lint
npm run test:run
npm run build
npm run launch:check
npm run validate:templates
npm run build:pdf-lambda
npm run build:pdf-worker-lambda
npm run build:cv-import-worker-lambda
npm run build:ocr-lambda
npm run build:email-worker-lambda
```

## Documentation

- [Docs index](docs/README.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API Docs](docs/API_DOCS.md)
- [Environment Variables](docs/ENVIRONMENT.md)
- [Deployment](docs/DEPLOYMENT.md)
- [AWS Services](docs/AWS_SERVICES.md)
- [Template Authoring Guide](docs/template-authoring-guide.md)
