# NexCV Operations Runbook

This document is for Site Reliability Engineers (SREs), DevOps, and Admin staff. It outlines standard procedures for responding to production incidents and performing routine maintenance on the NexCV platform.

## 1. Incident Response

### Scenario A: PDF Generation is Failing (Timeout/Errors)
**Symptoms:** Users click "Download PDF" but receive a 500 error or endless loading.
**Diagnosis:**
1.  Check the AWS Lambda CloudWatch logs for `lambda-pdf/`.
2.  Look for "Memory Limit Exceeded" or "Task timed out after 30.00 seconds".
3.  Check the Express backend logs for HTTP timeout errors reaching `PDF_LAMBDA_URL`.
**Resolution:**
*   If Lambda is timing out due to complex templates, temporarily increase the Lambda timeout to 60s and memory to 2048MB.
*   If Chromium is failing to launch, verify that the `@sparticuz/chromium` version is compatible with the Node.js runtime on AWS.
*   *Mitigation:* As an Admin, put up a temporary notice via the CMS announcing "PDF downloads are experiencing delays."

### Scenario B: PayHere Payments are Failing (IPN not updating)
**Symptoms:** Users are paying via PayHere, money is deducted, but their accounts are not upgrading to Premium.
**Diagnosis:**
1.  Check the Express server logs for `POST /api/payment/notify` (the PayHere webhook).
2.  Verify if the requests are reaching the server (check your load balancer / WAF logs to ensure PayHere IPs are not blocked).
3.  Check if the `PAYHERE_MERCHANT_SECRET` environment variable was accidentally changed, causing signature verification to fail.
**Resolution:**
*   Manually upgrade affected users via the Admin Panel -> Users section.
*   Fix the secret or unblock PayHere IPs.

### Scenario C: Admin Panel is Inaccessible
**Symptoms:** Admins get a 404 or 403 when navigating to `/admin`.
**Diagnosis:**
1.  The `ADMIN_ALLOWED_IPS` middleware is blocking the request.
2.  Check what IP address you are currently browsing from (e.g., using `whatismyip.com`).
**Resolution:**
*   Update the `ADMIN_ALLOWED_IPS` environment variable on your hosting provider to include your new IP address.
*   Restart the Node.js server to apply the new environment variables.

## 2. Routine Maintenance

### Enabling Maintenance Mode
If you need to perform database migrations or fix a critical security flaw:
1.  Log in to the Admin Dashboard.
2.  Go to **Settings**.
3.  Toggle **Maintenance Mode** to ON.
4.  *Result:* All public users will see a "We'll be right back" screen. Admin users will still be able to browse the site normally to test fixes.

### Database Backups
*   NexCV uses MongoDB Atlas. Ensure that automated daily backups are enabled in the Atlas console.
*   For major data changes (e.g., mass deleting old CVs), always take an on-demand manual snapshot in Atlas before running scripts.

### Clearing Old S3 Templates
When templates are deleted via the Admin CMS, the S3 HTML/CSS files might become orphaned. 
*   Run the provided cleanup script (if available) periodically to diff MongoDB template records against the S3 bucket contents and delete orphaned files.
