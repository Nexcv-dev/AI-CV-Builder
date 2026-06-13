import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CVForm from './CVForm';
import React from 'react';
import { TEXT_FIELD_LIMITS } from './form';

// Mock components that are not the focus of logic testing
vi.mock('./RichTextEditor', () => ({
  RichTextEditor: ({ value, onChange }: any) => (
    <textarea data-testid="mock-editor" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

vi.mock('lucide-react', () => {
  const icons = [
    'Plus', 'Trash2', 'Loader2', 'Upload', 'CloudUpload', 'FileUp', 'User', 'Briefcase', 'GraduationCap', 
    'Wrench', 'Palette', 'Star', 'FileText', 'BookOpen', 'Globe', 'FolderGit2', 
    'Trophy', 'UserCheck', 'ChevronDown', 'ChevronUp', 'Image', 'GripVertical', 'Info', 
    'CheckCircle', 'AlertCircle', 'CheckCircle2', 'LayoutTemplate', 
    'MoveHorizontal', 'MoveVertical', 'Layout', 'Sparkles', 'LogOut', 
    'Mail', 'Phone', 'MapPin', 'Linkedin', 'Github',
    'ArrowLeft', 'ArrowRight', 'Check', 'SkipForward', 'Type', 'Calendar', 'RotateCcw',
    'X', 'Lock'
  ];
  const mockExports: any = { __esModule: true };
  icons.forEach(name => {
    mockExports[name] = (props: any) => <span {...props} data-testid={`icon-${name}`}>{name}</span>;
  });
  return mockExports;
});

vi.mock('../utils/imageUtils', () => ({
  compressAndResizeImage: vi.fn(() => Promise.resolve('data:image/png;base64,mocked-image-data')),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

// Mock fetch globally with a small delay to allow testing intermediate states
vi.stubGlobal('fetch', vi.fn((input: any) => {
  const urlStr = typeof input === 'string' ? input : (input?.url || '');
  if (urlStr.includes('csrf-token')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ csrfToken: 'mock-token' }),
      text: () => Promise.resolve('{"csrfToken": "mock-token"}')
    });
  }
  return new Promise(resolve => setTimeout(() => resolve({ 
    ok: true, 
    json: () => Promise.resolve({ summary: 'Mocked summary' }),
    text: () => Promise.resolve(JSON.stringify({ summary: 'Mocked summary' }))
  }), 100));
}));

// Mock alert to prevent jsdom "Not implemented" errors
vi.stubGlobal('alert', vi.fn());

// Mock scrollTo for JSDOM
Element.prototype.scrollTo = vi.fn();

// Mock crypto for randomUUID
vi.stubGlobal('crypto', {
  randomUUID: () => 'test-uuid-' + Math.random().toString(36).substring(2, 11)
});

describe('CVForm Logic', () => {
  const mockSetCvData = vi.fn();
  const mockSetTemplate = vi.fn();
  const initialData = {
    personalInfo: { fullName: '', position: '', email: '', summary: '', phone: '', address: '', linkedin: '', github: '', website: '', dob: '', nic: '', gender: '', nationality: '', religion: '', maritalStatus: '' },
    experience: [],
    education: [],
    skills: [],
    courses: [],
    languages: [],
    projects: [],
    awards: [],
    references: [],
    themeColor: '#3b82f6',
    sidebarColor: '#f8fafc',
    fontFamily: 'Inter',
    profileImage: '',
    sectionOrder: ['personalDetails', 'summary', 'experience', 'education', 'skills', 'projects', 'courses', 'languages', 'awards', 'references']
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  it('generates a UUID when adding a new experience item', async () => {
    render(
      <MemoryRouter>
        <CVForm cvData={initialData} setCvData={mockSetCvData} template="classic" setTemplate={mockSetTemplate} />
      </MemoryRouter>
    );
    
    // Navigate to Experience step
    const expStep = screen.getByText('Experience');
    fireEvent.click(expStep);
    
    // Find the "Add Experience" button - wait for it to appear
    const addBtn = await screen.findByText(/Add Experience/i);
    fireEvent.click(addBtn);
    if (!addBtn) throw new Error("Add Experience button not found");
    fireEvent.click(addBtn);

    expect(mockSetCvData).toHaveBeenCalled();
    const updater = mockSetCvData.mock.calls[0][0];
    const newState = updater(initialData);
    
    expect(newState.experience.length).toBe(1);
    expect(newState.experience[0].id).toBeDefined();
  });

  it('resets image positioning when a new profile image is uploaded', async () => {
    render(
      <MemoryRouter>
        <CVForm cvData={initialData} setCvData={mockSetCvData} template="classic" setTemplate={mockSetTemplate} />
      </MemoryRouter>
    );
    
    // Switch to Design tab first
    const designTab = screen.getByText(/Design/i).closest('button');
    if (designTab) fireEvent.click(designTab);

    // Mock a file upload
    const file = new File(['image content'], 'test.png', { type: 'image/png' });
    
    // We need to find the specific input for profile image (it's the one that accepts images)
    const imageInput = await waitFor(() => {
        const input = document.querySelector('input[accept="image/*"]') as HTMLInputElement;
        if (!input) throw new Error("Image input not found");
        return input;
    });
    
    fireEvent.change(imageInput, { target: { files: [file] } });

    // Since FileReader is async, we wait for mockSetCvData to be called
    await waitFor(() => expect(mockSetCvData).toHaveBeenCalled(), { timeout: 2000 });
    
    const updater = mockSetCvData.mock.calls[0][0];
    const newState = updater(initialData);
    
    expect(newState.imageZoom).toBe(1);
    expect(newState.imageX).toBe(0);
    expect(newState.imageY).toBe(0);
  });

  it('shows a loading state while a profile image is uploading', async () => {
    render(
      <MemoryRouter>
        <CVForm cvData={initialData} setCvData={mockSetCvData} template="classic" setTemplate={mockSetTemplate} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText(/Design/i).closest('button')!);

    const imageInput = await waitFor(() => {
      const input = document.querySelector('input[accept="image/*"]') as HTMLInputElement;
      if (!input) throw new Error('Image input not found');
      return input;
    });
    const file = new File(['image content'], 'test.png', { type: 'image/png' });

    fireEvent.change(imageInput, { target: { files: [file] } });

    const uploadButton = await screen.findByRole('button', { name: 'Uploading...' });
    expect(uploadButton).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Profile photo is uploading.');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Upload Photo' })).toBeEnabled();
    });
  });

  it('stores a compressed profile image locally for signed-out users', async () => {
    render(
      <MemoryRouter>
        <CVForm
          cvData={initialData}
          setCvData={mockSetCvData}
          template="classic"
          setTemplate={mockSetTemplate}
          canImportCv={false}
        />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText(/Design/i).closest('button')!);
    const imageInput = await waitFor(() => {
      const input = document.querySelector('input[accept="image/*"]') as HTMLInputElement;
      if (!input) throw new Error('Image input not found');
      return input;
    });
    const file = new File(['image content'], 'guest.png', { type: 'image/png' });

    fireEvent.change(imageInput, { target: { files: [file] } });
    await waitFor(() => expect(mockSetCvData).toHaveBeenCalled());

    const updater = mockSetCvData.mock.calls[0][0];
    expect(updater(initialData).profileImage).toBe('data:image/png;base64,mocked-image-data');
  });

  it('applies aria-label to skill level buttons for accessibility', async () => {
    const dataWithSkills = {
      ...initialData,
      skills: [{ id: 'uuid-1', name: 'React', level: 3 }]
    };
    
    render(
      <MemoryRouter>
        <CVForm cvData={dataWithSkills} setCvData={mockSetCvData} template="classic" setTemplate={mockSetTemplate} />
      </MemoryRouter>
    );
    
    // Navigate to Skills step
    const skillsStep = screen.getByText('Skills');
    fireEvent.click(skillsStep);
    
    // Look for skill level buttons - wait for them to appear
    const skillButtons = await screen.findAllByLabelText(/Set skill level to/i, undefined, { timeout: 5000 });
    expect(skillButtons.length).toBe(5); // 5 levels
    expect(skillButtons[0]).toHaveAttribute('aria-label', 'Set skill level to 1 out of 5');
  });

  it('limits long text before saving field values', async () => {
    const longText = 'X'.repeat(TEXT_FIELD_LIMITS.mediumText + 50);
    const dataWithExperience = {
      ...initialData,
      experience: [{ id: 'exp-1', company: '', position: '', startDate: '', endDate: '', description: '' }],
    };

    render(
      <MemoryRouter>
        <CVForm cvData={dataWithExperience} setCvData={mockSetCvData} template="classic" setTemplate={mockSetTemplate} />
      </MemoryRouter>
    );

    const expStep = screen.getByText('Experience');
    fireEvent.click(expStep);

    const companyInput = await screen.findByLabelText('Company');
    expect(companyInput).toHaveAttribute('maxLength', String(TEXT_FIELD_LIMITS.mediumText));

    fireEvent.change(companyInput, { target: { value: longText } });

    const updater = mockSetCvData.mock.calls.at(-1)?.[0];
    const nextState = updater(dataWithExperience);
    expect(nextState.experience[0].company).toHaveLength(TEXT_FIELD_LIMITS.mediumText);
  });

  it('does not limit the professional summary field', async () => {
    const longSummary = 'Summary text '.repeat(300);

    render(
      <MemoryRouter>
        <CVForm cvData={initialData} setCvData={mockSetCvData} template="classic" setTemplate={mockSetTemplate} />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByText('Summary'));
    fireEvent.change(await screen.findByTestId('mock-editor'), { target: { value: longSummary } });

    const updater = mockSetCvData.mock.calls.at(-1)?.[0];
    const nextState = updater(initialData);
    expect(nextState.personalInfo.summary).toBe(longSummary);
  });

  it('adds length limits to every CV text input in each form section', async () => {
    const dataWithAllSections = {
      ...initialData,
      experience: [{ id: 'exp-1', company: '', position: '', startDate: '', endDate: '', description: '' }],
      education: [{ id: 'edu-1', institution: '', degree: '', startDate: '', endDate: '', description: '' }],
      skills: [{ id: 'skill-1', name: '', level: 3 }],
      courses: [{ id: 'course-1', name: '', institution: '', startDate: '', endDate: '' }],
      languages: [{ id: 'language-1', name: '', proficiency: 'Native' }],
      projects: [{ id: 'project-1', name: '', description: '', link: '' }],
      awards: [{ id: 'award-1', name: '', date: '', issuer: '' }],
      references: [{ id: 'reference-1', name: '', position: '', company: '', email: '', phone: '' }],
    };

    const { container } = render(
      <MemoryRouter>
        <CVForm cvData={dataWithAllSections} setCvData={mockSetCvData} template="classic" setTemplate={mockSetTemplate} />
      </MemoryRouter>
    );

    for (const stepName of ['Personal', 'Experience', 'Education', 'Skills', 'Finalize']) {
      fireEvent.click(await screen.findByText(stepName));
      const inputs = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="text"], input[type="email"], input[type="tel"]'))
        .filter((input) => !['dob', 'themeColor', 'templateSurfaceColor'].includes(input.id));

      expect(inputs.length).toBeGreaterThan(0);
      inputs.forEach((input) => {
        expect(input, input.id || input.name).toHaveAttribute('maxLength');
      });
    }
  });

  it('clears import message and shows file-reading message on new CV import', async () => {
    render(
      <MemoryRouter>
        <CVForm cvData={initialData} setCvData={mockSetCvData} template="classic" setTemplate={mockSetTemplate} showImportPromptOnMount />
      </MemoryRouter>
    );
    
    const user = userEvent.setup();
    const importPromptButton = await screen.findByText(/Yes, I have one/i);
    await user.click(importPromptButton);
    
    // Confirm the upload modal title appears
    expect(await screen.findByText(/Upload Resume/i)).toBeInTheDocument();
    
    // Wait for the modal and input to be available in the DOM
    const importInput = await screen.findByTestId('cv-upload-input');

    const file = new File(['{}'], 'cv.pdf', { type: 'application/pdf' });
    await user.upload(importInput, file);

    // Verify immediate feedback - use findBy to wait for render
    expect(await screen.findByText(/Reading your file/i)).toBeInTheDocument();

    // Wait for the async operation to finish to prevent unhandled promise rejections after test ends
    await waitFor(() => {
        expect(screen.queryByText(/Data imported successfully/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('extracts error from JSON and displays toast on API failure', async () => {
    // Mock fetch to return a JSON error, but succeed for csrf-token
    vi.stubGlobal('fetch', vi.fn((input: any) => {
      const urlStr = typeof input === 'string' ? input : (input?.url || '');
      if (urlStr.includes('csrf-token')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ csrfToken: 'mock-token' }),
          text: () => Promise.resolve('{"csrfToken": "mock-token"}')
        });
      }
      return Promise.resolve({ 
        ok: false, 
        json: () => Promise.resolve({ error: 'Mocked server error message' }),
        text: () => Promise.resolve(JSON.stringify({ error: 'Mocked server error message' })) 
      });
    }));

    const toast = (await import('react-hot-toast')).default;

    render(
      <MemoryRouter>
        <CVForm cvData={initialData} setCvData={mockSetCvData} template="classic" setTemplate={mockSetTemplate} />
      </MemoryRouter>
    );

    // Navigate to Summary step (the progress bar steps correspond to sections)
    // Wait for the UI to be fully rendered
    const summaryStep = await screen.findByText('Summary');
    fireEvent.click(summaryStep);

    // Wait for Generate with AI button
    const generateBtn = await screen.findByText(/Generate with AI/i);
    fireEvent.click(generateBtn);

    // Verify toast error is called with the extracted message
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Mocked server error message');
    });
  });
});
