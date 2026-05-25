# NexCV API Documentation

This document provides a high-level overview of the RESTful API endpoints available in the NexCV backend. The API is built using Express.js.

## Base URL
In local development, the base URL is typically:
`http://localhost:3002`

In production, it will be the domain where the Node.js server is hosted (e.g., `https://api.nexcv.com`).

---

## 1. Authentication (`/api/auth`)

Handles user sessions, Google OAuth, and session status checks.

*   `GET /api/auth/google`
    *   Initiates the Google OAuth flow.
*   `GET /api/auth/google/callback`
    *   The callback URL for Google OAuth. Creates or updates the user profile and establishes a session.
*   `GET /api/auth/status`
    *   Returns the current session status, user profile details, and role (e.g., `admin`, `user`).
*   `POST /api/auth/logout`
    *   Destroys the current user session and clears the session cookie.

---

## 2. CV Management (`/api/cv`)

Handles the creation, saving, AI parsing, and PDF generation of CVs.

*   `POST /api/cv/save`
    *   **Body**: JSON representation of the CV data.
    *   **Action**: Saves or updates a CV in the database for the authenticated user.
*   `GET /api/cv/list`
    *   **Action**: Returns a list of all saved CVs for the currently authenticated user.
*   `GET /api/cv/:id`
    *   **Action**: Retrieves a specific CV by its MongoDB ID.
*   `POST /api/cv/generate-pdf`
    *   **Body**: `{ cvData: object, templateId: string }`
    *   **Action**: Compiles the CV data into the specified template, calls the AWS Lambda service, and returns a binary PDF buffer.
*   `POST /api/cv/ai-parse`
    *   **Body**: `{ text: string }`
    *   **Action**: Sends raw text to the Gemini API and returns a structured JSON CV object.

---

## 3. Payments & Billing (`/api/payment`)

Handles interactions with PayHere and premium upgrades.

*   `POST /api/payment/checkout-session`
    *   **Body**: `{ planId: string }`
    *   **Action**: Generates a secure PayHere checkout hash and session details required by the frontend to initiate the PayHere modal.
*   `POST /api/payment/notify` (PayHere IPN Webhook)
    *   **Body**: `application/x-www-form-urlencoded` from PayHere.
    *   **Action**: Verifies the signature of the payment notification and upgrades the user's account to premium if the payment was successful. **Do not protect this route with authentication middleware.**

---

## 4. Public Content (`/api/public`)

Fetches CMS content that does not require authentication.

*   `GET /api/public/templates`
    *   **Action**: Returns a list of all active (published) templates, including custom S3 templates.
*   `GET /api/public/content`
    *   **Action**: Returns dynamic CMS content like FAQs, pricing, and the landing page text.

---

## 5. Admin Platform (`/api/admin/*`)

*Note: All routes under this prefix are protected by the `requireAdmin` middleware. In production, they are also restricted by the `ADMIN_ALLOWED_IPS` middleware.*

*   `GET /api/admin/analytics/summary`
    *   **Action**: Returns aggregate statistics (total users, revenue, CV counts).
*   `GET /api/admin/users`
    *   **Action**: Returns a paginated list of all registered users.
*   `POST /api/admin/templates`
    *   **Body**: `multipart/form-data` (HTML file, CSS file, metadata).
    *   **Action**: Uploads the files to S3 and creates a new template record in the database.
*   `PATCH /api/admin/users/:id/role`
    *   **Body**: `{ role: string }`
    *   **Action**: Updates a user's role. Logs the action in the Audit Log.
*   `GET /api/admin/audit-logs`
    *   **Action**: Retrieves a history of sensitive administrative actions.

---

## Important Headers

*   All endpoints expecting JSON must include the header: `Content-Type: application/json`.
*   Authentication is handled securely via `httpOnly` cookies (express-session). The frontend must send requests with `credentials: 'include'`.
