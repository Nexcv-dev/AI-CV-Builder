import React, { useState, useRef, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { motion, AnimatePresence } from 'motion/react';
import { CVData, Experience, Education, Skill, Course, Language, Project, Award } from '../types';
import { Plus, Trash2, Loader2, Upload, User, Briefcase, GraduationCap, Wrench, Palette, Star, FileText, BookOpen, Globe, FolderGit2, Trophy, ChevronDown, ChevronUp, Image as ImageIcon, GripVertical, Info, CheckCircle, AlertCircle, CheckCircle2, LayoutTemplate, MoveHorizontal, MoveVertical, Layout, Sparkles } from 'lucide-react';
import { EditorFooter } from './EditorFooter';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { RichTextEditor } from './RichTextEditor';

interface CVFormProps {
  cvData: CVData;
  setCvData: React.Dispatch<React.SetStateAction<CVData>>;
  template: string;
  setTemplate: (template: 'classic' | 'modern' | 'professional') => void;
}

const SortableAccordionSection = React.memo(({ id, title, icon: Icon, children, isOpen, onToggle }: { id: string, title: string, icon: any, children: React.ReactNode, isOpen: boolean, onToggle: () => void }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform ? { ...transform, x: 0 } : null),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-xl mb-4 bg-white overflow-hidden transition-colors transition-shadow duration-300 ${isOpen ? 'border-blue-500 shadow-md' : 'border-gray-200 shadow-sm'} ${isDragging ? 'opacity-50 shadow-lg relative' : ''}`}
    >
      <div className={`w-full flex items-center transition-colors ${isOpen ? 'bg-blue-50/30' : 'bg-gray-50 hover:bg-gray-100'}`}>
        <div
          {...attributes}
          {...listeners}
          className="p-4 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 flex items-center justify-center touch-none"
        >
          <GripVertical size={18} />
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 flex items-center justify-between p-4 pl-0"
        >
          <div className="flex items-center font-semibold text-gray-800">
            <Icon size={18} className="mr-2 text-blue-600" />
            {title}
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <ChevronDown size={18} className="text-gray-500" />
          </motion.div>
        </button>
      </div>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial="collapsed"
            animate="open"
            exit="collapsed"
            variants={{
              open: { opacity: 1, height: "auto" },
              collapsed: { opacity: 0, height: 0 }
            }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
          >
            <div className="p-5 border-t border-gray-200">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default function CVForm({ cvData, setCvData, template, setTemplate }: CVFormProps) {
  const [activeMainTab, setActiveMainTab] = useState<'content' | 'design'>('content');
  const [expandedSection, setExpandedSection] = useState<string | null>('personalDetails');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Requires 8px movement before drag starts, allowing scrolling
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [refiningIds, setRefiningIds] = useState<Record<string, boolean>>({});

  const setRefining = useCallback((id: string, value: boolean) => {
    setRefiningIds(prev => ({ ...prev, [id]: value }));
  }, []);

  // Strip HTML tags to get plain text for checking and sending
  const stripHtml = (html: string) => {
    return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
  };

  const handleGenerateSummary = async () => {
    setRefining('summary', true);
    try {
      const res = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experience: cvData.experience,
          education: cvData.education,
          skills: cvData.skills,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate summary');
      }
      const data = await res.json();
      if (data.summary) {
        setCvData(prev => ({
          ...prev,
          personalInfo: { ...prev.personalInfo, summary: data.summary },
        }));
      }
    } catch (error) {
      console.error('Generate summary error:', error);
    } finally {
      setRefining('summary', false);
    }
  };

  const handleRefineText = async (id: string, text: string, sectionType: string, context: any, onUpdate: (refined: string) => void) => {
    const plainText = stripHtml(text || '');
    if (!plainText.trim()) return;
    setRefining(id, true);
    try {
      const res = await fetch('/api/refine-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: plainText, sectionType, context }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to refine text');
      }
      const data = await res.json();
      if (data.refined) {
        onUpdate(data.refined);
      }
    } catch (error) {
      console.error('Refine text error:', error);
    } finally {
      setRefining(id, false);
    }
  };

  const MAX_CV_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

  const handleCVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_CV_FILE_SIZE) {
      setImportMessage({ type: 'error', text: 'File is too large. Maximum allowed size is 10 MB.' });
      event.target.value = '';
      return;
    }

    setIsImporting(true);
    setImportMessage(null);

    let mimeType = file.type;

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];

          if (!mimeType) {
            if ((reader.result as string).startsWith('data:application/pdf')) {
              mimeType = 'application/pdf';
            } else if ((reader.result as string).startsWith('data:image/')) {
              mimeType = (reader.result as string).split(';')[0].split(':')[1];
            } else {
              mimeType = 'application/pdf';
            }
          }

          // Call backend server instead of Gemini directly
          const parseResponse = await fetch('/api/parse-cv', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              base64Data,
              mimeType: mimeType || "application/pdf"
            }),
          });

          if (!parseResponse.ok) {
            const errorText = await parseResponse.text();
            throw new Error(`Server error: ${errorText}`);
          }

          const result = await parseResponse.json();

          if (result) {

            setCvData(prev => {
              const newData = { ...prev };

              if (result.personalInfo) {
                newData.personalInfo = {
                  ...newData.personalInfo,
                  ...result.personalInfo
                };
              }

              if (result.experience && Array.isArray(result.experience)) {
                newData.experience = result.experience.map((e: any) => ({ ...e, id: crypto.randomUUID() }));
              }

              if (result.education && Array.isArray(result.education)) {
                newData.education = result.education.map((e: any) => ({ ...e, id: crypto.randomUUID() }));
              }

              if (result.skills && Array.isArray(result.skills)) {
                newData.skills = result.skills.map((s: any) => ({ ...s, id: crypto.randomUUID(), level: s.level || 4 }));
              }

              if (result.courses && Array.isArray(result.courses)) {
                newData.courses = result.courses.map((c: any) => ({ ...c, id: crypto.randomUUID() }));
              }

              if (result.languages && Array.isArray(result.languages)) {
                newData.languages = result.languages.map((l: any) => ({ ...l, id: crypto.randomUUID() }));
              }

              if (result.projects && Array.isArray(result.projects)) {
                newData.projects = result.projects.map((p: any) => ({ ...p, id: crypto.randomUUID() }));
              }

              if (result.awards && Array.isArray(result.awards)) {
                newData.awards = result.awards.map((a: any) => ({ ...a, id: crypto.randomUUID() }));
              }

              return newData;
            });

            setImportMessage({ type: 'success', text: 'Data imported successfully!' });
          } else {
            throw new Error("No data returned");
          }
        } catch (error) {
          console.error("Error parsing CV document:", error);
          setImportMessage({ type: 'error', text: 'Failed to parse document. Please try again.' });
        } finally {
          setIsImporting(false);
        }
      };
      reader.onerror = () => {
        setImportMessage({ type: 'error', text: 'Failed to read file.' });
        setIsImporting(false);
      };
    } catch (error) {
      console.error("Error importing CV document:", error);
      setImportMessage({ type: 'error', text: 'Failed to process file. Please try again.' });
      setIsImporting(false);
    }

    if (event.target) {
      event.target.value = '';
    }
  };

  const handleDragOver = (event: any) => {
    // Left empty for performance. DndKit's SortableContext handles the visual swapping internally.
    // Updating deep App state during drag causes severe stutter.
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setCvData((prev) => {
        const oldIndex = prev.sectionOrder.indexOf(active.id as string);
        const newIndex = prev.sectionOrder.indexOf(over.id as string);
        return {
          ...prev,
          sectionOrder: arrayMove(prev.sectionOrder, oldIndex, newIndex),
        };
      });
    }
  };


  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_IMAGE_FILE_SIZE) {
        alert('Image is too large. Maximum allowed size is 5 MB.');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCvData((prev) => ({ ...prev, profileImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleThemeChange = (field: 'themeColor' | 'fontFamily' | 'sidebarColor', value: string) => {
    setCvData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePersonalInfoChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCvData((prev) => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [name]: value },
    }));
  }, [setCvData]);

  const handleExperienceChange = useCallback((id: string, field: keyof Experience, value: string) => {
    setCvData((prev) => ({
      ...prev,
      experience: prev.experience.map((exp) => (exp.id === id ? { ...exp, [field]: value } : exp)),
    }));
  }, [setCvData]);

  const addExperience = useCallback(() => {
    setCvData((prev) => ({
      ...prev,
      experience: [
        ...prev.experience,
        { id: crypto.randomUUID(), company: '', position: '', startDate: '', endDate: '', description: '' },
      ],
    }));
  }, [setCvData]);

  const removeExperience = useCallback((id: string) => {
    setCvData((prev) => ({
      ...prev,
      experience: prev.experience.filter((exp) => exp.id !== id),
    }));
  }, [setCvData]);

  const handleEducationChange = useCallback((id: string, field: keyof Education, value: string) => {
    setCvData((prev) => ({
      ...prev,
      education: prev.education.map((edu) => (edu.id === id ? { ...edu, [field]: value } : edu)),
    }));
  }, [setCvData]);

  const addEducation = useCallback(() => {
    setCvData((prev) => ({
      ...prev,
      education: [
        ...prev.education,
        { id: crypto.randomUUID(), institution: '', degree: '', startDate: '', endDate: '', description: '' },
      ],
    }));
  }, [setCvData]);

  const removeEducation = useCallback((id: string) => {
    setCvData((prev) => ({
      ...prev,
      education: prev.education.filter((edu) => edu.id !== id),
    }));
  }, [setCvData]);

  const handleSkillChange = useCallback((id: string, field: keyof Skill, value: string | number) => {
    setCvData((prev) => ({
      ...prev,
      skills: prev.skills.map((skill) => (skill.id === id ? { ...skill, [field]: value } : skill)),
    }));
  }, [setCvData]);

  const addSkill = useCallback(() => {
    setCvData((prev) => ({
      ...prev,
      skills: [...prev.skills, { id: crypto.randomUUID(), name: '', level: 5 }],
    }));
  }, [setCvData]);

  const removeSkill = useCallback((id: string) => {
    setCvData((prev) => ({
      ...prev,
      skills: prev.skills.filter((skill) => skill.id !== id),
    }));
  }, [setCvData]);

  const handleCourseChange = useCallback((id: string, field: keyof Course, value: string) => {
    setCvData((prev) => ({
      ...prev,
      courses: prev.courses.map((course) => (course.id === id ? { ...course, [field]: value } : course)),
    }));
  }, [setCvData]);

  const addCourse = useCallback(() => {
    setCvData((prev) => ({
      ...prev,
      courses: [...prev.courses, { id: crypto.randomUUID(), name: '', institution: '', startDate: '', endDate: '' }],
    }));
  }, [setCvData]);

  const removeCourse = useCallback((id: string) => {
    setCvData((prev) => ({
      ...prev,
      courses: prev.courses.filter((course) => course.id !== id),
    }));
  }, [setCvData]);

  const handleLanguageChange = useCallback((id: string, field: keyof Language, value: string) => {
    setCvData((prev) => ({
      ...prev,
      languages: prev.languages.map((lang) => (lang.id === id ? { ...lang, [field]: value } : lang)),
    }));
  }, [setCvData]);

  const addLanguage = useCallback(() => {
    setCvData((prev) => ({
      ...prev,
      languages: [...prev.languages, { id: crypto.randomUUID(), name: '', proficiency: 'Native' }],
    }));
  }, [setCvData]);

  const removeLanguage = useCallback((id: string) => {
    setCvData((prev) => ({
      ...prev,
      languages: prev.languages.filter((lang) => lang.id !== id),
    }));
  }, [setCvData]);

  const handleProjectChange = useCallback((id: string, field: keyof Project, value: string) => {
    setCvData((prev) => ({
      ...prev,
      projects: prev.projects.map((proj) => (proj.id === id ? { ...proj, [field]: value } : proj)),
    }));
  }, [setCvData]);

  const addProject = useCallback(() => {
    setCvData((prev) => ({
      ...prev,
      projects: [...prev.projects, { id: crypto.randomUUID(), name: '', description: '', link: '' }],
    }));
  }, [setCvData]);

  const removeProject = useCallback((id: string) => {
    setCvData((prev) => ({
      ...prev,
      projects: prev.projects.filter((proj) => proj.id !== id),
    }));
  }, [setCvData]);

  const handleAwardChange = useCallback((id: string, field: keyof Award, value: string) => {
    setCvData((prev) => ({
      ...prev,
      awards: prev.awards.map((award) => (award.id === id ? { ...award, [field]: value } : award)),
    }));
  }, [setCvData]);

  const addAward = useCallback(() => {
    setCvData((prev) => ({
      ...prev,
      awards: [...prev.awards, { id: crypto.randomUUID(), name: '', date: '', issuer: '' }],
    }));
  }, [setCvData]);

  const removeAward = useCallback((id: string) => {
    setCvData((prev) => ({
      ...prev,
      awards: prev.awards.filter((award) => award.id !== id),
    }));
  }, [setCvData]);


  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Main Tabs Styled as Chips */}
      <div className="flex p-1 mt-4 sm:mt-6 mx-4 sm:mx-6 mb-4 bg-gray-100/50 rounded-xl shrink-0 overflow-x-auto scrollbar-hide gap-2">
        <button
          onClick={() => setActiveMainTab('content')}
          className={`flex items-center justify-center px-4 py-2 text-sm font-bold rounded-full transition-all whitespace-nowrap ${activeMainTab === 'content' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <FileText size={16} className="mr-2" /> Content
        </button>
        <button
          onClick={() => setActiveMainTab('design')}
          className={`flex items-center justify-center px-4 py-2 text-sm font-bold rounded-full transition-all whitespace-nowrap ${activeMainTab === 'design' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Palette size={16} className="mr-2" /> Design
        </button>
      </div>

      <div className="flex-1 h-full overflow-y-auto px-4 sm:px-6" style={{ WebkitOverflowScrolling: 'touch' }}>
        {activeMainTab === 'content' && (
          <div className="animate-in fade-in duration-300">
            {/* CV Import Section */}
            <div className="mb-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-2 rounded-lg mr-3 shrink-0">
                    <FileText size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Upload Existing CV</h3>
                    <p className="text-xs text-gray-500 flex items-center mt-0.5">
                      <Info size={12} className="mr-1 shrink-0" />
                      Auto-fill data from any resume PDF or Image
                    </p>
                  </div>
                </div>
                <div className="shrink-0 w-full sm:w-auto">
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleCVImport}
                    className="hidden"
                    id="cv-upload"
                    disabled={isImporting}
                  />
                  <label
                    htmlFor="cv-upload"
                    className={`flex items-center justify-center w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors ${isImporting
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
                      }`}
                  >
                    {isImporting ? (
                      <><Loader2 size={16} className="mr-2 animate-spin" /> Parsing Doc...</>
                    ) : (
                      <><Upload size={16} className="mr-2" /> Upload CV (PDF/Image)</>
                    )}
                  </label>
                </div>
              </div>

              {importMessage && (
                <div className={`mt-3 p-2.5 rounded-md text-sm flex items-start ${importMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                  {importMessage.type === 'success' ? (
                    <CheckCircle size={16} className="mr-2 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle size={16} className="mr-2 mt-0.5 shrink-0" />
                  )}
                  {importMessage.text}
                </div>
              )}
            </div>


            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
              <SortableContext items={cvData.sectionOrder} strategy={verticalListSortingStrategy}>
                {cvData.sectionOrder.map((sectionKey) => {
                  switch (sectionKey) {
                    case 'personalDetails':
                      return (
                        <SortableAccordionSection key="personalDetails" id="personalDetails" title="Personal Details" icon={User} isOpen={expandedSection === 'personalDetails'} onToggle={() => setExpandedSection(expandedSection === 'personalDetails' ? null : 'personalDetails')}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                              <input
                                id="fullName"
                                type="text"
                                name="fullName"
                                autoComplete="name"
                                placeholder="e.g. Jane Doe"
                                value={cvData.personalInfo.fullName}
                                onChange={handlePersonalInfoChange}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-gray-400 transition-all bg-white"
                              />
                            </div>
                            <div>
                              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                              <input
                                id="email"
                                type="email"
                                name="email"
                                autoComplete="email"
                                placeholder="e.g. jane@example.com"
                                value={cvData.personalInfo.email}
                                onChange={handlePersonalInfoChange}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-gray-400 transition-all bg-white"
                              />
                            </div>
                            <div>
                              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                              <input
                                id="phone"
                                type="text"
                                name="phone"
                                autoComplete="tel"
                                placeholder="e.g. +1 234 567 890"
                                value={cvData.personalInfo.phone}
                                onChange={handlePersonalInfoChange}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-gray-400 transition-all bg-white"
                              />
                            </div>
                            <div>
                              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                              <input
                                id="address"
                                type="text"
                                name="address"
                                autoComplete="address-line1"
                                placeholder="e.g. New York, NY"
                                value={cvData.personalInfo.address}
                                onChange={handlePersonalInfoChange}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-gray-400 transition-all bg-white"
                              />
                            </div>
                            <div>
                              <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-1">Date of Birth <span className="text-gray-400 font-normal">(Optional)</span></label>
                              <input
                                id="dob"
                                type="date"
                                name="dob"
                                autoComplete="bday"
                                value={cvData.personalInfo.dob}
                                onChange={handlePersonalInfoChange}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-gray-400 transition-all bg-white"
                              />
                            </div>
                            <div>
                              <label htmlFor="nic" className="block text-sm font-medium text-gray-700 mb-1">NIC Number <span className="text-gray-400 font-normal">(Optional)</span></label>
                              <input
                                id="nic"
                                type="text"
                                name="nic"
                                placeholder="e.g. 199012345678"
                                value={cvData.personalInfo.nic}
                                onChange={handlePersonalInfoChange}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-gray-400 transition-all bg-white"
                              />
                            </div>
                            <div>
                              <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">Gender <span className="text-gray-400 font-normal">(Optional)</span></label>
                              <select
                                id="gender"
                                name="gender"
                                autoComplete="sex"
                                value={cvData.personalInfo.gender}
                                onChange={handlePersonalInfoChange}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-gray-400 transition-all bg-white"
                              >
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                            <div>
                              <label htmlFor="maritalStatus" className="block text-sm font-medium text-gray-700 mb-1">Marital Status <span className="text-gray-400 font-normal">(Optional)</span></label>
                              <select
                                id="maritalStatus"
                                name="maritalStatus"
                                value={cvData.personalInfo.maritalStatus}
                                onChange={handlePersonalInfoChange}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-gray-400 transition-all bg-white"
                              >
                                <option value="">Select Status</option>
                                <option value="Single">Single</option>
                                <option value="Married">Married</option>
                              </select>
                            </div>
                            <div>
                              <label htmlFor="nationality" className="block text-sm font-medium text-gray-700 mb-1">Nationality <span className="text-gray-400 font-normal">(Optional)</span></label>
                              <input
                                id="nationality"
                                type="text"
                                name="nationality"
                                autoComplete="on"
                                placeholder="e.g. American"
                                value={cvData.personalInfo.nationality}
                                onChange={handlePersonalInfoChange}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-gray-400 transition-all bg-white"
                              />
                            </div>
                            <div>
                              <label htmlFor="religion" className="block text-sm font-medium text-gray-700 mb-1">Religion <span className="text-gray-400 font-normal">(Optional)</span></label>
                              <input
                                id="religion"
                                type="text"
                                name="religion"
                                placeholder="e.g. Christianity"
                                value={cvData.personalInfo.religion}
                                onChange={handlePersonalInfoChange}
                                className="w-full min-h-[48px] p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-gray-400 transition-all bg-white"
                              />
                            </div>

                          </div>
                        </SortableAccordionSection>
                      );
                    case 'summary':
                      return (
                        <SortableAccordionSection
                          key="summary"
                          id="summary"
                          title="Professional Summary"
                          icon={FileText}
                          isOpen={expandedSection === 'summary'}
                          onToggle={() => setExpandedSection(expandedSection === 'summary' ? null : 'summary')}
                        >
                          <div className="grid grid-cols-1 gap-5">
                            <div className="md:col-span-2">
                              <label htmlFor="summary" className="block text-sm font-medium text-gray-700 mb-1">Professional Summary</label>
                              <RichTextEditor
                                id="summary"
                                value={cvData.personalInfo.summary}
                                onChange={(val) => handlePersonalInfoChange({ target: { name: 'summary', value: val } } as any)}
                                placeholder="Brief overview of your professional background..."
                              />
                              <button
                                type="button"
                                onClick={handleGenerateSummary}
                                disabled={refiningIds['summary']}
                                className="mt-2 flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg transition-all bg-gradient-to-r from-violet-50 to-blue-50 text-violet-700 border border-violet-200 hover:from-violet-100 hover:to-blue-100 hover:shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {refiningIds['summary'] ? (
                                  <><Loader2 size={13} className="mr-1.5 animate-spin" /> Generating...</>
                                ) : (
                                  <><Sparkles size={13} className="mr-1.5" /> Generate with AI</>
                                )}
                              </button>
                            </div>
                          </div>
                        </SortableAccordionSection>
                      );
                    case 'experience':
                      return (
                        <SortableAccordionSection
                          key="experience"
                          id="experience"
                          title="Work Experience"
                          icon={Briefcase}
                          isOpen={expandedSection === 'experience'}
                          onToggle={() => setExpandedSection(expandedSection === 'experience' ? null : 'experience')}
                        >
                          <div className="space-y-6">
                            {cvData.experience.map((exp) => (
                              <div key={exp.id} className="p-5 border border-gray-200 rounded-xl relative bg-gray-50 shadow-sm">
                                <button
                                  onClick={() => removeExperience(exp.id)}
                                  className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 size={18} />
                                </button>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                  <div>
                                    <label htmlFor={`exp-company-${exp.id}`} className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Company</label>
                                    <input
                                      id={`exp-company-${exp.id}`}
                                      type="text"
                                      autoComplete="organization"
                                      placeholder="Company Name"
                                      value={exp.company}
                                      onChange={(e) => handleExperienceChange(exp.id, 'company', e.target.value)}
                                      className="w-full min-h-[48px] p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-gray-400 transition-all bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label htmlFor={`exp-position-${exp.id}`} className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Position</label>
                                    <input
                                      id={`exp-position-${exp.id}`}
                                      type="text"
                                      autoComplete="organization-title"
                                      placeholder="Job Title"
                                      value={exp.position}
                                      onChange={(e) => handleExperienceChange(exp.id, 'position', e.target.value)}
                                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-gray-400 transition-all bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label htmlFor={`exp-startDate-${exp.id}`} className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Start Date</label>
                                    <input
                                      id={`exp-startDate-${exp.id}`}
                                      type="text"
                                      placeholder="e.g., Jan 2020"
                                      value={exp.startDate}
                                      onChange={(e) => handleExperienceChange(exp.id, 'startDate', e.target.value)}
                                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-gray-400 transition-all bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label htmlFor={`exp-endDate-${exp.id}`} className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">End Date</label>
                                    <input
                                      id={`exp-endDate-${exp.id}`}
                                      type="text"
                                      placeholder="e.g., Present"
                                      value={exp.endDate}
                                      onChange={(e) => handleExperienceChange(exp.id, 'endDate', e.target.value)}
                                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-gray-400 transition-all bg-white"
                                    />
                                  </div>
                                  <div className="md:col-span-2 space-y-2 mt-2">
                                    <div className="flex justify-between items-center">
                                      <label htmlFor={`exp-desc-${exp.id}`} className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Description</label>
                                    </div>
                                    <RichTextEditor
                                      id={`exp-desc-${exp.id}`}
                                      value={exp.description}
                                      onChange={(val) => handleExperienceChange(exp.id, 'description', val)}
                                      placeholder="Describe your responsibilities and achievements..."
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleRefineText(
                                        `exp-${exp.id}`,
                                        exp.description,
                                        'experience',
                                        { position: exp.position, company: exp.company },
                                        (refined) => handleExperienceChange(exp.id, 'description', refined)
                                      )}
                                      disabled={refiningIds[`exp-${exp.id}`] || !exp.description?.trim()}
                                      className="flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg transition-all bg-gradient-to-r from-violet-50 to-blue-50 text-violet-700 border border-violet-200 hover:from-violet-100 hover:to-blue-100 hover:shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                      {refiningIds[`exp-${exp.id}`] ? (
                                        <><Loader2 size={13} className="mr-1.5 animate-spin" /> Refining...</>
                                      ) : (
                                        <><Sparkles size={13} className="mr-1.5" /> Refine with AI</>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                            <button
                              onClick={addExperience}
                              className="w-full flex justify-center items-center text-sm py-3 border-2 border-dashed border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300 font-medium transition-colors"
                            >
                              <Plus size={18} className="mr-2" /> Add Experience
                            </button>
                          </div>
                        </SortableAccordionSection>
                      );
                    case 'education':
                      return (
                        <SortableAccordionSection
                          key="education"
                          id="education"
                          title="Education"
                          icon={GraduationCap}
                          isOpen={expandedSection === 'education'}
                          onToggle={() => setExpandedSection(expandedSection === 'education' ? null : 'education')}
                        >
                          <div className="space-y-6">
                            {cvData.education.map((edu) => (
                              <div key={edu.id} className="p-5 border border-gray-200 rounded-xl relative bg-gray-50 shadow-sm">
                                <button
                                  onClick={() => removeEducation(edu.id)}
                                  className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 size={18} />
                                </button>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                  <div>
                                    <label htmlFor={`edu-inst-${edu.id}`} className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Institution</label>
                                    <input
                                      id={`edu-inst-${edu.id}`}
                                      type="text"
                                      autoComplete="organization"
                                      placeholder="University or School"
                                      value={edu.institution}
                                      onChange={(e) => handleEducationChange(edu.id, 'institution', e.target.value)}
                                      className="w-full min-h-[48px] p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-gray-400 transition-all bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label htmlFor={`edu-degree-${edu.id}`} className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Degree</label>
                                    <input
                                      id={`edu-degree-${edu.id}`}
                                      type="text"
                                      placeholder="e.g., Bachelor of Science"
                                      value={edu.degree}
                                      onChange={(e) => handleEducationChange(edu.id, 'degree', e.target.value)}
                                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-gray-400 transition-all bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label htmlFor={`edu-startDate-${edu.id}`} className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Start Date</label>
                                    <input
                                      id={`edu-startDate-${edu.id}`}
                                      type="text"
                                      placeholder="e.g., Sep 2015"
                                      value={edu.startDate}
                                      onChange={(e) => handleEducationChange(edu.id, 'startDate', e.target.value)}
                                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-gray-400 transition-all bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label htmlFor={`edu-endDate-${edu.id}`} className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">End Date</label>
                                    <input
                                      id={`edu-endDate-${edu.id}`}
                                      type="text"
                                      placeholder="e.g., May 2019"
                                      value={edu.endDate}
                                      onChange={(e) => handleEducationChange(edu.id, 'endDate', e.target.value)}
                                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-gray-400 transition-all bg-white"
                                    />
                                  </div>
                                  <div className="md:col-span-2 mt-2 space-y-2">
                                    <label htmlFor={`edu-desc-${edu.id}`} className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Description (Optional)</label>
                                    <RichTextEditor
                                      id={`edu-desc-${edu.id}`}
                                      value={edu.description || ''}
                                      onChange={(val) => handleEducationChange(edu.id, 'description', val)}
                                      placeholder="Honors, coursework, or achievements..."
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleRefineText(
                                        `edu-${edu.id}`,
                                        edu.description || '',
                                        'education',
                                        { degree: edu.degree, institution: edu.institution },
                                        (refined) => handleEducationChange(edu.id, 'description', refined)
                                      )}
                                      disabled={refiningIds[`edu-${edu.id}`] || !edu.description?.trim()}
                                      className="flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg transition-all bg-gradient-to-r from-violet-50 to-blue-50 text-violet-700 border border-violet-200 hover:from-violet-100 hover:to-blue-100 hover:shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                      {refiningIds[`edu-${edu.id}`] ? (
                                        <><Loader2 size={13} className="mr-1.5 animate-spin" /> Refining...</>
                                      ) : (
                                        <><Sparkles size={13} className="mr-1.5" /> Refine with AI</>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                            <button
                              onClick={addEducation}
                              className="w-full flex justify-center items-center text-sm py-3 border-2 border-dashed border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300 font-medium transition-colors"
                            >
                              <Plus size={18} className="mr-2" /> Add Education
                            </button>
                          </div>
                        </SortableAccordionSection>
                      );
                    case 'skills':
                      return (
                        <SortableAccordionSection
                          key="skills"
                          id="skills"
                          title="Skills"
                          icon={Wrench}
                          isOpen={expandedSection === 'skills'}
                          onToggle={() => setExpandedSection(expandedSection === 'skills' ? null : 'skills')}
                        >
                          <div className="space-y-4">
                            {cvData.skills.map((skill) => (
                              <div key={skill.id} className="flex items-center space-x-4 p-3 border border-gray-100 rounded-lg bg-gray-50/50">
                                <div className="flex-1">
                                  <input
                                    id={`skill-name-${skill.id}`}
                                    type="text"
                                    aria-label="Skill name"
                                    placeholder="Skill name (e.g. React)"
                                    value={skill.name}
                                    onChange={(e) => handleSkillChange(skill.id, 'name', e.target.value)}
                                    className="w-full min-h-[44px] p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-gray-400 transition-all bg-white text-sm"
                                  />
                                </div>

                                <div className="flex items-center space-x-1">
                                  {[1, 2, 3, 4, 5].map((level) => (
                                    <button
                                      key={level}
                                      type="button"
                                      onClick={() => handleSkillChange(skill.id, 'level', level)}
                                      className="focus:outline-none transition-all"
                                    >
                                      <div
                                        className={`h-2.5 w-6 rounded-sm border ${level <= skill.level ? 'border-blue-500' : 'border-gray-300 bg-transparent'}`}
                                        style={{
                                          backgroundColor: level <= skill.level ? '#3b82f6' : 'transparent'
                                        }}
                                      />
                                    </button>
                                  ))}
                                </div>

                                <button
                                  onClick={() => removeSkill(skill.id)}
                                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ))}

                            <button
                              onClick={addSkill}
                              className="w-full flex justify-center items-center text-sm py-3 border-2 border-dashed border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300 font-medium transition-colors"
                            >
                              <Plus size={18} className="mr-2" /> Add Skill
                            </button>
                          </div>
                        </SortableAccordionSection>
                      );
                    case 'courses':
                      return (
                        <SortableAccordionSection
                          key="courses"
                          id="courses"
                          title="Courses & Certifications"
                          icon={BookOpen}
                          isOpen={expandedSection === 'courses'}
                          onToggle={() => setExpandedSection(expandedSection === 'courses' ? null : 'courses')}
                        >
                          <div className="space-y-6">
                            {cvData.courses.map((course) => (
                              <div key={course.id} className="p-5 border border-gray-200 rounded-xl relative bg-gray-50 shadow-sm">
                                <button
                                  onClick={() => removeCourse(course.id)}
                                  className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 size={18} />
                                </button>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                  <div>
                                    <label htmlFor={`course-name-${course.id}`} className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Course Name</label>
                                    <input
                                      id={`course-name-${course.id}`}
                                      type="text"
                                      placeholder="e.g., Advanced React Patterns"
                                      value={course.name}
                                      onChange={(e) => handleCourseChange(course.id, 'name', e.target.value)}
                                      className="w-full min-h-[48px] p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-gray-400 transition-all bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label htmlFor={`course-inst-${course.id}`} className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Institution</label>
                                    <input
                                      id={`course-inst-${course.id}`}
                                      type="text"
                                      autoComplete="organization"
                                      placeholder="e.g., Coursera"
                                      value={course.institution}
                                      onChange={(e) => handleCourseChange(course.id, 'institution', e.target.value)}
                                      className="w-full min-h-[48px] p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-gray-400 transition-all bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label htmlFor={`course-startDate-${course.id}`} className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Start Date</label>
                                    <input
                                      id={`course-startDate-${course.id}`}
                                      type="text"
                                      placeholder="e.g., Jan 2023"
                                      value={course.startDate}
                                      onChange={(e) => handleCourseChange(course.id, 'startDate', e.target.value)}
                                      className="w-full min-h-[48px] p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-gray-400 transition-all bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label htmlFor={`course-endDate-${course.id}`} className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">End Date</label>
                                    <input
                                      id={`course-endDate-${course.id}`}
                                      type="text"
                                      placeholder="e.g., Mar 2023"
                                      value={course.endDate}
                                      onChange={(e) => handleCourseChange(course.id, 'endDate', e.target.value)}
                                      className="w-full min-h-[48px] p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-gray-400 transition-all bg-white"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                            <button
                              onClick={addCourse}
                              className="w-full flex justify-center items-center text-sm py-3 border-2 border-dashed border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300 font-medium transition-colors"
                            >
                              <Plus size={18} className="mr-2" /> Add Course
                            </button>
                          </div>
                        </SortableAccordionSection>
                      );
                    case 'languages':
                      return (
                        <SortableAccordionSection
                          key="languages"
                          id="languages"
                          title="Languages"
                          icon={Globe}
                          isOpen={expandedSection === 'languages'}
                          onToggle={() => setExpandedSection(expandedSection === 'languages' ? null : 'languages')}
                        >
                          <div className="space-y-4">
                            {cvData.languages.map((lang) => (
                              <div key={lang.id} className="flex items-center space-x-4 p-3 border border-gray-100 rounded-lg bg-gray-50/50">
                                <div className="flex-1">
                                  <input
                                    id={`lang-name-${lang.id}`}
                                    type="text"
                                    autoComplete="on"
                                    aria-label="Language name"
                                    placeholder="Language (e.g. English)"
                                    value={lang.name}
                                    onChange={(e) => handleLanguageChange(lang.id, 'name', e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-gray-400 transition-all bg-white text-sm"
                                  />
                                </div>
                                <div className="flex-1">
                                  <select
                                    id={`lang-prof-${lang.id}`}
                                    aria-label="Proficiency level"
                                    value={lang.proficiency}
                                    onChange={(e) => handleLanguageChange(lang.id, 'proficiency', e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-gray-400 transition-all bg-white text-sm"
                                  >
                                    <option value="Native">Native</option>
                                    <option value="Fluent">Fluent</option>
                                    <option value="Advanced">Advanced</option>
                                    <option value="Intermediate">Intermediate</option>
                                    <option value="Beginner">Beginner</option>
                                  </select>
                                </div>
                                <button
                                  onClick={() => removeLanguage(lang.id)}
                                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={addLanguage}
                              className="w-full flex justify-center items-center text-sm py-3 border-2 border-dashed border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300 font-medium transition-colors"
                            >
                              <Plus size={18} className="mr-2" /> Add Language
                            </button>
                          </div>
                        </SortableAccordionSection>
                      );
                    case 'projects':
                      return (
                        <SortableAccordionSection
                          key="projects"
                          id="projects"
                          title="Projects"
                          icon={FolderGit2}
                          isOpen={expandedSection === 'projects'}
                          onToggle={() => setExpandedSection(expandedSection === 'projects' ? null : 'projects')}
                        >
                          <div className="space-y-6">
                            {cvData.projects.map((proj) => (
                              <div key={proj.id} className="p-5 border border-gray-200 rounded-xl relative bg-gray-50 shadow-sm">
                                <button
                                  onClick={() => removeProject(proj.id)}
                                  className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 size={18} />
                                </button>
                                <div className="grid grid-cols-1 gap-4 mt-2">
                                  <div>
                                    <label htmlFor={`proj-name-${proj.id}`} className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Project Name</label>
                                    <input
                                      id={`proj-name-${proj.id}`}
                                      type="text"
                                      placeholder="e.g., E-commerce Website"
                                      value={proj.name}
                                      onChange={(e) => handleProjectChange(proj.id, 'name', e.target.value)}
                                      className="w-full min-h-[48px] p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-gray-400 transition-all bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label htmlFor={`proj-link-${proj.id}`} className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Link (Optional)</label>
                                    <input
                                      id={`proj-link-${proj.id}`}
                                      type="text"
                                      autoComplete="url"
                                      placeholder="e.g., https://github.com/..."
                                      value={proj.link}
                                      onChange={(e) => handleProjectChange(proj.id, 'link', e.target.value)}
                                      className="w-full min-h-[48px] p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-gray-400 transition-all bg-white"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label htmlFor={`proj-desc-${proj.id}`} className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Description</label>
                                    <RichTextEditor
                                      id={`proj-desc-${proj.id}`}
                                      value={proj.description}
                                      onChange={(val) => handleProjectChange(proj.id, 'description', val)}
                                      placeholder="Describe the project and your role..."
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleRefineText(
                                        `proj-${proj.id}`,
                                        proj.description,
                                        'project',
                                        { name: proj.name },
                                        (refined) => handleProjectChange(proj.id, 'description', refined)
                                      )}
                                      disabled={refiningIds[`proj-${proj.id}`] || !proj.description?.trim()}
                                      className="flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg transition-all bg-gradient-to-r from-violet-50 to-blue-50 text-violet-700 border border-violet-200 hover:from-violet-100 hover:to-blue-100 hover:shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                      {refiningIds[`proj-${proj.id}`] ? (
                                        <><Loader2 size={13} className="mr-1.5 animate-spin" /> Refining...</>
                                      ) : (
                                        <><Sparkles size={13} className="mr-1.5" /> Refine with AI</>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                            <button
                              onClick={addProject}
                              className="w-full flex justify-center items-center text-sm py-3 border-2 border-dashed border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300 font-medium transition-colors"
                            >
                              <Plus size={18} className="mr-2" /> Add Project
                            </button>
                          </div>
                        </SortableAccordionSection>
                      );
                    case 'awards':
                      return (
                        <SortableAccordionSection
                          key="awards"
                          id="awards"
                          title="Awards & Honors"
                          icon={Trophy}
                          isOpen={expandedSection === 'awards'}
                          onToggle={() => setExpandedSection(expandedSection === 'awards' ? null : 'awards')}
                        >
                          <div className="space-y-6">
                            {cvData.awards.map((award) => (
                              <div key={award.id} className="p-5 border border-gray-200 rounded-xl relative bg-gray-50 shadow-sm">
                                <button
                                  onClick={() => removeAward(award.id)}
                                  className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 size={18} />
                                </button>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                  <div className="md:col-span-2">
                                    <label htmlFor={`award-name-${award.id}`} className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Award Name</label>
                                    <input
                                      id={`award-name-${award.id}`}
                                      type="text"
                                      placeholder="e.g., Employee of the Year"
                                      value={award.name}
                                      onChange={(e) => handleAwardChange(award.id, 'name', e.target.value)}
                                      className="w-full min-h-[48px] p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-gray-400 transition-all bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label htmlFor={`award-issuer-${award.id}`} className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Issuer</label>
                                    <input
                                      id={`award-issuer-${award.id}`}
                                      type="text"
                                      autoComplete="organization"
                                      placeholder="e.g., Tech Solutions Inc."
                                      value={award.issuer}
                                      onChange={(e) => handleAwardChange(award.id, 'issuer', e.target.value)}
                                      className="w-full min-h-[48px] p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-gray-400 transition-all bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label htmlFor={`award-date-${award.id}`} className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Date</label>
                                    <input
                                      id={`award-date-${award.id}`}
                                      type="text"
                                      placeholder="e.g., Dec 2022"
                                      value={award.date}
                                      onChange={(e) => handleAwardChange(award.id, 'date', e.target.value)}
                                      className="w-full min-h-[48px] p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-gray-400 transition-all bg-white"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                            <button
                              onClick={addAward}
                              className="w-full flex justify-center items-center text-sm py-3 border-2 border-dashed border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300 font-medium transition-colors"
                            >
                              <Plus size={18} className="mr-2" /> Add Award
                            </button>
                          </div>
                        </SortableAccordionSection>
                      );
                    default:
                      return null;
                  }
                })}
              </SortableContext>
            </DndContext>
            {/* Spacer to ensure scrollability and prevent dnd-kit bugs at the bottom */}
            <div className="h-8 w-full shrink-0"></div>
          </div>
        )}

        {activeMainTab === 'design' && (
          <div className="animate-in fade-in duration-300 space-y-6">

            {/* Choose Template Section */}
            <div className="p-5 border border-gray-200 rounded-xl bg-gray-50">
              <div className="flex items-center mb-4">
                <LayoutTemplate size={20} className="text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-800">Choose Template</h3>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-[480px]">
                {/* Classic Template Card */}
                <button
                  type="button"
                  onClick={() => setTemplate('classic')}
                  className={`relative flex flex-col items-center p-2 rounded-lg border-2 transition-all duration-200 group ${template === 'classic'
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                >
                  {template === 'classic' && (
                    <div className="absolute top-1.5 right-1.5 text-blue-600 z-10">
                      <CheckCircle2 size={16} fill="currentColor" className="text-white fill-blue-600" />
                    </div>
                  )}
                  <div className={`w-full aspect-[3/4] rounded-md border mb-2 flex flex-col p-1.5 space-y-0.5 overflow-hidden transition-colors ${template === 'classic' ? 'border-blue-200 bg-white' : 'border-gray-100 bg-gray-50'
                    }`}>
                    <div className="h-1.5 w-1/2 bg-gray-300 rounded-full mb-1"></div>
                    <div className="h-0.5 w-full bg-gray-200 rounded-full"></div>
                    <div className="h-0.5 w-full bg-gray-200 rounded-full"></div>
                    <div className="h-0.5 w-3/4 bg-gray-200 rounded-full mb-1"></div>
                    <div className="flex space-x-1 mt-0.5">
                      <div className="w-1/3 space-y-0.5">
                        <div className="h-0.5 w-full bg-gray-200 rounded-full"></div>
                        <div className="h-0.5 w-full bg-gray-200 rounded-full"></div>
                      </div>
                      <div className="w-2/3 space-y-0.5">
                        <div className="h-0.5 w-full bg-gray-200 rounded-full"></div>
                        <div className="h-0.5 w-full bg-gray-200 rounded-full"></div>
                        <div className="h-0.5 w-full bg-gray-200 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs font-bold ${template === 'classic' ? 'text-blue-700' : 'text-gray-600'}`}>Classic</span>
                </button>

                {/* Modern Template Card */}
                <button
                  type="button"
                  onClick={() => setTemplate('modern')}
                  className={`relative flex flex-col items-center p-2 rounded-lg border-2 transition-all duration-200 group ${template === 'modern'
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                >
                  {template === 'modern' && (
                    <div className="absolute top-1.5 right-1.5 text-blue-600 z-10">
                      <CheckCircle2 size={16} fill="currentColor" className="text-white fill-blue-600" />
                    </div>
                  )}
                  <div className={`w-full aspect-[3/4] rounded-md border mb-2 flex flex-row overflow-hidden transition-colors ${template === 'modern' ? 'border-blue-200 bg-white' : 'border-gray-100 bg-gray-50'
                    }`}>
                    <div className="w-1/3 h-full bg-blue-600/10 p-1.5 space-y-0.5">
                      <div className="w-5 h-5 rounded-full bg-blue-600/20 mb-1"></div>
                      <div className="h-0.5 w-full bg-blue-600/20 rounded-full"></div>
                      <div className="h-0.5 w-full bg-blue-600/20 rounded-full"></div>
                    </div>
                    <div className="w-2/3 h-full p-1.5 space-y-1">
                      <div className="h-1.5 w-1/2 bg-gray-300 rounded-full"></div>
                      <div className="space-y-0.5">
                        <div className="h-0.5 w-full bg-gray-200 rounded-full"></div>
                        <div className="h-0.5 w-full bg-gray-200 rounded-full"></div>
                        <div className="h-0.5 w-3/4 bg-gray-200 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs font-bold ${template === 'modern' ? 'text-blue-700' : 'text-gray-600'}`}>Modern</span>
                </button>

                {/* Professional Template Card */}
                <button
                  type="button"
                  onClick={() => setTemplate('professional')}
                  className={`relative flex flex-col items-center p-2 rounded-lg border-2 transition-all duration-200 group ${template === 'professional'
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                >
                  {template === 'professional' && (
                    <div className="absolute top-1.5 right-1.5 text-blue-600 z-10">
                      <CheckCircle2 size={16} fill="currentColor" className="text-white fill-blue-600" />
                    </div>
                  )}
                  <div className={`w-full aspect-[3/4] rounded-md border mb-2 flex flex-col p-1.5 overflow-hidden transition-colors ${template === 'professional' ? 'border-blue-200 bg-white' : 'border-gray-100 bg-gray-50'
                    }`}>
                    <div className="w-full h-1 bg-blue-600/30 rounded-full mb-1"></div>
                    <div className="h-1.5 w-1/2 bg-gray-300 rounded-full mb-0.5"></div>
                    <div className="h-0.5 w-1/3 bg-gray-200 rounded-full mb-2"></div>

                    <div className="h-0.5 w-1/4 bg-blue-600/20 rounded-full mb-1"></div>
                    <div className="flex space-x-1 mb-1.5">
                      <div className="w-1/3 space-y-0.5">
                        <div className="h-0.5 w-full bg-gray-200 rounded-full"></div>
                      </div>
                      <div className="w-2/3 space-y-0.5">
                        <div className="h-0.5 w-full bg-gray-300 rounded-full"></div>
                        <div className="h-0.5 w-full bg-gray-200 rounded-full"></div>
                        <div className="h-0.5 w-3/4 bg-gray-200 rounded-full"></div>
                      </div>
                    </div>

                    <div className="h-0.5 w-1/4 bg-blue-600/20 rounded-full mb-1"></div>
                    <div className="flex space-x-1">
                      <div className="w-1/3 space-y-0.5">
                        <div className="h-0.5 w-full bg-gray-200 rounded-full"></div>
                      </div>
                      <div className="w-2/3 space-y-0.5">
                        <div className="h-0.5 w-full bg-gray-300 rounded-full"></div>
                        <div className="h-0.5 w-full bg-gray-200 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs font-bold ${template === 'professional' ? 'text-blue-700' : 'text-gray-600'}`}>Professional</span>
                </button>
              </div>
            </div>

            <div className="p-5 border border-gray-200 rounded-xl bg-gray-50">
              <div className="flex items-center mb-4">
                <ImageIcon size={20} className="text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-800">Profile Picture</h3>
              </div>

              <div className="flex flex-col space-y-5">
                <div className="flex items-center space-x-5">
                  {cvData.profileImage ? (
                    <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 shadow-sm flex items-center justify-center bg-white">
                      <img
                        src={cvData.profileImage}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        style={{ transform: `scale(${cvData.imageZoom || 1}) translate(${cvData.imageX || 0}px, ${cvData.imageY || 0}px)` }}
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-white border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                      <Upload size={24} />
                    </div>
                  )}
                  <div className="flex flex-col space-y-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium transition-colors shadow-sm"
                    >
                      {cvData.profileImage ? 'Change Photo' : 'Upload Photo'}
                    </button>
                    {cvData.profileImage && (
                      <button
                        type="button"
                        onClick={() => setCvData(prev => ({ ...prev, profileImage: '' }))}
                        className="text-sm text-red-500 hover:text-red-700 font-medium text-left px-1"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                {cvData.profileImage && (
                  <div className="space-y-4 pt-4 border-t border-gray-200">
                    <div>
                      <div className="flex justify-between mb-1">
                        <label htmlFor="imageZoom" className="text-xs font-medium text-gray-600 uppercase tracking-wider">Zoom</label>
                        <span className="text-xs text-gray-500">{cvData.imageZoom || 1}x</span>
                      </div>
                      <input
                        id="imageZoom"
                        type="range"
                        min="0.5" max="3" step="0.1"
                        value={cvData.imageZoom || 1}
                        onChange={(e) => setCvData(prev => ({ ...prev, imageZoom: parseFloat(e.target.value) }))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <label htmlFor="imageX" className="text-xs font-medium text-gray-600 uppercase tracking-wider">Position X</label>
                          <span className="text-xs text-gray-500">{cvData.imageX || 0}px</span>
                        </div>
                        <input
                          id="imageX"
                          type="range"
                          min="-100" max="100" step="1"
                          value={cvData.imageX || 0}
                          onChange={(e) => setCvData(prev => ({ ...prev, imageX: parseInt(e.target.value) }))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <label htmlFor="imageY" className="text-xs font-medium text-gray-600 uppercase tracking-wider">Position Y</label>
                          <span className="text-xs text-gray-500">{cvData.imageY || 0}px</span>
                        </div>
                        <input
                          id="imageY"
                          type="range"
                          min="-100" max="100" step="1"
                          value={cvData.imageY || 0}
                          onChange={(e) => setCvData(prev => ({ ...prev, imageY: parseInt(e.target.value) }))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 border border-gray-200 rounded-xl bg-gray-50">
              <div className="flex items-center mb-4">
                <Palette size={20} className="text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-800">Theme Settings</h3>
              </div>
              <div className="space-y-5">
                <div>
                  <label htmlFor="themeColor" className="block text-sm font-medium text-gray-700 mb-2">Primary Theme Color</label>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <input
                        id="themeColor"
                        type="color"
                        value={cvData.themeColor}
                        onChange={(e) => handleThemeChange('themeColor', e.target.value)}
                        className="h-10 w-14 p-1 border border-gray-300 rounded-lg cursor-pointer bg-white"
                      />
                    </div>
                    <span className="text-sm font-mono text-gray-600 bg-white px-3 py-1.5 border border-gray-200 rounded-md uppercase">{cvData.themeColor}</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="sidebarColor" className="block text-sm font-medium text-gray-700 mb-2">Sidebar Background (Modern Template)</label>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <input
                        id="sidebarColor"
                        type="color"
                        value={cvData.sidebarColor}
                        onChange={(e) => handleThemeChange('sidebarColor', e.target.value)}
                        className="h-10 w-14 p-1 border border-gray-300 rounded-lg cursor-pointer bg-white"
                      />
                    </div>
                    <span className="text-sm font-mono text-gray-600 bg-white px-3 py-1.5 border border-gray-200 rounded-md uppercase">{cvData.sidebarColor}</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="fontFamily" className="block text-sm font-medium text-gray-700 mb-2">Font Family</label>
                  <select
                    id="fontFamily"
                    value={cvData.fontFamily}
                    onChange={(e) => handleThemeChange('fontFamily', e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-gray-400 transition-all bg-white text-gray-800"
                  >
                    <option value="Inter">Inter (Modern, Clean)</option>
                    <option value="Lora">Lora (Serif, Classic)</option>
                    <option value="Roboto">Roboto (Structured, Technical)</option>
                    <option value="Montserrat">Montserrat (Geometric, Bold)</option>
                    <option value="Merriweather">Merriweather (Elegant Serif)</option>
                    <option value="Playfair Display">Playfair Display (Stylish Serif)</option>
                    <option value="JetBrains Mono">JetBrains Mono (Technical, Code)</option>
                  </select>
                </div>

                {/* Spacing Controls */}
                <div className="space-y-6 pt-6 border-t border-gray-200">
                  <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wider">
                    <Layout size={16} className="text-blue-600" />
                    Document Spacing
                  </h4>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label htmlFor="lineSpacing" className="text-xs font-semibold text-gray-600 flex items-center gap-2 uppercase tracking-wider">
                          <MoveVertical size={14} />
                          Line Spacing
                        </label>
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          {cvData.lineSpacing || 1.5}
                        </span>
                      </div>
                      <input
                        id="lineSpacing"
                        type="range"
                        min="1"
                        max="2.5"
                        step="0.1"
                        value={cvData.lineSpacing || 1.5}
                        onChange={(e) => setCvData(prev => ({ ...prev, lineSpacing: parseFloat(e.target.value) }))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                        <span>Compact</span>
                        <span>Relaxed</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label htmlFor="sectionGap" className="text-xs font-semibold text-gray-600 flex items-center gap-2 uppercase tracking-wider">
                          <MoveHorizontal size={14} />
                          Section Gap
                        </label>
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          {cvData.sectionGap || 2}
                        </span>
                      </div>
                      <input
                        id="sectionGap"
                        type="range"
                        min="0.5"
                        max="4"
                        step="0.1"
                        value={cvData.sectionGap || 2}
                        onChange={(e) => setCvData(prev => ({ ...prev, sectionGap: parseFloat(e.target.value) }))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                        <span>Tight</span>
                        <span>Spacious</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Spacer to ensure scrollability at the bottom */}
            <div className="h-8 w-full shrink-0"></div>
          </div>
        )}
        <EditorFooter />
      </div>
    </div>
  );
}
