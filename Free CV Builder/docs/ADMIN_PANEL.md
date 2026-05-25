# Admin Platform Guide

The NexCV Admin Platform is a protected area of the application designed for system operators, support staff, and platform owners to manage the application without needing direct database access.

## 1. Access & Security
*   **Authentication**: Admins must log in using approved Google OAuth credentials.
*   **Super Admin List**: The initial master admins are defined via the `SUPER_ADMIN_EMAILS` environment variable.
*   **IP Restricting**: In production, the admin routes are completely hidden and inaccessible to any IP address not explicitly listed in the `ADMIN_ALLOWED_IPS` environment variable. This prevents public discovery of the admin portal.
*   **Audit Logging**: Every write-action performed by an admin (e.g., deleting a user, publishing a template, refunding a payment) is recorded in the MongoDB Audit Logs collection, retaining the Admin ID, action type, target ID, and timestamp for 30 days.

## 2. Core Modules

### Dashboard & Analytics
Provides a high-level overview of the platform's health:
*   Total registered users.
*   Total CVs created.
*   Conversion rates (Free to Premium users).
*   Recent payment transactions.

### User Management
*   Search and filter users by email or ID.
*   View user details, including their saved CVs and billing tier.
*   Manually upgrade or downgrade user accounts (e.g., granting premium access for support reasons).

### Template Management
*   Upload new custom templates (HTML/CSS) directly to S3.
*   Set template metadata (Premium flag, thumbnails, image crop data).
*   Publish, draft, or archive templates in real-time.

### Billing & Payments
*   View all PayHere transactions.
*   Manage premium plans and update pricing copy.
*   Manage promotional coupons and track their usage.

### Content Management System (CMS)
Allows admins to update text on the public-facing pages without deploying new code:
*   Landing page copy.
*   FAQ entries.
*   Legal policies (Privacy, Terms).

### Settings & Operations
*   **Maintenance Mode**: Toggle the site into maintenance mode, displaying a friendly "brb" page to users while allowing Admins to continue testing the site.
*   **Service Checks**: Verify connection status to MongoDB, AWS S3, and the Email SMTP server.
