import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import * as dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Increase JSON payload limit for large base64 CV/Resume files
app.use(express.json({ limit: '50mb' }));

app.post('/api/parse-cv', async (req, res) => {
  try {
    const { base64Data, mimeType } = req.body;

    if (!base64Data) {
      return res.status(400).json({ error: 'Missing base64Data in request body' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `Extract the resume data from this CV/Resume document.
          Return a JSON object that strictly matches the following structure.
          For arrays like experience, education, skills, courses, languages, projects, and awards, extract as much detail as possible.
          Ensure dates are in a readable format (e.g., "Jan 2020", "2015").
          If a field is not found, leave it as an empty string or empty array.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType || "application/pdf"
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
      const result = JSON.parse(cleanJson);
      return res.json(result);
    } else {
      return res.status(500).json({ error: "No data returned from Gemini API" });
    }
  } catch (error: any) {
    console.error("Backend API Error:", error);
    return res.status(500).json({ error: error.message || "Failed to process document" });
  }
});

// AI Generate Professional Summary
app.post('/api/generate-summary', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const { experience, education, skills } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const context = `Based on the following CV data, write a compelling professional summary (2-3 sentences, first person implied but don't start with "I").

Experience: ${JSON.stringify(experience || [])}
Education: ${JSON.stringify(education || [])}
Skills: ${JSON.stringify((skills || []).map((s: any) => s.name))}

Rules:
- Keep it concise (2-3 sentences max)
- Use strong action-oriented language
- Mention years of experience if determinable
- Highlight key technical skills and domain expertise
- Make it ATS-friendly
- Do NOT use markdown formatting
- Return ONLY the summary text, nothing else`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [context],
    });

    const text = response.text?.trim();
    if (text) {
      return res.json({ summary: text });
    } else {
      return res.status(500).json({ error: "No summary generated" });
    }
  } catch (error: any) {
    console.error("Generate Summary Error:", error);
    return res.status(500).json({ error: error.message || "Failed to generate summary" });
  }
});

// AI Refine Text (for experience, education, project descriptions)
app.post('/api/refine-text', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const { text, sectionType, context } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'No text provided to refine' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let prompt = '';

    switch (sectionType) {
      case 'experience':
        prompt = `Refine and professionally rewrite the following job experience description for a CV/resume.

Role: ${context?.position || 'Unknown'} at ${context?.company || 'Unknown'}

Original text:
"${text}"

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

Degree: ${context?.degree || 'Unknown'} at ${context?.institution || 'Unknown'}

Original text:
"${text}"

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

Project: ${context?.name || 'Unknown'}

Original text:
"${text}"

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
"${text}"
Return ONLY the refined text using HTML formatting. Do NOT wrap in code blocks.`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [prompt],
    });

    let result = response.text?.trim();
    if (result) {
      // Strip markdown code fences if present
      result = result.replace(/^```(?:html)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
      return res.json({ refined: result });
    } else {
      return res.status(500).json({ error: "No refined text generated" });
    }
  } catch (error: any) {
    console.error("Refine Text Error:", error);
    return res.status(500).json({ error: error.message || "Failed to refine text" });
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
