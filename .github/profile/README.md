<div align="center">
  <a href="https://free-ai-cv-builder.onrender.com">
    <img
      src="https://raw.githubusercontent.com/Nexcv-dev/AI-CV-Builder/main/apps/web/public/brand/logo-text.png"
      alt="NexCV"
      width="260"
    />
  </a>

  <h1>Build a better CV. Create your next opportunity.</h1>

  <p>
    NexCV builds accessible, AI-assisted tools that help people create,
    improve, manage, and export professional CVs.
  </p>

  <p>
    <a href="https://free-ai-cv-builder.onrender.com"><strong>Try NexCV</strong></a>
    |
    <a href="https://github.com/Nexcv-dev/AI-CV-Builder">Source Code</a>
    |
    <a href="https://github.com/Nexcv-dev/AI-CV-Builder/tree/main/apps/docs">Documentation</a>
    |
    <a href="https://github.com/Nexcv-dev/AI-CV-Builder/issues">Issues</a>
  </p>
</div>

## What We Build

Our flagship project is [NexCV](https://github.com/Nexcv-dev/AI-CV-Builder), a full-stack CV platform designed to make professional resume creation faster and more approachable.

- Live CV editing with professional templates
- AI-assisted writing, summaries, and text refinement
- CV import from PDF, image, and LinkedIn PDF files
- Secure accounts and saved CV management
- PDF export and shareable public CV links
- Free, premium, and admin-managed templates
- Billing, quotas, support tools, and an operations dashboard

## Our Technology

NexCV is built as a TypeScript monorepo using:

`React` | `Vite` | `Express` | `MongoDB` | `Turborepo` | `pnpm` | `AWS Lambda` | `SQS` | `S3` | `Google Gemini`

Long-running work such as CV import, OCR, email delivery, and PDF rendering is handled by queue-backed workers so the main application stays responsive.

## Get Involved

We welcome thoughtful bug reports, documentation improvements, feature ideas, and code contributions.

1. Read the [contribution guide](https://github.com/Nexcv-dev/AI-CV-Builder/blob/main/apps/docs/CONTRIBUTING.md).
2. Browse the [open issues](https://github.com/Nexcv-dev/AI-CV-Builder/issues).
3. Fork the repository and create a focused branch.
4. Run the checks before opening a pull request:

```bash
corepack pnpm install
corepack pnpm lint
corepack pnpm test:run
corepack pnpm build
```

## Explore

- [Architecture](https://github.com/Nexcv-dev/AI-CV-Builder/blob/main/apps/docs/ARCHITECTURE.md)
- [API documentation](https://github.com/Nexcv-dev/AI-CV-Builder/blob/main/apps/docs/API_DOCS.md)
- [Template authoring guide](https://github.com/Nexcv-dev/AI-CV-Builder/blob/main/apps/docs/template-authoring-guide.md)
- [Project roadmap](https://github.com/Nexcv-dev/AI-CV-Builder/blob/main/apps/docs/ROADMAP.md)

## Contact

For project questions and support, email [support@nexcv.com](mailto:support@nexcv.com) or start a conversation through [GitHub Issues](https://github.com/Nexcv-dev/AI-CV-Builder/issues).

<div align="center">
  <sub>Made with care by the NexCV team.</sub>
</div>
