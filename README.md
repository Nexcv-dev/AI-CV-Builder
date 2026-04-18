<div align="center">

# Free AI CV Builder
### Create Professional Resumes with the Power of AI 🚀
</div>

---

Free AI CV Builder is a modern, web-based application designed to help job seekers create stunning, ATS-friendly resumes in minutes. By leveraging **Google's Gemini AI**, the application can parse existing CVs, generate professional summaries, and refine job descriptions to make them more impactful.

## ✨ Key Features

- **AI-Powered Parsing**: Upload your existing PDF or image CV, and let AI extract your details automatically.
- **AI Content Refinement**: One-click professional summary generation and description rewriting.
- **Multiple Templates**: Choose between **Modern**, **Classic**, and **Professional** layouts.
- **High-Quality PDF Export**: Generate pixel-perfect PDFs using Puppeteer-core.
- **Real-time Preview**: See your changes instantly as you edit.
- **Secure by Design**: Input sanitization and secure HTML generation to prevent XSS.

## 🛠️ Tech Stack

- **Frontend**: React 18, Tailwind CSS, Lucide Icons, Framer Motion.
- **Backend**: Node.js, Express, TypeScript.
- **AI**: Google Gemini Pro (via `@google/genai`).
- **PDF Generation**: Puppeteer-core + @sparticuz/chromium.
- **Testing**: Vitest, React Testing Library.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- A [Google Gemini API Key](https://aistudio.google.com/app/apikey)

### Local Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/Free-AI-CV-Builder.git
   cd "Free CV Builder"
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_api_key_here
   PORT=3002
   ```

4. **Run the application**:
   ```bash
   npm run dev:all
   ```
   *This runs both the Vite frontend (port 3000) and the Express backend (port 3002) concurrently.*

---

## 🧪 Testing & Quality Assurance

The project follows a rigorous testing process to ensure stability and security.

### Running Tests
- **Unit Tests**: `npm run test` (Watch mode)
- **Single Run**: `npm run test:run`
- **Coverage Report**: `npm run test:coverage`

### Automated CI/CD
We use **GitHub Actions** to automate our quality checks. Every push to `main` and all Pull Requests trigger:
1. TypeScript Linting (`npm run lint`)
2. Unit Testing (`npm run test:run`)
3. Production Build (`npm run build`)

---

## 🌐 Deployment

This app is optimized for deployment on **Render**.

### Auto-Deployment Setup
1. Setup a **Web Service** on Render pointing to your repository.
2. In Render Settings, set the **Build Command** to `npm run render-build` and **Start Command** to `npm run start`.
3. Add your `GEMINI_API_KEY` to the **Environment Variables** in Render. 
4. To enable the CI/CD pipeline to trigger deployments, add your Render **Deploy Hook URL** as a GitHub Secret named `RENDER_DEPLOY_HOOK`.

---

## 🤝 Contributing

Feel free to open issues or submit pull requests to improve the templates or AI logic!

---
<div align="center">
Developed with ❤️ by the community.
</div>
