# Billing And Plans

This document summarizes the current NexCV billing behavior across public pricing, checkout, provider webhooks, coupons, and admin reporting.

## Paid Plans

| Key | Public name | Duration | Local provider | Global provider |
| --- | --- | --- | --- | --- |
| `payg` | Single CV Pass | 7 days | PayHere, LKR | Lemon Squeezy, USD |
| `monthly` | Monthly Pro | 30 days | PayHere, LKR | Lemon Squeezy, USD |
| `quarterly` | Pro Quarterly | 90 days | PayHere, LKR | Lemon Squeezy, USD |

The app normalizes older saved display labels when rendering public/admin copy:

- `Pay As You Go` becomes `Single CV Pass`.
- `Monthly` becomes `Monthly Pro`.

Quarterly uses the same daily download limit as monthly unless the quota model is changed.

## Public Pricing And Checkout

Public plan cards are loaded from `/api/billing/plans`. Checkout quote requests use `/api/billing/quote` and include the selected plan, country, and optional coupon code.

Billing market resolution controls the provider:

- Sri Lanka/local market uses PayHere with LKR.
- Global market uses Lemon Squeezy with USD.

The dashboard should not show upgrade prompts until the current user plan has loaded. Paid users should not briefly see the free-plan upgrade card during dashboard loading.

## PayHere Local Checkout

PayHere checkout is created with `POST /api/billing/payhere-checkout`.

Important behavior:

- Final LKR amounts are rounded to a whole rupee after promotions/coupons.
- The gateway payload still uses PayHere's decimal amount format, for example `3749.00`.
- The rounded amount is stored in `CheckoutSession.finalAmountCents` so PayHere IPN amount validation matches the gateway charge.
- Browser cancel/back handling calls `/api/billing/checkout/:orderId/cancel`, removes the pending checkout state from session storage, resets loading state, and shows one cancellation toast.

Common PayHere outcomes:

- `Unauthorized payment request` usually points to merchant/hash/amount format or sandbox/live credential mismatch.
- `Payment Declined: Unknown card` is normally a PayHere/card issuer or sandbox test-card issue, not an app-side amount/hash issue.

## Lemon Squeezy Global Checkout

Lemon Squeezy checkout is created with `POST /api/billing/lemonsqueezy-checkout`.

Required env vars:

```env
LEMON_SQUEEZY_API_KEY=your_lemon_squeezy_api_key
LEMON_SQUEEZY_STORE_ID=123456
LEMON_SQUEEZY_PAYG_VARIANT_ID=123456
LEMON_SQUEEZY_MONTHLY_VARIANT_ID=123456
LEMON_SQUEEZY_QUARTERLY_VARIANT_ID=123456
LEMON_SQUEEZY_WEBHOOK_SECRET=your_webhook_secret
```

The variant IDs must be numeric IDs from the same Lemon Squeezy test or live store.

Coupon note: the app can quote and store a coupon code, but Lemon Squeezy must charge the matching discounted amount for webhook validation to pass. If a coupon should work for global/USD checkout, create the same discount code in Lemon Squeezy with the same discount value and eligible variants.

## Coupons And Promotions

Admin promotions can be configured per plan price. Admin coupons support:

- Percent or fixed discounts.
- Active/paused state.
- Plan scope.
- Start and expiry dates.
- Optional max redemption count.

The `Monthly + Quarterly` admin target maps to `monthly` and `quarterly`. It is intended for campaigns such as a 25-redemption launch coupon.

Public featured coupons are exposed through `/api/billing/featured-coupon` and shown on the landing and pricing pages only when active, applicable to monthly/quarterly, and under the redemption limit. Checkout can receive a coupon from `?coupon=CODE`.

## Admin Revenue Reporting

Admin Dashboard and Billing split revenue by currency:

- PayHere/local payments are LKR.
- Lemon Squeezy/global payments are USD.

For older payment rows with missing `currency`, the provider is used as fallback:

- `lemonsqueezy` means USD.
- `payhere` or missing provider means LKR.

Daily revenue rows should show both values, for example `LKR 0 / USD 9.99`, so USD revenue is not accidentally added into the LKR total.

## Related Docs

- [API Docs](API_DOCS.md)
- [Admin Panel Guide](ADMIN_PANEL.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Operations Runbook](OPERATIONS_RUNBOOK.md)
- [Launch Checklist](LAUNCH_CHECKLIST.md)
