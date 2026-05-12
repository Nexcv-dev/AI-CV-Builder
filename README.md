# NexCV - Free AI-Powered CV Builder

NexCV is a modern, full-stack web application designed to help users create professional, ATS-friendly resumes effortlessly. Leveraging the power of AI (Google Gemini), NexCV can intelligently parse existing resumes from PDFs or images, and assist in writing compelling summaries. The app offers a seamless "guest-first" experience, allowing users to build and preview their CVs instantly, with optional cloud saving and PDF exports available upon account creation.

Currently in version: `1.0.0` (Beta)

## ✨ Key Features

### 🧠 AI-Powered Capabilities
- **Smart CV Parsing:** Upload an existing CV (PDF or Image), and NexCV's Gemini integration will instantly extract and populate your details into the builder.
- **AI Summary Generation:** Overcome writer's block with AI-assisted profile summaries tailored to your experience.

### 🛠️ Intuitive Builder Experience
- **Guest-First Flow:** Start building immediately without the friction of signing up.
- **Live Preview:** See changes in real-time as you type, with a responsive side-by-side builder layout.
- **Professional Templates:** Choose from a curated selection of modern, ATS-optimized CV templates.

### 🔐 Secure Authentication & Management
- **Flexible Login:** Sign up using Email/Password or instantly with Google OAuth 2.0.
- **Cloud Document Storage:** Safely store, edit, duplicate, and delete multiple CVs in your personal dashboard.
- **Profile Settings:** Manage your personal details, profile picture (with auto-fallback avatars), and account security.

### 🚀 Performance & Export
- **Pixel-Perfect PDFs:** Server-side rendering using Puppeteer ensures your downloaded CV looks exactly like the preview, with no browser inconsistencies.
- **Mobile Optimized:** A fully responsive design with pill-style navigation ensures you can edit your CV on the go.

## 💻 Tech Stack

**Frontend:**
- React 18 (with Vite 6)
- TypeScript
- Tailwind CSS v4
- Framer Motion (Animations)
- Lucide React (Icons)
- React Hot Toast (Notifications)
- Vitest & Testing Library

**Backend:**
- Node.js & Express
- TypeScript
- MongoDB with Mongoose
- Passport.js (Google OAuth 2.0 & Local)
- Express Session (Stateful Auth)
- `@google/genai` (Gemini API Integration)
- Puppeteer Core & `@sparticuz/chromium` (PDF Generation)
- DOMPurify & JSDOM (Sanitization)
- Helmet, CORS, & Express Rate Limit (Security)

## 📁 Project Structure

```text
AI-CV-Builder/
├── docker-compose.yml
├── render.yaml
├── README.md
└── Free CV Builder/
    ├── Dockerfile
    ├── server.ts             # Express backend entry point
    ├── vite.config.ts        # Vite configuration
    ├── server-models/        # MongoDB Schemas & Auth Logic
    │   ├── CVDocument.ts
    │   ├── User.ts
    │   ├── db.ts
    │   └── passportSetup.ts
    ├── src/                  # React Frontend
    │   ├── App.tsx           # Router & Layout
    │   ├── components/       # Reusable UI Components
    │   ├── pages/            # Main Page Views (Home, Dashboard, etc.)
    │   ├── utils/            # Helpers & API bindings
    │   ├── templates.ts      # CV Template definitions
    │   ├── htmlBuilder.ts    # HTML string generation for PDFs
    │   └── index.css         # Global styles & Tailwind
    ├── public/               # Static Assets
    └── tests/                # Backend & Integration Tests
```

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or newer)
- npm or yarn
- [MongoDB Atlas](https://www.mongodb.com/atlas) (or local MongoDB instance)
- [Google Gemini API Key](https://aistudio.google.com/)
- [Google Cloud Console](https://console.cloud.google.com/) (For Google OAuth Client ID & Secret)

### 1. Installation

Clone the repository and install dependencies:

```bash
cd "Free CV Builder"
npm install
```

### 2. Environment Variables

Create a `.env` file in the `Free CV Builder` directory and configure the following variables:

```env
# Server
PORT=3002
ALLOWED_ORIGIN=http://localhost:3000

# Database
MONGODB_URI=your_mongodb_connection_string

# AI Integration
GEMINI_API_KEY=your_gemini_api_key

# Authentication
SESSION_SECRET=your_super_secret_session_key
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
```
> **Note:** For local development, ensure your Google OAuth authorized redirect URI is set to `http://localhost:3002/api/auth/google/callback`.

### 3. Run the Development Server

Start both the React frontend and Express backend concurrently:

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
| `npm run dev:all` | Starts both frontend and backend concurrently |
| `npm run dev` | Starts the Vite development server (Frontend) |
| `npm run server` | Starts the Express development server (Backend) |
| `npm run build` | Compiles the React app for production |
| `npm run start` | Runs the production backend server |
| `npm run test` | Runs Vitest test suites in watch mode |
| `npm run lint` | Runs TypeScript type checking |

---

## 🛡️ Security Implementation

NexCV prioritizes user data security through multiple layers of protection:
- **Rate Limiting:** Protects API endpoints, authentication routes, and computationally expensive PDF generation endpoints from abuse.
- **CSRF Protection:** Non-GET requests require a specific `X-App-Source` header, and origins are strictly verified.
- **Sanitization:** All user inputs and AI-generated content are sanitized using `DOMPurify` before database storage and PDF rendering to prevent XSS.
- **Secure Headers:** Implemented via `Helmet.js`, including restrictive Content Security Policies (CSP).
- **Password Hashing:** Passwords are cryptographically hashed with unique salts using `pbkdf2Sync` before storage.

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
