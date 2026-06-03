import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { PDFParse } from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import path from 'node:path';

type CvImportSource = 'ai' | 'basic';
type OcrProvider = 'aws-lambda' | 'local-tesseract' | 'pdf-text' | 'none';

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
    ocrProvider: OcrProvider;
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
  personalInfo: [/^(details|personal info|personal details|contact|contact details)$/i],
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
const yearPattern = /\b(?:19|20)\d{2}\b/;
const degreePattern = /\b(?:degree|bachelor|master|diploma|certificate|advanced level|ordinary level|bsc|msc|ba|ma|phd|mba|hnd|nvq|gce|a\/l|o\/l)\b/i;
const institutionPattern = /\b(?:university|college|school|institute|academy|campus|faculty|polytechnic)\b/i;
const jobTitlePattern = /\b(?:engineer|developer|designer|manager|assistant|associate|executive|officer|analyst|consultant|coordinator|specialist|technician|intern|trainee|accountant|teacher|nurse|driver|cashier|clerk|supervisor|administrator|representative|lead|head|director)\b/i;
const companyPattern = /\b(?:pvt|ltd|limited|inc|llc|company|group|solutions|technologies|systems|services|holdings|bank|hospital|hotel|restaurant|agency|store|center|centre)\b/i;
const coursePattern = /\b(?:certification|certificate|course|training|license|licence|workshop|bootcamp|diploma)\b/i;
const awardPattern = /\b(?:award|honou?r|achievement|winner|recognized|recognised|scholarship|medal|prize)\b/i;
const proficiencyPattern = /\b(?:native|fluent|professional|conversational|intermediate|beginner|basic|advanced|excellent|good|fair|written|spoken)\b/i;
const knownLanguagePattern = /\b(?:english|sinhala|tamil|hindi|arabic|french|german|spanish|italian|chinese|mandarin|japanese|korean|russian|dutch|portuguese)\b/i;
const sectionNoisePattern = /\b(?:experience|education|skills|projects|references|summary|profile|curriculum vitae|resume)\b/i;
const personalInfoNoisePattern = /\b(?:male|female|american|sri lankan|christianity|buddhist|hindu|islam|muslim|single|married|nationality|religion|gender|nic|dob|personal info)\b/i;
const knownSkillNames = [
  'JavaScript',
  'TypeScript',
  'React',
  'Node.js',
  'Tailwind CSS',
  'Git',
  'AWS',
  'HTML',
  'CSS',
  'Python',
  'Java',
  'SQL',
  'MongoDB',
  'Express',
];

const splitIntoSections = (text: string) => {
  const sections: Record<SectionKey, string[]> = {
    personalInfo: [],
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
  const name = topLines.find((line) => {
    const lower = line.toLowerCase();
    if (blocked.has(lower) || lower.includes('@') || /\d{3,}/.test(line)) return false;
    if (line.includes(',') || /linkedin|github|portfolio|curriculum vitae|resume|address/i.test(line)) return false;
    if (personalInfoNoisePattern.test(line) || extractKnownSkills(line).length) return false;
    const words = line.split(/\s+/).filter(Boolean);
    return words.length >= 2 && words.length <= 5 && line.length <= 80;
  }) || '';
  return /^[A-Z\s.'-]+$/.test(name)
    ? name.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
    : name;
};

const stripInlineSectionLabels = (value: string) => cleanText(value
  .replace(/^(?:personal info|personal details|details|profile|professional summary|summary|skills(?:\s*&\s*expertise)?)\b\s*:?\s*/i, ' ')
  .replace(/\s+/g, ' '));

const parseSummary = (lines: string[]) => {
  const summary = stripInlineSectionLabels(lines.slice(0, 4).join(' '));
  return cleanText(summary.replace(/^(?:info|profile)\s+/i, ''), 700);
};

const wordCount = (value: string) => value.split(/\s+/).filter(Boolean).length;

const isLikelySentence = (value: string) => wordCount(value) > 8 || /[.!?]\s*$/.test(value);

const hasContactNoise = (value: string) => value.includes('@') || /(?:\+?\d[\d\s().-]{7,}\d)/.test(value);

const isUsefulSectionLine = (value: string) => {
  const line = cleanLine(value);
  if (/^[\d\s.,/-]+$/.test(line)) return false;
  return Boolean(line) && !sectionNoisePattern.test(line) && !personalInfoNoisePattern.test(line) && !hasContactNoise(line);
};

const normalizedForEmail = (text: string) => text
  .replace(/\s*@\s*/g, '@')
  .replace(/([A-Z0-9._%+-]+@[A-Z0-9.-]*[A-Z])\s+([A-Z0-9.-]+\.[A-Z]{2,})\b/gi, '$1$2')
  .replace(/([A-Z0-9._%+-]+@[A-Z0-9.-]+)\s+([A-Z]{2,})\b/gi, '$1.$2');

const extractPersonalDetails = (text: string, lines: string[]) => {
  const joined = lines.join('\n');
  const compactText = normalizedForEmail(`${text}\n${joined}`);
  const dob = compactText.match(/\b(?:19|20)\d{2}[-/]\d{2}[-/]\d{2}\b/)?.[0] || '';
  const nic = compactText.match(/\b(?:\d{9}[vx]|\d{12})\b/i)?.[0] || '';
  const gender = compactText.match(/\b(male|female)\b/i)?.[1] || '';
  const nationality = compactText.match(/\b(sri lankan|american|british|indian|canadian|australian)\b/i)?.[1] || '';
  const religion = compactText.match(/\b(christianity|christian|buddhist|hindu|islam|muslim|catholic)\b/i)?.[1] || '';
  const maritalStatus = compactText.match(/\b(single|married|divorced|widowed)\b/i)?.[1] || '';

  return {
    email: extractEmail(compactText),
    phone: extractPhone(compactText),
    dob,
    nic,
    gender: cleanText(gender, 20),
    nationality: cleanText(nationality, 40),
    religion: cleanText(religion, 40),
    maritalStatus: cleanText(maritalStatus, 20),
  };
};

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

const splitEntryBlocks = (lines: string[], startsEntry: (line: string) => boolean) => {
  const blocks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    const startsNewEntry = current.some((item) => dateRangePattern.test(item)) && current.some(startsEntry) && startsEntry(line);
    if (startsNewEntry && current.length) {
      blocks.push(current);
      current = [];
    }

    if (dateRangePattern.test(line) && current.some((item) => dateRangePattern.test(item))) {
      blocks.push(current);
      current = [];
    }

    current.push(line);
  }

  if (current.length) blocks.push(current);
  return blocks;
};

const parseExperience = (lines: string[]) => splitEntryBlocks(lines, (line) => jobTitlePattern.test(line))
  .map((block) => {
    const joined = block.join(' ');
    const dateMatch = joined.match(dateRangePattern);
    if (!dateMatch) return null;
    if (degreePattern.test(joined) || institutionPattern.test(joined)) return null;

    const nonDateLines = block
      .map((line) => cleanLine(line.replace(dateRangePattern, '')))
      .filter(isUsefulSectionLine);
    const jobLineIndex = nonDateLines.findIndex((line) => jobTitlePattern.test(line));
    const titleLine = jobLineIndex >= 0 ? nonDateLines[jobLineIndex] : nonDateLines[0] || '';
    const secondLine = jobLineIndex >= 0 ? nonDateLines[jobLineIndex + 1] || '' : nonDateLines[1] || '';
    if (!titleLine) return null;

    const atSplit = titleLine.split(/\s+at\s+/i).map(cleanLine);
    const position = atSplit.length > 1 ? atSplit[0] : cleanLine(titleLine.replace(companyPattern, ''));
    const company = atSplit.length > 1 ? atSplit.slice(1).join(' at ') : (companyPattern.test(titleLine) ? titleLine.replace(position, '').trim() : secondLine);
    const hasWorkEvidence = jobTitlePattern.test(position) || companyPattern.test(company) || /\s+at\s+/i.test(titleLine);
    if (!hasWorkEvidence || isLikelySentence(position)) return null;

    return {
      company: company || '',
      position: position || '',
      startDate: cleanLine(dateMatch[1]),
      endDate: cleanLine(dateMatch[2]),
      description: cleanText(nonDateLines.filter((_, index) => index !== jobLineIndex && index !== jobLineIndex + 1).join(' '), 1000),
    };
  })
  .filter((item): item is NonNullable<typeof item> => Boolean(item && (item.company || item.position)));

const parseEducation = (lines: string[]) => splitEntryBlocks(lines, (line) => degreePattern.test(line))
  .map((block) => {
    const joined = block.join(' ');
    const dateMatch = joined.match(dateRangePattern);
    if (jobTitlePattern.test(joined) && !degreePattern.test(joined) && !institutionPattern.test(joined)) return null;

    const nonDateLines = block
      .map((line) => cleanLine(line.replace(dateRangePattern, '')))
      .filter(isUsefulSectionLine);
    const degreeIndex = nonDateLines.findIndex((line) => degreePattern.test(line));
    const degree = degreeIndex >= 0 ? nonDateLines[degreeIndex] : nonDateLines[0] || '';
    const institution = nonDateLines.find((line, index) => index !== degreeIndex && institutionPattern.test(line)) || '';
    if (!degreePattern.test(degree) && !institution) return null;
    return {
      institution,
      degree,
      startDate: dateMatch ? cleanLine(dateMatch[1]) : '',
      endDate: dateMatch ? cleanLine(dateMatch[2]) : '',
      description: cleanText(nonDateLines
        .filter((line) => line !== degree && line !== institution)
        .filter((line) => !extractKnownSkills(line).length)
        .join(' '), 500),
    };
  })
  .filter((item): item is NonNullable<typeof item> => Boolean(item && (item.degree || item.institution)));

const isLikelySkill = (name: string) => {
  if (!name || name.length > 60 || wordCount(name) > 5) return false;
  if (dateRangePattern.test(name) || yearPattern.test(name) || hasContactNoise(name)) return false;
  if (isLikelySentence(name) || sectionNoisePattern.test(name)) return false;
  if (/^[A-Z\s.'-]+$/.test(name) && wordCount(name) === 2 && !extractKnownSkills(name).length) return false;
  return /[a-z]/i.test(name);
};

const extractKnownSkills = (line: string) => knownSkillNames.filter((skill) => {
  const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\.?/g, '\\.?');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(line);
}).filter((skill, _index, matches) => !matches.some((other) => other !== skill && other.toLowerCase().includes(skill.toLowerCase())));

const splitSkillLine = (line: string) => {
  if (/[,|\u2022]/.test(line)) return line.split(/[,|\u2022]/);
  const known = extractKnownSkills(line);
  if (known.length) return known;
  return [line];
};

const parseSkills = (lines: string[]) => unique(lines.flatMap(splitSkillLine)).slice(0, 30)
  .filter(isLikelySkill)
  .map((name) => ({ name, level: 4 }));

const parseCourses = (lines: string[]) => unique(lines).slice(0, 12)
  .map((line) => {
    if (!coursePattern.test(line) && !degreePattern.test(line)) return null;
    const date = line.match(yearPattern)?.[0] || '';
    return { name: cleanLine(line.replace(date, '')), institution: '', startDate: '', endDate: date };
  })
  .filter((item): item is NonNullable<typeof item> => Boolean(item?.name && !isLikelySentence(item.name)));

const parseLanguages = (lines: string[]) => unique(lines.flatMap((line) => line.split(/[,|\u2022]/))).slice(0, 10)
  .map((line) => {
    if (!knownLanguagePattern.test(line) && !proficiencyPattern.test(line)) return null;
    const [name, proficiency] = line.split(/[-:]/).map(cleanLine);
    return { name, proficiency: proficiency || '' };
  })
  .filter((item): item is NonNullable<typeof item> => Boolean(item?.name && wordCount(item.name) <= 3));

const parseNamedDescriptions = (lines: string[]) => unique(lines).slice(0, 12)
  .map((line) => {
    const [name, ...rest] = line.split(/[-:]/).map(cleanLine);
    if (!name || wordCount(name) > 8 || (!rest.length && !/https?:\/\/\S+/.test(line))) return null;
    return { name, description: cleanText(rest.join(' '), 700), link: line.match(/https?:\/\/\S+/)?.[0] || '' };
  })
  .filter((item): item is NonNullable<typeof item> => Boolean(item?.name));

const parseAwards = (lines: string[]) => unique(lines).slice(0, 12)
  .map((line) => {
    if (!awardPattern.test(line)) return null;
    return { name: cleanLine(line.replace(yearPattern, '')), date: line.match(yearPattern)?.[0] || '', issuer: '' };
  })
  .filter((item): item is NonNullable<typeof item> => Boolean(item?.name && !isLikelySentence(item.name)));

const parseReferences = (lines: string[]) => splitDatedBlocks(lines).flatMap((block) => block.length ? [block] : [])
  .slice(0, 6)
  .map((block) => {
    const joined = block.join(' ');
    const email = extractEmail(joined);
    const phone = extractPhone(joined);
    if (!email && !phone) return null;
    return {
      name: block.find((line) => !line.includes('@') && !/\d{7,}/.test(line)) || '',
      position: '',
      company: '',
      email,
      phone,
    };
  })
  .filter((item): item is NonNullable<typeof item> => Boolean(item && (item.name || item.email || item.phone)));

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

const normalizeLambdaPayload = (payload: any): { text: string; usedOcr: boolean; ocrProvider: OcrProvider } | null => {
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
    ocrProvider: 'aws-lambda',
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
  const personalLines = [...top, ...sections.personalInfo];
  const personalDetails = extractPersonalDetails(normalized, personalLines);
  const email = personalDetails.email;
  const phone = personalDetails.phone;

  result.personalInfo.email = email;
  result.personalInfo.phone = phone;
  result.personalInfo.fullName = parseName([...personalLines, ...sections.skills], email, phone);
  result.personalInfo.dob = personalDetails.dob;
  result.personalInfo.nic = personalDetails.nic;
  result.personalInfo.gender = personalDetails.gender;
  result.personalInfo.nationality = personalDetails.nationality;
  result.personalInfo.religion = personalDetails.religion;
  result.personalInfo.maritalStatus = personalDetails.maritalStatus;
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

export const extractCvText = async (base64Data: string, mimeType: string): Promise<{ text: string; usedOcr: boolean; ocrProvider: OcrProvider }> => {
  const lambdaResult = await extractWithConfiguredLambda(base64Data, mimeType);
  if (lambdaResult) return lambdaResult;

  const buffer = Buffer.from(base64Data, 'base64');
  if (mimeType === 'application/pdf') {
    const parser = new PDFParse({ data: buffer });
    try {
      const parsed = await parser.getText().catch(() => ({ text: '' }));
      const text = cleanExtractedText(parsed.text || '');
      if (text.length >= 120) {
        return { text, usedOcr: false, ocrProvider: 'pdf-text' };
      }

      const ocrText = await ocrPdfPages(parser).catch(() => '');
      return {
        text: cleanExtractedText(ocrText || text),
        usedOcr: Boolean(ocrText),
        ocrProvider: ocrText ? 'local-tesseract' : 'pdf-text',
      };
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  }

  if (mimeType.startsWith('image/')) {
    return { text: cleanExtractedText(await recognizeImageBuffer(buffer)), usedOcr: true, ocrProvider: 'local-tesseract' };
  }

  return { text: '', usedOcr: false, ocrProvider: 'none' };
};

export const withImportMeta = (data: ParsedCvImport, meta: ParsedCvImport['importMeta']) => ({
  ...data,
  importMeta: meta,
});
