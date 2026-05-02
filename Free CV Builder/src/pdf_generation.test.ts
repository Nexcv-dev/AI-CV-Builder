import { describe, it, expect } from 'vitest';
import { generateCVHTML } from '../server';

describe('PDF HTML Generation', () => {
  const mockCVData = {
    personalInfo: {
      fullName: 'Test User',
      email: 'test@example.com',
      phone: '1234567890',
      address: 'Test Address',
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
});
