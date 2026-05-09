import { FileText, User, Briefcase, GraduationCap, Wrench, CheckCircle2 } from 'lucide-react';

// Shared CSS class constants to eliminate duplication across form components
export const INPUT_CLASS =
  'w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 hover:border-gray-400 transition-all bg-white';

export const INPUT_CLASS_MIN_H =
  'w-full min-h-[48px] p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 hover:border-gray-400 transition-all bg-white';

export const INPUT_CLASS_SM =
  'w-full min-h-[44px] p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 hover:border-gray-400 transition-all bg-white text-sm';

export const AI_BUTTON_CLASS =
  'flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg transition-all bg-gradient-to-r from-fuchsia-50 to-violet-100 text-violet-700 border border-violet-300 hover:from-fuchsia-100 hover:to-violet-200 hover:shadow-sm disabled:opacity-60 disabled:cursor-not-allowed';

export const ADD_BUTTON_CLASS =
  'w-full flex justify-center items-center text-sm py-3 border-2 border-dashed border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50 hover:text-violet-600 hover:border-violet-300 font-medium transition-colors';

export const ITEM_CARD_CLASS =
  'p-5 border border-gray-200 rounded-xl relative bg-gray-50 shadow-sm';

export const DELETE_BUTTON_CLASS =
  'absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors';

export const LABEL_CLASS =
  'block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider';

export const LABEL_CLASS_SM =
  'block text-sm font-medium text-gray-700 mb-1';

// Tab Switcher styles
export const TAB_CONTAINER_CLASS = 'flex p-1 mt-4 sm:mt-6 mx-4 sm:mx-6 mb-4 bg-gray-100/50 rounded-xl shrink-0 overflow-x-auto scrollbar-hide gap-2';
export const TAB_BUTTON_BASE = 'flex items-center justify-center px-4 py-2 text-sm font-bold rounded-full transition-all whitespace-nowrap';
export const TAB_BUTTON_ACTIVE = 'bg-violet-600 text-white shadow-md';
export const TAB_BUTTON_INACTIVE = 'text-gray-500 hover:text-gray-700';

// Design Panel styles
export const DESIGN_CARD_CLASS = 'p-5 border rounded-xl transition-colors';
export const DESIGN_CARD_LIGHT = 'bg-gray-50 border-gray-200';
export const DESIGN_CARD_DARK = 'bg-slate-800/50 border-slate-700';
export const DESIGN_SECTION_TITLE_CLASS = 'text-lg font-semibold';
export const DESIGN_ICON_CLASS = 'text-violet-600 mr-2';

// Modal styles
export const MODAL_OVERLAY_CLASS = 'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm';
export const MODAL_CONTAINER_BASE = 'rounded-3xl shadow-2xl overflow-hidden border';

// Static data
export const fonts = [
  { name: 'Inter', description: 'Modern, Clean', className: 'font-sans' },
  { name: 'Lora', description: 'Serif, Classic', className: 'font-serif' },
  { name: 'Roboto', description: 'Structured, Technical', className: 'font-roboto' },
  { name: 'Montserrat', description: 'Geometric, Bold', className: 'font-montserrat' },
  { name: 'Merriweather', description: 'Elegant Serif', className: 'font-merriweather' },
  { name: 'Playfair Display', description: 'Stylish Serif', className: 'font-playfair' },
  { name: 'JetBrains Mono', description: 'Technical, Code', className: 'font-mono' },
];

// Wizard configuration — module-level to avoid re-creation every render
export const MAIN_SECTION_KEYS = ['summary', 'personalDetails', 'experience', 'education', 'skills'] as const;
export const FINALIZE_SECTION_KEYS = ['projects', 'courses', 'awards', 'languages', 'references'] as const;
export const ALL_STEPS = [...MAIN_SECTION_KEYS, 'finalize'] as const;

export const WIZARD_STEPS = [
  { key: 'summary', title: 'Summary', icon: FileText },
  { key: 'personalDetails', title: 'Personal', icon: User },
  { key: 'experience', title: 'Experience', icon: Briefcase },
  { key: 'education', title: 'Education', icon: GraduationCap },
  { key: 'skills', title: 'Skills', icon: Wrench },
  { key: 'finalize', title: 'Finalize', icon: CheckCircle2 },
] as const;

// File size limits
export const MAX_CV_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
