# Admin Panel Guide

The NexCV admin panel is the protected operations area for platform owners and support/admin staff. It provides user, template, billing, support, settings, role, and audit management without direct database access.

## Access And Security

- Admins must be authenticated.
- Initial owner access comes from `SUPER_ADMIN_EMAILS`.
- Role and permission checks are enforced through `requireAdminPermission(...)`.
- Production admin access can be hidden from untrusted networks with `ADMIN_ALLOWED_IPS`.
- Important state changes should create admin audit log entries.

Local development usually leaves `ADMIN_ALLOWED_IPS` empty. In production, set it to trusted public IPv4/IPv6 addresses only.

## Core Modules

### Overview

The overview shows operational summaries such as user counts, CV activity, payment health, and service readiness. The backing API is `GET /api/admin/summary`.

### Users

Admins can:

- Search and inspect users.
- View user plan/account state.
- Update user plans for support or manual correction.
- Change roles when the acting admin has the required permission.

Relevant APIs:

- `GET /api/admin/users`
- `GET /api/admin/users/:id`
- `PATCH /api/admin/users/:id/plan`
- `PATCH /api/admin/users/:id/role`

### Templates

Admins can manage template records and publication state.

- List managed templates.
- Create and update template metadata/content.
- Publish templates when they are ready for users.
- Archive templates that should no longer appear publicly.

Relevant APIs:

- `GET /api/admin/templates`
- `POST /api/admin/templates`
- `PATCH /api/admin/templates/:key`
- `POST /api/admin/templates/:key/publish`
- `POST /api/admin/templates/:key/archive`

For local authoring rules, see [Template Authoring Guide](template-authoring-guide.md).

### Billing And Coupons

Admins can:

- View/update plan configuration.
- Create/update coupons.
- Review payment transactions.
- Support users after PayHere/IPN failures.

Relevant APIs:

- `GET /api/admin/billing/config`
- `PATCH /api/admin/billing/plans/:plan`
- `POST /api/admin/billing/coupons`
- `PATCH /api/admin/billing/coupons/:code`
- `GET /api/admin/payments`

### Support

Admins can view support tickets, update ticket status, and send replies.

Relevant APIs:

- `GET /api/admin/support/tickets`
- `PATCH /api/admin/support/tickets/:id`
- `POST /api/admin/support/tickets/:id/reply`

### Settings

Settings cover launch and runtime controls, including:

- Maintenance mode.
- Public app settings.
- Default/template settings.
- Runtime environment display.
- Service readiness indicators for MongoDB, S3, PayHere, Gemini, email, and session configuration.
- Test-email delivery.

Relevant APIs:

- `GET /api/admin/settings`
- `PATCH /api/admin/settings`
- `POST /api/admin/settings/test-email`

### Audit Logs

Audit logs provide a history of sensitive admin activity. Keep in mind that database-retained audit logs are not a long-term compliance archive by themselves. Export them externally if launch/compliance requirements need longer retention.

Relevant API:

- `GET /api/admin/audit-logs`

## Operational Checklist

Before production launch:

- Configure `SUPER_ADMIN_EMAILS`.
- Configure `SESSION_SECRET`.
- Decide whether `ADMIN_ALLOWED_IPS` is required.
- Verify role permissions with a non-owner admin account.
- Test billing updates and coupon creation in sandbox.
- Test template publish/archive flow with one non-critical template.
- Test email delivery through the admin test-email endpoint.
- Confirm audit logs are written for sensitive actions.
