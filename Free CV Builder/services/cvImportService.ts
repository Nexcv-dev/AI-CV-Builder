import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { PDFParse } from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import path from 'node:path';

type CvImportSource = 'ai' | 'basic';

export interface ParsedCvImport {
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    summary: string;
    dob: string;
    nic: string;
    gender: string;
    nationality: string;
    religion: string;
    maritalStatus: string;
  };
  experience: Array<{ company: string; position: string; startDate: string; endDate: string; description: string }>;
  education: Array<{ institution: string; degree: string; startDate: string; endDate: string; description: string }>;
  skills: Array<{ name: string; level: number; category?: string }>;
  courses: Array<{ name: string; institution: string; startDate: string; endDate: string }>;
  languages: Array<{ name: string; proficiency: string }>;
  projects: Array<{ name: string; description: string; link: string }>;
  awards: Array<{ name: string; date: string; issuer: string }>;
  references: Array<{ name: string; position: string; company: string; email: string; phone: string }>;
  importMeta?: {
    source: CvImportSource;
    extractedTextLength: number;
    usedAi: boolean;
    usedOcr: boolean;
    message?: string;
  };
}

const blankImport = (): ParsedCvImport => ({
  personalInfo: {
    fullName: '',
    email: '',
    phone: '',
    address: '',
    summary: '',
    dob: '',
    nic: '',
    gender: '',
    nationality: '',
    religion: '',
    maritalStatus: '',
  },
  experience: [],
  education: [],
  skills: [],
  courses: [],
  languages: [],
  projects: [],
  awards: [],
  references: [],
});

const SECTION_ALIASES = {
  summary: [/^(profile|professional profile|summary|career summary|about me|objective)$/i],
  experience: [/^(experience|work experience|employment history|professional experience|career history|work history)$/i],
  education: [/^(education|academic background|educational qualifications|qualifications)$/i],
  skills: [/^(skills|technical skills|core skills|key skills|competencies)$/i],
  courses: [/^(certifications|certificates|courses|licenses|training)$/i],
  languages: [/^(languages|language skills)$/i],
  projects: [/^(projects|portfolio|personal projects)$/i],
  awards: [/^(awards|honors|achievements)$/i],
  references: [/^(references|referees)$/i],
} as const;

type SectionKey = keyof typeof SECTION_ALIASES;

const cleanText = (value: string, limit = 1600) => value
  .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, limit);

const cleanExtractedText = (value: string, limit = 20_000) => value
  .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  .replace(/[ \t]+/g, ' ')
  .replace(/\n[ \t]+/g, '\n')
  .replace(/\n{4,}/g, '\n\n\n')
  .trim()
  .slice(0, limit);

const TESSERACT_LANG_PATH = path.resolve(process.cwd(), 'node_modules', '@tesseract.js-data', 'eng', '4.0.0');
const OCR_LAMBDA_TIMEOUT_MS = Number(process.env.OCR_LAMBDA_TIMEOUT_MS || 45_000);
const OCR_LAMBDA_FUNCTION_NAME = process.env.OCR_LAMBDA_FUNCTION_NAME?.trim();
const OCR_LAMBDA_REGION = process.env.OCR_LAMBDA_REGION?.trim();
const OCR_LAMBDA_URL = process.env.OCR_LAMBDA_URL?.trim();

let lambdaClient: LambdaClient | null = null;

const getLambdaClient = () => {
  if (!lambdaClient) {
    lambdaClient = new LambdaClient({ region: OCR_LAMBDA_REGION || process.env.AWS_REGION || 'eu-north-1' });
  }
  return lambdaClient;
};

const cleanLine = (value: string) => cleanText(value.replace(/^[\u2022*\-\u2013\u2014]\s*/, ''), 240);

const unique = (items: string[]) => Array.from(new Set(items.map((item) => cleanLine(item)).filter(Boolean)));

const lineLooksLikeHeading = (line: string) => {
  const cleaned = cleanLine(line).replace(/:$/, '');
  return Object.entries(SECTION_ALIASES).find(([, patterns]) => patterns.some((pattern) => pattern.test(cleaned)))?.[0] as SectionKey | undefined;
};

const extractEmail = (text: string) => text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';

const extractPhone = (text: string) => {
  const match = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/);
  return match ? cleanText(match[0], 32) : '';
};

const dateRangePattern = /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{4})\s*(?:-|\u2013|\u2014|to)\s*((?:present|current|now)|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{4})/i;

const splitIntoSections = (text: string) => {
  const sections: Record<SectionKey, string[]> = {
    summary: [],
    experience: [],
    education: [],
    skills: [],
    courses: [],
    languages: [],
    projects: [],
    awards: [],
    references: [],
  };
  const top: string[] = [];
  let current: SectionKey | null = null;

  text.split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean)
    .forEach((line) => {
      const heading = lineLooksLikeHeading(line);
      if (heading) {
        current = heading;
        return;
      }
      if (current) {
        sections[current].push(line);
      } else {
        top.push(line);
      }
    });

  return { top, sections };
};

const parseName = (topLines: string[], email: string, phone: string) => {
  const blocked = new Set([email.toLowerCase(), phone.toLowerCase()]);
  return topLines.find((line) => {
    const lower = line.toLowerCase();
    if (blocked.has(lower) || lower.includes('@') || /\d{3,}/.test(line)) return false;
    if (/linkedin|github|portfolio|curriculum vitae|resume|address/i.test(line)) return false;
    const words = line.split(/\s+/).filter(Boolean);
    return words.length >= 2 && words.length <= 5 && line.length <= 80;
  }) || '';
};

const parseSummary = (lines: string[]) => cleanText(lines.slice(0, 4).join(' '), 700);

const splitDatedBlocks = (lines: string[]) => {
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (dateRangePattern.test(line) && current.some((item) => dateRangePattern.test(item))) {
      blocks.push(current);
      current = [];
    }
    current.push(line);
  }
  if (current.length) blocks.push(current);
  return blocks;
};

const parseExperience = (lines: string[]) => splitDatedBlocks(lines)
  .map((block) => {
    const joined = block.join(' ');
    const dateMatch = joined.match(dateRangePattern);
    if (!dateMatch) return null;
    const nonDateLines = block.map((line) => cleanLine(line.replace(dateRangePattern, ''))).filter(Boolean);
    const titleLine = nonDateLines[0] || '';
    const secondLine = nonDateLines[1] || '';
    if (!titleLine && !secondLine) return null;
    const [position, company] = titleLine.includes(' at ')
      ? titleLine.split(/\s+at\s+/i).map(cleanLine)
      : [titleLine, secondLine];
    return {
      company: company || '',
      position: position || '',
      startDate: cleanLine(dateMatch[1]),
      endDate: cleanLine(dateMatch[2]),
      description: cleanText(nonDateLines.slice(company ? 2 : 1).join(' '), 1000),
    };
  })
  .filter((item): item is NonNullable<typeof item> => Boolean(item && (item.company || item.position)));

const parseEducation = (lines: string[]) => splitDatedBlocks(lines)
  .map((block) => {
    const joined = block.join(' ');
    const dateMatch = joined.match(dateRangePattern);
    const nonDateLines = block.map((line) => cleanLine(line.replace(dateRangePattern, ''))).filter(Boolean);
    const degreeIndex = nonDateLines.findIndex((line) => /degree|bachelor|master|diploma|certificate|advanced level|ordinary level|bsc|msc|ba|ma|phd/i.test(line));
    const degree = degreeIndex >= 0 ? nonDateLines[degreeIndex] : nonDateLines[0] || '';
    const institution = nonDateLines.find((line, index) => index !== degreeIndex && /university|college|school|institute|academy|campus/i.test(line)) || nonDateLines.find((_, index) => index !== degreeIndex) || '';
    if (!degree && !institution) return null;
    return {
      institution,
      degree,
      startDate: dateMatch ? cleanLine(dateMatch[1]) : '',
      endDate: dateMatch ? cleanLine(dateMatch[2]) : '',
      description: cleanText(nonDateLines.filter((line) => line !== degree && line !== institution).join(' '), 500),
    };
  })
  .filter((item): item is NonNullable<typeof item> => Boolean(item && (item.degree || item.institution)));

const parseSkills = (lines: string[]) => unique(lines.flatMap((line) => line.split(/[,|\u2022]/))).slice(0, 30)
  .filter((name) => name.length <= 60 && !dateRangePattern.test(name))
  .map((name) => ({ name, level: 4 }));

const parseCourses = (lines: string[]) => unique(lines).slice(0, 12)
  .map((line) => {
    const date = line.match(/\b(19|20)\d{2}\b/)?.[0] || '';
    return { name: cleanLine(line.replace(date, '')), institution: '', startDate: '', endDate: date };
  })
  .filter((item) => item.name);

const parseLanguages = (lines: string[]) => unique(lines.flatMap((line) => line.split(/[,|\u2022]/))).slice(0, 10)
  .map((line) => {
    const [name, proficiency] = line.split(/[-:]/).map(cleanLine);
    return { name, proficiency: proficiency || '' };
  })
  .filter((item) => item.name);

const parseNamedDescriptions = (lines: string[]) => unique(lines).slice(0, 12)
  .map((line) => {
    const [name, ...rest] = line.split(/[-:]/).map(cleanLine);
    return { name, description: cleanText(rest.join(' '), 700), link: line.match(/https?:\/\/\S+/)?.[0] || '' };
  })
  .filter((item) => item.name);

const parseAwards = (lines: string[]) => unique(lines).slice(0, 12)
  .map((line) => ({ name: cleanLine(line.replace(/\b(19|20)\d{2}\b/, '')), date: line.match(/\b(19|20)\d{2}\b/)?.[0] || '', issuer: '' }))
  .filter((item) => item.name);

const parseReferences = (lines: string[]) => splitDatedBlocks(lines).flatMap((block) => block.length ? [block] : [])
  .slice(0, 6)
  .map((block) => {
    const joined = block.join(' ');
    return {
      name: block.find((line) => !line.includes('@') && !/\d{7,}/.test(line)) || '',
      position: '',
      company: '',
      email: extractEmail(joined),
      phone: extractPhone(joined),
    };
  })
  .filter((item) => item.name || item.email || item.phone);

const recognizeImageBuffer = async (buffer: Buffer | Uint8Array) => {
  const worker = await createWorker('eng', undefined, {
    langPath: TESSERACT_LANG_PATH,
    gzip: true,
  });
  try {
    const { data } = await worker.recognize(Buffer.from(buffer));
    return data.text || '';
  } finally {
    await worker.terminate();
  }
};

const ocrPdfPages = async (parser: PDFParse) => {
  const screenshot = await parser.getScreenshot({
    first: 3,
    desiredWidth: 1400,
    imageDataUrl: false,
    imageBuffer: true,
  });

  const pageTexts: string[] = [];
  for (const page of screenshot.pages) {
    if (!page.data?.length) continue;
    pageTexts.push(await recognizeImageBuffer(page.data));
  }
  return pageTexts.join('\n');
};

const normalizeLambdaPayload = (payload: any): { text: string; usedOcr: boolean } | null => {
  const body = typeof payload?.body === 'string'
    ? JSON.parse(payload.body)
    : payload;
  const text = typeof body?.text === 'string'
    ? body.text
    : typeof body?.extractedText === 'string'
      ? body.extractedText
      : '';
  if (!text.trim()) return null;
  return {
    text: cleanExtractedText(text),
    usedOcr: body?.usedOcr !== false,
  };
};

const extractWithLambdaUrl = async (base64Data: string, mimeType: string) => {
  if (!OCR_LAMBDA_URL) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OCR_LAMBDA_TIMEOUT_MS);

  try {
    const response = await fetch(OCR_LAMBDA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Source': 'cv-builder-app',
      },
      body: JSON.stringify({ base64Data, mimeType }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return normalizeLambdaPayload(await response.json().catch(() => null));
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const extractWithLambdaFunction = async (base64Data: string, mimeType: string) => {
  if (!OCR_LAMBDA_FUNCTION_NAME) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OCR_LAMBDA_TIMEOUT_MS);
  try {
    const response = await getLambdaClient().send(new InvokeCommand({
      FunctionName: OCR_LAMBDA_FUNCTION_NAME,
      InvocationType: 'RequestResponse',
      Payload: Buffer.from(JSON.stringify({ base64Data, mimeType })),
    }), { abortSignal: controller.signal });

    if (response.FunctionError || !response.Payload) return null;
    const raw = Buffer.from(response.Payload).toString('utf8');
    return normalizeLambdaPayload(JSON.parse(raw));
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const extractWithConfiguredLambda = async (base64Data: string, mimeType: string) => {
  const lambdaResult = await extractWithLambdaFunction(base64Data, mimeType)
    || await extractWithLambdaUrl(base64Data, mimeType);
  return lambdaResult && lambdaResult.text.length >= 20 ? lambdaResult : null;
};

export const parseCvTextToStructuredData = (text: string): ParsedCvImport => {
  const result = blankImport();
  const normalized = text.replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n').slice(0, 20_000);
  const { top, sections } = splitIntoSections(normalized);
  const email = extractEmail(normalized);
  const phone = extractPhone(normalized);

  result.personalInfo.email = email;
  result.personalInfo.phone = phone;
  result.personalInfo.fullName = parseName(top, email, phone);
  result.personalInfo.summary = parseSummary(sections.summary);
  result.experience = parseExperience(sections.experience).slice(0, 12);
  result.education = parseEducation(sections.education).slice(0, 12);
  result.skills = parseSkills(sections.skills);
  result.courses = parseCourses(sections.courses);
  result.languages = parseLanguages(sections.languages);
  result.projects = parseNamedDescriptions(sections.projects);
  result.awards = parseAwards(sections.awards);
  result.references = parseReferences(sections.references);
  return result;
};

export const extractCvText = async (base64Data: string, mimeType: string): Promise<{ text: string; usedOcr: boolean }> => {
  const lambdaResult = await extractWithConfiguredLambda(base64Data, mimeType);
  if (lambdaResult) return lambdaResult;

  const buffer = Buffer.from(base64Data, 'base64');
  if (mimeType === 'application/pdf') {
    const parser = new PDFParse({ data: buffer });
    try {
      const parsed = await parser.getText().catch(() => ({ text: '' }));
      const text = cleanExtractedText(parsed.text || '');
      if (text.length >= 120) {
        return { text, usedOcr: false };
      }

      const ocrText = await ocrPdfPages(parser).catch(() => '');
      return { text: cleanExtractedText(ocrText || text), usedOcr: Boolean(ocrText) };
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  }

  if (mimeType.startsWith('image/')) {
    return { text: cleanExtractedText(await recognizeImageBuffer(buffer)), usedOcr: true };
  }

  return { text: '', usedOcr: false };
};

export const withImportMeta = (data: ParsedCvImport, meta: ParsedCvImport['importMeta']) => ({
  ...data,
  importMeta: meta,
});
