# PDF Rendering Pipeline

PDF generation is one of the most computationally expensive tasks in NexCV. To prevent the main Express API server from slowing down or crashing under load, this task is offloaded to a dedicated AWS Lambda microservice.

## 1. The Architecture
*   **Caller**: The main Express backend.
*   **Worker**: AWS Lambda function (code found in `lambda-pdf/`).
*   **Engine**: Puppeteer-core with Chromium (optimized for Lambda environments, typically using `@sparticuz/chromium`).

## 2. Request Flow
1.  **User Trigger**: The user requests a PDF download from the React frontend.
2.  **Payload Preparation**: The Express server compiles the user's CV JSON data and the chosen HTML/CSS template into a single, fully populated HTML string.
3.  **Lambda Invocation**: The Express server makes a POST request to the `PDF_LAMBDA_URL` with the HTML payload.
4.  **Headless Rendering**:
    *   The Lambda function boots up Headless Chromium.
    *   It loads the HTML string into a new page.
    *   It waits for fonts, network requests, and images to fully load (`waitUntil: 'networkidle0'`).
    *   It calls `page.pdf()` with specific print parameters (e.g., A4 size, print background colors).
5.  **Response**: The Lambda returns the generated PDF as a base64 encoded string or raw binary buffer to the Express server.
6.  **Delivery**: The Express server forwards the PDF to the user's browser for download.

## 3. Important Considerations
*   **Page Breaks**: CSS rules like `page-break-inside: avoid` and `break-inside: avoid` are heavily utilized in the template CSS to prevent text or sections from splitting awkwardly across pages.
*   **Timeouts**: Headless browser tasks can be slow. The Lambda function is configured with a high timeout (e.g., 30 seconds), and the Express server's HTTP client must also have a matching timeout threshold.
*   **Local Fallback**: For local development, if the `PDF_LAMBDA_URL` is not provided, the Express backend may fall back to a local instance of Puppeteer (if configured in `services/pdf.service.ts`).
