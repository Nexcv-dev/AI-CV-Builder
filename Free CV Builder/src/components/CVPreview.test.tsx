import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CVPreview from './CVPreview';
import { CVData } from '../types';
import { useTemplateHtml } from '../hooks/useTemplateHtml';

vi.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="icon-loader" />,
}));

vi.mock('../hooks/useTemplateHtml', () => ({
  useTemplateHtml: vi.fn(),
}));

const mockUseTemplateHtml = vi.mocked(useTemplateHtml);

const mockCVData: CVData = {
  personalInfo: {
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '123456789',
    address: '123 Main St',
    summary: '<p>Experienced developer</p>',
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
  projects: [],
  courses: [],
  awards: [],
  languages: [],
  references: [],
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
  sectionOrder: ['summary'],
};

describe('CVPreview Component', () => {
  it('renders the S3/admin template inside the custom preview iframe', () => {
    mockUseTemplateHtml.mockReturnValue({
      html: '<main><h1>{{personalInfo.fullName}}</h1><div>{{{personalInfo.summary}}}</div></main>',
      loading: false,
      error: null,
    });

    const { container } = render(<CVPreview cvData={mockCVData} template="classic" />);
    const iframe = screen.getByTitle('Custom CV template preview');

    expect(mockUseTemplateHtml).toHaveBeenCalledWith('classic');
    expect(container.querySelector('.cv-preview-surface')).toBeInTheDocument();
    expect(iframe).toHaveAttribute(
      'srcDoc',
      '<main><h1>Jane Doe</h1><div><p>Experienced developer</p></div></main>'
    );
  });

  it('shows the custom template loading state', () => {
    mockUseTemplateHtml.mockReturnValue({
      html: '',
      loading: true,
      error: null,
    });

    render(<CVPreview cvData={mockCVData} template="modern" />);

    expect(screen.getByTestId('icon-loader')).toBeInTheDocument();
    expect(screen.getByText('Loading custom template...')).toBeInTheDocument();
  });

  it('shows the custom template error state', () => {
    mockUseTemplateHtml.mockReturnValue({
      html: '',
      loading: false,
      error: 'Could not load template.',
    });

    render(<CVPreview cvData={mockCVData} template="startup" />);

    expect(screen.getByText('Could not load template.')).toBeInTheDocument();
  });
});
