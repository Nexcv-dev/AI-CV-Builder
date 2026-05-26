# NexCV App

This folder contains the main NexCV application: a React/Vite frontend, an Express/TypeScript API, MongoDB models, admin tooling, and the Lambda PDF renderer source.

## Quick Start

```bash
npm install
npm run dev:all
```

Default local URLs:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3002`

Create `.env` in this folder before running backend features that need MongoDB, sessions, Gemini, PayHere, S3, PDF Lambda, or email. The root [README](../README.md) has the full variable list.

## Common Commands

```bash
npm run dev:all
npm run lint
npm run test:run
npm run build
npm run launch:check
npm run validate:templates
npm run build:pdf-lambda
```

## Documentation

- [Docs index](docs/README.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API Docs](docs/API_DOCS.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Template Authoring Guide](docs/template-authoring-guide.md)
