# NexCV - AI CV Builder

NexCV is a full-stack AI CV builder for creating, importing, saving, editing, and exporting professional resumes. It includes a polished landing page, guest-friendly builder flow, authenticated dashboard, profile/settings pages, MongoDB-backed saved documents, Google/email authentication, AI-assisted CV import, AI writing tools, template selection, and PDF download.

Current app version: `0.0.0`

## Features

- Guest builder access with login required only for saving and downloading.
- Email/password signup and login.
- Google OAuth login with Google profile image support.
- User avatar fallback using the first letter of the user's name.
- Dashboard for saved CV documents.
- Import CV flow from landing page, dashboard, and post-login onboarding.
- AI CV import from PDF or image files.
- AI summary generation and text refinement.
- Template picker with explicit "Use this template" confirmation.
- Live CV preview with responsive builder layout.
- Cloud save, edit, and delete for saved CV documents.
- Profile page with editable personal details and profile picture upload/remove.
- Settings page for password, session, and account actions.
- PDF generation through Puppeteer and Chromium.
- Toast-based success/error/rate-limit feedback.
- Mobile-optimized builder, dashboard, profile, and settings pages with pill-style navigation.
- Enhanced Dashboard with activity stats and compact document cards.
- Reset and Import flow with smooth loading animations and component-level remounting.
- Docker support for consistent development and deployment environments.
- Rate limiting, request integrity checks, sanitization, and secure sessions.

## Tech Stack

### Frontend

- React 18
- Vite 6
- TypeScript
- Tailwind CSS 4
- Motion
- Lucide React
- React Hot Toast
- Vitest and Testing Library

### Backend

- Node.js
- Express
- TypeScript
- MongoDB with Mongoose
- Passport Google OAuth 2.0
- Express Session
- Google Gemini via `@google/genai`
- Puppeteer Core with `@sparticuz/chromium`
- DOMPurify and JSDOM
- Helmet, CORS, and Express Rate Limit

## Project Structure

```text
AI-CV-Builder/
  README.md
  docker-compose.yml
  render.yaml
  Free CV Builder/
    Dockerfile
    server.ts             # Express backend entry point
    package.json
    vite.config.ts
    server-models/        # MongoDB Mongoose models & Auth
      CVDocument.ts
      User.ts
      db.ts
      passportSetup.ts
    src/                  # Frontend React application
      App.tsx             # Router & main layout
      main.tsx            # App entry point
      components/         # Shared UI components
        CVForm.tsx        # Main builder form & logic
        CVPreview.tsx     # Live CV preview & HTML templates
        AuthModal.tsx     # Login/Signup modal
      pages/              # Page components
        Home.tsx          # Builder entry page
        Dashboard.tsx     # Document management
        LandingPage.tsx   # Landing page
        Profile.tsx       # User profile
        Settings.tsx      # Account settings
      utils/              # API and helper utilities
      templates.ts        # CV template configurations
      htmlBuilder.ts      # PDF HTML generation logic
      types.ts            # TypeScript definitions
      index.css           # Global styles & Tailwind CSS 4
    public/               # Static assets
      brand/              # Branding assets
      templates/          # Template previews
    tests/                # Backend & integration tests
```

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm
- MongoDB Atlas or a local MongoDB connection string
- Google Gemini API key
- Google OAuth credentials if Google login is enabled

### Install

```bash
cd "Free CV Builder"
npm install
```

### Environment Variables

Create `Free CV Builder/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key
MONGODB_URI=your_mongodb_connection_string
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SESSION_SECRET=your_session_secret
PORT=3002
ALLOWED_ORIGIN=https://your-production-domain.com
```

For local development, Google OAuth should include the callback URL:

```text
http://localhost:3002/api/auth/google/callback
```

### Run Locally

```bash
npm run dev:all
```

Frontend: `http://localhost:3000`
Backend: `http://localhost:3002`

### Run with Docker

Ensure you have Docker and Docker Compose installed.

1. Build and start the containers:
   ```bash
   docker-compose up --build
   ```

2. The app will be available at:
   - Frontend: `http://localhost:3000`
   - Backend: `http://localhost:3002`

3. To run in the background:
   ```bash
   docker-compose up -d
   ```

## Main Scripts

```bash
npm run dev          # Start Vite frontend
npm run server       # Start Express backend
npm run dev:all      # Start frontend and backend together
npm run build        # Build production frontend
npm run start        # Start backend
npm run lint         # Type-check with tsc
npm run test         # Run Vitest in watch mode
npm run test:run     # Run Vitest once
npm run test:coverage
```

## App Flow

1. Guests can click `Get Started` and use the builder without creating an account.
2. Guests can build and preview CVs.
3. Downloading requires login; the login modal appears and returns to the download flow.
4. Saving requires an authenticated user.
5. New authenticated users can import an existing CV, skip import, choose a template, and continue building.
6. Saved CVs appear in the dashboard and can be edited or deleted.
7. Profile details and profile picture can be managed from the profile page.
8. Password/session/account actions are managed from settings.

## Security Notes

- API requests use credentials-based sessions.
- Non-GET API requests require `X-App-Source: cv-builder-app`.
- API routes are rate-limited.
- User and AI-generated content is sanitized before PDF rendering.
- Sensitive environment values must remain server-side.
- In production, configure `ALLOWED_ORIGIN` and secure MongoDB Atlas access rules.

## MongoDB Atlas Notes

For Render or other hosted deployments, MongoDB Atlas network access must allow the outbound IPs used by the host. Free Render services do not provide a stable static outbound IP. A temporary broad allowlist such as `0.0.0.0/0` works, but it is less restrictive; use strong database credentials and tighten access when possible.

## Deployment

The app is designed for Render-style deployment.

Recommended production settings:

- `NODE_ENV=production`
- `MONGODB_URI`
- `GEMINI_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SESSION_SECRET`
- `ALLOWED_ORIGIN`

Build command:

```bash
npm run render-build
```

Start command:

```bash
npm run start
```

## Testing

Run the main verification commands before deploying:

```bash
npm run lint
npm run test:run
```

Current verified status during the latest update:

- TypeScript check passes.
- Vitest suite passes with 49 tests.

## License

MIT

## Author

Built by Bimantha Perera.
