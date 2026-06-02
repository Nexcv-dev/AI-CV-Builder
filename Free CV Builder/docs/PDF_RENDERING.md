# PDF Rendering

NexCV generates PDFs through `POST /api/generate-pdf`. The main app performs auth, template, plan, and quota checks before calling the renderer.

## Renderer Order

`services/pdfService.ts` supports two rendering modes:

1. Lambda renderer when `PDF_LAMBDA_URL` is configured.
2. Local Puppeteer renderer as a development/fallback path.

Production should use Lambda so the main Express process does not spend CPU and memory on Chromium rendering.

## Main App Flow

1. The frontend requests PDF export with CV data and selected template state.
2. The Express route checks the authenticated user, plan state, premium template access, and download quotas.
3. The PDF service prepares the render payload.
4. If `PDF_LAMBDA_URL` exists, the service posts to Lambda and waits up to `PDF_LAMBDA_TIMEOUT_MS` milliseconds, defaulting to 45000.
5. If Lambda is unavailable/not configured, the local renderer can launch Chromium/Puppeteer.
6. The API returns the PDF buffer to the browser.

## Lambda Flow

The Lambda source lives in `lambda-pdf/`.

Request body shape:

```json
{
  "cvData": {},
  "template": "professional",
  "watermark": false
}
```

The Lambda:

- Resolves built-in or S3-backed template content.
- Injects CV data into template HTML/CSS.
- Launches headless Chromium with `@sparticuz/chromium`.
- Renders A4 PDF output with backgrounds enabled.
- Returns an API Gateway compatible base64 PDF response.

Warmup events can send `{ "warmup": true }`.

## Environment Variables

Main app:

```env
PDF_LAMBDA_URL=https://your-lambda-url.example
PDF_LAMBDA_TIMEOUT_MS=45000
PDF_WARM_BROWSER_IDLE_MS=300000
PUPPETEER_EXECUTABLE_PATH=optional_local_browser_path
```

OCR import uses a separate Lambda function when configured, so PDF rendering is not affected:

```env
OCR_LAMBDA_FUNCTION_NAME=OCR_data_Extract
OCR_LAMBDA_REGION=eu-central-1
OCR_LAMBDA_TIMEOUT_MS=45000
OCR_DOCUMENT_BUCKET=your-temp-ocr-bucket
```

Lambda:

```env
AWS_REGION=eu-north-1
S3_TEMPLATE_BUCKET_NAME=your_template_bucket
S3_TEMPLATE_PREFIX=templates
S3_TEMPLATE_CACHE_TTL_MS=300000
```

## Template Requirements

Templates should include:

```css
@page {
  size: A4;
  margin: 0;
}

.page {
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  overflow: visible;
}
```

Avoid fixed `.page { height: 297mm; }`, global `overflow: hidden`, scripts, iframes, tracking pixels, and remote dependencies that may fail in Lambda.

## Troubleshooting

- Lambda timeout: raise timeout/memory and inspect CloudWatch logs.
- Chromium launch failure: confirm Node runtime and `@sparticuz/chromium` compatibility.
- Missing template: confirm S3 bucket, prefix, object keys, and template metadata.
- Clipped PDF content: check template print CSS and remove fixed page heights.
- Slow local rendering: set `PDF_LAMBDA_URL` and use Lambda for production.
