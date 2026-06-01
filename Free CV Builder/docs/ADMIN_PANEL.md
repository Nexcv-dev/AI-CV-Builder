# Admin Panel Guide

The NexCV admin panel is the protected operations area for platform owners and support/admin staff. It provides user, template, billing, support, settings, role, and audit management without direct database access.

## Access And Security

- Admins must be authenticated.
- Initial owner access comes from `SUPER_ADMIN_EMAILS`.
- Role and permission checks are enforced through `requireAdminPermission(...)`.
- Production admin API access can be restricted to trusted networks with `ADMIN_ALLOWED_IPS`.
- Important state changes should create admin audit log entries.

Local development usually leaves `ADMIN_ALLOWED_IPS` empty only when admin API calls are not being exercised. In production, set it to trusted public IPv4/IPv6 addresses only. The `/admin` page itself is served by the React app so unknown public paths can show the branded React 404 page instead of plain server text; `/api/admin/*` still requires an authenticated admin, the relevant permission, and an allowed source IP.

## Core Modules

### Overview

The overview shows operational summaries such as user counts, CV activity, payment health, service readiness, and revenue split by currency. The backing API is `GET /api/admin/summary`.

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
- Support users after PayHere IPN or Lemon Squeezy webhook failures.
- Review LKR PayHere revenue and USD Lemon Squeezy revenue separately.

Supported paid plans are:

- `payg` - Single CV Pass, 7 days.
- `monthly` - Monthly Pro, 30 days.
- `quarterly` - Pro Quarterly, 90 days.

Old saved display labels such as `Pay As You Go` and `Monthly` are normalized to the current public labels when plan copy is rendered.

Promotions can be attached to plan prices, and coupons can be limited by plan and maximum redemptions. The `Monthly + Quarterly` coupon target maps to `monthly` and `quarterly`, which is used for first-user campaigns such as a 25-use launch coupon. Featured public coupons are exposed to the landing/pricing flows and can be deep-linked into checkout with `?coupon=CODE`.

PayHere local LKR checkouts round the final gateway amount to a whole rupee and send the value in PayHere's expected decimal format, for example `3749.00`. The rounded amount is also stored on the checkout session so IPN amount validation matches the gateway charge.

Lemon Squeezy global USD checkouts use Lemon Squeezy variant prices. If an app coupon is intended for global users, create the matching discount code in Lemon Squeezy as well and pass/apply the same code at checkout; otherwise the webhook amount check can reject a payment because Lemon Squeezy charged the undiscounted variant price.

Admin summary and billing views report revenue by actual or inferred currency. If an older payment record is missing `currency`, provider fallback is used: Lemon Squeezy is treated as USD and PayHere as LKR.

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
- Admin-editable email subject/body text. Transactional emails are delivered as branded React Email HTML with the plain text content preserved as fallback.

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
- Configure `ADMIN_ALLOWED_IPS` with trusted public admin IPs.
- Verify role permissions with a non-owner admin account.
- Test billing updates and coupon creation in sandbox.
- Test PayHere local-market checkout and Lemon Squeezy global-market checkout in sandbox/test mode.
- Test Single CV Pass, Monthly Pro, and Pro Quarterly plan activation.
- Test local featured coupons on both landing/pricing pages and checkout.
- Confirm admin revenue overview and billing report LKR and USD separately.
- Test template publish/archive flow with one non-critical template.
- Test email delivery through the admin test-email endpoint.
- Test password reset, OTP verification, payment receipt, and support reply emails after changing sender/domain settings.
- Confirm audit logs are written for sensitive actions.
