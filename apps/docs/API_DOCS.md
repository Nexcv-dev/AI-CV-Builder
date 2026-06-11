# NexCV API Docs

Local backend URL: `http://localhost:3002`

Most authenticated routes use `httpOnly` session cookies. Frontend calls should include credentials.

```ts
fetch(url, { credentials: 'include' })
```

## Health And Public Routes

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | API health and launch-readiness checks for core service configuration. |
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
| `POST` | `/api/parse-cv` | Legacy/direct CV parsing endpoint. Prefer queued import jobs for normal UI imports. |
| `POST` | `/api/cv-import-jobs` | Queue an authenticated CV import job from PDF/JPG/PNG/LinkedIn PDF base64 data. |
| `GET` | `/api/cv-import-jobs/:id` | Poll the current user's CV import job until it is ready, failed, or expired. |
| `POST` | `/api/generate-summary` | Generate a professional summary with Gemini. |
| `POST` | `/api/refine-text` | Refine user-provided CV text with Gemini. |
| `POST` | `/api/pdf-jobs` | Queue an authenticated PDF generation job. |
| `GET` | `/api/pdf-jobs/:id` | Poll the current user's PDF job status. |
| `GET` | `/api/pdf-jobs/:id/download` | Download a ready queued PDF. |
| `POST` | `/api/generate-pdf` | Generate a PDF for the selected CV/template. |
| `GET` | `/api/html-pdf-quota` | Return the current guest/user quota for custom HTML-to-PDF exports. |
| `POST` | `/api/html-pdf-jobs` | Queue a custom HTML-to-PDF export from sanitized self-contained HTML, optional override CSS, filename, and page size. |
| `GET` | `/api/html-pdf-jobs/:id` | Poll a custom HTML-to-PDF job until it is ready, failed, or expired. |
| `GET` | `/api/html-pdf-jobs/:id/download` | Download a ready custom HTML-to-PDF export. |

PDF generation requires authentication and is subject to quota, plan, and premium-template checks.

Custom HTML-to-PDF exports can run for guests or signed-in users according to HTML PDF quota. The uploaded HTML must pass the inline/offline CV rules before the server queues a job. The `css` field is reserved for safe export overrides, such as the preview toolbar's font and header color overrides; the local renderer and `apps/workers/pdf-worker` both inject that CSS into the final PDF document.

CV import also requires authentication. The frontend opens the login modal before starting file reading or queueing for guests. Failed imports should return user-safe messages such as "We could not find clear resume details in this file" rather than raw OCR, parser, or AI provider details.

## Billing And Payment Routes

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/billing/plans` | Return public billing plan configuration. |
| `POST` | `/api/billing/quote` | Quote a plan/coupon combination. |
| `GET` | `/api/billing/featured-coupon` | Return the current public coupon for monthly/quarterly pricing banners when one is active and under its redemption limit. |
| `POST` | `/api/billing/payhere-checkout` | Create PayHere checkout data for the authenticated user. |
| `POST` | `/api/billing/lemonsqueezy-checkout` | Create a Lemon Squeezy global/USD checkout URL for the authenticated user. |
| `GET` | `/api/billing/checkout/:orderId/status` | Poll checkout status after returning from a payment provider. |
| `POST` | `/api/billing/checkout/:orderId/cancel` | Mark a pending checkout as cancelled after a provider cancel/back action. |
| `POST` | `/api/billing/activate` | Deprecated, admin-restricted, and disabled; normal users receive `403`, admins receive `410`. Paid plans are activated only by verified PayHere IPN processing. |
| `POST` | `/api/payhere/ipn` | PayHere Instant Payment Notification webhook. |
| `POST` | `/api/lemonsqueezy/webhook` | Lemon Squeezy order webhook for global/USD plan activation. |

Do not wrap `/api/payhere/ipn` in session authentication. It must be reachable by PayHere and verified by signature/merchant data.
Do not wrap `/api/lemonsqueezy/webhook` in session authentication. It must be reachable by Lemon Squeezy and verified by webhook signature.
Do not activate a paid plan from browser-submitted plan, order, or transaction data.

Billing plan keys are `payg`, `monthly`, and `quarterly`. Public labels are Single CV Pass, Monthly Pro, and Pro Quarterly. PayHere handles local LKR checkout, and Lemon Squeezy handles global USD checkout. Local PayHere quote amounts are rounded to whole rupees before the gateway payload is signed, while USD quotes keep cents. Coupon quotes are validated against plan scope, active dates, and maximum redemption count.

## Admin Routes

Admin API routes require an authenticated admin user, the relevant permission, and `ADMIN_ALLOWED_IPS` configured with the caller's source IP. The `/admin` React route may still be served so public users see the branded app 404 instead of a plain server 404; admin data remains behind `/api/admin/*`.

### Admin Summary

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/admin/summary` | `dashboard.read` | Dashboard totals, health summaries, and LKR/USD revenue overview. |

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
| `GET` | `/api/admin/billing/config` | `billing.read` | Billing plans, promotions, coupons, and provider config. |
| `PATCH` | `/api/admin/billing/plans/:plan` | `billing.write` | Update plan settings. |
| `POST` | `/api/admin/billing/coupons` | `billing.write` | Create a coupon. |
| `PATCH` | `/api/admin/billing/coupons/:code` | `billing.write` | Update a coupon. |
| `PATCH` | `/api/admin/billing/review/:type/:id` | `billing.write` | Resolve a payment or checkout review item with an admin note. |
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
