# NexCV API Docs

Local backend URL: `http://localhost:3002`

Most authenticated routes use `httpOnly` session cookies. Frontend calls should include credentials.

```ts
fetch(url, { credentials: 'include' })
```

## Health And Public Routes

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Basic API health response. |
| `GET` | `/api/public/app-settings` | Public app settings such as maintenance/public flags. |
| `GET` | `/api/templates/config` | Published template configuration and metadata. |
| `GET` | `/api/templates/:key/html` | Renderable HTML for a template key. |
| `GET` | `/api/templates/:key/thumbnail` | Template thumbnail asset. |
| `POST` | `/api/support/tickets` | Create a public support ticket. |
| `POST` | `/api/contact` | Submit the public contact form. |

## Auth Routes

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/signup` | Create an email/password account. |
| `POST` | `/api/auth/login` | Start a session for an email/password user. |
| `GET` | `/api/auth/google` | Start Google OAuth. |
| `GET` | `/api/auth/google/callback` | Complete Google OAuth and establish a session. |
| `GET` | `/api/auth/current-user` | Return current session user, role, permissions, and plan state. |
| `PATCH` | `/api/auth/profile` | Update the authenticated user's profile. |
| `PATCH` | `/api/auth/password` | Change the authenticated user's password. |
| `DELETE` | `/api/auth/account` | Delete the authenticated user's account. |
| `POST` | `/api/auth/forgot-password` | Request a password reset email. |
| `POST` | `/api/auth/validate-reset-token` | Check whether a password reset token is valid. |
| `POST` | `/api/auth/reset-password` | Reset a password using a valid token. |
| `POST` | `/api/auth/verify-email` | Verify an authenticated user's email. |
| `POST` | `/api/auth/resend-verification` | Send a new verification email. |
| `POST` | `/api/auth/logout` | Destroy the current session. |

## CV And AI Routes

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/documents` | List the current user's saved CV documents. |
| `GET` | `/api/documents/:id` | Load one saved CV document. |
| `POST` | `/api/documents` | Create a CV document. |
| `PUT` | `/api/documents/:id` | Update a CV document. |
| `DELETE` | `/api/documents/:id` | Delete a CV document. |
| `POST` | `/api/parse-cv` | Parse uploaded/pasted CV text with Gemini. |
| `POST` | `/api/generate-summary` | Generate a professional summary with Gemini. |
| `POST` | `/api/refine-text` | Refine user-provided CV text with Gemini. |
| `POST` | `/api/generate-pdf` | Generate a PDF for the selected CV/template. |

PDF generation requires authentication and is subject to quota, plan, and premium-template checks.

## Billing And Payment Routes

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/billing/plans` | Return public billing plan configuration. |
| `POST` | `/api/billing/quote` | Quote a plan/coupon combination. |
| `POST` | `/api/billing/payhere-checkout` | Create PayHere checkout data for the authenticated user. |
| `POST` | `/api/billing/activate` | Activate a plan after a verified flow. |
| `POST` | `/api/payhere/ipn` | PayHere Instant Payment Notification webhook. |

Do not wrap `/api/payhere/ipn` in session authentication. It must be reachable by PayHere and verified by signature/merchant data.

## Admin Routes

Admin routes require an authenticated admin user and the relevant permission. In production, `ADMIN_ALLOWED_IPS` can block access before route handling.

### Admin Summary

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/admin/summary` | `dashboard.read` | Dashboard totals and health summaries. |

### Users And Roles

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/admin/users` | `users.read` | Paginated user list. |
| `GET` | `/api/admin/users/:id` | `users.read` | User details. |
| `PATCH` | `/api/admin/users/:id/plan` | `users.plan.update` | Update a user's plan. |
| `GET` | `/api/admin/roles` | `roles.read` | Available role/permission metadata. |
| `PATCH` | `/api/admin/users/:id/role` | `users.role.update` | Update a user's role. |

### Templates

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/admin/templates` | `templates.read` | List managed templates. |
| `POST` | `/api/admin/templates` | `templates.write` | Create a template record/upload payload. |
| `PATCH` | `/api/admin/templates/:key` | `templates.write` | Update template metadata/content. |
| `POST` | `/api/admin/templates/:key/publish` | `templates.publish` | Publish a template. |
| `POST` | `/api/admin/templates/:key/archive` | `templates.publish` | Archive a template. |

### Billing

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/admin/billing/config` | `billing.read` | Billing plans and coupon config. |
| `PATCH` | `/api/admin/billing/plans/:plan` | `billing.write` | Update plan settings. |
| `POST` | `/api/admin/billing/coupons` | `billing.write` | Create a coupon. |
| `PATCH` | `/api/admin/billing/coupons/:code` | `billing.write` | Update a coupon. |
| `GET` | `/api/admin/payments` | `billing.read` | List payment transactions. |

### Support, Settings, And Audit

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/admin/support/tickets` | `support.read` | List support tickets. |
| `PATCH` | `/api/admin/support/tickets/:id` | `support.write` | Update ticket state. |
| `POST` | `/api/admin/support/tickets/:id/reply` | `support.write` | Send/store support replies. |
| `GET` | `/api/admin/settings` | `settings.read` | Runtime, launch, and service settings. |
| `PATCH` | `/api/admin/settings` | `settings.write` | Update app settings. |
| `POST` | `/api/admin/settings/test-email` | `email.write` | Send a test email. |
| `GET` | `/api/admin/audit-logs` | `audit.read` | Paginated audit log history. |

## Headers And Body Notes

- Use `Content-Type: application/json` for JSON endpoints.
- PayHere IPN uses `application/x-www-form-urlencoded`.
- Template/admin endpoints may accept larger JSON bodies than normal user routes.
- Auth is session-cookie based; avoid putting tokens in local storage.
