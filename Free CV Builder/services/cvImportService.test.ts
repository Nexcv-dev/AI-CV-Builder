import { describe, expect, it, vi } from 'vitest';
import { extractCvText, parseCvTextToStructuredData } from './cvImportService';

describe('cv import parser', () => {
  it('extracts clear section data while ignoring unrelated lines', () => {
    const parsed = parseCvTextToStructuredData(`
Jane Perera
jane@example.com
+94 77 123 4567

Experience
Software Engineer at NexCV Technologies
Jan 2022 - Present
Built resume import workflows.

Education
BSc Computer Science
University of Colombo
2018 - 2021

Skills
React, TypeScript, AWS
This is a long sentence that should not become a skill.

Languages
English - Fluent
Sinhala - Native
`);

    expect(parsed.personalInfo.fullName).toBe('Jane Perera');
    expect(parsed.experience).toEqual([
      expect.objectContaining({
        position: 'Software Engineer',
        company: 'NexCV Technologies',
        startDate: 'Jan 2022',
        endDate: 'Present',
      }),
    ]);
    expect(parsed.education).toEqual([
      expect.objectContaining({
        degree: 'BSc Computer Science',
        institution: 'University of Colombo',
      }),
    ]);
    expect(parsed.skills.map((skill) => skill.name)).toEqual(['React', 'TypeScript', 'AWS']);
    expect(parsed.languages).toEqual([
      { name: 'English', proficiency: 'Fluent' },
      { name: 'Sinhala', proficiency: 'Native' },
    ]);
  });

  it('does not force ambiguous OCR lines into structured sections', () => {
    const parsed = parseCvTextToStructuredData(`
Experience
Completed Bachelor of Information Technology
University of Moratuwa
2019 - 2022

Education
Worked with customers and improved daily operations.

Skills
Managed customer requests and prepared monthly sales reports.
2020 - 2023

References
Available upon request
`);

    expect(parsed.experience).toEqual([]);
    expect(parsed.education).toEqual([]);
    expect(parsed.skills).toEqual([]);
    expect(parsed.references).toEqual([]);
  });

  it('keeps sidebar personal data out of two-column work and education sections', () => {
    const parsed = parseCvTextToStructuredData(`
DETAILS
jane.doe@exam
ple.com
+1 234 567 890
New York, NY

PERSONAL INFO
1990-01-01
199012345678
FEMALE
AMERICAN
CHRISTIANITY
SINGLE

SKILLS
JAVASCRIPT
TYPESCRIPT
REACT
NODE.JS
TAILWIND CSS
GIT

JANE DOE
PROFILE
A highly motivated and detail-oriented professional with experience in software development and project management.

EXPERIENCE
Jan 2020 - Present
0
AMERICAN
CHRISTIANITY
Senior Software Engineer
Tech Solutions Inc.
Led a team of 5 engineers to develop a scalable web application.

EDUCATION
Sep 2015 - May 2019
Bachelor of Science in Computer Science
State University
Graduated with Honors. Coursework included Data Structures, Algorithms, and Web Development.
TAILWIND CSS GIT
`);

    expect(parsed.personalInfo.fullName).toBe('Jane Doe');
    expect(parsed.personalInfo.email).toBe('jane.doe@example.com');
    expect(parsed.personalInfo.phone).toBe('+1 234 567 890');
    expect(parsed.personalInfo.nic).toBe('199012345678');
    expect(parsed.personalInfo.gender).toBe('FEMALE');
    expect(parsed.personalInfo.nationality).toBe('AMERICAN');
    expect(parsed.personalInfo.religion).toBe('CHRISTIANITY');
    expect(parsed.personalInfo.maritalStatus).toBe('SINGLE');
    expect(parsed.personalInfo.summary).toBe('A highly motivated and detail-oriented professional with experience in software development and project management.');
    expect(parsed.experience).toEqual([
      expect.objectContaining({
        position: 'Senior Software Engineer',
        company: 'Tech Solutions Inc.',
        startDate: 'Jan 2020',
        endDate: 'Present',
        description: 'Led a team of 5 engineers to develop a scalable web application.',
      }),
    ]);
    expect(parsed.education).toEqual([
      expect.objectContaining({
        degree: 'Bachelor of Science in Computer Science',
        institution: 'State University',
        description: 'Graduated with Honors. Coursework included Data Structures, Algorithms, and Web Development.',
      }),
    ]);
    expect(parsed.skills.map((skill) => skill.name)).toEqual(['JavaScript', 'TypeScript', 'React', 'Node.js', 'Tailwind CSS', 'Git']);
  });

  it('splits multiple experience and education entries into separate records', () => {
    const parsed = parseCvTextToStructuredData(`
EXPERIENCE
Senior Software Engineer
Tech Solutions Inc.
Jan 2020 - Present
Led platform migration work.

Frontend Developer
Creative Apps Ltd.
Jun 2017 - Dec 2019
Built React dashboards.

EDUCATION
Bachelor of Science in Computer Science
State University
Sep 2015 - May 2019
Graduated with Honors.

Diploma in Software Engineering
Tech Institute
Jan 2014 - Dec 2014
Completed practical software training.
`);

    expect(parsed.experience).toEqual([
      expect.objectContaining({
        position: 'Senior Software Engineer',
        company: 'Tech Solutions Inc.',
        startDate: 'Jan 2020',
        endDate: 'Present',
        description: 'Led platform migration work.',
      }),
      expect.objectContaining({
        position: 'Frontend Developer',
        company: 'Creative Apps Ltd.',
        startDate: 'Jun 2017',
        endDate: 'Dec 2019',
        description: 'Built React dashboards.',
      }),
    ]);
    expect(parsed.education).toEqual([
      expect.objectContaining({
        degree: 'Bachelor of Science in Computer Science',
        institution: 'State University',
        startDate: 'Sep 2015',
        endDate: 'May 2019',
        description: 'Graduated with Honors.',
      }),
      expect.objectContaining({
        degree: 'Diploma in Software Engineering',
        institution: 'Tech Institute',
        startDate: 'Jan 2014',
        endDate: 'Dec 2014',
        description: 'Completed practical software training.',
      }),
    ]);
  });

  it('marks unsupported import input with no OCR provider', async () => {
    const result = await extractCvText(Buffer.from('hello').toString('base64'), 'text/plain');

    expect(result).toEqual({ text: '', usedOcr: false, ocrProvider: 'none' });
  });

  it('does not run local image OCR when AWS OCR is configured', async () => {
    const originalFunctionName = process.env.OCR_LAMBDA_FUNCTION_NAME;
    const originalUrl = process.env.OCR_LAMBDA_URL;
    process.env.OCR_LAMBDA_FUNCTION_NAME = 'test-ocr-lambda';
    delete process.env.OCR_LAMBDA_URL;
    vi.resetModules();

    const { extractCvText: extractWithAwsConfigured } = await import('./cvImportService');
    const result = await extractWithAwsConfigured(Buffer.from('not an image').toString('base64'), 'image/png');

    expect(result).toEqual({ text: '', usedOcr: false, ocrProvider: 'aws-lambda' });

    if (originalFunctionName === undefined) delete process.env.OCR_LAMBDA_FUNCTION_NAME;
    else process.env.OCR_LAMBDA_FUNCTION_NAME = originalFunctionName;
    if (originalUrl === undefined) delete process.env.OCR_LAMBDA_URL;
    else process.env.OCR_LAMBDA_URL = originalUrl;
    vi.resetModules();
  });
});
