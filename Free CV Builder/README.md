# NexCV - Free AI CV Builder

NexCV is a modern, full-stack AI-powered CV builder application. It features a robust backend for handling user authentication, payments, document generation (PDFs), and AI integrations, alongside a dynamic, responsive frontend built with React.

## 🚀 Tech Stack

### Frontend
- **React 18**
- **TypeScript**
- **Vite** (Build Tool)
- **Tailwind CSS** (Styling)
- **React Router** (Navigation)
- **Lucide React** (Icons)

### Backend
- **Node.js & Express**
- **MongoDB & Mongoose** (Database)
- **Passport.js** (Authentication)
- **AWS S3** (Storage for CV Templates)
- **Puppeteer** (PDF Generation)
- **PayHere** (Payment Gateway)
- **Google Gemini AI** (AI Services)

---

## 📂 Project Structure (Optimized Architecture)

The codebase has been refactored and optimized for scalability, separating concerns between the frontend and backend, as well as breaking down large monolithic files into manageable modules.

```text
Free CV Builder/
│
├── public/                 # Static assets (images, icons, etc.)
│
├── src/                    # 🎨 FRONTEND CODE (React App)
│   ├── components/         # Reusable UI components (Modals, Headers, Footers)
│   │   ├── cv-preview/     # CV Preview logic and styling components
│   │   └── form/           # CV form input components (Education, Experience, etc.)
│   │
│   ├── pages/              # Main application pages
│   │   ├── AdminDashboard.tsx   # Main Admin container
│   │   ├── admin/          # 🧩 Separated Admin Dashboard Modules
│   │   │   ├── AdminSharedComponents.tsx  # Reusable admin UI widgets
│   │   │   ├── BillingManagementSection.tsx
│   │   │   ├── SupportManagementSection.tsx
│   │   │   ├── TemplateManagementSection.tsx
│   │   │   ├── UserManagementSection.tsx
│   │   │   ├── adminTypes.ts      # TypeScript interfaces for admin
│   │   │   └── adminUtils.ts      # Helper functions for admin
│   │   │
│   │   ├── Home.tsx
│   │   ├── LandingPage.tsx
│   │   ├── Dashboard.tsx
│   │   └── ...other pages
│   │
│   ├── utils/              # Frontend utilities (API fetch wrappers, etc.)
│   ├── adminPermissions.ts # Role-based access control configurations
│   ├── App.tsx             # Main React Router setup
│   ├── main.tsx            # React application entry point
│   └── index.css           # Global Tailwind CSS and custom styles
│
├── routes/                 # ⚙️ BACKEND ROUTES (Express Controllers)
│   ├── admin.ts            # Admin-specific API endpoints
│   ├── auth.ts             # Authentication endpoints (Login, Signup, OAuth)
│   ├── cv.ts               # CV CRUD operations and PDF generation endpoints
│   ├── payment.ts          # Payment processing and PayHere IPN logic
│   ├── public.ts           # Publicly accessible endpoints
│   └── _shared.ts          # Shared route utilities
│
├── services/               # 🛠️ BACKEND SERVICES (Business Logic)
│   ├── emailService.ts     # Nodemailer logic for sending system/auth emails
│   ├── pdfService.ts       # Puppeteer logic for generating PDFs
│   └── s3Service.ts        # AWS S3 integration for template management
│
├── middlewares/            # 🛡️ BACKEND MIDDLEWARE
│   ├── passportAuth.ts     # Passport strategies and authentication checks
│   ├── rateLimiters.ts     # Express-rate-limit configurations to prevent abuse
│   ├── security.ts         # Helmet, CORS, and origin checking logic
│   └── session.ts          # Express-session configurations
│
├── server-models/          # 🗄️ DATABASE MODELS (Mongoose Schemas)
│   ├── User.ts
│   ├── CVDocument.ts
│   ├── PaymentTransaction.ts
│   └── ...other models
│
├── server.ts               # 🚀 BACKEND ENTRY POINT (Express Server Setup)
├── vite.config.ts          # Vite build and proxy configuration
└── package.json            # Project dependencies and scripts
```

## 🏗️ Architectural Highlights

1. **Modular Backend**: The Express server (`server.ts`) acts solely as the entry point. All business logic is abstracted into `services/`, request handling into `routes/`, and security into `middlewares/`. This makes it extremely easy to deploy the backend separately from the frontend in the future.
2. **Componentized Frontend**: Large pages like the `AdminDashboard` have been broken down into smaller, focused sections (e.g., `UserManagementSection`, `BillingManagementSection`). Shared logic and types are extracted to utility files.
3. **Type Safety**: TypeScript is used extensively across both the frontend (`src/`) and the backend (`routes/`, `services/`, `server-models/`) to ensure data consistency and reduce runtime errors.

## 💻 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- MongoDB instance (local or Atlas)
- Required API Keys (AWS, PayHere, Gemini, Google OAuth, etc.) set in `.env`

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Setup Environment Variables:
   Create a `.env` file in the root directory and add the necessary configuration keys.

3. Start the Development Server (Frontend + Backend concurrently):
   ```bash
   npm run dev
   ```

### Building for Production
To build the frontend assets:
```bash
npm run build
```
The compiled static files will be placed in the `dist/` directory, which can then be served by the Express backend or a dedicated static file server.
