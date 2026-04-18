import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import CVForm from '../src/components/CVForm';
import React from 'react';

// Mocking icons and heavy components
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

vi.mock('../src/components/RichTextEditor', () => ({
  RichTextEditor: () => <div data-testid="mock-editor" />
}));

describe('Accessibility Audit', () => {
  const initialData = {
    personalInfo: { fullName: '', email: '', summary: '', phone: '', address: '', dob: '', nic: '', gender: '', nationality: '', religion: '', maritalStatus: '' },
    experience: [],
    education: [],
    skills: [{ id: '1', name: 'React', level: 3 }],
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

  it('provides descriptive labels for delete/remove buttons', () => {
    render(
      <MemoryRouter>
        <CVForm cvData={initialData} setCvData={() => {}} template="classic" setTemplate={() => {}} />
      </MemoryRouter>
    );
    
    // Open the Skills section first
    const skillsHeader = screen.getByText(/Skills/i).closest('button');
    if (skillsHeader) fireEvent.click(skillsHeader);
    
    // Skill remove button
    const removeSkillBtn = screen.getByLabelText(/Remove skill/i);
    expect(removeSkillBtn).toBeInTheDocument();
    expect(removeSkillBtn).toHaveAttribute('title', 'Remove skill');
  });

  it('uses semantic labels for form inputs', () => {
    render(
      <MemoryRouter>
        <CVForm cvData={initialData} setCvData={() => {}} template="classic" setTemplate={() => {}} />
      </MemoryRouter>
    );
    
    // Check if labels are correctly associated with inputs
    expect(screen.getByLabelText(/Full Name/i)).toHaveAttribute('id', 'fullName');
  });

  it('announces skill level selection status', () => {
     render(
       <MemoryRouter>
         <CVForm cvData={initialData} setCvData={() => {}} template="classic" setTemplate={() => {}} />
       </MemoryRouter>
     );
     
     // Open the Skills section first
     const skillsHeader = screen.getByText(/Skills/i).closest('button');
     if (skillsHeader) fireEvent.click(skillsHeader);
     
     const levelButtons = screen.getAllByLabelText(/Set skill level to/i);
     expect(levelButtons[0]).toHaveAttribute('aria-label', 'Set skill level to 1 out of 5');
  });
});
