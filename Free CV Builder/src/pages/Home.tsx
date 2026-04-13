/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CVData } from '../types';
import CVForm from '../components/CVForm';
import CVPreview from '../components/CVPreview';
import { Download, LayoutTemplate, Loader2, FileText, Edit3, AlertCircle, RotateCcw, Save, CheckCircle2 } from 'lucide-react';

const STORAGE_KEY = 'cv-builder-data';
const TEMPLATE_STORAGE_KEY = 'cv-builder-template';

function loadSavedData(): CVData | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure sectionOrder exists (backward compat)
      if (!parsed.sectionOrder) {
        parsed.sectionOrder = ['summary', 'personalDetails', 'experience', 'education', 'skills', 'projects', 'courses', 'awards', 'languages'];
      }
      return parsed as CVData;
    }
  } catch (e) {
    console.warn('Failed to load saved CV data:', e);
  }
  return null;
}

function loadSavedTemplate(): 'classic' | 'modern' | 'professional' | null {
  try {
    const saved = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (saved && ['classic', 'modern', 'professional'].includes(saved)) {
      return saved as 'classic' | 'modern' | 'professional';
    }
  } catch (e) {
    console.warn('Failed to load saved template:', e);
  }
  return null;
}

const initialData: CVData = {
  personalInfo: {
    fullName: 'Jane Doe',
    email: 'jane.doe@example.com',
    phone: '+1 234 567 890',
    address: 'New York, NY',
    summary: 'A highly motivated and detail-oriented professional with experience in software development and project management.',
    dob: '1990-01-01',
    nic: '199012345678',
    gender: 'Female',
    nationality: 'American',
    religion: 'Christianity',
    maritalStatus: 'Single',
  },
  experience: [
    {
      id: '1',
      company: 'Tech Solutions Inc.',
      position: 'Senior Software Engineer',
      startDate: 'Jan 2020',
      endDate: 'Present',
      description: '• Led a team of 5 engineers to develop a scalable web application.\n• Improved system performance by 30%.\n• Mentored junior developers and conducted code reviews.',
    },
  ],
  education: [
    {
      id: '1',
      institution: 'State University',
      degree: 'Bachelor of Science in Computer Science',
      startDate: 'Sep 2015',
      endDate: 'May 2019',
      description: 'Graduated with Honors. Coursework included Data Structures, Algorithms, and Web Development.',
    },
  ],
  skills: [
    { id: '1', name: 'JavaScript', level: 5 },
    { id: '2', name: 'TypeScript', level: 4 },
    { id: '3', name: 'React', level: 5 },
    { id: '4', name: 'Node.js', level: 4 },
    { id: '5', name: 'Tailwind CSS', level: 5 },
    { id: '6', name: 'Git', level: 4 },
  ],
  courses: [],
  languages: [],
  projects: [],
  awards: [],
  themeColor: '#2563eb', // Default blue-600
  fontFamily: 'Inter',
  profileImage: '',
  imageZoom: 1,
  imageX: 0,
  imageY: 0,
  sidebarColor: '#111827', // Default gray-900
  lineSpacing: 1.5,
  sectionGap: 2,
  sectionOrder: ['summary', 'personalDetails', 'experience', 'education', 'skills', 'projects', 'courses', 'awards', 'languages'],
  hiddenSections: [],
};

export default function Home() {
  const [cvData, setCvData] = useState<CVData>(() => loadSavedData() || initialData);
  const [debouncedCvData, setDebouncedCvData] = useState<CVData>(() => loadSavedData() || initialData);
  const [template, setTemplate] = useState<'classic' | 'modern' | 'professional'>(() => loadSavedTemplate() || 'classic');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit');
  const [scale, setScale] = useState(1);
  const [previewHeight, setPreviewHeight] = useState(1122); // Default A4 height in px
  const [formWidth, setFormWidth] = useState(45);
  const [isDraggingResizer, setIsDraggingResizer] = useState(false);
  const isDraggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  // Resizer logic - uses ref to avoid recreating callbacks
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      // Cancel any pending rAF to avoid stacking
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const newWidth = (e.clientX / window.innerWidth) * 100;
        // Clamp: min 420px for form, min 300px for preview
        const minFormPx = 520;
        const minPreviewPx = 300;
        const minFormPct = (minFormPx / window.innerWidth) * 100;
        const maxFormPct = ((window.innerWidth - minPreviewPx) / window.innerWidth) * 100;
        if (newWidth > minFormPct && newWidth < maxFormPct) {
          setFormWidth(newWidth);
        }
      });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      setIsDraggingResizer(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const startDragging = useCallback(() => {
    isDraggingRef.current = true;
    setIsDraggingResizer(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }, []);

  // Debounce CV data updates for the preview to prevent freezing during typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCvData(cvData);
    }, 250);
    return () => clearTimeout(timer);
  }, [cvData]);

  // Auto-save CV data to localStorage (debounced)
  useEffect(() => {
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      try {
        const dataStr = JSON.stringify(cvData);
        // Check if data size is approaching localStorage limit (~5MB)
        if (dataStr.length > 4.5 * 1024 * 1024) {
          console.warn('CV data is very large, save may fail. Consider removing the profile image.');
        }
        localStorage.setItem(STORAGE_KEY, dataStr);
        setSaveStatus('saved');
        // Reset status after 2 seconds
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (e: any) {
        console.warn('Failed to save CV data:', e);
        // Show specific error for quota exceeded
        if (e?.name === 'QuotaExceededError' || e?.code === 22) {
          setSaveStatus('error' as any);
          alert('Storage is full. Try removing your profile image or reducing data to enable auto-save.');
        }
        setSaveStatus('idle');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [cvData]);

  // Auto-save template selection
  useEffect(() => {
    try {
      localStorage.setItem(TEMPLATE_STORAGE_KEY, template);
    } catch (e) {
      console.warn('Failed to save template:', e);
    }
  }, [template]);

  const handleReset = useCallback(() => {
    setCvData(initialData);
    setTemplate('classic');
    setShowResetConfirm(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TEMPLATE_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear saved data:', e);
    }
  }, []);

  const contentRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Use ResizeObserver to track preview container width changes reliably
  // This fires AFTER CSS layout is complete, so clientWidth is always accurate
  useEffect(() => {
    if (!previewContainerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const containerWidth = entry.contentRect.width;
        const padding = 32; // 16px padding on each side
        const availableWidth = containerWidth - padding;
        const a4WidthPx = 794; // approximate width of 210mm in pixels

        if (availableWidth < a4WidthPx) {
          setScale(availableWidth / a4WidthPx);
        } else {
          setScale(1);
        }
      }
    });

    observer.observe(previewContainerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [mobileView]);

  useEffect(() => {
    if (!contentRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setPreviewHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(contentRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [mobileView, template, cvData]);

  const handlePrint = async () => {
    setShowDownloadConfirm(false);
    setIsGeneratingPDF(true);

    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cvData, template }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate PDF: ${response.statusText}`);
      }

      // Convert response to blob
      const blob = await response.blob();
      
      // Create a temporary link to trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Use the user's name for the file, or a default
      const safeName = (cvData.personalInfo.fullName || 'CV').replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
      link.setAttribute('download', `${safeName}_Resume.pdf`);
      
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#f8f9fa] font-sans text-gray-900 overflow-hidden print:relative print:inset-auto print:h-auto print:bg-white print:overflow-visible">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-gray-200/80 flex flex-col sm:flex-row items-center justify-between p-4 sm:px-8 shrink-0 z-50 print:hidden gap-4 sm:gap-0 sticky top-0 shadow-sm">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <h1 className="text-xl sm:text-2xl font-extrabold flex items-center">
            <div className="p-2 bg-gray-900 rounded-xl mr-3 shadow-md shadow-gray-900/10">
              <LayoutTemplate className="text-white" size={20} />
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
              CV Builder
            </span>
          </h1>
        </div>

        {/* Mobile View Toggle - Segmented Control */}
        <div className="lg:hidden flex bg-gray-100/50 p-1.5 rounded-2xl w-full max-w-sm mx-auto sm:mx-4 border border-gray-200/40 shadow-inner">
          <button
            onClick={() => setMobileView('edit')}
            className={`flex-1 flex items-center justify-center py-2 px-4 text-sm font-semibold rounded-xl transition-all duration-300 ${mobileView === 'edit' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-900/5 scale-100' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50 scale-95'}`}
          >
            <FileText size={16} className="mr-2" />
            Edit
          </button>
          <button
            onClick={() => setMobileView('preview')}
            className={`flex-1 flex items-center justify-center py-2 px-4 text-sm font-semibold rounded-xl transition-all duration-300 ${mobileView === 'preview' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-900/5 scale-100' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50 scale-95'}`}
          >
            <LayoutTemplate size={16} className="mr-2" />
            Preview
          </button>
        </div>

        <div className="hidden sm:flex flex-wrap items-center justify-center gap-3 sm:space-x-4 w-full sm:w-auto">
          {/* Save Status Indicator */}
          <div className="hidden md:flex items-center text-xs font-medium transition-all duration-300">
            {saveStatus === 'saving' && (
              <span className="flex items-center text-gray-400 animate-pulse">
                <Save size={13} className="mr-1.5" /> Saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center text-green-500">
                <CheckCircle2 size={13} className="mr-1.5" /> Saved
              </span>
            )}
          </div>

          <button
            onClick={() => setShowResetConfirm(true)}
            className="hidden md:flex items-center px-4 py-2.5 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-red-50 hover:text-red-600 transition-all duration-200 border border-gray-200 active:scale-95"
          >
            <RotateCcw size={15} className="mr-2" /> Reset
          </button>
          <button
            onClick={() => setShowDownloadConfirm(true)}
            disabled={isGeneratingPDF}
            className="hidden md:flex items-center px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-black hover:shadow-gray-900/20 transition-all duration-200 shadow-md active:scale-95 disabled:opacity-70 disabled:active:scale-100"
          >
            {isGeneratingPDF ? (
              <><Loader2 size={16} className="mr-2 animate-spin" /> Generating...</>
            ) : (
              <><Download size={16} className="mr-2" /> Download PDF</>
            )}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden relative flex flex-col lg:flex-row print:overflow-visible print:block">
        {/* Left Side: Form */}
        <div
          className={`${mobileView === 'edit' ? 'flex max-lg:!w-full max-lg:!min-w-0' : 'hidden'} lg:flex h-full border-r border-gray-200/80 bg-white p-0 print:hidden flex-col relative shrink-0 z-10 shadow-[2px_0_15px_-3px_rgba(0,0,0,0.03)]`}
          style={{ width: `${formWidth}%`, minWidth: '420px' }}
        >
          <div className="h-full w-full overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <CVForm
              cvData={cvData}
              setCvData={setCvData}
              template={template}
              setTemplate={setTemplate}
            />
          </div>
        </div>

        {/* Resizer */}
        <div
          className="hidden lg:block w-1.5 hover:w-2 bg-transparent hover:bg-blue-400/50 cursor-col-resize transition-all z-20 shrink-0 relative group"
          onMouseDown={startDragging}
        >
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-gray-200/50 group-hover:bg-blue-400/0 transition-colors"></div>
        </div>

        {/* Right Side: Preview */}
        <div
          className={`${mobileView === 'preview' ? 'flex max-lg:!w-full' : 'hidden'} lg:flex flex-col h-full bg-transparent print:w-full print:bg-white print:block relative overflow-x-hidden`}
          style={{ width: `calc(${100 - formWidth}% - 6px)` }}
        >
          <div
            ref={previewContainerRef}
            className="preview-container-scroll h-full overflow-y-scroll overflow-x-hidden p-4 pb-24 lg:pb-8 flex flex-col items-center justify-start overscroll-y-none overscroll-x-none print:p-0 print:overflow-visible"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div
              id="cv-preview-wrapper"
              className={`preview-scale-wrapper transform origin-top print:!transform-none ${isDraggingResizer ? '' : 'transition-transform'}`}
              style={{
                transform: `scale(${scale})`,
                marginBottom: scale < 1 ? `-${previewHeight * (1 - scale)}px` : '0'
              }}
            >
              <CVPreview ref={contentRef} cvData={debouncedCvData} template={template} />
            </div>
          </div>

          {/* Sticky Mobile Download Button */}
          {mobileView === 'preview' && (
            <div className="lg:hidden absolute bottom-6 left-0 w-full px-4 z-40 print:hidden pointer-events-none will-change-transform">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setShowDownloadConfirm(true);
                }}
                onTouchStart={(e) => e.stopPropagation()}
                disabled={isGeneratingPDF}
                className="pointer-events-auto touch-manipulation select-none [-webkit-tap-highlight-color:transparent] w-full flex items-center justify-center px-4 py-3.5 bg-gray-900 text-white text-sm font-semibold rounded-2xl hover:bg-black active:scale-[0.98] transition-all shadow-xl shadow-gray-900/20 disabled:opacity-70"
              >
                {isGeneratingPDF ? (
                  <><Loader2 size={18} className="mr-2 animate-spin" /> Generating...</>
                ) : (
                  <><Download size={18} className="mr-2" /> Download PDF</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Download Confirmation Modal */}
      {showDownloadConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
            <div className="p-8">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-6 mx-auto shadow-inner border border-gray-200/60">
                <Download className="text-gray-900" size={28} />
              </div>
              <h3 className="text-xl font-bold text-center text-gray-900 mb-2">Download Resume</h3>
              <p className="text-sm text-center text-gray-500 mb-8">
                Are you ready to download your resume as a PDF? This might take a few seconds.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handlePrint}
                  className="w-full py-3.5 px-4 bg-gray-900 hover:bg-black active:scale-[0.98] text-white font-semibold rounded-xl transition-all shadow-lg shadow-gray-900/20 flex items-center justify-center"
                >
                  <Download size={18} className="mr-2" /> Yes, Download PDF
                </button>
                <button
                  onClick={() => setShowDownloadConfirm(false)}
                  className="w-full py-3.5 px-4 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all border border-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
            <div className="p-8">
              <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-6 mx-auto shadow-inner border border-red-100">
                <RotateCcw className="text-red-500" size={28} />
              </div>
              <h3 className="text-xl font-bold text-center text-gray-900 mb-2">Reset All Data?</h3>
              <p className="text-sm text-center text-gray-500 mb-8">
                This will clear all your CV data and reset to the default template. This action cannot be undone.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleReset}
                  className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-semibold rounded-xl transition-all shadow-lg shadow-red-600/20 flex items-center justify-center"
                >
                  <RotateCcw size={18} className="mr-2" /> Yes, Reset Everything
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="w-full py-3.5 px-4 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all border border-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Loading Overlay */}
      {isGeneratingPDF && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center border border-gray-100">
            <div className="relative mb-6">
              <div className="w-16 h-16 border-4 border-gray-100 border-t-gray-900 rounded-full animate-spin"></div>
              <FileText className="absolute inset-0 m-auto text-gray-900" size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Generating PDF</h3>
            <p className="text-gray-500 text-center max-w-[200px]">
              Please wait while we prepare your professional resume...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

