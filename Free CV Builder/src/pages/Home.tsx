/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CVData } from '../types';
import CVForm from '../components/CVForm';
import CVPreview from '../components/CVPreview';
import { Download, LayoutTemplate, Loader2, FileText, Edit3, AlertCircle, RotateCcw, Save, CheckCircle2, Moon, Sun } from 'lucide-react';

const STORAGE_KEY = 'cv-builder-data';
const TEMPLATE_STORAGE_KEY = 'cv-builder-template';
const THEME_STORAGE_KEY = 'cv-builder-theme';

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
  themeColor: '#7c3aed', // Default violet-600
  fontFamily: 'Inter',
  profileImage: '',
  imageZoom: 1,
  imageX: 0,
  imageY: 0,
  sidebarColor: '#1e293b', // Default slate-800
  lineSpacing: 1.5,
  sectionGap: 2,
  sectionOrder: ['summary', 'personalDetails', 'experience', 'education', 'skills', 'projects', 'courses', 'awards', 'languages'],
  hiddenSections: [],
};

export default function Home() {
  const [cvData, setCvData] = useState<CVData>(() => loadSavedData() || initialData);
  const [debouncedCvData, setDebouncedCvData] = useState<CVData>(() => loadSavedData() || initialData);
  const [template, setTemplate] = useState<'classic' | 'modern' | 'professional'>(() => loadSavedTemplate() || 'professional');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit');
  const [scale, setScale] = useState(1);
  const [previewHeight, setPreviewHeight] = useState(1122); // Default A4 height in px
  const [formWidth, setFormWidth] = useState(45);
  const [isDraggingResizer, setIsDraggingResizer] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [isThemeAnimating, setIsThemeAnimating] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme) return savedTheme === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch (e) {
      return false;
    }
  });
  const [themeTransition, setThemeTransition] = useState<{ x: number; y: number; key: number; targetDark: boolean } | null>(null);
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

  useEffect(() => {
    // Simulate initial loading sequence
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 1500); // 1.5 seconds loading animation
    return () => clearTimeout(timer);
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

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, isDarkMode ? 'dark' : 'light');
    } catch (e) {
      console.warn('Failed to save theme preference:', e);
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (!themeTransition) return;
    const timer = setTimeout(() => setThemeTransition(null), 800);
    return () => clearTimeout(timer);
  }, [themeTransition]);

  const handleThemeToggle = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX || rect.left + rect.width / 2;
    const y = event.clientY || rect.top + rect.height / 2;
    const nextDark = !isDarkMode;
    setIsThemeAnimating(true);
    setThemeTransition({ x, y, key: Date.now(), targetDark: nextDark });
    setIsDarkMode(nextDark);
  }, [isDarkMode]);

  useEffect(() => {
    if (!isThemeAnimating) return;
    const timer = setTimeout(() => setIsThemeAnimating(false), 650);
    return () => clearTimeout(timer);
  }, [isThemeAnimating]);

  const handleReset = useCallback(() => {
    setCvData(initialData);
    setTemplate('classic');
    setShowResetConfirm(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TEMPLATE_STORAGE_KEY);
      sessionStorage.removeItem('hasSeenCVPrompt');
      window.location.reload();
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
  }, [mobileView, template]);

  const handlePrint = async () => {
    setShowDownloadConfirm(false);
    setIsGeneratingPDF(true);

    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Source': 'cv-builder-app',
        },
        body: JSON.stringify({ cvData, template }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const err = new Error(`Failed to generate PDF: ${response.statusText}`);
        (err as any).responseBody = JSON.stringify(errorData);
        throw err;
      }

      // Convert response to blob
      const blob = await response.blob();

      // Create a temporary link to trigger download
      const url = window.URL.createObjectURL(blob);
      const safeName = (cvData.personalInfo.fullName || 'CV').replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
      const filename = `${safeName}_Resume.pdf`;

      // Use a consistent approach for all platforms. `location.assign` with blob urls fails on modern mobile browsers.
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);

      // Fallback for iOS Safari which might sometimes prefer opening blobs in a new tab if download fails
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        link.setAttribute('target', '_blank');
      }

      document.body.appendChild(link);
      link.click();
      link.remove();

      // Clean up after a delay to ensure mobile browser handled it
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (error: any) {
      console.error("Error generating PDF:", error);

      // Try to get a more specific error message from the backend
      let errorMessage = "Failed to generate PDF. Please try again.";

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      // If we got a response that wasn't ok, try to parse its JSON content
      if (error.responseBody) {
        try {
          const parsed = JSON.parse(error.responseBody);
          if (parsed.error) {
            errorMessage = `${parsed.error}: ${parsed.details || 'Unknown reason'}`;
          }
        } catch (e) {
          // Fallback if not JSON
        }
      }

      alert(errorMessage);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isInitialLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={`fixed inset-0 flex flex-col items-center justify-center z-[200] ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}
          >
            <div className="relative mb-6">
              <div className={`w-20 h-20 border-4 border-t-violet-600 rounded-full animate-spin ${isDarkMode ? 'border-violet-900/60' : 'border-violet-100'}`}></div>
              <LayoutTemplate className="absolute inset-0 m-auto text-violet-600 animate-pulse" size={32} />
            </div>
            <h2 className={`text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r animate-pulse ${isDarkMode ? 'from-slate-100 to-violet-400' : 'from-slate-800 to-violet-600'}`}>
              CV Builder
            </h2>
            <p className={`text-sm mt-2 font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Preparing your workspace...</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`flex flex-col h-full w-full font-sans overflow-hidden print:relative print:inset-auto print:h-auto print:bg-white print:overflow-visible transition-colors duration-500 ${isThemeAnimating ? 'theme-switch-animate' : ''} ${isDarkMode ? 'dark-cv bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
        {/* Top Navigation Bar - hidden when popup is visible */}
        {!isPopupVisible && (
          <header className={`border-b flex flex-col lg:flex-row items-center justify-between p-4 lg:px-8 shrink-0 z-50 print:hidden gap-4 lg:gap-0 sticky top-0 shadow-sm transition-colors duration-500 ${isDarkMode ? 'bg-slate-900 border-slate-700/70' : 'bg-white border-gray-200/80'}`}>
            <div className="flex items-center justify-between w-full lg:w-auto">
              <h1 className="text-xl lg:text-2xl font-extrabold flex items-center">
                <div className={`p-2 rounded-xl mr-3 shadow-md transition-colors duration-500 ${isDarkMode ? 'bg-violet-500 shadow-violet-500/30' : 'bg-violet-600 shadow-violet-600/20'}`}>
                  <LayoutTemplate className="text-white" size={20} />
                </div>
                <span className={`bg-clip-text text-transparent bg-gradient-to-r ${isDarkMode ? 'from-slate-100 to-violet-400' : 'from-slate-800 to-violet-600'}`}>
                  CV Builder
                </span>
              </h1>
              <div className="lg:hidden flex items-center gap-2">
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all active:scale-95 ${isDarkMode ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                  aria-label="Reset Resume"
                >
                  Reset
                </button>
                <button
                  onClick={handleThemeToggle}
                  className={`p-2 active:scale-95 rounded-xl transition-all border ${isDarkMode ? 'text-slate-200 bg-slate-800 border-slate-700 hover:bg-slate-700' : 'text-slate-700 bg-white border-gray-200 hover:bg-gray-100'}`}
                  aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
              </div>
            </div>

            {/* Mobile View Toggle - Segmented Control */}
            <div className={`lg:hidden flex p-1.5 rounded-2xl w-full max-w-sm mx-auto border shadow-inner transition-colors duration-500 ${isDarkMode ? 'bg-slate-800/70 border-slate-700/70' : 'bg-gray-100/50 border-gray-200/40'}`}>
              <button
                onClick={() => setMobileView('edit')}
                className={`flex-1 flex items-center justify-center py-2 px-4 text-sm font-semibold rounded-xl transition-all duration-300 ${mobileView === 'edit' ? (isDarkMode ? 'bg-slate-700 text-violet-300 shadow-sm ring-1 ring-violet-200/10 scale-100' : 'bg-white text-violet-600 shadow-sm ring-1 ring-slate-800/5 scale-100') : (isDarkMode ? 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/80 scale-95' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 scale-95')}`}
              >
                <FileText size={16} className="mr-2" />
                Edit
              </button>
              <button
                onClick={() => setMobileView('preview')}
                className={`flex-1 flex items-center justify-center py-2 px-4 text-sm font-semibold rounded-xl transition-all duration-300 ${mobileView === 'preview' ? (isDarkMode ? 'bg-slate-700 text-violet-300 shadow-sm ring-1 ring-violet-200/10 scale-100' : 'bg-white text-violet-600 shadow-sm ring-1 ring-slate-800/5 scale-100') : (isDarkMode ? 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/80 scale-95' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 scale-95')}`}
              >
                <LayoutTemplate size={16} className="mr-2" />
                Preview
              </button>
            </div>

            <div className="hidden lg:flex flex-wrap items-center justify-center gap-3 lg:space-x-4 w-full lg:w-auto">
              {/* Save Status Indicator */}
              <div className="flex items-center text-xs font-medium transition-all duration-300">
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
                className={`flex items-center px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 border active:scale-95 ${isDarkMode ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                <RotateCcw size={15} className="mr-2" /> Reset
              </button>
              <button
                onClick={() => setShowDownloadConfirm(true)}
                disabled={isGeneratingPDF}
                className="flex items-center px-5 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 hover:shadow-violet-600/20 transition-all duration-200 shadow-md active:scale-95 disabled:opacity-70 disabled:active:scale-100"
              >
                {isGeneratingPDF ? (
                  <><Loader2 size={16} className="mr-2 animate-spin" /> Generating...</>
                ) : (
                  <><Download size={16} className="mr-2" /> Download PDF</>
                )}
              </button>
              <button
                onClick={handleThemeToggle}
                className={`flex items-center justify-center p-2.5 rounded-xl transition-all duration-200 border active:scale-95 ${isDarkMode ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-700 border-gray-200 hover:bg-gray-100'}`}
                aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
          </header>
        )}

        <div className="flex-1 overflow-hidden relative flex flex-col lg:flex-row print:overflow-visible print:block">
          {/* Left Side: Form */}
          <div
            className={`${mobileView === 'edit' ? 'flex max-lg:!w-full max-lg:!min-w-0' : 'hidden'} lg:flex h-full border-r p-0 print:hidden flex-col relative shrink-0 z-10 shadow-[2px_0_15px_-3px_rgba(0,0,0,0.03)] transition-colors duration-500 cv-form-panel ${isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-gray-200/80 bg-white'}`}
            style={{ width: `${formWidth}%`, minWidth: '420px' }}
          >
            <div className="h-full w-full overflow-y-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
              <CVForm
                cvData={cvData}
                setCvData={setCvData}
                template={template}
                setTemplate={setTemplate}
                isDarkMode={isDarkMode}
                onPopupVisibleChange={setIsPopupVisible}
              />
            </div>
          </div>

          {/* Resizer - hidden when popup is visible */}
          {!isPopupVisible && (
            <div
              className={`hidden lg:block w-1.5 hover:w-2 bg-transparent cursor-col-resize transition-all z-20 shrink-0 relative group ${isDarkMode ? 'hover:bg-violet-400/30' : 'hover:bg-violet-400/50'}`}
              onMouseDown={startDragging}
            >
              <div className={`absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 h-full group-hover:bg-violet-400/0 transition-colors ${isDarkMode ? 'bg-slate-700/70' : 'bg-gray-200/50'}`}></div>
            </div>
          )}

          {/* Right Side: Preview */}
          <div
            className={`${mobileView === 'preview' ? 'flex max-lg:!w-full' : 'hidden'} lg:flex flex-col h-full bg-transparent print:w-full print:bg-white print:block relative overflow-x-hidden`}
            style={{ width: `calc(${100 - formWidth}% - 6px)` }}
          >
            <div
              ref={previewContainerRef}
              className="preview-container-scroll h-full overflow-y-auto overflow-x-hidden scrollbar-hide p-4 pb-24 lg:pb-8 flex flex-col items-center justify-start overscroll-y-none overscroll-x-none print:p-0 print:overflow-visible"
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
                  className="pointer-events-auto touch-manipulation select-none [-webkit-tap-highlight-color:transparent] w-full flex items-center justify-center px-4 py-3.5 bg-violet-600 text-white text-sm font-semibold rounded-2xl hover:bg-violet-700 active:scale-[0.98] transition-all shadow-xl shadow-violet-600/20 disabled:opacity-70"
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
            <div className={`rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border ${isDarkMode ? 'bg-slate-900 border-slate-700/70' : 'bg-white border-white/20'}`}>
              <div className="p-8">
                {/* Premium Icon Block */}
                <div className="relative w-20 h-20 mx-auto mb-6 group">
                  <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/20 to-fuchsia-500/20 rounded-full blur-xl scale-125 group-hover:scale-150 transition-transform duration-500 animate-pulse" />
                  <div className={`relative flex items-center justify-center w-full h-full backdrop-blur-md rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] group-hover:shadow-[0_8px_30px_rgb(59,130,246,0.15)] group-hover:-translate-y-1 transition-all duration-300 overflow-hidden border ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/50 border-white/80'}`}>
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/60 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                    <Download className="text-violet-600 w-9 h-9 drop-shadow-sm group-hover:translate-y-1 transition-transform duration-300" strokeWidth={1.5} />
                  </div>
                </div>
                <h3 className={`text-xl font-bold text-center mb-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Download Resume</h3>
                <p className={`text-sm text-center mb-8 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Your resume will be exported as a PDF.
                  <br />
                  This usually takes a few seconds.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handlePrint}
                    className="w-full py-3.5 px-4 bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-600/20 flex items-center justify-center"
                  >
                    <Download size={18} className="mr-2" /> Yes, Download PDF
                  </button>
                  <button
                    onClick={() => setShowDownloadConfirm(false)}
                    className={`w-full py-3.5 px-4 font-semibold rounded-xl transition-all border ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-700 border-gray-200'}`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {themeTransition && (
          <motion.div
            key={themeTransition.key}
            className="fixed inset-0 pointer-events-none z-[120] overflow-hidden"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={() => setThemeTransition(null)}
          >
            <motion.div
              className={`absolute rounded-full ${themeTransition.targetDark ? 'bg-slate-950' : 'bg-slate-50'}`}
              style={{
                left: themeTransition.x,
                top: themeTransition.y,
                width: Math.hypot(window.innerWidth, window.innerHeight) * 2,
                height: Math.hypot(window.innerWidth, window.innerHeight) * 2,
                transform: 'translate(-50%, -50%)',
              }}
              initial={{ scale: 0, opacity: 0.9 }}
              animate={{ scale: 1, opacity: 0 }}
              transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
            />
          </motion.div>
        )}

        {/* Reset Confirmation Modal */}
        {showResetConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border ${isDarkMode ? 'bg-slate-900 border-slate-700/70' : 'bg-white border-white/20'}`}>
              <div className="p-8">
                {/* Premium Icon Block */}
                <div className="relative w-20 h-20 mx-auto mb-6 group">
                  <div className="absolute inset-0 bg-gradient-to-tr from-red-500/20 to-orange-500/20 rounded-full blur-xl scale-125 group-hover:scale-150 transition-transform duration-500 animate-pulse" />
                  <div className={`relative flex items-center justify-center w-full h-full backdrop-blur-md rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] group-hover:shadow-[0_8px_30px_rgb(239,68,68,0.15)] group-hover:-translate-y-1 transition-all duration-300 overflow-hidden border ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/50 border-white/80'}`}>
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/60 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                    <RotateCcw className="text-red-500 w-9 h-9 drop-shadow-sm group-hover:-rotate-180 transition-transform duration-500" strokeWidth={1.5} />
                  </div>
                </div>
                <h3 className={`text-xl font-bold text-center mb-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Reset All Data?</h3>
                <p className={`text-sm text-center mb-8 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  This will clear all resume content and restore defaults.
                  <br />
                  This action cannot be undone.
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
                    className={`w-full py-3.5 px-4 font-semibold rounded-xl transition-all border ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-700 border-gray-200'}`}
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
          <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center backdrop-blur-md animate-in fade-in duration-300 ${isDarkMode ? 'bg-slate-950/80' : 'bg-white/80'}`}>
            <div className={`p-8 rounded-3xl shadow-2xl flex flex-col items-center border ${isDarkMode ? 'bg-slate-900 border-slate-700/70' : 'bg-white border-gray-100'}`}>
              <div className="relative mb-6">
                <div className={`w-16 h-16 border-4 border-t-violet-600 rounded-full animate-spin ${isDarkMode ? 'border-violet-900/60' : 'border-violet-100'}`}></div>
                <FileText className="absolute inset-0 m-auto text-violet-600" size={24} />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Generating PDF</h3>
              <p className={`text-center max-w-[200px] ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                Please wait while we prepare your professional resume...
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

