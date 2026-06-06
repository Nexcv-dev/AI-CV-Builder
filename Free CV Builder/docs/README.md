# NexCV Documentation

This folder is the main documentation hub for the NexCV application.

## Start Here

- [Architecture](ARCHITECTURE.md) - application structure, request flow, storage, and integrations.
- [API Docs](API_DOCS.md) - current Express endpoints grouped by route module.
- [Billing And Plans](BILLING.md) - paid plan keys, PayHere/Lemon Squeezy flows, coupons, and revenue reporting.
- [Deployment](DEPLOYMENT.md) - production setup, Render notes, Lambda deployment, and environment variables.
- [Environment Variables](ENVIRONMENT.md) - complete env/secrets reference for the app, workers, scripts, and GitHub Actions.
- [AWS Services](AWS_SERVICES.md) - S3, Lambda, SQS queues, workers, environment variables, and IAM policies.
- [Backup And Restore](BACKUP_RESTORE.md) - daily MongoDB S3 backups, GitHub Actions secrets, and restore steps.
- [Operations Runbook](OPERATIONS_RUNBOOK.md) - incident response and routine maintenance.
- [Launch Checklist](LAUNCH_CHECKLIST.md) - pre-launch verification across code, payments, PDF, admin, and recovery.
- [QA Test Cases](QA_TEST_CASES.md) - manual QA matrix for auth, builder, import, templates, PDF, billing, admin, and security.
- [Codebase Cleanup Plan](CODEBASE_CLEANUP_PLAN.md) - phased structure cleanup plan for scaling after launch.

## Product And Admin

- [Admin Panel](ADMIN_PANEL.md) - admin access, permissions, and core modules.
- [Template System](TEMPLATES.md) - built-in/custom template behavior and release flow.
- [Template Authoring Guide](template-authoring-guide.md) - how to write and validate admin templates.
- [PDF Rendering](PDF_RENDERING.md) - Lambda/local PDF rendering pipeline.

## Project Process

- [Contributing](CONTRIBUTING.md)
- [Roadmap](ROADMAP.md)

## Legal Drafts

The legal pages are working drafts and should be reviewed before production use:

- [Privacy Policy Draft](PRIVACY_POLICY_DRAFT.md)
- [Terms of Service Draft](TERMS_OF_SERVICE_DRAFT.md)
