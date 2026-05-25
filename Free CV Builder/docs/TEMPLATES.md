# Template Management & Rendering

NexCV uses a robust, S3-backed template system to render user CVs both in the browser (Live Preview) and on the server (PDF Generation).

## 1. Template Types
*   **Built-in Templates**: Pre-packaged templates included in the React frontend codebase. These are loaded locally and provide immediate fallbacks.
*   **Custom S3 Templates**: Dynamic HTML/CSS templates stored in an AWS S3 bucket. The Admin Panel allows uploading and managing these without changing the core codebase.

## 2. How Templates Work
A template in NexCV is essentially a combination of:
1.  **HTML Layout**: The structure of the CV. It uses placeholder tokens (e.g., `{{firstName}}`, `{{summary}}`) that get replaced with actual user data.
2.  **CSS Styles**: The design rules. These define layout, colors, typography, and specific `print` media queries to ensure page breaks work correctly when generating a PDF.
3.  **Metadata**: Information such as the template name, thumbnail URL, premium status (free vs. paid), and profile image positioning details.

## 3. Template Rendering Pipeline
1.  **Data Hydration**: The user's JSON CV data is mapped to the placeholder tokens.
2.  **DOM Injection**: The mapped data replaces the placeholders in the HTML string.
3.  **CSS Injection**: The corresponding CSS is injected into the `<head>` of the rendered document.
4.  **Preview / Export**: The final HTML document is either rendered in an iframe for live preview in the React app, or sent to the PDF microservice.

## 4. Admin Management
Admins can upload new templates via the Admin Dashboard. When a template is uploaded:
1.  The HTML and CSS files are uploaded to the S3 Bucket defined by `S3_TEMPLATE_BUCKET_NAME` and `S3_TEMPLATE_PREFIX`.
2.  A MongoDB record is created linking the S3 URLs and the template's metadata.
3.  Users immediately see the new template in their dashboard.

*(For detailed instructions on writing your own custom templates with proper page-break support, see `template-authoring-guide.md`.)*
