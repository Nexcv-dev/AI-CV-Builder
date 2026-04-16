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
    // In modern template, some info moves to a sidebar with sidebarColor background
    const sidebar = container.querySelector('.modern-sidebar');
    expect(sidebar).toBeInTheDocument();
    expect(sidebar).toHaveStyle({ backgroundColor: '#111827' });
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
});
