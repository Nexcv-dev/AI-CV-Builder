<div align="center">

# ✨ AI CV Builder
### Create Professional Resumes with the Power of AI 🚀

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)](https://reactjs.org/)

![Project Preview](cv_builder_preview_1776875844654.png)

</div>

---

## 📖 Overview

**Free AI CV Builder** is a premium, open-source web application designed to help job seekers create stunning, ATS-friendly resumes in minutes. By leveraging **Google's Gemini AI**, the application automates the tedious parts of resume building—from parsing old documents to crafting impactful job descriptions.

## 🚀 Key Features

- 🤖 **AI-Powered Parsing**: Upload your existing PDF or image-based CV and let Gemini AI extract your details automatically.
- ✍️ **Content Refinement**: One-click professional summary generation and description rewriting using advanced AI.
- 🎨 **Premium Templates**: Choose between **Modern**, **Classic**, and **Professional** layouts, all designed for maximum impact.
- 🖨️ **Pixel-Perfect PDF**: High-quality export using Puppeteer, ensuring your CV looks identical on screen and in print.
- ⚡ **Real-time Preview**: See your changes instantly with a side-by-side live editor and preview.
- 🖼️ **Image Processing**: Built-in image cropping and optimization for profile pictures.
- 🛡️ **Enterprise-Grade Security**: XSS prevention, rate limiting, and secure HTML sanitization.

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 (Vite)
- **Styling**: Tailwind CSS 4.x
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **State Management**: React Hooks & Context API

### Backend
- **Runtime**: Node.js & Express
- **Language**: TypeScript
- **AI Engine**: Google Gemini Pro (`@google/genai`)
- **PDF Engine**: Puppeteer-core + @sparticuz/chromium

## 📂 Project Structure

```text
Free CV Builder/
├── src/                # Frontend Source
│   ├── components/     # Reusable UI components
│   ├── pages/          # Main page layouts
│   ├── utils/          # Helper functions (AI, PDF, etc.)
│   ├── types.ts        # TypeScript definitions
│   └── index.css       # Global styles & Tailwind config
├── tests/              # Unit & Integration tests
├── server.ts           # Express backend for PDF generation & AI
├── vite.config.ts      # Vite configuration
└── package.json        # Dependencies & scripts
```

## 🏁 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- A [Google Gemini API Key](https://aistudio.google.com/app/apikey)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/bimanthaperera-lab/Free-AI-CV-Builder.git
   cd "Free CV Builder"
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the `Free CV Builder` directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3002
   ```

4. **Start Development Server**:
   ```bash
   npm run dev:all
   ```
   *Access the frontend at `http://localhost:3000` and backend at `http://localhost:3002`.*

### 🐳 Docker Support (Recommended)

For the easiest setup, use Docker Compose. This ensures all system dependencies (like Chromium for PDF generation) are correctly configured.

1. **Prerequisites**: [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.
2. **Build and Start**:
   ```bash
   docker compose up --build
   ```
3. **Hot-Reloading**: The setup uses Docker volumes, so any changes you make to the code will be reflected instantly.

## 🧪 Testing

We prioritize stability and security.

- **Run all tests**: `npm run test:run`
- **Watch mode**: `npm run test`
- **Coverage**: `npm run test:coverage`

## ⚙️ CI/CD Pipeline & Release Management

This project uses **GitHub Actions** for continuous integration, deployment, and release management.

**Continuous Integration & Deployment:**
1.  **Lints & Tests**: Ensures TypeScript standards and verifies all components via Vitest on every push.
2.  **Docker Verification**: Automatically builds a Docker image to ensure the containerization environment remains stable.
3.  **Builds**: Verifies production readiness of the frontend.
4.  **Auto-Deploys**: Automatically deploys to **Render** whenever changes are pushed to the `main` branch.

**Release & Version Management:**
- **Automated Changelogs**: Generates and updates `CHANGELOG.md` automatically on push.
- **Release Drafter**: Automatically drafts GitHub Releases with semantic versioning tags based on merged pull request labels (`major`, `minor`, `patch`).
- **Auto Versioning App Sync**: When a release is published on GitHub, a dedicated workflow automatically bumps the `package.json` version to match the release tag, ensuring the UI always reflects the live version.

> [!IMPORTANT]
> To enable automatic deployment, you must add a GitHub Secret named `RENDER_DEPLOY_HOOK` containing your Render Deploy Hook URL.

## 🛡️ Security Features

- **Content Security Policy (CSP)**: Hardened via Helmet.js.
- **Rate Limiting**: Protection against brute-force and DDoS.
- **Sanitization**: All AI-generated and user content is sanitized via `DOMPurify`.
- **Environment Safety**: Sensitive keys are never exposed to the client.

## 🌐 Deployment

This application is optimized for **Render** and includes a `render.yaml` Blueprint for 1-click deployment.

1. Go to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New** and select **Blueprint**.
3. Connect this GitHub repository.
4. Render will automatically detect the `render.yaml` file and configure the Web Service.
5. Provide your `GEMINI_API_KEY` and `ALLOWED_ORIGIN` when prompted during setup.

---

<div align="center">
Made with ❤️ for Job Seekers Everywhere.
</div>
