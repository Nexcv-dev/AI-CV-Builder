# API Error Handling

NexCV uses stable API error codes for application behavior and user-safe messages for display. Frontend code must not decide behavior by matching message text.

## Response Contract

JSON API failures use this shape:

```json
{
  "error": "User-safe message.",
  "code": "STABLE_ERROR_CODE",
  "errorId": "development-only-log-reference"
}
```

Some responses also include structured context such as `quota`, `reason`, `upgradeRequired`, `missing`, or validation details.

- `error` is safe to show to the user. Its wording may change.
- `code` is the stable machine-readable contract.
- `errorId` may be returned outside production to correlate the response with server logs.
- HTTP status still describes the transport-level result, but frontend behavior should prefer `code`.

External webhook endpoints may use provider-required plain-text responses instead of this JSON contract.

## Source Of Truth

Error codes are defined in:

```text
packages/shared/src/apiErrors.ts
```

Both the API and web app import from `@nexcv/shared/apiErrors`. Do not duplicate code strings in route or component files.

The registry covers common errors and domain-specific groups for:

- authentication, credentials, OTP delivery/verification, and password reset;
- request integrity, CSRF, rate limits, and timeouts;
- AI generation and CV import;
- CV document CRUD, including `DOCUMENT_NOT_FOUND`;
- profile image validation, storage availability, and upload failures;
- PDF and HTML-to-PDF jobs;
- billing, coupons, checkout providers, and checkout sessions.

## Backend Usage

Use `sendError` for caught operational failures:

```ts
return sendError(
  res,
  500,
  'Could not start checkout.',
  error,
  API_ERROR_CODES.PAYMENT_SERVICE_FAILED,
);
```

Return validation or expected business failures with an explicit code:

```ts
return res.status(400).json({
  error: 'Coupon is not valid for this plan.',
  code: API_ERROR_CODES.COUPON_INVALID,
});
```

Rules:

1. Keep provider, database, parser, OCR, and stack-trace details in logs.
2. Return a user-safe message and stable code.
3. Reuse a code when the frontend response is the same; do not create a code for every sentence.
4. Add a domain-specific code when the frontend must take a distinct action.
5. Use `VALIDATION_FAILED` for ordinary invalid input that needs no special behavior.
6. Add focused tests that assert the code, not only the message or HTTP status.

## Frontend Usage

Use `apiFetch` for normal JSON requests:

```ts
const data = await apiFetch<ResponseType>('/api/example', {
  method: 'POST',
  body: JSON.stringify(payload),
});
```

Use `csrfFetch` plus `readApiResponse` when the success body is not normal JSON, such as PDF downloads:

```ts
const response = await csrfFetch('/api/generate-pdf', options);
if (!response.ok) {
  await readApiResponse(response, 'Could not generate PDF.');
}
```

`apps/web/src/utils/api.ts` provides:

- `ApiError`, including `status`, `code`, and response `data`;
- `normalizeApiError` and `getUserErrorMessage`;
- `hasApiErrorCode` and domain predicates;
- consistent network and cancellation classification;
- CSRF token attachment and one retry for a stale token.

Behavior must be code-based:

```ts
if (hasApiErrorCode(error, API_ERROR_CODES.COUPON_INVALID)) {
  setQuote(null);
}
```

Do not do this:

```ts
if (error.message.includes('coupon')) {
  // Fragile: wording and localization can change.
}
```

## Network, Server, And Cancellation

- A browser fetch failure is normalized to an `ApiError` with `data.networkError` and the message asking the user to check their internet connection.
- A server response keeps its server-provided user-safe message and error code.
- An intentional `AbortController` cancellation is classified separately and should normally be silent.
- Closing an AI/import flow or navigating away must not show a failure toast for the cancelled request.

## Compatibility

Code-first predicates may keep a narrow HTTP-status fallback for older deployed API responses. A fallback is only for rollout compatibility:

```ts
return hasApiErrorCode(error, API_ERROR_CODES.AUTH_REQUIRED)
  || (error instanceof ApiError && !error.code && error.status === 401);
```

Do not add new message-text fallbacks. Remove status fallbacks after all supported API deployments return the shared code.

## Endpoint Checklist

When adding or changing an endpoint:

1. Choose an existing shared error code or add one to `packages/shared/src/apiErrors.ts`.
2. Return `{ error, code }` for expected JSON failures.
3. Pass an explicit code to `sendError` for domain-specific caught failures.
4. Consume the route with `apiFetch`, or `csrfFetch` plus `readApiResponse`.
5. Use code predicates for UI actions and `getUserErrorMessage` for display.
6. Keep expected cancellation silent.
7. Test the backend response code and the frontend behavior predicate.
8. Run affected typechecks, tests, and the web production build.
