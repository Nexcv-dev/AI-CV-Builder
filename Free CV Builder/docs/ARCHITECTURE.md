# NexCV - System Architecture

This document provides a high-level overview of the NexCV application architecture. It is designed to help developers, sysadmins, and new contributors understand the structural components, data flow, and third-party integrations that make up the AI CV Builder platform.

## High-Level System Architecture

NexCV is built as a monolithic full-stack web application (React + Express) with specific computationally intensive or stateless tasks offloaded to microservices (AWS Lambda) and cloud storage (AWS S3).

### 1. Frontend Layer (React + Vite)
The frontend is a Single Page Application (SPA) responsible for both the public-facing CV builder and the protected Admin platform.

*   **Technology Stack**: React, Vite, TypeScript (implied).
*   **Key Responsibilities**:
    *   **CV Builder**: Handles the guest-first UI, live preview of templates, dynamic form inputs, and image cropping.
    *   **Admin Dashboard**: Modular UI for managing users, templates, billing, support, and analytics.
    *   **Lazy Loading**: The application employs route-level lazy loading (e.g., separating the builder, admin sections, checkout, and public pages) to optimize bundle sizes and improve initial load times.
    *   **State Management**: Complex UI states for the CV preview and template interactions are managed locally or via dedicated hooks.

### 2. Backend Layer (Node.js + Express)
The backend acts as the core API gateway and business logic handler for the platform.

*   **Technology Stack**: Node.js, Express, TypeScript (via `server.ts` and `routes/`).
*   **Key Responsibilities**:
    *   **Authentication & Authorization**: Session management, Google OAuth integration, and role-based access control (RBAC) for the admin dashboard. Features IP allowlisting (`ADMIN_ALLOWED_IPS`) for production security.
    *   **API Endpoints**: Serves frontend requests for CV saving, user data, analytics, admin CMS updates, and billing.
    *   **Security & Middleware**: Rate limiting, Helmet, CORS, input sanitization, and secure session management.
    *   **Template Rendering Pipeline**: Serves and dynamically injects data into S3-backed HTML/CSS templates.

### 3. Database Layer (MongoDB)
The primary data store for the application.

*   **Technology**: MongoDB (interacted with via Mongoose in `server-models/`).
*   **Key Data Entities**:
    *   **Users & Sessions**: Stores user profiles, Google OAuth links, and session data.
    *   **CV Data**: JSON representations of user resumes.
    *   **Templates**: Metadata for built-in and custom templates (pointing to S3).
    *   **Transactions & Billing**: PayHere payment records, subscriptions, and quotas.
    *   **Audit Logs**: Tracks sensitive admin actions (retained for 30 days).
    *   **CMS & Settings**: Dynamic content for the landing page, FAQs, and global app settings.

## External Services & Integrations

NexCV relies on several external services to deliver premium features securely and efficiently:

### AI & Processing
*   **Google Gemini API**: Powers the AI-assisted writing features, such as CV parsing and intelligent summary generation.
*   **AWS Lambda (`lambda-pdf/`)**: Offloads the heavy lifting of generating PDF files from HTML templates. This ensures the main Express server is not blocked by CPU-intensive Chromium/Puppeteer rendering tasks.

### Storage & Assets
*   **AWS S3**: Stores custom HTML/CSS CV templates and generated thumbnails. The backend fetches these templates to render user CVs dynamically.

### Payments & Billing
*   **PayHere**: Handles secure checkout flows and payment processing for premium plans. Integrates via PayHere IPN (Instant Payment Notification) to update local database transactions securely.

### Communication
*   **Email Delivery**: Uses Nodemailer combined with generic SMTP, Resend, or the Gmail API to send transactional emails (e.g., alerts, email verification, admin notifications).

## Application Directory Structure

```text
Free-AI-CV-Builder/
├── Free CV Builder/            # Main Monorepo root
│   ├── src/                    # React frontend application code
│   ├── public/                 # Static assets (images, icons)
│   ├── routes/                 # Express API route handlers
│   ├── services/               # Core backend services (Email, PDF, S3, Billing)
│   ├── middlewares/            # Express middlewares (Auth, Security)
│   ├── server-models/          # Mongoose database schemas
│   ├── server-utils/           # Shared backend utility functions
│   ├── tests/                  # Vitest server & frontend tests
│   ├── lambda-pdf/             # Code for the AWS Lambda PDF microservice
│   ├── server.ts               # Main Express application entry point
│   ├── vite.config.ts          # Frontend build configuration
│   └── package.json            # Project dependencies and NPM scripts
```

## Data Flow: PDF Generation Process (Example)

1.  **User Request**: The user clicks "Download PDF" on the React frontend.
2.  **API Call**: The frontend sends the raw CV data (JSON) and requested template ID to the Express backend.
3.  **Template Retrieval**: The backend fetches the required HTML/CSS template from AWS S3 (or local cache).
4.  **Data Injection**: The backend injects the user's JSON data into the HTML template.
5.  **Lambda Offload**: The injected HTML payload is sent via HTTP to the AWS Lambda PDF generation endpoint.
6.  **PDF Rendering**: The Lambda function uses a headless browser (Puppeteer/Playwright) to convert the HTML to a PDF binary.
7.  **Response Delivery**: The Lambda returns the PDF buffer to the Express server, which pipes it back to the React frontend as a downloadable file.

## Security Posture

*   **Admin Access**: Production admin access is strictly gated by an IP Allowlist (`ADMIN_ALLOWED_IPS`).
*   **Data Validation**: All inputs are sanitized before database entry.
*   **Audit Logging**: Every state-changing action in the admin dashboard is logged with a 30-day TTL in MongoDB.
*   **Maintenance Mode**: The application supports a graceful maintenance mode that restricts public traffic while keeping admin functions active for troubleshooting.
