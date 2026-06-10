# NexCV CV Import Worker Lambda

Deploy `dist/nexcv-cv-import-worker.zip` to AWS Lambda with:

- Runtime: Node.js 20.x
- Handler: `handler.handler`
- Architecture: x86_64
- Memory: 1024 MB minimum
- Timeout: 120 seconds
- Trigger: SQS queue that receives `{ "jobId": "..." }`

Environment variables:

```env
AWS_REGION=eu-central-1
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
OCR_LAMBDA_FUNCTION_NAME=OCR_data_Extract
OCR_LAMBDA_REGION=eu-central-1
OCR_LAMBDA_TIMEOUT_MS=90000
```

Optional:

```env
MONGODB_DB_NAME=your_database_name
MONGODB_MAX_POOL_SIZE=3
MONGODB_SERVER_SELECTION_TIMEOUT_MS=10000
```

The worker reads the CV import job from MongoDB, extracts text through the configured OCR Lambda when available, runs AI parsing for paid users, stores the parsed CV result, and removes the uploaded base64 file data from the job document.
