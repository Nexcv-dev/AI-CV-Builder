# Deployment & Operations Guide

This document outlines the standard procedure for deploying NexCV to a production environment.

## 1. Infrastructure Requirements
To run NexCV in production, you will need:
1.  **Node.js Server**: To host the main Express/React bundled application (e.g., Render, Heroku, AWS EC2, DigitalOcean).
2.  **MongoDB Database**: A managed MongoDB cluster (e.g., MongoDB Atlas).
3.  **AWS S3 Bucket**: For storing custom CV templates.
4.  **AWS Lambda**: For the PDF generation microservice.
5.  **PayHere Merchant Account**: For processing payments.
6.  **SMTP Server / Resend**: For outgoing transactional emails.

## 2. Environment Variables
Before deploying, ensure all variables listed in the `README.md` are securely injected into your hosting provider's environment variables. 
*   **CRITICAL**: Ensure `SESSION_SECRET` is a long, cryptographically secure random string.
*   **CRITICAL**: Set `ADMIN_ALLOWED_IPS` to your office/home static IP addresses to secure the Admin panel.

## 3. Build & Deploy Process (Standard Node.js Host)
If deploying manually or via a CI/CD pipeline (like GitHub Actions) to a standard server:

1.  **Install Dependencies**:
    ```bash
    cd "Free CV Builder"
    npm ci
    ```
2.  **Build the Frontend**:
    ```bash
    npm run build
    ```
    *(This compiles the Vite React app into static files inside the `dist/` or `public/` directory, ready to be served by Express).*
3.  **Start the Server**:
    ```bash
    npm run server
    # or
    NODE_ENV=production node server.ts (if using tsx/ts-node, or compile ts to js first)
    ```

## 4. Deploying the PDF Lambda
The code inside `lambda-pdf/` must be deployed to AWS Lambda separately.
1.  Zip the contents of `lambda-pdf/` (including `node_modules` if not using a layer).
2.  Upload to AWS Lambda.
3.  Expose the Lambda function via AWS API Gateway or an AWS Lambda Function URL.
4.  Copy the resulting URL and paste it into the `PDF_LAMBDA_URL` environment variable of the main Express server.

## 5. Operations & Troubleshooting
*   **Logs**: Ensure your hosting provider captures standard output (`stdout`) and standard error (`stderr`). Use structured JSON logging if possible.
*   **Database Backups**: Rely on MongoDB Atlas automated backups.
*   **Maintenance**: If a critical bug is found, an Admin can enable "Maintenance Mode" via the Admin Dashboard. If the database is completely down, you may need to rely on a hardcoded fallback page at your load balancer level.
