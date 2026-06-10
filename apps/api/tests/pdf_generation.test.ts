import { describe, it, expect } from 'vitest';
import { generateCVHTML } from '../server';
import { CV_TEMPLATES } from '@nexcv/templates';

describe('PDF HTML Generation', () => {
  const mockCVData = {
    personalInfo: {
      fullName: 'Test User',
      position: 'Software Engineer',
      email: 'test@example.com',
      phone: '1234567890',
      address: 'Test Address',
      linkedin: '',
      github: '',
      website: '',
      summary: 'Test Summary',
    },
    experience: [
      {
        id: '1',
        company: 'Test Company',
        position: 'Test Position',
        startDate: '2020',
        endDate: '2021',
        description: 'Test Experience Description',
      }
    ],
    education: [
      {
        id: '2',
        institution: 'Test Uni',
        degree: 'Test Degree',
        startDate: '2015',
        endDate: '2019',
        description: 'Test Education Description',
      }
    ],
    skills: [
      { id: '3', name: 'React', level: 5 }
    ],
    themeColor: '#2563eb',
    sidebarColor: '#111827',
    fontFamily: 'Inter',
    sectionOrder: ['summary', 'personalDetails', 'experience', 'education', 'skills'],
    hiddenSections: [],
  };

  it('renders the full name correctly', () => {
    const html = generateCVHTML(mockCVData, 'classic');
    expect(html).toContain('Test User');
  });

  it('renders the email correctly', () => {
    const html = generateCVHTML(mockCVData, 'classic');
    expect(html).toContain('test@example.com');
  });

  it('renders experience items correctly', () => {
    const html = generateCVHTML(mockCVData, 'classic');
    expect(html).toContain('Test Company');
    expect(html).toContain('Test Position');
    expect(html).toContain('Test Experience Description');
  });

  it('renders education items correctly', () => {
    const html = generateCVHTML(mockCVData, 'classic');
    expect(html).toContain('Test Uni');
    expect(html).toContain('Test Degree');
  });

  it('renders skills correctly', () => {
    const html = generateCVHTML(mockCVData, 'classic');
    expect(html).toContain('React');
  });

  it('respects the theme color', () => {
    const customData = { ...mockCVData, themeColor: '#ff0000' };
    const html = generateCVHTML(customData, 'classic');
    // Check if the theme color is used in a style attribute (this is a bit brittle but good enough)
    expect(html).toContain('#ff0000');
  });

  it('renders minimalist PDF HTML with design settings', () => {
    const html = generateCVHTML({
      ...mockCVData,
      themeColor: '#ff0000',
      lineSpacing: 2.4,
      sectionGap: 3.2,
      languages: [{ id: '4', name: 'English', proficiency: 'Fluent' }],
    }, 'minimalist');

    expect(html).toContain('grid-template-columns:1fr 250px');
    expect(html).toContain('color:#ff0000');
    expect(html).toContain('line-height:2.4');
    expect(html).toContain('margin-bottom:3.2rem');
  });

  it('clamps unsafe design values before generating PDF HTML', () => {
    const html = generateCVHTML({
      ...mockCVData,
      themeColor: 'red',
      lineSpacing: 10,
      sectionGap: -5,
    }, 'minimalist');

    expect(html).not.toContain('color:red');
    expect(html).toContain('color:#000000');
    expect(html).toContain('line-height:2.5');
    expect(html).toContain('margin-bottom:0.5rem');
  });

  it('applies text size scaling to generated PDF HTML', () => {
    const html = generateCVHTML({
      ...mockCVData,
      textScale: 1.12,
    }, 'classic');

    expect(html).toContain('font-size:calc(0.875rem * 1.12)');
    expect(html).toContain('font-size:calc(2.25rem * 1.12)');
  });

  it('handles empty sections gracefully', () => {
    const emptyData = {
      ...mockCVData,
      experience: [],
      education: [],
      skills: [],
    };
    const html = generateCVHTML(emptyData, 'classic');
    expect(html).not.toContain('Test Company');
    expect(html).not.toContain('Test Uni');
    expect(html).not.toContain('React');
  });

  it('renders the profile image in the Timeline PDF HTML', () => {
    const html = generateCVHTML({
      ...mockCVData,
      profileImage: 'data:image/png;base64,dGVzdC1pbWFnZQ==',
      imageZoom: 1.2,
      imageX: 4,
      imageY: -3,
    }, 'timeline');

    expect(html).toContain('data:image/png;base64,dGVzdC1pbWFnZQ==');
    expect(html).toContain('width:112px;height:112px;border-radius:9999px');
    expect(html).toContain('transform:scale(1.2) translate(4px,-3px)');
  });

  it('keeps Startup PDF layout aligned with preview-critical structure', () => {
    const html = generateCVHTML({
      ...mockCVData,
      templateSurfaceColor: '#123456',
      personalInfo: {
        ...mockCVData.personalInfo,
        dob: '1990-01-01',
        nic: '123456789V',
        gender: 'Female',
        maritalStatus: 'Single',
        nationality: 'Sri Lankan',
        religion: 'Buddhism',
      },
      sectionOrder: ['personalDetails', 'summary', 'experience', 'education', 'skills'],
    }, 'startup');

    expect(html).toContain('background:#123456');
    expect(html).toContain('width:60%;vertical-align:top;padding:0 20px 0 0');
    expect(html).toContain('width:40%;vertical-align:top;padding:64px 0 0 20px');
    expect(html).toContain('Personal Details');
    expect(html).toContain('Date of Birth');
    expect(html).toContain('NIC Number');
    expect(html).toContain('<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"');
  });

  it('renders Startup PDF dates for courses and awards', () => {
    const html = generateCVHTML({
      ...mockCVData,
      courses: [{ id: 'course-1', name: 'Advanced React', institution: 'NexCV Academy', startDate: 'Jan 2024', endDate: 'Mar 2024' }],
      awards: [{ id: 'award-1', name: 'Best Builder', issuer: 'NexCV', date: '2025' }],
      sectionOrder: ['courses', 'awards'],
    }, 'startup');

    expect(html).toContain('Jan 2024');
    expect(html).toContain('Mar 2024');
    expect(html).toContain('2025');
  });

  it('strips unsafe profile image sources from PDF HTML', () => {
    const html = generateCVHTML({
      ...mockCVData,
      profileImage: 'https://example.com/avatar.png" onerror="alert(1)',
    }, 'timeline');

    expect(html).not.toContain('https://example.com/avatar.png');
    expect(html).not.toContain('onerror');
  });

  it('adds PDF-safe wrapping rules for long text in every template', () => {
    const longWord = 'LongUnbrokenPdfText'.repeat(80);
    const longData = {
      ...mockCVData,
      personalInfo: {
        ...mockCVData.personalInfo,
        fullName: longWord,
        email: `${longWord}@example.com`,
        phone: longWord,
        address: longWord,
        summary: `<p>${longWord}</p>`,
      },
      experience: [{
        id: 'long-exp',
        company: longWord,
        position: longWord,
        startDate: longWord,
        endDate: longWord,
        description: `<p>${longWord}</p>`,
      }],
      education: [{
        id: 'long-edu',
        institution: longWord,
        degree: longWord,
        startDate: longWord,
        endDate: longWord,
        description: `<p>${longWord}</p>`,
      }],
      skills: [{ id: 'long-skill', name: longWord, level: 5 }],
      projects: [{ id: 'long-project', name: longWord, description: `<p>${longWord}</p>`, link: `https://example.com/${longWord}` }],
      courses: [{ id: 'long-course', name: longWord, institution: longWord, startDate: longWord, endDate: longWord }],
      awards: [{ id: 'long-award', name: longWord, date: longWord, issuer: longWord }],
      languages: [{ id: 'long-language', name: longWord, proficiency: longWord }],
      references: [{ id: 'long-reference', name: longWord, position: longWord, company: longWord, email: `${longWord}@example.com`, phone: longWord }],
      sectionOrder: ['personalDetails', 'summary', 'experience', 'education', 'skills', 'projects', 'courses', 'awards', 'languages', 'references'],
    };

    CV_TEMPLATES.forEach(({ key }) => {
      const html = generateCVHTML(longData, key);
      expect(html).toContain('overflow-wrap: anywhere');
      expect(html).toContain('word-break: break-word');
      expect(html).toContain(longWord);
    });
  });
});
