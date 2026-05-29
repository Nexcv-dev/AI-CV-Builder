import { create } from 'zustand';
import type { CVData } from '../types';
import { DEFAULT_TEMPLATE, type TemplateName } from '../templates';

const DEFAULT_SECTION_ORDER = ['summary', 'personalDetails', 'experience', 'education', 'skills', 'projects', 'courses', 'awards', 'languages', 'references'];

export const initialBuilderCvData: CVData = {
  personalInfo: {
    fullName: '',
    email: '',
    phone: '',
    address: '',
    summary: '',
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
  courses: [],
  languages: [],
  projects: [],
  awards: [],
  references: [],
  themeColor: '#000000',
  fontFamily: 'Inter',
  profileImage: '',
  imageZoom: 1,
  imageX: 0,
  imageY: 0,
  sidebarColor: '#1e293b',
  lineSpacing: 1.5,
  sectionGap: 2,
  sectionOrder: DEFAULT_SECTION_ORDER,
  hiddenSections: [],
};

type CvDataUpdater = CVData | ((previous: CVData) => CVData);

interface BuilderState {
  cvData: CVData;
  template: TemplateName;
  setCvData: (updater: CvDataUpdater) => void;
  setTemplate: (template: TemplateName) => void;
  resetBuilder: () => void;
}

export const useBuilderStore = create<BuilderState>((set) => ({
  cvData: initialBuilderCvData,
  template: DEFAULT_TEMPLATE,
  setCvData: (updater) => set((state) => ({
    cvData: typeof updater === 'function' ? updater(state.cvData) : updater,
  })),
  setTemplate: (template) => set({ template }),
  resetBuilder: () => set({ cvData: initialBuilderCvData, template: DEFAULT_TEMPLATE }),
}));
