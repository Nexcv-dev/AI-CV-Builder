# NexCV - Free AI-Powered CV Builder

NexCV is a modern, full-stack web application designed to help users create professional, ATS-friendly resumes effortlessly. Leveraging the power of AI (Google Gemini), NexCV can intelligently parse existing resumes from PDFs or images, and assist in writing compelling summaries. The app offers a seamless "guest-first" experience, allowing users to build and preview their CVs instantly, with optional cloud saving, premium template options, and pixel-perfect PDF exports.

Currently in version: `1.1.0` (Stable Production Release)

---

## ✨ Key Features

### 🧠 AI-Powered Capabilities
- **Smart CV Parsing:** Upload an existing CV (PDF or Image), and NexCV's Gemini integration will instantly extract and populate your details into the builder.
- **AI Summary Generation:** Overcome writer's block with AI-assisted profile summaries tailored to your experience.

### 🛠️ Intuitive Builder Experience & Rich Templates
- **Guest-First Flow:** Start building immediately without the friction of signing up.
- **Live Preview:** See changes in real-time as you type, with a responsive side-by-side builder layout.
- **Premium Template Selection:** Choose from a curated, beautiful library of modern layouts:
  - `Classic` (Free) — Clean and timeless layout.
  - `Modern` (Paid) — Structured layout with a professional side panel.
  - `Professional` (Paid) — Corporate standard design.
  - `Timeline` (Paid) — Creative layout mapping achievements over time.
  - `Minimalist` (Paid) — Clean, ultra-minimal typography and spacious layout.
  - `Startup` (Paid) — Dynamic, tech-oriented, bold header style.
- **Offline HTML Mockups:** Seven stunning, stand-alone HTML/Tailwind mockup files in the root folder for rapid visual iteration of different resume layouts (`bold`, `creative`, `elegant`, `executive`, `split`, `startup`, and `studio`).

### 💳 Complete Monetization & Secure Payments
- **Tiered Pricing Structure:** Clearly outlined plans (Free, Premium Monthly, Pro) designed directly in `PricingPage.tsx` with synced feature details.
- **Seamless Checkout:** A dedicated, premium `CheckoutPage` fully integrated with the official **PayHere** gateway, displaying the high-visibility dark/long banner.
- **SSL-Encrypted Connection:** Trust status badges prominently displayed to assure users of a secure payment transaction.
- **Customer Support Integration:** Direct, clickable telephone (+94 70 123 4567) and email (`support@nexcv.com`) links inside the checkout footer to offer immediate help in case of payment issues.
- **Fully Compliant Legal Flows:** Standardized paths for Privacy Policy, Terms & Conditions, and a newly created **Refund & Cancellation Policy** (`RefundPolicy.tsx`) with dynamic route resolution.

### 🎨 State-of-the-Art UX/UI Optimizations
- **Dynamic Link Micro-animations:** A premium gradient underline hover effect (`.nav-link-hover`) applied to header links that slides in smoothly when hovered.
- **Autofill Theme Protection:** A CSS override in `index.css` that prevents native browser autofill from turning form input backgrounds white in dark mode, preserving the sleek, dark aesthetic.
- **Zero Mobile Input Zooming:** Set input font sizes on the checkout page to a comfortable `16px` to prevent default iOS/Android browsers from zoom-focusing and breaking layout alignments.
- **Distraction-Free Layouts:** Global layout footers are dynamically hidden on key focused pages (such as checkout, dashboard, password reset, and settings) to ensure high focus and seamless checkouts.

### 🚀 Performance, Serverless Rendering & Cloud Templates
- **AWS Lambda PDF Generation:** High-performance, pixel-perfect PDF rendering offloaded to a serverless AWS Lambda microservice using Puppeteer Core and `@sparticuz/chromium`. This isolates memory-heavy Puppeteer processes, drastically reducing main application resource consumption and page-load lag.
- **AWS S3 Dynamic Template Pipeline:** Hardcoded CV templates have been fully migrated to S3. They are stored as modern Mustache-based HTML/CSS template assets inside S3 (`s3://cv-template-bucket/templates`), acting as the single source of truth for both live previewing and final downloads.
- **Intelligent Pre-processing & Caching:** A robust data pre-processing layer dynamically formats dates, groups skills, checks typography contrast, and orders sections. To maximize speed, an optimized S3 caching mechanism (`s3TemplateCache`) stores retrieved S3 templates locally with custom TTL configs.
- **Robust Quota Management:** Quota models (`CvCreationQuotaModel` and `DownloadQuotaModel`) enforce strict resume creation and export limits on free accounts, seamlessly unlocking unlimited premium operations upon verified subscriptions.
- **Production-Grade Security:** Enforced via restrictive CORS, secure rate limiters, client-side & server-side JSDOM/DOMPurify XSS filters, and secure PBKDF2 cryptographically salted password hashing.

### 🛡️ Admin & Platform Management
- **Comprehensive Admin Dashboard:** Dedicated admin portal (`AdminDashboard.tsx`) broken down into modular management sections (Users, Billing, Support, Templates).
- **Role-Based Access Control:** Secure routes and UI components protected by dedicated admin permissions and middleware.
- **Optimized Modular Architecture:** Backend logic elegantly separated into `routes`, `services`, and `middlewares` to ensure maintainability and high scalability.

---

## 📁 Project Structure

```text
AI-CV-Builder/
├── docker-compose.yml
├── render.yaml
├── README.md
├── CHANGELOG.md
├── bold_preview.html          # HTML mockups/prototypes for design testing
├── creative_preview.html
├── elegant_preview.html
├── executive_preview.html
├── split_preview.html
├── startup_preview.html
├── studio_preview.html
├── templates/                 # S3-syncable Mustache PDF templates
│   ├── classic/               # Standard layout files (index.html, style.css)
│   ├── modern/
│   ├── professional/
│   ├── timeline/
│   ├── minimalist/
│   ├── startup/
│   └── README.md              # S3 template sync instructions & placeholders
└── Free CV Builder/
    ├── Dockerfile
    ├── server.ts             # Express backend entry point with S3/Lambda client integration
    ├── vite.config.ts        # Vite configuration
    ├── lambda-pdf/           # AWS Lambda PDF rendering microservice bundle
    │   ├── README.md         # Lambda deployment configuration & parameters
    │   ├── dist/             # Packaged nexcv-pdf-lambda.zip zipfile
    │   └── src/
    │       └── handler.ts    # Transpiled AWS Lambda Puppeteer handler
    ├── scripts/
    │   └── build-pdf-lambda.mjs # Compilation, bundling (esbuild) & zipping script
    ├── server-models/        # MongoDB Schemas, Quotas & Auth
    │   ├── CVDocument.ts
    │   ├── CvCreationQuotaModel.ts
    │   ├── DownloadQuotaModel.ts
    │   ├── User.ts
    │   ├── cvQuota.ts
    │   ├── db.ts
    │   ├── downloadQuotaUtils.ts
    │   ├── passportSetup.ts
    │   ├── userPlan.ts
    │   └── userRole.ts
    ├── src/                  # React Frontend
    │   ├── App.tsx           # Router, global state & layout
    │   ├── main.tsx          # Client entry point
    │   ├── index.css         # Styling system, Tailwind & utility layer
    │   ├── adminPermissions.ts # Role-based access control configurations
    │   ├── templates.ts      # Template definitions & color utilities
    │   ├── htmlBuilder.ts    # Server-side HTML builder for Puppeteer PDF
    │   ├── types.ts          # Core TypeScript typings
    │   ├── pdf_generation.test.ts # Puppeteer PDF generation unit tests
    │   ├── components/       # Reusable UI components
    │   │   ├── CVForm.tsx          # Multi-step resume builder form
    │   │   ├── CVForm_logic.test.tsx # Unit tests for builder state & wizard logic
    │   │   ├── CVPreview.tsx       # Live-updating preview grid layout
    │   │   ├── CVPreview.test.tsx  # Unit tests for CV Preview layouts
    │   │   ├── SiteHeader.tsx      # Main application nav header
    │   │   ├── Footer.tsx          # Global footer (hidden on checkout/dashboard)
    │   │   ├── form/               # Modular Form Builder Sections
    │   │   │   ├── PersonalDetailsSection.tsx
    │   │   │   ├── ExperienceSection.tsx
    │   │   │   ├── EducationSection.tsx
    │   │   │   ├── SkillsSection.tsx
    │   │   │   └── ... (awards, courses, projects, references, design)
    │   │   └── ... (ImageCropper, AuthModal, AccountMenu, BrandLogo)
    │   ├── pages/            # Core App Pages
    │   │   ├── admin/              # Separated Admin Dashboard Modules
    │   │   │   ├── AdminSharedComponents.tsx
    │   │   │   ├── UserManagementSection.tsx
    │   │   │   └── BillingManagementSection.tsx
    │   │   ├── AdminDashboard.tsx  # Main Admin container
    │   │   ├── LandingPage.tsx     # Marketing landing page
    │   │   ├── Home.tsx            # Builder workspace & template selector
    │   │   ├── Dashboard.tsx       # Cloud document management panel
    │   │   ├── MyCvs.tsx           # CV index list (create/duplicate/delete)
    │   │   ├── PricingPage.tsx     # Tiered pricing plans layout
    │   │   ├── CheckoutPage.tsx    # Secure PayHere payment forms & trust widgets
    │   │   ├── RefundPolicy.tsx    # Dedicated Refund & Cancellation Policy
    │   │   ├── ResetPassword.tsx   # Verified password reset wizard
    │   │   └── ... (AboutUs, ContactUs, PrivacyPolicy, TermsAndConditions)
    │   └── utils/            # Shared helper functions & API handlers
    │       └── api.ts              # Server fetch requests & token handling
    ├── routes/               # Backend Routes (Express Controllers)
    │   ├── admin.ts
    │   ├── auth.ts
    │   ├── cv.ts
    │   ├── payment.ts
    │   └── public.ts
    ├── services/             # Backend Services (Business Logic)
    │   ├── emailService.ts
    │   ├── pdfService.ts
    │   └── s3Service.ts
    ├── middlewares/          # Backend Middleware (Security, Auth, Rate Limits)
    │   ├── passportAuth.ts
    │   ├── rateLimiters.ts
    │   ├── security.ts
    │   └── session.ts
    ├── public/               # Static images & template graphics
    └── tests/                # Server and Integration Tests
        ├── server.test.ts          # Express API route verification tests
        ├── server_advanced.test.ts # Deep route security and rate-limiting tests
        └── accessibility.test.tsx  # React accessibility audits
```

---

## 💻 Tech Stack

**Frontend:**
- React 18 (with Vite 6)
- TypeScript
- Tailwind CSS v4
- Framer Motion (Micro-animations & transitions)
- Lucide React (Icons)
- React Hot Toast (Notifications)
- Vitest & Testing Library (Automated unit tests)

**Backend & Cloud Services:**
- Node.js & Express
- TypeScript & tsx (TypeScript execute runner)
- MongoDB with Mongoose
- AWS Lambda (PDF generation microservice)
- AWS S3 (Mustache-based HTML/CSS template storage)
- AWS SDK (`@aws-sdk/client-s3`) for fetching templates dynamically
- Passport.js (Google OAuth 2.0 & Local stateful sessions)
- Express Session (Stateful authentication storage)
- Nodemailer (Email Delivery for Password Resets & Account Verification)
- `@google/genai` (Google Gemini API integration)
- Puppeteer Core & `@sparticuz/chromium` (Serverless pixel-perfect PDF rendering)
- esbuild & typescript compiler (AWS Lambda package compiler)
- DOMPurify & JSDOM (Input sanitization)
- Helmet, CORS, & Express Rate Limit (Strict production API security)

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or newer)
- npm or yarn
- [MongoDB Atlas](https://www.mongodb.com/atlas) (or local MongoDB instance)
- [Google Gemini API Key](https://aistudio.google.com/)
- [Google Cloud Console](https://console.cloud.google.com/) (For Google OAuth Client ID & Secret)

### 1. Installation

Clone the repository and install the dependencies:

```bash
cd "Free CV Builder"
npm install
```

### 2. Environment Variables

Create a `.env` file in the `Free CV Builder` directory and configure the following variables:

```env
# Server Configuration
PORT=3002
ALLOWED_ORIGIN=http://localhost:3000

# Database Configuration
MONGODB_URI=your_mongodb_connection_string

# AI Integration
GEMINI_API_KEY=your_gemini_api_key

# Authentication Configs
SESSION_SECRET=your_super_secret_session_key
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret

# Email Configuration (for Password Resets & Account Verifications)
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASS=your_gmail_app_password

# AWS Lambda PDF Rendering Microservice
PDF_LAMBDA_URL=your_aws_lambda_function_url
PDF_LAMBDA_TIMEOUT_MS=45000

# AWS S3 Dynamic Template Cache configuration
S3_TEMPLATE_BUCKET_NAME=your_s3_template_bucket
S3_TEMPLATE_PREFIX=templates
S3_TEMPLATE_CACHE_TTL_MS=300000

# Optional: AWS Credentials (if not running with IAM Roles on EC2/ECS/Lambda)
AWS_REGION=eu-north-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
```
> **Note:** For local development, ensure your Google OAuth authorized redirect URI is set to `http://localhost:3002/api/auth/google/callback`.

### 3. Run the Development Server

Start both the React frontend (Vite) and Express backend concurrently:

```bash
npm run dev:all
```
- **Frontend:** `http://localhost:3000`
- **Backend API:** `http://localhost:3002`

---

## 🐳 Running with Docker

NexCV includes Docker support for a seamless, containerized development experience.

1. Build and start the containers:
   ```bash
   docker-compose up --build
   ```
2. Access the application:
   - Frontend: `http://localhost:3000`
   - Backend: `http://localhost:3002`

*(Use `docker-compose up -d` to run in detached mode).*

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev:all` | Starts both frontend and backend concurrently in dev mode |
| `npm run dev` | Starts the Vite development server (Frontend only) |
| `npm run server` | Starts the Express development server (Backend only) |
| `npm run build` | Compiles the React app for production |
| `npm run start` | Runs the compiled production backend server |
| `npm run test` | Runs the automated Vitest suites in watch mode |
| `npm run lint` | Runs TypeScript type checking and validation |
| `npm run build:pdf-lambda` | Compiles, bundles (esbuild), and packages the AWS Lambda function zip |

---

## 🛡️ Security Implementation

NexCV prioritizes user data security through multiple layers of protection:
- **Process Isolation (AWS Lambda):** Computationally heavy PDF generation using Puppeteer is fully isolated in an AWS Lambda sandbox, protecting the main backend from denial-of-service (DoS) memory exhaustion.
- **Strict CORS & Rate Limiting:** Restricts API requests to approved domains and limits requests to authentication, AI generation, and PDF download endpoints.
- **CSRF Protection:** State-modifying endpoints strictly require custom source validations (`X-App-Source` header checks).
- **Sanitization Pipeline:** All user input and AI-generated contents undergo comprehensive HTML sanitization using `DOMPurify` (with a custom tags/attributes allowlist in both the main Express application and the Lambda compiler).
- **Template Security Constraints:** S3 Mustache template compilations are sandboxed, escaping HTML dynamic bindings by default (double curly braces `{{}}`) and sanitizing only verified rich-text fields (triple curly braces `{{{}}}`).
- **Secure Headers:** Configured with `Helmet.js` using highly restrictive Content Security Policy (CSP) headers.
- **Password Hashing:** Implemented with Node's native `pbkdf2Sync` using secure cryptographic salts before storing user credentials.

---

## ☁️ Deployment (Render)

NexCV is structured to be easily deployed on platforms like [Render](https://render.com/).

1. Set your build command to:
   ```bash
   npm run render-build
   ```
2. Set your start command to:
   ```bash
   npm run start
   ```
3. Ensure all environment variables (especially `NODE_ENV=production` and `ALLOWED_ORIGIN`) are configured in your Render dashboard.

> **MongoDB Atlas Note:** If deploying on a platform with dynamic IPs (like Render's free tier), you may need to allow `0.0.0.0/0` in your MongoDB Atlas Network Access settings. Ensure you use strong database credentials.

---

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

Built with ❤️ by **Bimantha Perera**.
