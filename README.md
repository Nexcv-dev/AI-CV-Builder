<div align="center">

# ✨ Free AI CV Builder
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

## 🧪 Testing

We prioritize stability and security.

- **Run all tests**: `npm run test:run`
- **Watch mode**: `npm run test`
- **Coverage**: `npm run test:coverage`

## 🛡️ Security Features

- **Content Security Policy (CSP)**: Hardened via Helmet.js.
- **Rate Limiting**: Protection against brute-force and DDoS.
- **Sanitization**: All AI-generated and user content is sanitized via `DOMPurify`.
- **Environment Safety**: Sensitive keys are never exposed to the client.

## 🌐 Deployment

This application is optimized for **Render**.

1. Connect your GitHub repository to Render.
2. Select **Web Service**.
3. **Build Command**: `npm run render-build`
4. **Start Command**: `npm run start`
5. Add your `GEMINI_API_KEY` to the Environment Variables.

---

<div align="center">
Made with ❤️ for Job Seekers Everywhere.
</div>
