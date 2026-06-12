# Environment Variables

This reference lists the environment variables used by the main NexCV app, worker Lambdas, scripts, and GitHub Actions. Do not commit real secret values.

## Main App Core

| Variable | Required | Purpose |
| --- | --- | --- |
| `NODE_ENV` | Production | Use `production` on deployed app hosts. |
| `PORT` | Optional | Express port. Defaults to `3002`. |
| `FRONTEND_URL` | Production | Public frontend origin for redirects, OAuth callbacks, emails, and checkout returns. |
| `ALLOWED_ORIGIN` / `ALLOWED_ORIGINS` / `FRONTEND_ORIGIN` | Production | CORS and trusted browser origins. |
| `API_PUBLIC_URL` / `BACKEND_PUBLIC_URL` | Recommended | Public API origin used when building absolute URLs. |
| `PUBLIC_CV_BASE_URL` | Optional | Base origin used when returning public live CV share links. Falls back to `FRONTEND_URL`, then `ALLOWED_ORIGIN`. |
| `PUBLIC_CV_CACHE_BROWSER_SECONDS` | Optional | Browser cache seconds for `/cv/:shareSlug`. Defaults to `60`. |
| `PUBLIC_CV_CACHE_CDN_SECONDS` | Optional | CDN `s-maxage` seconds for `/cv/:shareSlug`. Defaults to `300`. |
| `PUBLIC_CV_DOWNLOAD_LIMIT_PER_HOUR` | Optional | Public shared CV PDF downloads allowed per IP per CV link per hour. Defaults to `5`. |
| `SESSION_SECRET` | Production | Long random session secret. Required in production. |
| `SESSION_COOKIE_NAME` | Optional | Session cookie name. Defaults to `nexcv.sid`. |
| `SESSION_STORE_MAX_POOL_SIZE` | Optional | Mongo session-store pool size. Defaults to `5`. |
| `SUPER_ADMIN_EMAILS` | Production | Comma-separated bootstrap owner emails. |
| `ADMIN_ALLOWED_IPS` | Production admin | Comma-separated public IP allowlist for `/api/admin/*`. |
| `ADMIN_TRUSTED_PROXY_IPS` | Optional | Trusted proxy IPs when resolving client IPs. |

## MongoDB

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` / `MONGO_URI` | Production | MongoDB connection string. |
| `MONGODB_DB_NAME` | Workers optional | Database override for Lambda workers. |
| `MONGODB_MAX_POOL_SIZE` | Optional | Main app pool max. Defaults to `20`. |
| `MONGODB_MIN_POOL_SIZE` | Optional | Main app pool min. Defaults to `0`. |
| `MONGODB_MAX_IDLE_TIME_MS` | Optional | Mongo idle timeout. Defaults to `30000`. |
| `MONGODB_SERVER_SELECTION_TIMEOUT_MS` | Optional | Mongo server selection timeout. Defaults to `10000`. |
| `MONGODB_SLOW_QUERY_MS` | Optional | Slow-query log threshold. Defaults to `500`. |

## AI And CV Import

| Variable | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | AI features | Enables summary/refine and AI CV import. |
| `GEMINI_REQUEST_TIMEOUT_MS` | Optional | Gemini request timeout. Defaults to `35000`. |
| `GEMINI_CIRCUIT_FAILURE_THRESHOLD` | Optional | Gemini circuit breaker threshold. Defaults to `5`. |
| `CV_IMPORT_QUEUE_URL` / `SQS_CV_IMPORT_QUEUE_URL` | Production recommended | SQS queue for background CV import jobs. |
| `CV_IMPORT_QUEUE_REGION` | Queue | SQS region. Existing production queue is in `eu-central-1`. |
| `CV_IMPORT_LOCAL_WORKER_DISABLED` | Production queue | Set `true` when SQS worker is active so the main app does not parse imports locally. |
| `CV_IMPORT_JOB_TTL_MS` | Optional | Import job expiry. Defaults to 24 hours. |
| `CV_IMPORT_REQUEST_TIMEOUT_MS` | Optional | HTTP timeout for import requests. Defaults to `90000`. |
| `OCR_LAMBDA_FUNCTION_NAME` | OCR Lambda | AWS Lambda function name, for example `OCR_data_Extract`. |
| `OCR_LAMBDA_URL` | OCR Lambda alternative | Function URL/API Gateway alternative to `OCR_LAMBDA_FUNCTION_NAME`. |
| `OCR_LAMBDA_REGION` | OCR Lambda | OCR Lambda region. Existing OCR function is in `eu-central-1`. |
| `OCR_LAMBDA_TIMEOUT_MS` | Optional | OCR Lambda call timeout. Defaults to `45000`. |

Guest users must sign in before CV import starts. The frontend opens the auth modal before the file picker/import queue runs. If import cannot find readable resume details, the user sees a friendly retry message instead of raw parser or AI errors.

## OCR Lambda

| Variable | Required | Purpose |
| --- | --- | --- |
| `AWS_REGION` | Lambda | AWS region fallback. |
| `OCR_DOCUMENT_BUCKET` | Textract flow | Private temporary bucket for uploaded OCR documents. |
| `OCR_DOCUMENT_PREFIX` | Optional | Temp object prefix. Defaults to `ocr-imports`. |
| `OCR_MAX_BYTES` | Optional | Max OCR payload size. Defaults to 10 MB. |
| `OCR_TEXTRACT_TIMEOUT_MS` | Optional | Textract polling timeout. Defaults to `55000`. |
| `OCR_TEXTRACT_POLL_MS` | Optional | Textract polling interval. Defaults to `1500`. |
| `OCR_TEXTRACT_MAX_PAGES` | Optional | Max pages to process. Defaults to `8`. |
| `OCR_AI_PARSE_ENABLED` | Optional | Set `false` to disable structured AI parsing inside OCR Lambda. |
| `OCR_AI_TIMEOUT_MS` | Optional | OCR Lambda AI parse timeout. Defaults to `30000`. |
| `OCR_AI_MODEL` | Optional | OCR Lambda AI model. Defaults to `gemini-flash-latest`. |
| `GEMINI_API_KEY` | Optional | Enables structured parsing in OCR Lambda. |

## PDF Rendering And Queue

| Variable | Required | Purpose |
| --- | --- | --- |
| `PDF_LAMBDA_URL` | Production recommended | PDF renderer Function URL/API Gateway URL. |
| `PDF_LAMBDA_TIMEOUT_MS` | Optional | PDF Lambda timeout. Defaults to `45000`. |
| `PDF_LAMBDA_CIRCUIT_FAILURE_THRESHOLD` | Optional | PDF Lambda circuit breaker threshold. Defaults to `3`. |
| `PDF_REQUEST_TIMEOUT_MS` | Optional | HTTP timeout for PDF requests. Defaults to `75000`. |
| `PDF_QUEUE_URL` / `SQS_PDF_QUEUE_URL` | Production recommended | SQS queue for background PDF jobs. |
| `PDF_QUEUE_REGION` | Queue | PDF queue region. Existing production queue is in `eu-north-1`. |
| `PDF_JOB_TTL_MS` | Optional | PDF job expiry. Defaults to 24 hours. |
| `PDF_OUTPUT_BUCKET_NAME` / `S3_PDF_BUCKET_NAME` | Queue worker | Private S3 bucket for generated PDFs. |
| `PDF_OUTPUT_PREFIX` | Optional | Generated PDF prefix. Defaults to `pdf-jobs`. |
| `PDF_OUTPUT_REGION` | Optional | S3 output bucket region. Falls back to `AWS_REGION`. |
| `PUPPETEER_EXECUTABLE_PATH` | Local PDF | Browser executable override for local rendering. |
| `PDF_WARM_BROWSER_IDLE_MS` | Optional | Local browser warm-pool idle timeout. |
| `HTML_PDF_QUEUE_URL` | Production recommended | Dedicated SQS queue for authenticated HTML-to-PDF jobs. |
| `HTML_PDF_QUEUE_REGION` | Queue | HTML PDF queue region. Falls back to `AWS_REGION`. |
| `HTML_PDF_OUTPUT_BUCKET_NAME` | Queue worker | Private S3 bucket for generated HTML PDFs. Falls back to the PDF output bucket. |
| `HTML_PDF_OUTPUT_PREFIX` | Optional | Generated HTML PDF prefix. Defaults to `html-pdf-jobs`. |
| `HTML_PDF_OUTPUT_REGION` | Optional | HTML PDF output bucket region. Falls back to PDF/AWS region. |
| `HTML_PDF_GUEST_QUOTAS_COLLECTION` | Optional | MongoDB collection for guest HTML-to-PDF quota counters. Defaults to `htmlpdfguestquotas`. |
| `HTML_PDF_DAILY_GUEST_LIMIT` | Optional | Guest daily HTML-to-PDF limit. Defaults to `1`. |
| `HTML_PDF_DAILY_FREE_LIMIT` | Optional | Free signed-in user daily HTML-to-PDF limit. Defaults to `3`. |
| `HTML_PDF_DAILY_PAYG_LIMIT` | Optional | Single CV Pass daily HTML-to-PDF limit. Defaults to `10`. |
| `HTML_PDF_DAILY_MONTHLY_LIMIT` | Optional | Monthly Pro daily HTML-to-PDF limit. Defaults to `25`. |
| `HTML_PDF_DAILY_QUARTERLY_LIMIT` | Optional | Quarterly Pro daily HTML-to-PDF limit. Defaults to `50`. |
| `HTML_PDF_MAX_INPUT_BYTES` | Optional | Combined HTML and CSS size limit. Defaults to 250 KB. |
| `PDF_WORKER_MODE` | HTML PDF worker | Set to `html-pdf` when reusing `apps/workers/pdf-worker` on the dedicated HTML PDF queue. |

## Templates And S3

| Variable | Required | Purpose |
| --- | --- | --- |
| `S3_TEMPLATE_BUCKET_NAME` / `TEMPLATE_BUCKET_NAME` | S3 templates | Bucket for admin/built-in template assets. |
| `S3_CV_ASSET_BUCKET_NAME` / `CV_ASSET_BUCKET_NAME` | Profile images | Private bucket for uploaded CV assets; defaults to the template bucket. |
| `S3_CV_ASSET_PREFIX` | Profile images | Object prefix for uploaded CV assets; defaults to `cv-assets`. |
| `S3_TEMPLATE_PREFIX` | Optional | Template prefix. Defaults to `templates`. |
| `S3_TEMPLATE_CACHE_TTL_MS` | Optional | Server-side template cache TTL. |
| `AWS_REGION` | AWS SDK | Default AWS SDK region. |
| `TEMPLATE_CONFIG_CACHE_TTL_MS` | Optional | Public template config cache TTL. Defaults to `300000`. |
| `TEMPLATE_HTML_CACHE_TTL_MS` | Optional | Template HTML cache TTL. Defaults to `600000`. |

## Billing

| Variable | Required | Purpose |
| --- | --- | --- |
| `PAYHERE_MERCHANT_ID` / `PAYHERE_SANDBOX_MERCHANT_ID` | PayHere | Merchant ID. |
| `PAYHERE_MERCHANT_SECRET` / `PAYHERE_SANDBOX_MERCHANT_SECRET` | PayHere | Merchant secret for signature validation. |
| `PAYHERE_NOTIFY_URL` | PayHere | Public `/api/payhere/ipn` URL. |
| `PAYHERE_CHECKOUT_URL` | Optional | Checkout URL override. |
| `LEMON_SQUEEZY_API_KEY` | Lemon Squeezy | API key for checkout creation. |
| `LEMON_SQUEEZY_STORE_ID` | Lemon Squeezy | Numeric store ID. |
| `LEMON_SQUEEZY_PAYG_VARIANT_ID` | Lemon Squeezy | Single CV Pass variant ID. |
| `LEMON_SQUEEZY_MONTHLY_VARIANT_ID` | Lemon Squeezy | Monthly Pro variant ID. |
| `LEMON_SQUEEZY_QUARTERLY_VARIANT_ID` | Lemon Squeezy | Pro Quarterly variant ID. |
| `LEMON_SQUEEZY_WEBHOOK_SECRET` | Lemon Squeezy | Webhook signing secret. |
| `BILLING_PLANS_CACHE_TTL_MS` | Optional | Public billing plan cache TTL. |

## Email

| Variable | Required | Purpose |
| --- | --- | --- |
| `EMAIL_FROM` | Email | Sender address. Use a verified domain in production. |
| `ADMIN_NOTIFICATION_EMAIL` | Recommended | Admin notifications and support alerts. |
| `RESEND_API_KEY` | Provider option | Resend API key. |
| `EMAIL_USER` / `EMAIL_PASS` | Provider option | SMTP username/password. |
| `SMTP_HOST` | Optional | SMTP host. Defaults to `smtp.gmail.com` when SMTP creds exist. |
| `SMTP_PORT` | Optional | SMTP port. Defaults to `587`. |
| `SMTP_SECURE` | Optional | Set `true` for implicit TLS. |
| `SMTP_FAMILY` | Optional | IP family override. |
| `SMTP_CONNECTION_TIMEOUT_MS` | Optional | SMTP connection timeout. |
| `SMTP_GREETING_TIMEOUT_MS` | Optional | SMTP greeting timeout. |
| `SMTP_SOCKET_TIMEOUT_MS` | Optional | SMTP socket timeout. |
| `EMAIL_QUEUE_URL` / `SQS_EMAIL_QUEUE_URL` | Optional | SQS queue for async email delivery. |
| `EMAIL_QUEUE_REGION` | Queue | Email queue region. |

## OAuth

| Variable | Required | Purpose |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` | Google OAuth | Enables Google login. |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | Google OAuth secret. |
| `GITHUB_CLIENT_ID` | GitHub OAuth | Enables GitHub login. |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth | GitHub OAuth secret. |
| `GITHUB_CALLBACK_URL` / `GITHUB_REDIRECT_URI` | Optional | GitHub callback override. |
| `LINKEDIN_CLIENT_ID` | LinkedIn OAuth | Enables LinkedIn login. |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth | LinkedIn OAuth secret. |
| `LINKEDIN_REDIRECT_URI` | Optional | LinkedIn callback override. |

## Observability And Timeouts

| Variable | Required | Purpose |
| --- | --- | --- |
| `SENTRY_DSN` | Optional | Backend Sentry DSN. |
| `SENTRY_ENVIRONMENT` | Optional | Backend Sentry environment. |
| `SENTRY_RELEASE` | Optional | Backend Sentry release. |
| `SENTRY_TRACES_SAMPLE_RATE` | Optional | Backend traces sample rate. |
| `VITE_SENTRY_DSN` | Optional | Frontend Sentry DSN. |
| `VITE_SENTRY_ENVIRONMENT` | Optional | Frontend Sentry environment. |
| `VITE_SENTRY_RELEASE` | Optional | Frontend release. |
| `VITE_SENTRY_TRACES_SAMPLE_RATE` | Optional | Frontend traces sample rate. |
| `VITE_POSTHOG_TOKEN` | Optional | PostHog project token used after analytics consent. |
| `VITE_POSTHOG_HOST` | Optional | PostHog ingest host. Defaults to the US Cloud host. |
| `API_REQUEST_TIMEOUT_MS` | Optional | Default API request timeout. |
| `AI_REQUEST_TIMEOUT_MS` | Optional | AI route timeout. |
| `SERVER_REQUEST_TIMEOUT_MS` | Optional | Node server request timeout. |
| `SERVER_HEADERS_TIMEOUT_MS` | Optional | Node headers timeout. |
| `SERVER_KEEP_ALIVE_TIMEOUT_MS` | Optional | Node keep-alive timeout. |
| `GRACEFUL_SHUTDOWN_TIMEOUT_MS` | Optional | Shutdown grace period. |
| `CIRCUIT_BREAKER_FAILURE_THRESHOLD` | Optional | Default circuit breaker threshold. |
| `CIRCUIT_BREAKER_COOLDOWN_MS` | Optional | Circuit breaker cooldown. |
| `CIRCUIT_BREAKER_HALF_OPEN_MAX_CALLS` | Optional | Half-open probe count. |

## Quotas

| Variable | Required | Purpose |
| --- | --- | --- |
| `DAILY_CV_CREATION_LIMIT` | Optional | Free saved-CV limit override. |
| `DAILY_UNVERIFIED_DOWNLOAD_LIMIT` | Optional | Download limit for unverified users. |
| `PAYG_DAILY_DOWNLOAD_LIMIT` | Optional | Single CV Pass daily download limit. |
| `MONTHLY_DAILY_DOWNLOAD_LIMIT` | Optional | Monthly plan daily download limit. |
| `HTML_PDF_DAILY_GUEST_LIMIT` | Optional | Guest HTML-to-PDF jobs per UTC day. Defaults to `1`. |
| `HTML_PDF_DAILY_FREE_LIMIT` | Optional | Free signed-in HTML-to-PDF jobs per UTC day. Defaults to `3`. |
| `HTML_PDF_DAILY_PAYG_LIMIT` | Optional | Single CV Pass HTML-to-PDF jobs per UTC day. Defaults to `10`. |
| `HTML_PDF_DAILY_MONTHLY_LIMIT` | Optional | Monthly Pro HTML-to-PDF jobs per UTC day. Defaults to `25`. |
| `HTML_PDF_DAILY_QUARTERLY_LIMIT` | Optional | Quarterly Pro HTML-to-PDF jobs per UTC day. Defaults to `50`. |

## GitHub Actions Backup Secrets

The MongoDB backup workflow uses dedicated backup secrets first and falls back to generic AWS secrets for older setups.

| Secret/Variable | Type | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Secret | Database URI used by `mongodump`. |
| `BACKUP_AWS_ACCESS_KEY_ID` | Secret | Access key for the backup IAM user. |
| `BACKUP_AWS_SECRET_ACCESS_KEY` | Secret | Secret key for the backup IAM user. |
| `BACKUP_AWS_REGION` | Secret | Backup AWS region. Defaults to `eu-north-1` through workflow fallback. |
| `MONGODB_BACKUP_S3_BUCKET` | Repository variable | Optional backup bucket override. Defaults to `mongodb-database-backup1`. |
| `MONGODB_BACKUP_S3_PREFIX` | Repository variable | Optional backup prefix override. Defaults to `mongodb/daily`. |
