import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Palette, Check, ArrowRight } from 'lucide-react';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import DOMPurify from 'dompurify';

import { CVData, Experience, Education, Skill, Course, Language, Project, Award } from '../types';
import { EditorFooter } from './EditorFooter';
import { WizardNav } from './WizardNav';
import { compressAndResizeImage } from '../utils/imageUtils';

import {
  PersonalDetailsSection,
  SummarySection,
  ExperienceSection,
  EducationSection,
  SkillsSection,
  CoursesSection,
  LanguagesSection,
  ProjectsSection,
  AwardsSection,
  DesignPanel,
  ImportModals,
  ALL_STEPS,
  FINALIZE_SECTION_KEYS,
  WIZARD_STEPS,
  MAX_CV_FILE_SIZE,
  MAX_IMAGE_FILE_SIZE,
  TAB_CONTAINER_CLASS,
  TAB_BUTTON_BASE,
  TAB_BUTTON_ACTIVE,
  TAB_BUTTON_INACTIVE
} from './form';

interface CVFormProps {
  cvData: CVData;
  setCvData: React.Dispatch<React.SetStateAction<CVData>>;
  template: string;
  setTemplate: (template: 'classic' | 'modern' | 'professional') => void;
  isDarkMode?: boolean;
  onPopupVisibleChange?: (visible: boolean) => void;
}

export default function CVForm({ cvData, setCvData, template, setTemplate, isDarkMode = false, onPopupVisibleChange }: CVFormProps) {
  const [activeMainTab, setActiveMainTab] = useState<'content' | 'design'>('content');
  const [expandedSection, setExpandedSection] = useState<string | null>('personalDetails');
  const [wizardStep, setWizardStep] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressContainerRef = useRef<HTMLDivElement>(null);
  const formContainerRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Scroll to active step in progress bar
  useEffect(() => {
    if (progressContainerRef.current && stepRefs.current[wizardStep]) {
      const container = progressContainerRef.current;
      const stepElement = stepRefs.current[wizardStep];
      if (stepElement) {
        const scrollLeft = stepElement.offsetLeft - (container.clientWidth / 2) + (stepElement.clientWidth / 2);
        container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
    }
  }, [wizardStep]);

  // Scroll to top of form when step changes
  useEffect(() => {
    if (formContainerRef.current) {
      formContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [wizardStep]);

  // Expand relevant section when step changes
  useEffect(() => {
    const currentSectionKey = ALL_STEPS[wizardStep];
    if (currentSectionKey) {
      if (currentSectionKey === 'finalize') {
        setExpandedSection(FINALIZE_SECTION_KEYS[0]);
      } else {
        setExpandedSection(currentSectionKey);
      }
    }
  }, [wizardStep]);

  const [showInitialPrompt, setShowInitialPrompt] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    const hasSeenPrompt = sessionStorage.getItem('hasSeenCVPrompt');
    const hasSavedData = localStorage.getItem('cv-builder-data');
    if (!hasSeenPrompt && !hasSavedData) {
      setShowInitialPrompt(true);
      sessionStorage.setItem('hasSeenCVPrompt', 'true');
    }
  }, []);

  useEffect(() => {
    onPopupVisibleChange?.(showInitialPrompt || showUploadModal);
  }, [showInitialPrompt, showUploadModal, onPopupVisibleChange]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [refiningIds, setRefiningIds] = useState<Record<string, boolean>>({});
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const setRefining = useCallback((id: string, value: boolean) => {
    setRefiningIds(prev => ({ ...prev, [id]: value }));
  }, []);

  const stripHtml = (html: string) => DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });

  const handleGenerateSummary = async () => {
    setRefining('summary', true);
    try {
      const res = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-App-Source': 'cv-builder-app' },
        body: JSON.stringify({
          experience: cvData.experience,
          education: cvData.education,
          skills: cvData.skills,
        }),
      });
      if (!res.ok) throw new Error('Failed to generate summary');
      const data = await res.json();
      if (data.summary) {
        setCvData(prev => ({ ...prev, personalInfo: { ...prev.personalInfo, summary: data.summary } }));
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      alert('Failed to generate summary. Please try again.');
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
        headers: { 'Content-Type': 'application/json', 'X-App-Source': 'cv-builder-app' },
        body: JSON.stringify({ text: plainText, sectionType, context }),
      });
      if (!res.ok) throw new Error('Failed to refine text');
      const data = await res.json();
      if (data.refined) onUpdate(data.refined);
    } catch (error) {
      console.error('Error refining text:', error);
      alert('Failed to refine text. Please try again.');
    } finally {
      setRefining(id, false);
    }
  };

  const handleCVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportMessage({ type: 'success', text: 'Starting import...' });

    if (file.size > MAX_CV_FILE_SIZE) {
      setImportMessage({ type: 'error', text: 'File is too large. Maximum allowed size is 10 MB.' });
      event.target.value = '';
      setIsImporting(false);
      return;
    }

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const mimeType = file.type || "application/pdf";

          const parseResponse = await fetch('/api/parse-cv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-App-Source': 'cv-builder-app' },
            body: JSON.stringify({ base64Data, mimeType }),
          });

          if (!parseResponse.ok) throw new Error(`Server error: ${await parseResponse.text()}`);

          const result = await parseResponse.json();
          if (result) {
            setCvData(prev => ({
              ...prev,
              personalInfo: { ...prev.personalInfo, ...(result.personalInfo || {}) },
              experience: (result.experience || []).map((e: any) => ({ ...e, id: crypto.randomUUID() })),
              education: (result.education || []).map((e: any) => ({ ...e, id: crypto.randomUUID() })),
              skills: (result.skills || []).map((s: any) => ({ ...s, id: crypto.randomUUID(), level: s.level || 4 })),
              courses: (result.courses || []).map((c: any) => ({ ...c, id: crypto.randomUUID() })),
              languages: (result.languages || []).map((l: any) => ({ ...l, id: crypto.randomUUID() })),
              projects: (result.projects || []).map((p: any) => ({ ...p, id: crypto.randomUUID() })),
              awards: (result.awards || []).map((a: any) => ({ ...a, id: crypto.randomUUID() })),
            }));

            setImportMessage({ type: 'success', text: 'Data imported successfully!' });
            setTimeout(() => { setShowUploadModal(false); setImportMessage(null); }, 1500);
          }
        } catch (error: any) {
          console.error('Error importing CV:', error);
          setImportMessage({ type: 'error', text: `Import failed: ${error.message}` });
        } finally {
          setIsImporting(false);
        }
      };
    } catch (error: any) {
      console.error('Error importing CV:', error);
      setIsImporting(false);
    }
    if (event.target) event.target.value = '';
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setCvData((prev) => {
        const oldIndex = prev.sectionOrder.indexOf(active.id as string);
        const newIndex = prev.sectionOrder.indexOf(over.id as string);
        return { ...prev, sectionOrder: arrayMove(prev.sectionOrder, oldIndex, newIndex) };
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_IMAGE_FILE_SIZE) {
        alert('Image is too large. Maximum allowed size is 5 MB.');
        return;
      }
      try {
        const compressedImage = await compressAndResizeImage(file);
        setCvData((prev) => ({ ...prev, profileImage: compressedImage, imageZoom: 1, imageX: 0, imageY: 0 }));
      } catch (error) {
        console.error('Error processing image:', error);
        alert('Failed to process image.');
      }
    }
  };

  const handlePersonalInfoChange = useCallback((e: any) => {
    const { name, value } = e.target;
    setCvData((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, [name]: value } }));
  }, [setCvData]);

  const handleExperienceChange = useCallback((id: string, field: keyof Experience, value: string) => {
    setCvData((prev) => ({
      ...prev,
      experience: prev.experience.map((exp) => (exp.id === id ? { ...exp, [field]: value } : exp)),
    }));
  }, [setCvData]);

  const handleEducationChange = useCallback((id: string, field: keyof Education, value: string) => {
    setCvData((prev) => ({
      ...prev,
      education: prev.education.map((edu) => (edu.id === id ? { ...edu, [field]: value } : edu)),
    }));
  }, [setCvData]);

  const handleSkillChange = useCallback((id: string, field: keyof Skill, value: any) => {
    setCvData((prev) => ({
      ...prev,
      skills: prev.skills.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    }));
  }, [setCvData]);

  const handleCourseChange = useCallback((id: string, field: keyof Course, value: string) => {
    setCvData((prev) => ({
      ...prev,
      courses: prev.courses.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    }));
  }, [setCvData]);

  const handleLanguageChange = useCallback((id: string, field: keyof Language, value: string) => {
    setCvData((prev) => ({
      ...prev,
      languages: prev.languages.map((l) => (l.id === id ? { ...l, [field]: value } : l)),
    }));
  }, [setCvData]);

  const handleProjectChange = useCallback((id: string, field: keyof Project, value: string) => {
    setCvData((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    }));
  }, [setCvData]);

  const handleAwardChange = useCallback((id: string, field: keyof Award, value: string) => {
    setCvData((prev) => ({
      ...prev,
      awards: prev.awards.map((a) => (a.id === id ? { ...a, [field]: value } : a)),
    }));
  }, [setCvData]);

  // Generic Add/Remove helper
  const addSectionItem = useCallback((section: keyof CVData, defaultItem: any) => {
    setCvData(prev => ({ ...prev, [section]: [...(prev[section] as any[]), { ...defaultItem, id: crypto.randomUUID() }] }));
  }, [setCvData]);

  const removeSectionItem = useCallback((section: keyof CVData, id: string) => {
    setCvData(prev => ({ ...prev, [section]: (prev[section] as any[]).filter(item => item.id !== id) }));
  }, [setCvData]);

  const goNext = () => { if (wizardStep < ALL_STEPS.length - 1) setWizardStep(wizardStep + 1); };
  const goBack = () => { if (wizardStep > 0) setWizardStep(wizardStep - 1); };

  const renderSection = (sectionKey: string) => {
    switch (sectionKey) {
      case 'personalDetails':
        return (
          <PersonalDetailsSection
            personalInfo={cvData.personalInfo}
            isOpen={expandedSection === 'personalDetails'}
            onToggle={() => setExpandedSection(expandedSection === 'personalDetails' ? null : 'personalDetails')}
            onChange={handlePersonalInfoChange}
            isDarkMode={isDarkMode}
            isDatePickerOpen={isDatePickerOpen}
            onDatePickerOpen={() => setIsDatePickerOpen(true)}
            onDatePickerClose={() => setIsDatePickerOpen(false)}
          />
        );
      case 'summary':
        return (
          <SummarySection
            summary={cvData.personalInfo.summary}
            isOpen={expandedSection === 'summary'}
            onToggle={() => setExpandedSection(expandedSection === 'summary' ? null : 'summary')}
            onSummaryChange={(val) => handlePersonalInfoChange({ target: { name: 'summary', value: val } })}
            onGenerateSummary={handleGenerateSummary}
            isRefining={refiningIds['summary']}
          />
        );
      case 'experience':
        return (
          <ExperienceSection
            experience={cvData.experience}
            isOpen={expandedSection === 'experience'}
            onToggle={() => setExpandedSection(expandedSection === 'experience' ? null : 'experience')}
            onChange={handleExperienceChange}
            onAdd={() => addSectionItem('experience', { company: '', position: '', startDate: '', endDate: '', description: '' })}
            onRemove={(id) => removeSectionItem('experience', id)}
            onRefineText={handleRefineText}
            refiningIds={refiningIds}
          />
        );
      case 'education':
        return (
          <EducationSection
            education={cvData.education}
            isOpen={expandedSection === 'education'}
            onToggle={() => setExpandedSection(expandedSection === 'education' ? null : 'education')}
            onChange={handleEducationChange}
            onAdd={() => addSectionItem('education', { institution: '', degree: '', startDate: '', endDate: '', description: '' })}
            onRemove={(id) => removeSectionItem('education', id)}
            onRefineText={handleRefineText}
            refiningIds={refiningIds}
          />
        );
      case 'skills':
        return (
          <SkillsSection
            skills={cvData.skills}
            isOpen={expandedSection === 'skills'}
            onToggle={() => setExpandedSection(expandedSection === 'skills' ? null : 'skills')}
            onChange={handleSkillChange}
            onAdd={() => addSectionItem('skills', { name: '', level: 5 })}
            onRemove={(id) => removeSectionItem('skills', id)}
            isDarkMode={isDarkMode}
          />
        );
      case 'courses':
        return (
          <CoursesSection
            courses={cvData.courses}
            isOpen={expandedSection === 'courses'}
            onToggle={() => setExpandedSection(expandedSection === 'courses' ? null : 'courses')}
            onChange={handleCourseChange}
            onAdd={() => addSectionItem('courses', { name: '', institution: '', startDate: '', endDate: '' })}
            onRemove={(id) => removeSectionItem('courses', id)}
          />
        );
      case 'languages':
        return (
          <LanguagesSection
            languages={cvData.languages}
            isOpen={expandedSection === 'languages'}
            onToggle={() => setExpandedSection(expandedSection === 'languages' ? null : 'languages')}
            onChange={handleLanguageChange}
            onAdd={() => addSectionItem('languages', { name: '', proficiency: 'Native' })}
            onRemove={(id) => removeSectionItem('languages', id)}
            isDarkMode={isDarkMode}
          />
        );
      case 'projects':
        return (
          <ProjectsSection
            projects={cvData.projects}
            isOpen={expandedSection === 'projects'}
            onToggle={() => setExpandedSection(expandedSection === 'projects' ? null : 'projects')}
            onChange={handleProjectChange}
            onAdd={() => addSectionItem('projects', { name: '', description: '', link: '' })}
            onRemove={(id) => removeSectionItem('projects', id)}
            onRefineText={handleRefineText}
            refiningIds={refiningIds}
          />
        );
      case 'awards':
        return (
          <AwardsSection
            awards={cvData.awards}
            isOpen={expandedSection === 'awards'}
            onToggle={() => setExpandedSection(expandedSection === 'awards' ? null : 'awards')}
            onChange={handleAwardChange}
            onAdd={() => addSectionItem('awards', { name: '', date: '', issuer: '' })}
            onRemove={(id) => removeSectionItem('awards', id)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Tab Switcher */}
      <div className={TAB_CONTAINER_CLASS}>
        <button
          onClick={() => setActiveMainTab('content')}
          className={`${TAB_BUTTON_BASE} ${activeMainTab === 'content' ? TAB_BUTTON_ACTIVE : TAB_BUTTON_INACTIVE}`}
        >
          <FileText size={16} className="mr-2" /> Content
        </button>
        <button
          onClick={() => setActiveMainTab('design')}
          className={`${TAB_BUTTON_BASE} ${activeMainTab === 'design' ? TAB_BUTTON_ACTIVE : TAB_BUTTON_INACTIVE}`}
        >
          <Palette size={16} className="mr-2" /> Design
        </button>
      </div>

      <div
        ref={formContainerRef}
        className="flex-1 h-full overflow-y-auto scrollbar-hide px-4 sm:px-6 flex flex-col"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {activeMainTab === 'content' ? (
          <div className="animate-in fade-in duration-300 flex flex-col flex-1">
            {/* Progress Bar */}
            <div ref={progressContainerRef} className="mb-5 px-1 w-full overflow-x-auto scrollbar-hide py-2">
              <div className="flex items-center justify-between min-w-max sm:min-w-full px-2 gap-4 sm:gap-2">
                {WIZARD_STEPS.map((step, i) => {
                  const status = i < wizardStep ? 'completed' : i === wizardStep ? 'active' : 'upcoming';
                  const Icon = step.key === 'finalize' ? ArrowRight : (WIZARD_STEPS[i] as any).icon || FileText; // Fallback or handle icons
                  return (
                    <React.Fragment key={step.key}>
                      <div
                        ref={(el) => { stepRefs.current[i] = el; }}
                        className="flex flex-col items-center cursor-pointer"
                        onClick={() => setWizardStep(i)}
                      >
                        <div className={`wizard-step-dot ${status}`}>
                          {status === 'completed' ? <Check size={14} /> : <Icon size={14} />}
                        </div>
                        <span className={`wizard-step-label ${status === 'active' ? 'text-violet-600' : status === 'completed' ? 'text-violet-500' : 'text-gray-400'}`}>
                          {step.title}
                        </span>
                      </div>
                      {i < WIZARD_STEPS.length - 1 && (
                        <div className={`wizard-step-connector ${i < wizardStep ? 'completed' : ''}`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Form Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={wizardStep}
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.98 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              >
                <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
                  <SortableContext
                    items={ALL_STEPS[wizardStep] === 'finalize' ? [...FINALIZE_SECTION_KEYS] : [ALL_STEPS[wizardStep]]}
                    strategy={verticalListSortingStrategy}
                  >
                    {(ALL_STEPS[wizardStep] === 'finalize' ? FINALIZE_SECTION_KEYS : [ALL_STEPS[wizardStep]])
                      .filter(Boolean)
                      .map((key) => renderSection(key as string))}
                  </SortableContext>
                </DndContext>
              </motion.div>
            </AnimatePresence>

            <WizardNav
              wizardStep={wizardStep}
              totalSteps={ALL_STEPS.length}
              onNext={goNext}
              onBack={goBack}
            />
            <div className="h-8 w-full shrink-0"></div>
          </div>
        ) : (
          <DesignPanel
            cvData={cvData}
            setCvData={setCvData}
            template={template}
            setTemplate={setTemplate}
            isDarkMode={isDarkMode}
            fileInputRef={fileInputRef}
            onImageUpload={handleImageUpload}
          />
        )}
        <div className="mt-auto">
          <EditorFooter />
        </div>
      </div>

      <ImportModals
        showInitialPrompt={showInitialPrompt}
        setShowInitialPrompt={setShowInitialPrompt}
        showUploadModal={showUploadModal}
        setShowUploadModal={setShowUploadModal}
        isImporting={isImporting}
        importMessage={importMessage}
        handleCVImport={handleCVImport}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}
