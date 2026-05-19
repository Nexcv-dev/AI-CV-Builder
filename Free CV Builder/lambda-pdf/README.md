# NexCV PDF Lambda

Deploy `dist/nexcv-pdf-lambda.zip` to AWS Lambda with:

- Runtime: Node.js 20.x
- Handler: `handler.handler`
- Architecture: x86_64
- Memory: 1024 MB or higher
- Timeout: 30 seconds or higher

Request body:

```json
{
  "cvData": {},
  "template": "professional",
  "watermark": false
}
```

The response is API Gateway compatible and returns the PDF as base64 with `isBase64Encoded: true`.
Keep auth, plan checks, premium template checks, and download quota logic in the main app before calling this Lambda.
