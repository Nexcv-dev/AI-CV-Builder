import { describe, expect, it } from 'vitest';
import { parseCvTextToStructuredData } from './cvImportService';

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
});
