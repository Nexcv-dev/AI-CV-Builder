import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import * as dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import puppeteer from 'puppeteer';
import fs from 'fs';

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// ─── Security Middleware ─────────────────────────────────────────────

// Helmet: set secure HTTP headers
app.use(helmet({
  contentSecurityPolicy: false, // CSP is handled via index.html meta tag
}));

// CORS: restrict to same-origin in production, allow dev proxy in development
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.ALLOWED_ORIGIN || ''].filter(Boolean)
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like server-side or same-origin)
    if (!origin) return callback(null, true);
    
    // In development mode, allow localhost origins
    if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost')) {
      return callback(null, true);
    }
    
    // In production, if ALLOWED_ORIGIN is not set, allow all as fallback
    if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

// Rate limiting: protect AI API endpoints from abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 API requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

app.use('/api/', apiLimiter);

// Default JSON limit for most endpoints (1MB)
app.use(express.json({ limit: '1mb' }));

// ─── Input Validation Helpers ────────────────────────────────────────

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
];

const ALLOWED_SECTION_TYPES = ['experience', 'education', 'project'];

const MAX_TEXT_LENGTH = 10000; // Maximum characters for text inputs
const MAX_BASE64_LENGTH = 15 * 1024 * 1024; // ~15MB for base64 data

function sanitizeTextForPrompt(text: string): string {
  // Strip control characters and limit length
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .slice(0, MAX_TEXT_LENGTH)
    .trim();
}

function sanitizeContextField(value: any): string {
  if (typeof value !== 'string') return 'Unknown';
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, 200).trim() || 'Unknown';
}

// ─── API Routes ──────────────────────────────────────────────────────

app.post('/api/parse-cv', express.json({ limit: '15mb' }), async (req, res) => {
  try {
    const { base64Data, mimeType } = req.body;

    if (!base64Data || typeof base64Data !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid base64Data in request body' });
    }

    if (base64Data.length > MAX_BASE64_LENGTH) {
      return res.status(400).json({ error: 'File too large. Maximum allowed size is 10 MB.' });
    }

    // Validate mimeType against allow-list
    const validatedMimeType = ALLOWED_MIME_TYPES.includes(mimeType) ? mimeType : 'application/pdf';

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'AI service is not configured. Please contact the administrator.' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `Extract the resume data from this CV/Resume document.
          Return a JSON object that strictly matches the following structure.
          For arrays like experience, education, skills, courses, languages, projects, and awards, extract as much detail as possible.
          Ensure dates are in a readable format (e.g., "Jan 2020", "2015").
          If a field is not found, leave it as an empty string or empty array.`;

    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: validatedMimeType
          }
        },
        prompt
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            personalInfo: {
              type: Type.OBJECT,
              properties: {
                fullName: { type: Type.STRING },
                email: { type: Type.STRING },
                phone: { type: Type.STRING },
                address: { type: Type.STRING },
                summary: { type: Type.STRING },
                dob: { type: Type.STRING },
                nic: { type: Type.STRING },
                gender: { type: Type.STRING },
                nationality: { type: Type.STRING },
                religion: { type: Type.STRING },
                maritalStatus: { type: Type.STRING }
              }
            },
            experience: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  company: { type: Type.STRING },
                  position: { type: Type.STRING },
                  startDate: { type: Type.STRING },
                  endDate: { type: Type.STRING },
                  description: { type: Type.STRING },
                }
              }
            },
            education: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  institution: { type: Type.STRING },
                  degree: { type: Type.STRING },
                  startDate: { type: Type.STRING },
                  endDate: { type: Type.STRING },
                  description: { type: Type.STRING },
                }
              }
            },
            skills: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  level: { type: Type.INTEGER, description: "1 to 5" },
                  category: { type: Type.STRING, description: "e.g., Frontend, Backend, Tools, Soft Skills" }
                }
              }
            },
            courses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  institution: { type: Type.STRING },
                  startDate: { type: Type.STRING },
                  endDate: { type: Type.STRING }
                }
              }
            },
            languages: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  proficiency: { type: Type.STRING }
                }
              }
            },
            projects: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  link: { type: Type.STRING }
                }
              }
            },
            awards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  date: { type: Type.STRING },
                  issuer: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    const jsonStr = response.text?.trim();
    if (jsonStr) {
      // Strip markdown code fences if present
      const cleanJson = jsonStr.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
      try {
        const result = JSON.parse(cleanJson);
        return res.json(result);
      } catch {
        console.error("Failed to parse AI response as JSON");
        return res.status(500).json({ error: "Failed to parse document. Please try again." });
      }
    } else {
      return res.status(500).json({ error: "No data returned. Please try again." });
    }
  } catch (error: any) {
    console.error("Backend API Error:", error);
    return res.status(500).json({ error: "Failed to process document. Please try again." });
  }
});

// AI Generate Professional Summary
app.post('/api/generate-summary', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'AI service is not configured. Please contact the administrator.' });
    }

    const { experience, education, skills } = req.body;

    // Validate inputs are arrays
    if (experience && !Array.isArray(experience)) {
      return res.status(400).json({ error: 'Invalid experience data' });
    }
    if (education && !Array.isArray(education)) {
      return res.status(400).json({ error: 'Invalid education data' });
    }
    if (skills && !Array.isArray(skills)) {
      return res.status(400).json({ error: 'Invalid skills data' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Sanitize and limit data size before embedding in prompt
    const safeExp = JSON.stringify((experience || []).slice(0, 10)).slice(0, 5000);
    const safeEdu = JSON.stringify((education || []).slice(0, 10)).slice(0, 5000);
    const safeSkills = JSON.stringify(((skills || []) as any[]).slice(0, 30).map((s: any) => sanitizeContextField(s.name))).slice(0, 2000);

    const context = `Based on the following CV data, write a compelling professional summary (2-3 sentences, first person implied but don't start with "I").

Experience: ${safeExp}
Education: ${safeEdu}
Skills: ${safeSkills}

Rules:
- Keep it concise (2-3 sentences max)
- Use strong action-oriented language
- Mention years of experience if determinable
- Highlight key technical skills and domain expertise
- Make it ATS-friendly
- Do NOT use markdown formatting
- Return ONLY the summary text, nothing else`;

    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: [context],
    });

    const text = response.text?.trim();
    if (text) {
      return res.json({ summary: text });
    } else {
      return res.status(500).json({ error: "No summary generated. Please try again." });
    }
  } catch (error: any) {
    console.error("Generate Summary Error:", error);
    return res.status(500).json({ error: "Failed to generate summary. Please try again." });
  }
});

// AI Refine Text (for experience, education, project descriptions)
app.post('/api/refine-text', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'AI service is not configured. Please contact the administrator.' });
    }

    const { text, sectionType, context } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'No text provided to refine' });
    }

    // Validate sectionType against allow-list
    if (sectionType && !ALLOWED_SECTION_TYPES.includes(sectionType)) {
      return res.status(400).json({ error: 'Invalid section type' });
    }

    const safeText = sanitizeTextForPrompt(text);
    const safePosition = sanitizeContextField(context?.position);
    const safeCompany = sanitizeContextField(context?.company);
    const safeDegree = sanitizeContextField(context?.degree);
    const safeInstitution = sanitizeContextField(context?.institution);
    const safeName = sanitizeContextField(context?.name);

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let prompt = '';

    switch (sectionType) {
      case 'experience':
        prompt = `Refine and professionally rewrite the following job experience description for a CV/resume.

Role: ${safePosition} at ${safeCompany}

Original text:
"${safeText}"

Rules:
- Use bullet points (HTML <ul><li> tags) for each achievement/responsibility
- Start each bullet with a strong action verb (Led, Developed, Implemented, Managed, etc.)
- Add quantifiable metrics where reasonable (%, numbers, timeframes)
- Keep it professional and concise
- 3-5 bullet points maximum
- Use HTML formatting (<ul>, <li>, <strong> tags only)
- Do NOT wrap in code blocks or markdown
- Return ONLY the HTML content`;
        break;

      case 'education':
        prompt = `Refine the following education description for a CV/resume.

Degree: ${safeDegree} at ${safeInstitution}

Original text:
"${safeText}"

Rules:
- Highlight academic achievements, GPA, honors, relevant coursework
- Keep it concise (1-3 short lines)
- Use HTML formatting if multiple points (<ul><li> tags)
- Make it professional and impactful
- Do NOT wrap in code blocks or markdown
- Return ONLY the HTML content`;
        break;

      case 'project':
        prompt = `Refine the following project description for a CV/resume.

Project: ${safeName}

Original text:
"${safeText}"

Rules:
- Describe the project's purpose, your role, and technologies used
- Highlight impact and results
- Use bullet points (HTML <ul><li> tags) if multiple points
- Keep it concise (2-4 lines)
- Use HTML formatting (<ul>, <li>, <strong> tags only)
- Do NOT wrap in code blocks or markdown
- Return ONLY the HTML content`;
        break;

      default:
        prompt = `Professionally rewrite the following text for a CV/resume:
"${safeText}"
Return ONLY the refined text using HTML formatting. Do NOT wrap in code blocks.`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: [prompt],
    });

    let result = response.text?.trim();
    if (result) {
      // Strip markdown code fences if present
      result = result.replace(/^```(?:html)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
      return res.json({ refined: result });
    } else {
      return res.status(500).json({ error: "No refined text generated. Please try again." });
    }
  } catch (error: any) {
    console.error("Refine Text Error:", error);
    return res.status(500).json({ error: "Failed to refine text. Please try again." });
  }
});

// AI Generate PDF via Puppeteer
app.post('/api/generate-pdf', async (req, res) => {
  try {
    const { cvData, template } = req.body;
    
    if (!cvData) {
      return res.status(400).json({ error: 'Missing CV data' });
    }

    // Helper to find Chrome/Edge on Windows as a fallback
    const findSystemBrowser = () => {
      if (process.platform !== 'win32') return null;
      
      const commonPaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      ];
      
      for (const p of commonPaths) {
        if (fs.existsSync(p)) return p;
      }
      return null;
    };

    const executablePath = findSystemBrowser();

    // Launch puppeteer with memory-saving flags
      ]
    };

    // On Render (Docker), Puppeteer might need to use a specific executable path 
    // or we can just let it use the one downloaded during 'npm install'.
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      console.log(`Using custom browser at: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
    } else if (executablePath) {
      launchOptions.executablePath = executablePath;
      console.log(`Using system browser at: ${executablePath}`);
    } else {
      console.log("No custom executable path found, using Puppeteer default.");
    }

    console.log("Launching Puppeteer...");
    const browser = await puppeteer.launch(launchOptions);
    console.log("Browser launched successfully.");

    const page = await browser.newPage();
    
    // Set to A4 portrait
    await page.setViewport({ width: 794, height: 1122, deviceScaleFactor: 2 });

    // Navigate to local print page
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? `http://127.0.0.1:${PORT}` 
      : 'http://localhost:3000'; // Vite dev server port

    console.log(`Navigating to: ${baseUrl}/print`);
    await page.goto(`${baseUrl}/print`, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    // Inject data
    await page.evaluate((data: any, tpl: string) => {
      (window as any).__CV_DATA__ = data;
      (window as any).__CV_TEMPLATE__ = tpl;
    }, cvData, template || 'modern');

    // Wait for the render to complete
    console.log("Injecting data and waiting for render flag...");
    await page.waitForFunction('window.__CV_RENDERED__ === true', { timeout: 15000 });
    console.log("Render completed.");

    // Hide scrollbars for the PDF
    await page.addStyleTag({ content: '::-webkit-scrollbar { display: none; } * { scrollbar-width: none; }' });

    // Generate PDF
    console.log("Generating PDF buffer...");
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });
    console.log(`PDF generated. Buffer size: ${pdfBuffer.length}`);

    await browser.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': pdfBuffer.length.toString()
    });

    res.send(Buffer.from(pdfBuffer));
  } catch (error) {
    console.error("PDF generation error:", error);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
});

// --- Serve frontend static files in production ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, 'dist');

app.use(express.static(distPath));

// Catch-all: serve index.html for any non-API route (React Router support)
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
