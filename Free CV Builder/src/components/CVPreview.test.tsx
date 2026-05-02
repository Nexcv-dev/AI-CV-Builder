import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CVPreview from './CVPreview';
import { CVData } from '../types';
import React from 'react';

// Mock lucide-react to avoid issues with icon rendering in tests
vi.mock('lucide-react', () => ({
  Mail: () => <div data-testid="icon-mail" />,
  Phone: () => <div data-testid="icon-phone" />,
  MapPin: () => <div data-testid="icon-map-pin" />,
  Calendar: () => <div data-testid="icon-calendar" />,
  IdCard: () => <div data-testid="icon-id-card" />,
  User: () => <div data-testid="icon-user" />,
  Globe: () => <div data-testid="icon-globe" />,
  Sparkles: () => <div data-testid="icon-sparkles" />,
  Heart: () => <div data-testid="icon-heart" />,
}));

const mockCVData: CVData = {
  personalInfo: {
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '123456789',
    address: '123 Main St',
    summary: '<p>Experienced developer</p>',
    dob: '1990-01-01',
    nic: '123456789V',
    gender: 'Female',
    nationality: 'Sri Lankan',
    religion: 'Buddhism',
    maritalStatus: 'Single',
  },
  experience: [
    {
      id: '1',
      company: 'Tech Solutions',
      position: 'Lead Dev',
      startDate: '2019',
      endDate: 'Present',
      description: '<ul><li>Led team of 5</li></ul>',
    }
  ],
  education: [],
  skills: [
    { id: '1', name: 'React', level: 5, category: 'Frontend' }
  ],
  projects: [],
  courses: [],
  awards: [],
  languages: [],
  themeColor: '#2563eb',
  sidebarColor: '#111827',
  fontFamily: 'Inter',
  profileImage: '',
  imageZoom: 1,
  imageX: 0,
  imageY: 0,
  lineSpacing: 1.5,
  sectionGap: 2,
  hiddenSections: [],
  sectionOrder: ['summary', 'experience', 'skills'],
};

describe('CVPreview Component', () => {
  it('renders fullName correctly in Classic template', () => {
    render(<CVPreview cvData={mockCVData} template="classic" />);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('renders summary HTML correctly', () => {
    render(<CVPreview cvData={mockCVData} template="classic" />);
    const summaryElement = screen.getByText('Experienced developer');
    expect(summaryElement).toBeInTheDocument();
  });

  it('renders experience details', () => {
    render(<CVPreview cvData={mockCVData} template="classic" />);
    expect(screen.getByText('Tech Solutions')).toBeInTheDocument();
    expect(screen.getByText('Lead Dev')).toBeInTheDocument();
    expect(screen.getByText('Led team of 5')).toBeInTheDocument();
  });

  it('applies theme color to headers in Classic template', () => {
    render(<CVPreview cvData={mockCVData} template="classic" />);
    const headers = screen.getAllByRole('heading', { level: 2 });
    expect(headers[0]).toHaveStyle({ color: '#2563eb' });
  });

  it('renders Modern sidebar when template is modern', () => {
    const { container } = render(<CVPreview cvData={mockCVData} template="modern" />);
    const sidebar = container.querySelector('.modern-sidebar');
    expect(sidebar).toBeInTheDocument();
  });

  it('handles "Kitchen Sink" data without crashing (Full fields)', () => {
    const kitchenSinkData = {
      personalInfo: {
        fullName: 'Dr. Jane Verity Smith-Doe, PhD',
        email: 'jane.smith.doe@extremely-long-domain-name-example.com',
        phone: '+1 (555) 000-0000 ext 1234',
        location: '1234 Very Long Street Name, Suite 567, San Francisco, CA 94105, United States of America',
        title: 'Principal Lead Senior Executive Software Architect & Visionary Strategy Consultant',
        summary: 'A'.repeat(1000), // Huge summary
        links: [
          { label: 'LinkedIn', url: 'https://linkedin.com/in/very-long-profile-id-12345' },
          { label: 'Portfolio', url: 'https://very-long-subdomain.portfolio-site.com/user/jane-doe' }
        ]
      },
      experience: Array(5).fill(null).map((_, i) => ({
        id: `exp-${i}`,
        company: 'Global Megacorp International Services Limited',
        position: 'Senior Vice President of Engineering Engineering Engineering',
        startDate: 'Jan 2010',
        endDate: 'Present',
        description: '<p>' + 'B'.repeat(500) + '</p><ul><li>' + 'Bullet '.repeat(20) + '</li></ul>'
      })),
      education: Array(3).fill(null).map((_, i) => ({
        id: `edu-${i}`,
        institution: 'University of High Excellence and International Learning at Oxford',
        degree: 'Doctorate in Theoretical Computation and Advanced Mathematics',
        startDate: '2005',
        endDate: '2010',
        description: 'C'.repeat(300)
      })),
      skills: Array(20).fill(null).map((_, i) => ({ id: `skill-${i}`, name: 'Very Long Skill Name Here', level: 5 })),
      projects: Array(4).fill(null).map((_, i) => ({
        id: `proj-${i}`,
        name: 'Massive Scalable Global Architecture Platform',
        description: 'D'.repeat(400),
        url: 'https://github.com/org/very-very-very-long-repo-name'
      })),
      awards: Array(2).fill(null).map((_, i) => ({ id: `award-${i}`, name: 'Global Award', date: '2022', issuer: 'World Org' })),
      languages: Array(2).fill(null).map((_, i) => ({ id: `lang-${i}`, name: 'English', proficiency: 'Native' })),
      courses: Array(2).fill(null).map((_, i) => ({ id: `course-${i}`, name: 'Advanced JS', institution: 'MIT', startDate: '2021', endDate: '2021' })),
      themeColor: '#2563eb',
      sidebarColor: '#1f2937',
      sectionOrder: ['summary', 'experience', 'education', 'skills', 'projects', 'awards', 'languages', 'courses']
    };

    const { container } = render(<CVPreview cvData={kitchenSinkData as any} template="modern" />);
    expect(container).toBeInTheDocument();
    expect(screen.getByText(/Dr. Jane Verity Smith-Doe/i)).toBeInTheDocument();
  });

  it('handles "Minimum Data" gracefully', () => {
    const minData = {
      personalInfo: { fullName: 'Minimalist' },
      experience: [],
      education: [],
      skills: [],
      projects: [],
      sectionOrder: [],
      themeColor: '#000',
      sidebarColor: '#000'
    };

    const { container } = render(<CVPreview cvData={minData as any} template="professional" />);
    expect(container).toBeInTheDocument();
    expect(screen.getByText('Minimalist')).toBeInTheDocument();
  });

  it('sanitizes HTML content', () => {
    const unsafeData = {
      ...mockCVData,
      personalInfo: {
        ...mockCVData.personalInfo,
        summary: '<p>Safe</p><script>alert("unsafe")</script>'
      }
    };
    const { container } = render(<CVPreview cvData={unsafeData} template="classic" />);
    expect(container.innerHTML).toContain('Safe');
    expect(container.querySelector('script')).toBeNull();
  });

  it('applies whitespace-pre-wrap and break-words classes to rich text containers', () => {
    const dataWithNewlines: CVData = {
      ...mockCVData,
      personalInfo: {
        ...mockCVData.personalInfo,
        summary: '<div>Line 1</div><div>Line 2</div>',
      },
    };
    const { container } = render(<CVPreview cvData={dataWithNewlines} template="modern" />);
    
    // Find the summary container - it has the prose class
    const summaryContainer = container.querySelector('.prose');
    expect(summaryContainer).toHaveClass('whitespace-pre-wrap');
    expect(summaryContainer).toHaveClass('break-words');
    
    // Verify that the content still has two separate lines/blocks
    expect(screen.getByText('Line 1')).toBeInTheDocument();
    expect(screen.getByText('Line 2')).toBeInTheDocument();
  });
});
