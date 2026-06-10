# NexCV PDF Worker Lambda

Deploy `dist/nexcv-pdf-worker.zip` to AWS Lambda with:

- Runtime: Node.js 20.x
- Handler: `handler.handler`
- Architecture: x86_64
- Memory: 512 MB minimum
- Timeout: 90 seconds
- Trigger: SQS queue that receives `{ "jobId": "..." }`

Environment variables:

```env
AWS_REGION=eu-north-1
MONGODB_URI=your_mongodb_connection_string
PDF_LAMBDA_URL=https://your-pdf-renderer-lambda-url
PDF_LAMBDA_TIMEOUT_MS=45000
PDF_OUTPUT_BUCKET_NAME=nexcv-pdf-jobs-prod1
PDF_OUTPUT_PREFIX=pdf-jobs
```

The worker reads the PDF job from MongoDB, calls the existing PDF renderer Lambda, uploads the generated PDF to S3, and marks the job as ready.
