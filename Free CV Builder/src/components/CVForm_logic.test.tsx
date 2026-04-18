import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    'Plus', 'Trash2', 'Loader2', 'Upload', 'User', 'Briefcase', 'GraduationCap', 
    'Wrench', 'Palette', 'Star', 'FileText', 'BookOpen', 'Globe', 'FolderGit2', 
    'Trophy', 'ChevronDown', 'ChevronUp', 'Image', 'GripVertical', 'Info', 
    'CheckCircle', 'AlertCircle', 'CheckCircle2', 'LayoutTemplate', 
    'MoveHorizontal', 'MoveVertical', 'Layout', 'Sparkles', 'LogOut', 
    'Mail', 'Phone', 'MapPin', 'Linkedin', 'Github'
  ];
  const mockExports: any = { __esModule: true };
  icons.forEach(name => {
    mockExports[name] = (props: any) => <span {...props} data-testid={`icon-${name}`}>{name}</span>;
  });
  return mockExports;
});

// Mock fetch globally
vi.stubGlobal('fetch', vi.fn(() => 
  Promise.resolve({ 
    ok: true, 
    json: () => Promise.resolve({ summary: 'Mocked summary' }) 
  })
));

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
  });

  it('generates a UUID when adding a new experience item', async () => {
    render(
      <MemoryRouter>
        <CVForm cvData={initialData} setCvData={mockSetCvData} template="classic" setTemplate={mockSetTemplate} />
      </MemoryRouter>
    );
    
    // Open the Work Experience section first
    const expHeader = screen.getByText(/Work Experience/i).closest('button');
    if (expHeader) fireEvent.click(expHeader);
    
    // Find the "Add Experience" button
    const addBtn = screen.getByText(/Add Experience/i).closest('button');
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
    await waitFor(() => {
        const imageInput = document.querySelector('input[accept="image/*"]') as HTMLInputElement;
        if (!imageInput) throw new Error("Image input not found");
        fireEvent.change(imageInput, { target: { files: [file] } });
    });

    // Since FileReader is async, we wait for mockSetCvData to be called
    await waitFor(() => expect(mockSetCvData).toHaveBeenCalled(), { timeout: 2000 });
    
    const updater = mockSetCvData.mock.calls[0][0];
    const newState = updater(initialData);
    
    expect(newState.imageZoom).toBe(1);
    expect(newState.imageX).toBe(0);
    expect(newState.imageY).toBe(0);
  });

  it('applies aria-label to skill level buttons for accessibility', () => {
    const dataWithSkills = {
      ...initialData,
      skills: [{ id: 'uuid-1', name: 'React', level: 3 }]
    };
    
    render(
      <MemoryRouter>
        <CVForm cvData={dataWithSkills} setCvData={mockSetCvData} template="classic" setTemplate={mockSetTemplate} />
      </MemoryRouter>
    );
    
    // Open the Skills section first
    const skillsHeader = screen.getByText(/Skills/i).closest('button');
    if (skillsHeader) fireEvent.click(skillsHeader);
    
    // Look for skill level buttons
    const skillButtons = screen.getAllByLabelText(/Set skill level to/i);
    expect(skillButtons.length).toBe(5); // 5 levels
    expect(skillButtons[0]).toHaveAttribute('aria-label', 'Set skill level to 1 out of 5');
  });

  it('clears import message and shows starting message on new CV import', async () => {
    render(
      <MemoryRouter>
        <CVForm cvData={initialData} setCvData={mockSetCvData} template="classic" setTemplate={mockSetTemplate} />
      </MemoryRouter>
    );
    
    const importInput = document.getElementById('cv-upload') as HTMLInputElement;
    const file = new File(['{}'], 'cv.json', { type: 'application/json' });
    
    fireEvent.change(importInput, { target: { files: [file] } });

    // Verify immediate feedback
    expect(screen.getByText(/Starting import/i)).toBeInTheDocument();
  });
});
