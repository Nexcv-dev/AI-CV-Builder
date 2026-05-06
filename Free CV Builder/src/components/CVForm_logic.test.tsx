import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CVForm from './CVForm';
import React from 'react';

// Mock components that are not the focus of logic testing
vi.mock('./RichTextEditor', () => ({
  RichTextEditor: ({ value, onChange }: any) => (
    <textarea data-testid="mock-editor" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

vi.mock('lucide-react', () => {
  const icons = [
    'Plus', 'Trash2', 'Loader2', 'Upload', 'CloudUpload', 'User', 'Briefcase', 'GraduationCap', 
    'Wrench', 'Palette', 'Star', 'FileText', 'BookOpen', 'Globe', 'FolderGit2', 
    'Trophy', 'ChevronDown', 'ChevronUp', 'Image', 'GripVertical', 'Info', 
    'CheckCircle', 'AlertCircle', 'CheckCircle2', 'LayoutTemplate', 
    'MoveHorizontal', 'MoveVertical', 'Layout', 'Sparkles', 'LogOut', 
    'Mail', 'Phone', 'MapPin', 'Linkedin', 'Github',
    'ArrowLeft', 'ArrowRight', 'Check', 'SkipForward', 'Type', 'Calendar'
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
vi.stubGlobal('fetch', vi.fn(() => 
  new Promise(resolve => setTimeout(() => resolve({ 
    ok: true, 
    json: () => Promise.resolve({ summary: 'Mocked summary' }) 
  }), 100))
));

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
    personalInfo: { fullName: '', email: '', summary: '', phone: '', address: '', dob: '', nic: '', gender: '', nationality: '', religion: '', maritalStatus: '' },
    experience: [],
    education: [],
    skills: [],
    courses: [],
    languages: [],
    projects: [],
    awards: [],
    themeColor: '#3b82f6',
    sidebarColor: '#f8fafc',
    fontFamily: 'Inter',
    profileImage: '',
    sectionOrder: ['personalDetails', 'summary', 'experience', 'education', 'skills', 'projects', 'courses', 'languages', 'awards']
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
    const skillButtons = await screen.findAllByLabelText(/Set skill level to/i);
    expect(skillButtons.length).toBe(5); // 5 levels
    expect(skillButtons[0]).toHaveAttribute('aria-label', 'Set skill level to 1 out of 5');
  });

  it('clears import message and shows starting message on new CV import', async () => {
    render(
      <MemoryRouter>
        <CVForm cvData={initialData} setCvData={mockSetCvData} template="classic" setTemplate={mockSetTemplate} />
      </MemoryRouter>
    );
    
    const user = userEvent.setup();
    const yesButton = await screen.findByText(/Yes, I have one/i);
    await user.click(yesButton);
    
    // Confirm the upload modal title appears
    expect(await screen.findByText(/Upload Resume/i)).toBeInTheDocument();
    
    // Wait for the modal and input to be available in the DOM
    const importInput = await screen.findByTestId('cv-upload-input');

    const file = new File(['{}'], 'cv.pdf', { type: 'application/pdf' });
    await user.upload(importInput, file);

    // Verify immediate feedback - use findBy to wait for render
    expect(await screen.findByText(/Starting import/i)).toBeInTheDocument();

    // Wait for the async operation to finish to prevent unhandled promise rejections after test ends
    await waitFor(() => {
        expect(screen.queryByText(/Data imported successfully/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('extracts error from JSON and displays toast on API failure', async () => {
    // Mock fetch to return a JSON error
    vi.stubGlobal('fetch', vi.fn(() => 
      Promise.resolve({ 
        ok: false, 
        text: () => Promise.resolve(JSON.stringify({ error: 'Mocked server error message' })) 
      })
    ));

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
