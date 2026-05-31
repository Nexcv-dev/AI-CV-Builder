import React, { Suspense, lazy, useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Palette, Check, LayoutTemplate, Crown } from 'lucide-react';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import DOMPurify from 'dompurify';
import toast from 'react-hot-toast';

import { CVData, Experience, Education, Skill, Course, Language, Project, Award, Reference } from '../types';
import { TemplateName } from '../templates';
import { useTemplateConfig } from '../hooks/useTemplateConfig';
import { useBuilderStore } from '../stores/useBuilderStore';
import { EditorFooter } from './EditorFooter';
import { WizardNav } from './WizardNav';
import { compressAndResizeImage } from '../utils/imageUtils';
import { applyTemplateColorDefaults } from '../utils/templateData';
import { csrfFetch } from '../utils/api';

import {
  ALL_STEPS,
  FINALIZE_SECTION_KEYS,
  WIZARD_STEPS,
  MAX_CV_FILE_SIZE,
  MAX_IMAGE_FILE_SIZE,
  TAB_CONTAINER_CLASS,
  TAB_BUTTON_BASE,
  TAB_BUTTON_ACTIVE,
  TAB_BUTTON_INACTIVE,
  getPersonalInfoLimit,
  getSectionFieldLimit,
  truncateText
} from './form/constants';

const PersonalDetailsSection = lazy(() => import('./form/PersonalDetailsSection').then((module) => ({ default: module.PersonalDetailsSection })));
const SummarySection = lazy(() => import('./form/SummarySection').then((module) => ({ default: module.SummarySection })));
const ExperienceSection = lazy(() => import('./form/ExperienceSection').then((module) => ({ default: module.ExperienceSection })));
const EducationSection = lazy(() => import('./form/EducationSection').then((module) => ({ default: module.EducationSection })));
const SkillsSection = lazy(() => import('./form/SkillsSection').then((module) => ({ default: module.SkillsSection })));
const CoursesSection = lazy(() => import('./form/CoursesSection').then((module) => ({ default: module.CoursesSection })));
const LanguagesSection = lazy(() => import('./form/LanguagesSection').then((module) => ({ default: module.LanguagesSection })));
const ProjectsSection = lazy(() => import('./form/ProjectsSection').then((module) => ({ default: module.ProjectsSection })));
const AwardsSection = lazy(() => import('./form/AwardsSection').then((module) => ({ default: module.AwardsSection })));
const ReferencesSection = lazy(() => import('./form/ReferencesSection').then((module) => ({ default: module.ReferencesSection })));
const DesignPanel = lazy(() => import('./form/DesignPanel').then((module) => ({ default: module.DesignPanel })));
const ImportModals = lazy(() => import('./form/ImportModals').then((module) => ({ default: module.ImportModals })));

interface CVFormProps {
  cvData?: CVData;
  setCvData?: React.Dispatch<React.SetStateAction<CVData>>;
  template?: TemplateName;
  setTemplate?: (template: TemplateName) => void;
  isDarkMode?: boolean;
  onPopupVisibleChange?: (visible: boolean) => void;
  onFinish?: () => void;
  showImportPromptOnMount?: boolean;
  showTemplatesOnMount?: boolean;
  skipTemplatesAfterImport?: boolean;
  isFreePlan?: boolean;
  onUpgradeRequired?: (source: 'save' | 'download' | 'ai') => void;
}

function FormChunkFallback({ isDarkMode = false }: { isDarkMode?: boolean }) {
  return (
    <div className={`flex min-h-48 items-center justify-center rounded-2xl border text-sm font-bold ${isDarkMode ? 'border-slate-700 bg-slate-800/45 text-slate-400' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
      Loading editor...
    </div>
  );
}

export default function CVForm({ cvData: cvDataProp, setCvData: setCvDataProp, template: templateProp, setTemplate: setTemplateProp, isDarkMode = false, onPopupVisibleChange, onFinish, showImportPromptOnMount = false, showTemplatesOnMount = false, skipTemplatesAfterImport = false, isFreePlan = false, onUpgradeRequired }: CVFormProps) {
  const { templates, isTemplatePaid, getTemplateLabel } = useTemplateConfig();
  const storeCvData = useBuilderStore((state) => state.cvData);
  const storeSetCvData = useBuilderStore((state) => state.setCvData);
  const storeTemplate = useBuilderStore((state) => state.template);
  const storeSetTemplate = useBuilderStore((state) => state.setTemplate);
  const cvData = cvDataProp || storeCvData;
  const setCvData = setCvDataProp || storeSetCvData;
  const template = templateProp || storeTemplate;
  const setTemplate = setTemplateProp || storeSetTemplate;
  const templateDefaults = useMemo(() => Object.fromEntries(templates.map((item) => [item.key, item.defaultThemeColor || '#000000'])), [templates]);
  const [activeMainTab, setActiveMainTab] = useState<'content' | 'design' | 'templates'>(showTemplatesOnMount ? 'templates' : 'content');
  const [pendingTemplate, setPendingTemplate] = useState<TemplateName | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('personalDetails');
  const [wizardStep, setWizardStep] = useState(0);
  const [isDraggingSection, setIsDraggingSection] = useState(false);

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
  const hasHandledLoginImportPrompt = useRef(false);
  const shouldOpenTemplatesAfterImport = useRef(showImportPromptOnMount && !skipTemplatesAfterImport);

  const completeLoginImportStep = useCallback(() => {
    if (!shouldOpenTemplatesAfterImport.current) return;
    shouldOpenTemplatesAfterImport.current = false;
    setActiveMainTab('templates');
  }, []);

  const scrollFormToTop = useCallback(() => {
    const scrollToTop = () => formContainerRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    scrollToTop();
    window.requestAnimationFrame(scrollToTop);
  }, []);

  useEffect(() => {
    if (!showImportPromptOnMount || hasHandledLoginImportPrompt.current) return;
    hasHandledLoginImportPrompt.current = true;
    setShowInitialPrompt(true);
  }, [showImportPromptOnMount]);

  useEffect(() => {
    const isPopupOpen = showInitialPrompt || showUploadModal;
    if (isPopupOpen) {
      onPopupVisibleChange?.(true);
      return;
    }

    const timer = window.setTimeout(() => {
      onPopupVisibleChange?.(false);
    }, 240);

    return () => window.clearTimeout(timer);
  }, [showInitialPrompt, showUploadModal, onPopupVisibleChange]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { 
      activationConstraint: { 
        delay: 200, 
        tolerance: 6 
      } 
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [refiningIds, setRefiningIds] = useState<Record<string, boolean>>({});
  const abortControllerRef = useRef<AbortController | null>(null);
  const importAbortControllerRef = useRef<AbortController | null>(null);
  const aiRequestIdsRef = useRef<Set<string>>(new Set());
  const importInFlightRef = useRef(false);

  // Cancel any ongoing AI generation when changing steps or tabs
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, [wizardStep, activeMainTab]);

  // Cancel CV import if modal is closed during import
  useEffect(() => {
    if (!showUploadModal && isImporting && importAbortControllerRef.current) {
      importAbortControllerRef.current.abort();
      setIsImporting(false);
      setImportMessage(null);
    }
  }, [showUploadModal, isImporting]);

  const setRefining = useCallback((id: string, value: boolean) => {
    setRefiningIds(prev => ({ ...prev, [id]: value }));
  }, []);

  const stripHtml = useCallback((html: string) => DOMPurify.sanitize(html, { ALLOWED_TAGS: [] }), []);

  const handleGenerateSummary = useCallback(async () => {
    if (aiRequestIdsRef.current.has('summary')) return;

    if (isFreePlan) {
      onUpgradeRequired?.('ai');
      return;
    }

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    aiRequestIdsRef.current.add('summary');
    setRefining('summary', true);
    try {
      const res = await csrfFetch('/api/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experience: cvData.experience,
          education: cvData.education,
          skills: cvData.skills,
        }),
        signal: abortControllerRef.current.signal,
      });
      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = res.status === 429 ? 'Too many requests. Please wait a moment and try again.' : "Failed to generate summary";
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorText;
        } catch (e) {
          errorMessage = errorText;
        }
        throw new Error(errorMessage);
      }
      const data = await res.json();
      if (data.summary) {
        setCvData(prev => ({ ...prev, personalInfo: { ...prev.personalInfo, summary: data.summary } }));
        toast.success("Summary generated!");
      }
    } catch (error: any) {
      if (error.name === 'AbortError' || abortControllerRef.current?.signal.aborted) return;
      console.error('Error generating summary:', error);
      toast.error(error.message || 'Failed to generate summary. Please try again.');
    } finally {
      aiRequestIdsRef.current.delete('summary');
      setRefining('summary', false);
    }
  }, [cvData.experience, cvData.education, cvData.skills, isFreePlan, onUpgradeRequired, setCvData, setRefining]);

  const handleRefineText = async (id: string, text: string, sectionType: string, context: any, onUpdate: (refined: string) => void) => {
    if (aiRequestIdsRef.current.has(id)) return;

    if (isFreePlan) {
      onUpgradeRequired?.('ai');
      return;
    }

    const plainText = stripHtml(text || '');
    if (!plainText.trim()) return;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    aiRequestIdsRef.current.add(id);
    setRefining(id, true);
    try {
      const res = await csrfFetch('/api/refine-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: plainText, sectionType, context }),
        signal: abortControllerRef.current.signal,
      });
      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = res.status === 429 ? 'Too many requests. Please wait a moment and try again.' : "Failed to refine text";
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorText;
        } catch (e) {
          errorMessage = errorText;
        }
        throw new Error(errorMessage);
      }
      const data = await res.json();
      if (data.refined) {
        onUpdate(data.refined);
        toast.success("Text refined!");
      }
    } catch (error: any) {
      if (error.name === 'AbortError' || abortControllerRef.current?.signal.aborted) return;
      console.error('Error refining text:', error);
      toast.error(error.message || 'Failed to refine text. Please try again.');
    } finally {
      aiRequestIdsRef.current.delete(id);
      setRefining(id, false);
    }
  };

  const handleCVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (importInFlightRef.current) {
      event.target.value = '';
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    if (isFreePlan) {
      onUpgradeRequired?.('ai');
      event.target.value = '';
      return;
    }

    importInFlightRef.current = true;
    setIsImporting(true);
    setImportMessage({ type: 'success', text: 'Starting import...' });

    if (file.size > MAX_CV_FILE_SIZE) {
      setImportMessage({ type: 'error', text: 'File is too large. Maximum allowed size is 10 MB.' });
      event.target.value = '';
      importInFlightRef.current = false;
      setIsImporting(false);
      return;
    }

    if (importAbortControllerRef.current) {
      importAbortControllerRef.current.abort();
    }
    importAbortControllerRef.current = new AbortController();

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const mimeType = file.type || "application/pdf";

          const parseResponse = await csrfFetch('/api/parse-cv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64Data, mimeType }),
            signal: importAbortControllerRef.current.signal,
          });

          if (!parseResponse.ok) {
            const errorText = await parseResponse.text();
            let errorMessage = parseResponse.status === 429 ? 'Too many requests. Please wait a moment and try again.' : "Unknown server error";
            try {
              const errorJson = JSON.parse(errorText);
              if (errorJson.upgradeRequired) {
                onUpgradeRequired?.('ai');
                return;
              }
              errorMessage = errorJson.error || errorJson.message || errorText;
            } catch (e) {
              errorMessage = errorText;
            }
            throw new Error(errorMessage);
          }

          const result = await parseResponse.json();
          if (result) {
            setCvData(prev => ({
              ...prev,
              personalInfo: {
                ...prev.personalInfo,
                fullName: result.personalInfo?.fullName || prev.personalInfo.fullName || '',
                email: result.personalInfo?.email || prev.personalInfo.email || '',
                phone: result.personalInfo?.phone || prev.personalInfo.phone || '',
                address: result.personalInfo?.address || prev.personalInfo.address || '',
                summary: result.personalInfo?.summary || prev.personalInfo.summary || '',
                dob: result.personalInfo?.dob || prev.personalInfo.dob || '',
                nic: result.personalInfo?.nic || prev.personalInfo.nic || '',
                gender: result.personalInfo?.gender || prev.personalInfo.gender || '',
                nationality: result.personalInfo?.nationality || prev.personalInfo.nationality || '',
                religion: result.personalInfo?.religion || prev.personalInfo.religion || '',
                maritalStatus: result.personalInfo?.maritalStatus || prev.personalInfo.maritalStatus || '',
              },
              experience: (result.experience || []).map((e: any) => ({
                id: crypto.randomUUID(),
                company: e.company || '',
                position: e.position || '',
                startDate: e.startDate || '',
                endDate: e.endDate || '',
                description: e.description || '',
              })),
              education: (result.education || []).map((e: any) => ({
                id: crypto.randomUUID(),
                institution: e.institution || '',
                degree: e.degree || '',
                startDate: e.startDate || '',
                endDate: e.endDate || '',
                description: e.description || '',
              })),
              skills: (result.skills || []).map((s: any) => ({
                id: crypto.randomUUID(),
                name: s.name || '',
                level: s.level || 4,
              })),
              courses: (result.courses || []).map((c: any) => ({
                id: crypto.randomUUID(),
                name: c.name || '',
                institution: c.institution || '',
                startDate: c.startDate || '',
                endDate: c.endDate || '',
              })),
              languages: (result.languages || []).map((l: any) => ({
                id: crypto.randomUUID(),
                name: l.name || '',
                proficiency: l.proficiency || '',
              })),
              projects: (result.projects || []).map((p: any) => ({
                id: crypto.randomUUID(),
                name: p.name || '',
                description: p.description || '',
                link: p.link || '',
              })),
              awards: (result.awards || []).map((a: any) => ({
                id: crypto.randomUUID(),
                name: a.name || '',
                date: a.date || '',
                issuer: a.issuer || '',
              })),
              references: (result.references || []).map((r: any) => ({
                id: crypto.randomUUID(),
                name: r.name || '',
                position: r.position || '',
                company: r.company || '',
                email: r.email || '',
                phone: r.phone || '',
              })),
            }));

            setImportMessage({ type: 'success', text: 'Data imported successfully!' });
            setTimeout(() => {
              setShowUploadModal(false);
              setImportMessage(null);
              completeLoginImportStep();
            }, 1500);
          }
        } catch (error: any) {
          if (error.name === 'AbortError' || importAbortControllerRef.current?.signal.aborted) {
            console.log('CV Import aborted by user');
            return;
          }
          console.error('Error importing CV:', error);
          // Use a friendly message — avoid exposing technical details to end users
          const isNetworkError = !error?.message?.trim() || error?.name === 'TypeError';
          const errorMsg = isNetworkError
            ? 'Something went wrong. Please try again in a moment.'
            : error.message;
          setImportMessage({ type: 'error', text: errorMsg });
        } finally {
          importInFlightRef.current = false;
          setIsImporting(false);
        }
      };
    } catch (error: any) {
      console.error('Error importing CV:', error);
      importInFlightRef.current = false;
      setIsImporting(false);
    }
    if (event.target) event.target.value = '';
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDraggingSection(false);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setCvData((prev) => {
        const oldIndex = prev.sectionOrder.indexOf(active.id as string);
        const newIndex = prev.sectionOrder.indexOf(over.id as string);
        return { ...prev, sectionOrder: arrayMove(prev.sectionOrder, oldIndex, newIndex) };
      });
    }
  };

  const handleDragCancel = useCallback(() => {
    setIsDraggingSection(false);
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target;
    const file = target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_FILE_SIZE) {
      toast.error('Image is too large. Maximum allowed size is 5 MB.');
      target.value = '';
      return;
    }
    try {
      const compressedImage = await compressAndResizeImage(file);
      setCvData((prev) => ({ ...prev, profileImage: compressedImage, imageZoom: 1, imageX: 0, imageY: 0 }));
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error('Failed to process image.');
    } finally {
      target.value = '';
    }
  };

  const handlePersonalInfoChange = useCallback((e: any) => {
    const { name, value } = e.target;
    const nextValue = name === 'summary' ? value : truncateText(value, getPersonalInfoLimit(name));
    setCvData((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, [name]: nextValue } }));
  }, [setCvData]);

  const handleExperienceChange = useCallback((id: string, field: keyof Experience, value: string) => {
    setCvData((prev) => ({
      ...prev,
      experience: prev.experience.map((exp) => (exp.id === id ? { ...exp, [field]: truncateText(value, getSectionFieldLimit(field)) } : exp)),
    }));
  }, [setCvData]);

  const handleEducationChange = useCallback((id: string, field: keyof Education, value: string) => {
    setCvData((prev) => ({
      ...prev,
      education: prev.education.map((edu) => (edu.id === id ? { ...edu, [field]: truncateText(value, getSectionFieldLimit(field)) } : edu)),
    }));
  }, [setCvData]);

  const handleSkillChange = useCallback((id: string, field: keyof Skill, value: any) => {
    setCvData((prev) => ({
      ...prev,
      skills: prev.skills.map((s) => (
        s.id === id
          ? { ...s, [field]: typeof value === 'string' ? truncateText(value, getSectionFieldLimit(field)) : value }
          : s
      )),
    }));
  }, [setCvData]);

  const handleCourseChange = useCallback((id: string, field: keyof Course, value: string) => {
    setCvData((prev) => ({
      ...prev,
      courses: prev.courses.map((c) => (c.id === id ? { ...c, [field]: truncateText(value, getSectionFieldLimit(field)) } : c)),
    }));
  }, [setCvData]);

  const handleLanguageChange = useCallback((id: string, field: keyof Language, value: string) => {
    setCvData((prev) => ({
      ...prev,
      languages: prev.languages.map((l) => (l.id === id ? { ...l, [field]: truncateText(value, getSectionFieldLimit(field)) } : l)),
    }));
  }, [setCvData]);

  const handleProjectChange = useCallback((id: string, field: keyof Project, value: string) => {
    setCvData((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => (p.id === id ? { ...p, [field]: truncateText(value, getSectionFieldLimit(field)) } : p)),
    }));
  }, [setCvData]);

  const handleAwardChange = useCallback((id: string, field: keyof Award, value: string) => {
    setCvData((prev) => ({
      ...prev,
      awards: prev.awards.map((a) => (a.id === id ? { ...a, [field]: truncateText(value, getSectionFieldLimit(field)) } : a)),
    }));
  }, [setCvData]);

  const handleReferenceChange = useCallback((id: string, field: keyof Reference, value: string) => {
    setCvData((prev) => ({
      ...prev,
      references: prev.references.map((r) => (r.id === id ? { ...r, [field]: truncateText(value, getSectionFieldLimit(field)) } : r)),
    }));
  }, [setCvData]);

  // Generic Add/Remove helper
  const addSectionItem = useCallback((section: keyof CVData, defaultItem: any) => {
    setCvData(prev => ({ ...prev, [section]: [...(prev[section] as any[]), { ...defaultItem, id: crypto.randomUUID() }] }));
  }, [setCvData]);

  const removeSectionItem = useCallback((section: keyof CVData, id: string) => {
    setCvData(prev => ({ ...prev, [section]: (prev[section] as any[]).filter(item => item.id !== id) }));
  }, [setCvData]);

  const goNext = useCallback(() => { setWizardStep(prev => Math.min(prev + 1, ALL_STEPS.length - 1)); }, []);
  const goBack = useCallback(() => { setWizardStep(prev => Math.max(prev - 1, 0)); }, []);

  // Stable toggle callback factory — avoids creating new function refs on each render
  const toggleSection = useCallback((key: string) => {
    setExpandedSection(prev => prev === key ? null : key);
  }, []);

  // Stable add/remove callbacks
  const addExperience = useCallback(() => addSectionItem('experience', { company: '', position: '', startDate: '', endDate: '', description: '' }), [addSectionItem]);
  const addEducation = useCallback(() => addSectionItem('education', { institution: '', degree: '', startDate: '', endDate: '', description: '' }), [addSectionItem]);
  const addSkill = useCallback(() => addSectionItem('skills', { name: '', level: 5 }), [addSectionItem]);
  const addCourse = useCallback(() => addSectionItem('courses', { name: '', institution: '', startDate: '', endDate: '' }), [addSectionItem]);
  const addLanguage = useCallback(() => addSectionItem('languages', { name: '', proficiency: 'Native' }), [addSectionItem]);
  const addProject = useCallback(() => addSectionItem('projects', { name: '', description: '', link: '' }), [addSectionItem]);
  const addAward = useCallback(() => addSectionItem('awards', { name: '', date: '', issuer: '' }), [addSectionItem]);
  const addReference = useCallback(() => addSectionItem('references', { name: '', position: '', company: '', email: '', phone: '' }), [addSectionItem]);

  const removeExperience = useCallback((id: string) => removeSectionItem('experience', id), [removeSectionItem]);
  const removeEducation = useCallback((id: string) => removeSectionItem('education', id), [removeSectionItem]);
  const removeSkill = useCallback((id: string) => removeSectionItem('skills', id), [removeSectionItem]);
  const removeCourse = useCallback((id: string) => removeSectionItem('courses', id), [removeSectionItem]);
  const removeLanguage = useCallback((id: string) => removeSectionItem('languages', id), [removeSectionItem]);
  const removeProject = useCallback((id: string) => removeSectionItem('projects', id), [removeSectionItem]);
  const removeAward = useCallback((id: string) => removeSectionItem('awards', id), [removeSectionItem]);
  const removeReference = useCallback((id: string) => removeSectionItem('references', id), [removeSectionItem]);

  // Stable summary change callback
  const handleSummaryChange = useCallback((val: string) => {
    handlePersonalInfoChange({ target: { name: 'summary', value: val } });
  }, [handlePersonalInfoChange]);

  const renderSection = (sectionKey: string) => {
    switch (sectionKey) {
      case 'personalDetails':
        return (
          <PersonalDetailsSection
            personalInfo={cvData.personalInfo}
            isOpen={expandedSection === 'personalDetails'}
            onToggle={() => toggleSection('personalDetails')}
            onChange={handlePersonalInfoChange}
            isDarkMode={isDarkMode}
          />
        );
      case 'summary':
        return (
          <SummarySection
            summary={cvData.personalInfo.summary}
            isOpen={expandedSection === 'summary'}
            onToggle={() => toggleSection('summary')}
            onSummaryChange={handleSummaryChange}
            onGenerateSummary={handleGenerateSummary}
            isRefining={refiningIds['summary']}
          />
        );
      case 'experience':
        return (
          <ExperienceSection
            experience={cvData.experience}
            isOpen={expandedSection === 'experience'}
            onToggle={() => toggleSection('experience')}
            onChange={handleExperienceChange}
            onAdd={addExperience}
            onRemove={removeExperience}
            onRefineText={handleRefineText}
            refiningIds={refiningIds}
          />
        );
      case 'education':
        return (
          <EducationSection
            education={cvData.education}
            isOpen={expandedSection === 'education'}
            onToggle={() => toggleSection('education')}
            onChange={handleEducationChange}
            onAdd={addEducation}
            onRemove={removeEducation}
            onRefineText={handleRefineText}
            refiningIds={refiningIds}
          />
        );
      case 'skills':
        return (
          <SkillsSection
            skills={cvData.skills}
            isOpen={expandedSection === 'skills'}
            onToggle={() => toggleSection('skills')}
            onChange={handleSkillChange}
            onAdd={addSkill}
            onRemove={removeSkill}
            isDarkMode={isDarkMode}
          />
        );
      case 'courses':
        return (
          <CoursesSection
            courses={cvData.courses}
            isOpen={expandedSection === 'courses'}
            onToggle={() => toggleSection('courses')}
            onChange={handleCourseChange}
            onAdd={addCourse}
            onRemove={removeCourse}
          />
        );
      case 'languages':
        return (
          <LanguagesSection
            languages={cvData.languages}
            isOpen={expandedSection === 'languages'}
            onToggle={() => toggleSection('languages')}
            onChange={handleLanguageChange}
            onAdd={addLanguage}
            onRemove={removeLanguage}
            isDarkMode={isDarkMode}
          />
        );
      case 'projects':
        return (
          <ProjectsSection
            projects={cvData.projects}
            isOpen={expandedSection === 'projects'}
            onToggle={() => toggleSection('projects')}
            onChange={handleProjectChange}
            onAdd={addProject}
            onRemove={removeProject}
            onRefineText={handleRefineText}
            refiningIds={refiningIds}
          />
        );
      case 'awards':
        return (
          <AwardsSection
            awards={cvData.awards}
            isOpen={expandedSection === 'awards'}
            onToggle={() => toggleSection('awards')}
            onChange={handleAwardChange}
            onAdd={addAward}
            onRemove={removeAward}
          />
        );
      case 'references':
        return (
          <ReferencesSection
            references={cvData.references}
            isOpen={expandedSection === 'references'}
            onToggle={() => toggleSection('references')}
            onChange={handleReferenceChange}
            onAdd={addReference}
            onRemove={removeReference}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 relative overflow-hidden">
      {/* Tab Switcher */}
      <div className={`${TAB_CONTAINER_CLASS} items-center`}>
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
        <button
          onClick={() => {
            setActiveMainTab('templates');
            setPendingTemplate(null);
          }}
          className={`${TAB_BUTTON_BASE} ${activeMainTab === 'templates' ? TAB_BUTTON_ACTIVE : TAB_BUTTON_INACTIVE}`}
        >
          <LayoutTemplate size={16} className="mr-2" /> Templates
        </button>
      </div>

      <div
        ref={formContainerRef}
        className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-4 sm:px-6 flex flex-col"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {activeMainTab === 'content' ? (
          <div className="animate-in fade-in duration-300 flex flex-col flex-1">
            {/* Progress Bar */}
            <div ref={progressContainerRef} className="mb-5 px-1 w-full overflow-x-auto scrollbar-hide py-2">
              <div className="flex items-center justify-between min-w-max sm:min-w-full px-2 gap-4 sm:gap-2">
                {WIZARD_STEPS.map((step, i) => {
                  const status = i < wizardStep ? 'completed' : i === wizardStep ? 'active' : 'upcoming';
                  const Icon = step.icon;
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
            <div className={`relative ${isDraggingSection ? 'overflow-hidden pb-1' : 'overflow-visible'}`}>
              <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={() => setIsDraggingSection(true)} onDragCancel={handleDragCancel} onDragEnd={handleDragEnd}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={wizardStep}
                    initial={{ opacity: 0, y: 16, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -16, scale: 0.98 }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  >
                    <Suspense fallback={<FormChunkFallback isDarkMode={isDarkMode} />}>
                      {(() => {
                        const isFinalize = ALL_STEPS[wizardStep] === 'finalize';
                        const currentSectionKeys = isFinalize
                          ? cvData.sectionOrder.filter(key => (FINALIZE_SECTION_KEYS as readonly string[]).includes(key))
                          : [ALL_STEPS[wizardStep]];

                        return (
                          <SortableContext
                            items={currentSectionKeys}
                            strategy={verticalListSortingStrategy}
                          >
                            {currentSectionKeys
                              .filter(Boolean)
                              .map((key) => (
                                <React.Fragment key={key}>
                                  {renderSection(key as string)}
                                </React.Fragment>
                              ))}
                          </SortableContext>
                        );
                      })()}
                    </Suspense>
                  </motion.div>
                </AnimatePresence>
              </DndContext>
            </div>

            <WizardNav
              wizardStep={wizardStep}
              totalSteps={ALL_STEPS.length}
              onNext={goNext}
              onBack={goBack}
              onFinish={onFinish}
            />
            <div className="h-8 w-full shrink-0"></div>
          </div>
        ) : activeMainTab === 'design' ? (
          <Suspense fallback={<FormChunkFallback isDarkMode={isDarkMode} />}>
            <DesignPanel
              templateDefaultThemeColor={templateDefaults[template]}
              isDarkMode={isDarkMode}
              fileInputRef={fileInputRef}
              onImageUpload={handleImageUpload}
            />
          </Suspense>
        ) : (
          <div className="animate-in fade-in duration-300 space-y-5 pb-8">
            <div className={`rounded-2xl border p-5 ${isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="mb-5 flex items-center gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${isDarkMode ? 'bg-violet-500/15 text-violet-300' : 'bg-violet-50 text-violet-600'}`}>
                  <LayoutTemplate size={20} />
                </span>
                <div>
                  <h3 className={`font-montserrat text-lg font-black ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>Templates</h3>
                  <p className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Select a layout for your CV preview and PDF.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 min-[430px]:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                {templates.map((item) => {
                  const isSelected = template === item.key;
                  const isPending = pendingTemplate === item.key;
                  const isPremium = isTemplatePaid(item.key);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setPendingTemplate(item.key);
                      }}
                      className={`group relative flex min-w-0 flex-col overflow-hidden rounded-xl border-2 text-left transition-all active:scale-[0.99] ${
                        isPending
                          ? (isDarkMode ? 'border-emerald-300 bg-emerald-500/10 shadow-lg shadow-emerald-950/30' : 'border-emerald-500 bg-emerald-50 shadow-md')
                          : isSelected
                          ? (isDarkMode ? 'border-violet-400 bg-violet-500/10 shadow-lg shadow-violet-950/30' : 'border-violet-500 bg-violet-50 shadow-md')
                          : (isDarkMode ? 'border-slate-700 bg-slate-900 hover:border-slate-600' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm')
                      }`}
                    >
                      {(isSelected || isPending) && (
                        <span className={`absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full text-white shadow-md ${isPending ? 'bg-emerald-500' : 'bg-violet-600'}`}>
                          <Check size={14} />
                        </span>
                      )}
                      {isPremium && !(isSelected || isPending) && (
                        <span
                          className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-slate-950 shadow-md ring-1 ring-white/60"
                          title="Premium template"
                          aria-label="Premium template"
                        >
                          <Crown size={13} />
                        </span>
                      )}
                      <div className="aspect-3/4 overflow-hidden bg-slate-900">
                        <img
                          src={item.thumbnail}
                          alt={`${item.label} template preview`}
                          className={`h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03] ${isSelected ? '' : 'opacity-90'}`}
                        />
                      </div>
                      <div className="px-3 py-2.5">
                        <div className="flex min-w-0 items-center justify-between gap-2">
                          <span className={`truncate text-xs font-black ${isPending ? 'text-emerald-500' : isSelected ? 'text-violet-600' : (isDarkMode ? 'text-slate-200' : 'text-gray-700')}`}>
                            {item.label}
                          </span>
                          {isPremium && (
                            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase leading-none ${isDarkMode ? 'bg-amber-300/15 text-amber-200' : 'bg-amber-50 text-amber-700'}`}>
                              <Crown size={9} />
                              Premium
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {pendingTemplate && (
                <div className={`sticky bottom-3 z-30 mt-5 rounded-2xl border p-3 shadow-2xl backdrop-blur-xl ${isDarkMode ? 'border-slate-700 bg-slate-900/95' : 'border-slate-200 bg-white/95'}`}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className={`text-xs font-black uppercase ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Selected template</p>
                      <p className={`text-sm font-extrabold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                        {getTemplateLabel(pendingTemplate)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCvData((prev) => applyTemplateColorDefaults(prev, template, pendingTemplate, templateDefaults));
                        setTemplate(pendingTemplate);
                        setPendingTemplate(null);
                        setActiveMainTab('content');
                        scrollFormToTop();
                      }}
                      className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500 active:scale-[0.98]"
                    >
                      Use this template
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="mt-auto">

        </div>
      </div>

      <Suspense fallback={null}>
        <ImportModals
          showInitialPrompt={showInitialPrompt}
          setShowInitialPrompt={setShowInitialPrompt}
          showUploadModal={showUploadModal}
          setShowUploadModal={setShowUploadModal}
          isImporting={isImporting}
          importMessage={importMessage}
          handleCVImport={handleCVImport}
          isDarkMode={isDarkMode}
          onImportSkipped={completeLoginImportStep}
        />
      </Suspense>
    </div>
  );
}
