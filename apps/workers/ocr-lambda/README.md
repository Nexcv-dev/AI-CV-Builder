# NexCV OCR Lambda

Deploy `dist/nexcv-ocr-lambda.zip` to AWS Lambda with:

- Runtime: Node.js 20.x
- Handler: `handler.handler`
- Architecture: x86_64
- Memory: 512 MB or higher
- Timeout: 90 seconds or higher

Environment variables:

- `AWS_REGION=eu-north-1`
- `OCR_DOCUMENT_BUCKET=your-temp-ocr-bucket`
- `OCR_DOCUMENT_PREFIX=ocr-imports`
- `OCR_TEXTRACT_TIMEOUT_MS=55000`
- `OCR_TEXTRACT_MAX_PAGES=8`

Request body:

```json
{
  "mimeType": "application/pdf",
  "base64Data": "..."
}
```

Response:

```json
{
  "text": "Extracted CV text",
  "usedOcr": true,
  "source": "textract"
}
```

The Lambda uploads the document to S3 temporarily, runs Textract text detection, returns line text, and deletes the S3 object in a `finally` block. Keep the bucket private, enable public access block, and add a short lifecycle rule as a safety cleanup.

Required Lambda role permissions:

```json
[
  "s3:PutObject",
  "s3:GetObject",
  "s3:DeleteObject",
  "textract:StartDocumentTextDetection",
  "textract:GetDocumentTextDetection"
]
```
