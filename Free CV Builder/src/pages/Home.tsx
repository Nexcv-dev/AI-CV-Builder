/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams } from 'react-router-dom';
import { CVData } from '../types';
import { DEFAULT_TEMPLATE, isTemplateName, TemplateName } from '../templates';
import { AuthUser, apiFetch, getCurrentUser, setDashboardNotification } from '../utils/api';
import CVForm from '../components/CVForm';
import CVPreview from '../components/CVPreview';
import { AccountMenu } from '../components/AccountMenu';
import { AuthModal } from '../components/AuthModal';
import toast from 'react-hot-toast';
import { Download, LayoutTemplate, Loader2, FileText, AlertCircle, LogIn, RotateCcw, Save, CheckCircle2, Moon, Sun } from 'lucide-react';

const THEME_STORAGE_KEY = 'cv-builder-theme';
const DEFAULT_SECTION_ORDER = ['summary', 'personalDetails', 'experience', 'education', 'skills', 'projects', 'courses', 'awards', 'languages', 'references'];

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
  references: [],
  themeColor: '#7c3aed', // Default violet-600
  fontFamily: 'Inter',
  profileImage: '',
  imageZoom: 1,
  imageX: 0,
  imageY: 0,
  sidebarColor: '#1e293b', // Default slate-800
  lineSpacing: 1.5,
  sectionGap: 2,
  sectionOrder: DEFAULT_SECTION_ORDER,
  hiddenSections: [],
};

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const showImportPromptOnLoad = useRef(searchParams.get('import') === '1');
  const showDownloadAfterAuthOnLoad = useRef(searchParams.get('download') === '1');
  const showTemplatesOnLoad = useRef(searchParams.get('templates') === '1');
  const shouldScrollTopOnLoad = useRef(searchParams.has('template'));
  const [cvData, setCvData] = useState<CVData>(initialData);
  const [debouncedCvData, setDebouncedCvData] = useState<CVData>(initialData);
  const [template, setTemplate] = useState<TemplateName>(DEFAULT_TEMPLATE);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false);
  const [cloudSaveStatus, setCloudSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(() => searchParams.get('document'));
  const [documentTitle, setDocumentTitle] = useState('Untitled CV');
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit');
  const [scale, setScale] = useState(1);
  const [previewHeight, setPreviewHeight] = useState(1122); // Default A4 height in px
  const [formWidth, setFormWidth] = useState(45);
  const [isDraggingResizer, setIsDraggingResizer] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [downloadError, setDownloadError] = useState<{ title: string; message: string } | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authRedirectTo, setAuthRedirectTo] = useState('/builder');
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

  useEffect(() => {
    let ignore = false;
    getCurrentUser()
      .then((user) => {
        if (!ignore) setCurrentUser(user);
      })
      .catch(() => {
        if (!ignore) setCurrentUser(null);
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const handleAuthUserChanged = (event: Event) => {
      const user = (event as CustomEvent<AuthUser | undefined>).detail;
      setCurrentUser(user || null);
    };

    window.addEventListener('auth-user-changed', handleAuthUserChanged);
    return () => window.removeEventListener('auth-user-changed', handleAuthUserChanged);
  }, []);

  // On mount: pick up ?template= from landing page and pre-select it
  useEffect(() => {
    const paramTemplate = searchParams.get('template');
    if (isTemplateName(paramTemplate)) {
      setTemplate(paramTemplate);
    }
    // Remove one-time query params so they do not persist on manual refresh.
    if (searchParams.has('template') || searchParams.has('import') || searchParams.has('download') || searchParams.has('templates')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('template');
      nextParams.delete('import');
      nextParams.delete('download');
      nextParams.delete('templates');
      setSearchParams(nextParams, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!showDownloadAfterAuthOnLoad.current || !currentUser) return;
    showDownloadAfterAuthOnLoad.current = false;
    setShowDownloadConfirm(true);
  }, [currentUser]);

  useEffect(() => {
    const id = searchParams.get('document');
    if (!id) return;

    let ignore = false;

    async function loadDocument() {
      try {
        const data = await apiFetch<{ document: { id: string; title: string; template: TemplateName; cvData: CVData } }>(`/api/documents/${id}`);
        if (ignore) return;

        setDocumentId(data.document.id);
        setDocumentTitle(data.document.title);
        setCvData(data.document.cvData);
        setDebouncedCvData(data.document.cvData);
        if (isTemplateName(data.document.template)) {
          setTemplate(data.document.template);
        }
      } catch (error) {
        console.warn('Failed to load saved document:', error);
        setCloudSaveStatus('error');
      }
    }

    loadDocument();
    return () => {
      ignore = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    }, 150);
    return () => clearTimeout(timer);
  }, [cvData]);

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
    setThemeTransition({ x, y, key: Date.now(), targetDark: nextDark });
    setIsDarkMode(nextDark);
  }, [isDarkMode]);

  const handleCloudSave = useCallback(async () => {
    if (currentUser && !currentUser.emailVerified) {
      toast.error('Verify your email to save CVs.');
      return;
    }

    setCloudSaveStatus('saving');
    try {
      const title = cvData.personalInfo.fullName?.trim() ? `${cvData.personalInfo.fullName.trim()} CV` : documentTitle;
      const data = await apiFetch<{ document: { id: string; title: string } }>(
        documentId ? `/api/documents/${documentId}` : '/api/documents',
        {
          method: documentId ? 'PUT' : 'POST',
          body: JSON.stringify({ title, template, cvData }),
        }
      );

      setDocumentId(data.document.id);
      setDocumentTitle(data.document.title);
      setCloudSaveStatus('saved');
      setDashboardNotification(true);
      toast.success('CV saved successfully.');
      setTimeout(() => setCloudSaveStatus('idle'), 2200);
    } catch (error) {
      console.warn('Failed to save document:', error);
      setCloudSaveStatus('error');
      toast.error(error instanceof Error ? error.message : 'Could not save your CV. Please try again.');
      setTimeout(() => setCloudSaveStatus('idle'), 4000);
    }
  }, [currentUser, cvData, documentId, documentTitle, template]);

  const handleResendVerification = useCallback(async () => {
    if (!currentUser || isResendingVerification) return;

    setIsResendingVerification(true);
    try {
      const data = await apiFetch<{ user: AuthUser; message: string }>('/api/auth/resend-verification', {
        method: 'POST',
      });
      setCurrentUser(data.user);
      toast.success(data.message || 'Verification email sent.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send verification email.');
    } finally {
      setIsResendingVerification(false);
    }
  }, [currentUser, isResendingVerification]);

  const contentRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const formScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shouldScrollTopOnLoad.current) return;
    shouldScrollTopOnLoad.current = false;

    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      formScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      previewContainerRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    };

    scrollToTop();
    const frame = window.requestAnimationFrame(scrollToTop);
    const timer = window.setTimeout(scrollToTop, 120);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, []);

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

      let details = "We couldn't reach the PDF server. Check your internet connection and try again.";

      if (error?.name === 'TypeError' || error?.message?.includes('fetch')) {
        details = "Could not connect to the server. Make sure you're online and try again.";
      } else if (error?.responseBody) {
        try {
          const parsed = JSON.parse(error.responseBody);
          if (parsed.details) details = parsed.details;
          else if (parsed.error) details = parsed.error;
        } catch { /* ignore */ }
      } else if (error instanceof Error && error.message && !error.message.includes('Failed to generate')) {
        details = error.message;
      }

      setDownloadError({ title: 'Download Failed', message: details });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const openBuilderLogin = useCallback(() => {
    setAuthRedirectTo('/builder');
    setAuthModalOpen(true);
  }, []);

  const requestDownload = useCallback(() => {
    if (!currentUser) {
      setAuthRedirectTo('/builder?download=1');
      setAuthModalOpen(true);
      return;
    }
    setShowDownloadConfirm(true);
  }, [currentUser]);

  return (
    <>
      <AnimatePresence>
        {isInitialLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={`fixed inset-0 flex flex-col items-center justify-center z-200 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}
          >
            <div className="relative mb-6">
              <div className={`w-20 h-20 border-4 border-t-violet-600 rounded-full animate-spin ${isDarkMode ? 'border-violet-900/60' : 'border-violet-100'}`}></div>
              <img src="/brand/faviconblack.png" alt="NexCV" className="absolute inset-0 m-auto h-12 w-12 rounded-2xl" />
            </div>
            <h2 className={`text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r ${isDarkMode ? 'from-slate-100 to-violet-400' : 'from-slate-800 to-violet-600'}`}>
              NexCV
            </h2>
            <p className={`text-sm mt-2 font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Preparing your workspace...</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`flex flex-col min-h-0 h-full w-full font-sans overflow-hidden print:relative print:inset-auto print:h-auto print:bg-white print:overflow-visible transition-colors duration-500 ${isDarkMode ? 'dark-cv bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
        {/* Top Navigation Bar - hidden when popup is visible */}
        {!isPopupVisible && (
          <header className={`border-b flex flex-col lg:flex-row items-center justify-between px-4 py-3 lg:px-8 lg:py-4 shrink-0 z-50 print:hidden gap-3 lg:gap-0 sticky top-0 shadow-sm transition-colors duration-500 ${isDarkMode ? 'bg-slate-900 border-slate-700/70' : 'bg-white border-gray-200/80'}`}>
            <div className="flex items-center justify-between w-full lg:w-auto">
              <h1 className="text-lg lg:text-2xl font-extrabold flex items-center">
                <div className={`p-1.5 rounded-xl mr-2.5 lg:mr-3 shadow-md transition-colors duration-500 ${isDarkMode ? 'bg-slate-800 shadow-black/20 ring-1 ring-slate-700' : 'bg-white shadow-violet-600/10 ring-1 ring-violet-100'}`}>
                  <img src="/brand/faviconblack.png" alt="" className="h-6 w-6 rounded-lg lg:h-7 lg:w-7" />
                </div>
                <div className="flex flex-col justify-center">
                  <span className={`bg-clip-text text-transparent bg-linear-to-r leading-tight ${isDarkMode ? 'from-slate-100 to-violet-400' : 'from-slate-800 to-violet-600'}`}>
                    NexCV
                  </span>
                </div>
              </h1>
              <div className="lg:hidden flex items-center gap-2">
                {currentUser ? (
                  <AccountMenu isDarkMode={isDarkMode} size="sm" displayName={currentUser.displayName} profileImage={currentUser.profileImage} />
                ) : (
                  <button
                    type="button"
                    onClick={openBuilderLogin}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-lg transition-all active:scale-95 ${isDarkMode ? 'border-slate-700 bg-slate-800 text-slate-200 shadow-black/20 hover:bg-slate-700' : 'border-gray-200 bg-white text-slate-700 shadow-slate-900/10 hover:bg-gray-100'}`}
                    aria-label="Login"
                  >
                    <LogIn size={15} />
                  </button>
                )}
                <button
                  onClick={handleThemeToggle}
                  data-keep-builder-dropdown-open="true"
                  className={`flex h-10 w-10 items-center justify-center rounded-full border shadow-lg transition-all active:scale-95 ${isDarkMode ? 'border-slate-700 bg-slate-800 text-slate-200 shadow-black/20 hover:bg-slate-700' : 'border-gray-200 bg-white text-slate-700 shadow-slate-900/10 hover:bg-gray-100'}`}
                  aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
              </div>
            </div>

            {/* Mobile View Toggle - Segmented Control */}
            <div className={`lg:hidden flex p-1 rounded-2xl w-full max-w-sm mx-auto border shadow-inner transition-colors duration-500 ${isDarkMode ? 'bg-slate-800/70 border-slate-700/70' : 'bg-gray-100/50 border-gray-200/40'}`}>
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

            <div className="hidden lg:flex items-center gap-2">
              {currentUser && (
                <button
                  onClick={handleCloudSave}
                  disabled={cloudSaveStatus === 'saving'}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-500 active:scale-95 disabled:opacity-70"
                  aria-label="Save CV"
                >
                  {cloudSaveStatus === 'saving' ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : cloudSaveStatus === 'saved' ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <Save size={18} />
                  )}
                </button>
              )}
              {currentUser ? (
                <AccountMenu isDarkMode={isDarkMode} displayName={currentUser.displayName} profileImage={currentUser.profileImage} showName />
              ) : (
                <button
                  type="button"
                  onClick={openBuilderLogin}
                  className={`inline-flex h-12 items-center justify-center gap-2 rounded-full border px-4 text-sm font-extrabold shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:scale-95 ${isDarkMode ? 'border-slate-700 bg-slate-800 text-slate-200 shadow-black/20 hover:bg-slate-700' : 'border-gray-200 bg-white text-slate-700 shadow-slate-900/10 hover:bg-gray-100'}`}
                >
                  <LogIn size={17} />
                  Login
                </button>
              )}
              <button
                onClick={handleThemeToggle}
                data-keep-builder-dropdown-open="true"
                className={`flex h-12 w-12 items-center justify-center rounded-full border shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:scale-95 ${isDarkMode ? 'border-slate-700 bg-slate-800 text-slate-200 shadow-black/20 hover:bg-slate-700' : 'border-gray-200 bg-white text-slate-700 shadow-slate-900/10 hover:bg-gray-100'}`}
                aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
          </header>
        )}

        {!isPopupVisible && currentUser && !currentUser.emailVerified && (
          <div className={`shrink-0 border-b px-4 py-3 print:hidden ${isDarkMode ? 'border-amber-300/20 bg-amber-950/35' : 'border-amber-200 bg-amber-50'}`}>
            <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-2">
                <AlertCircle size={18} className={`mt-0.5 shrink-0 ${isDarkMode ? 'text-amber-300' : 'text-amber-600'}`} />
                <p className={`text-sm font-bold leading-5 ${isDarkMode ? 'text-amber-100' : 'text-amber-900'}`}>
                  Verify your email to save CVs. Check your inbox for the verification link.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isResendingVerification}
                className={`inline-flex h-9 shrink-0 items-center justify-center rounded-full px-4 text-xs font-extrabold transition active:scale-95 disabled:opacity-70 ${isDarkMode ? 'bg-amber-300 text-slate-950 hover:bg-amber-200' : 'bg-amber-600 text-white hover:bg-amber-500'}`}
              >
                {isResendingVerification ? 'Sending...' : 'Resend email'}
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden relative flex flex-col lg:flex-row print:overflow-visible print:block">
          {/* Left Side: Form */}
          <div
            className={`${mobileView === 'edit' ? 'flex max-lg:w-full! max-lg:min-w-0!' : 'hidden'} lg:flex h-full min-h-0 border-r p-0 print:hidden flex-col relative shrink-0 z-10 shadow-[2px_0_15px_-3px_rgba(0,0,0,0.03)] transition-colors duration-500 cv-form-panel ${isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-gray-200/80 bg-white'}`}
            style={{ width: `${formWidth}%`, minWidth: 'min(420px, 100%)' }}
          >
            <div ref={formScrollRef} className="h-full min-h-0 w-full overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              <CVForm
                cvData={cvData}
                setCvData={setCvData}
                template={template}
                setTemplate={setTemplate}
                isDarkMode={isDarkMode}
                onPopupVisibleChange={setIsPopupVisible}
                onFinish={requestDownload}
                showImportPromptOnMount={showImportPromptOnLoad.current}
                showTemplatesOnMount={showTemplatesOnLoad.current}
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
            className={`${mobileView === 'preview' ? 'flex max-lg:w-full!' : 'hidden'} lg:flex flex-col h-full min-h-0 bg-transparent print:w-full print:bg-white print:block relative overflow-x-hidden`}
            style={{ width: `calc(${100 - formWidth}% - 6px)` }}
          >
            <div
              ref={previewContainerRef}
              className="preview-container-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 pb-6 lg:pb-8 flex flex-col items-center justify-start overscroll-y-none overscroll-x-none print:p-0 print:overflow-visible"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <div
                id="cv-preview-wrapper"
                className={`preview-scale-wrapper transform origin-top print:transform-none! ${isDraggingResizer ? '' : 'transition-transform'}`}
                style={{
                  transform: `scale(${scale})`,
                  marginBottom: scale < 1 ? `-${previewHeight * (1 - scale)}px` : '0'
                }}
              >
                <CVPreview ref={contentRef} cvData={debouncedCvData} template={template} />
              </div>
            </div>

            <div className="pointer-events-none absolute bottom-8 right-8 z-40 hidden lg:flex print:hidden">
              <motion.button
                onClick={requestDownload}
                disabled={isGeneratingPDF}
                className="group pointer-events-auto relative flex h-14 items-center justify-center gap-2.5 overflow-hidden rounded-full bg-violet-600 px-5 pr-6 text-sm font-extrabold text-white shadow-2xl shadow-violet-600/30 ring-1 ring-white/15 transition-colors hover:bg-violet-500 disabled:opacity-70"
                aria-label="Download PDF"
                initial={{ opacity: 0, y: 18, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                whileHover={{ y: -3, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="absolute inset-0 bg-linear-to-r from-white/0 via-white/18 to-white/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <span className="absolute -inset-1 rounded-full bg-violet-400/25 blur-xl transition-opacity duration-300 group-hover:opacity-100" />
                <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/14 ring-1 ring-white/15">
                  {isGeneratingPDF ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Download size={18} />
                  )}
                </span>
                <span className="relative">{isGeneratingPDF ? 'Preparing...' : 'Download PDF'}</span>
              </motion.button>
            </div>

            {mobileView === 'preview' && (
              <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] lg:hidden print:hidden">
                <div className="grid w-full max-w-md grid-cols-[0.9fr_1.1fr] gap-2">
                  <button
                    onClick={currentUser ? handleCloudSave : openBuilderLogin}
                    disabled={cloudSaveStatus === 'saving'}
                    className={`pointer-events-auto flex h-13 min-w-0 items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-extrabold shadow-2xl ring-1 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 ${
                      isDarkMode
                        ? 'border-slate-700 bg-slate-900/95 text-slate-100 shadow-black/35 ring-white/10'
                        : 'border-slate-200 bg-white/95 text-slate-900 shadow-slate-900/15 ring-slate-900/5'
                    }`}
                    aria-label="Save CV"
                  >
                    {cloudSaveStatus === 'saving' ? (
                      <Loader2 size={19} className="shrink-0 animate-spin" />
                    ) : cloudSaveStatus === 'saved' ? (
                      <CheckCircle2 size={19} className="shrink-0 text-emerald-400" />
                    ) : (
                      <Save size={19} className="shrink-0" />
                    )}
                    <span className="truncate">{cloudSaveStatus === 'saving' ? 'Saving...' : cloudSaveStatus === 'saved' ? 'Saved' : 'Save'}</span>
                  </button>
                <button
                  onClick={requestDownload}
                  disabled={isGeneratingPDF}
                    className="pointer-events-auto flex h-13 min-w-0 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-3 text-sm font-extrabold text-white shadow-2xl shadow-violet-600/35 ring-1 ring-white/15 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
                  aria-label="Download PDF"
                >
                  {isGeneratingPDF ? (
                    <Loader2 size={19} className="shrink-0 animate-spin" />
                  ) : (
                    <Download size={19} className="shrink-0" />
                  )}
                    <span className="truncate">{isGeneratingPDF ? 'Preparing...' : 'Download PDF'}</span>
                </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Download Confirmation Modal */}
        <AnimatePresence>
          {showDownloadConfirm && (
            <motion.div
              className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <motion.div
                className={`relative w-full max-w-sm overflow-hidden rounded-2xl border shadow-2xl ${isDarkMode ? 'bg-slate-900 border-slate-700/80 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              >
              <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-violet-600 via-fuchsia-500 to-sky-500" />
              <div className="p-7">
                <div className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border shadow-sm ${isDarkMode ? 'bg-violet-500/10 border-violet-400/30' : 'bg-violet-50 border-violet-100'}`}>
                  <Download className="h-8 w-8 text-violet-600" strokeWidth={1.8} />
                </div>
                <h3 className="mb-2 text-center text-xl font-bold">Download Resume</h3>
                <p className={`mb-7 text-center text-sm leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Your resume will be exported as a PDF.
                  <br />
                  This usually takes a few seconds.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handlePrint}
                    className="flex w-full items-center justify-center rounded-xl bg-violet-600 px-4 py-3.5 font-semibold text-white shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-700 active:scale-[0.98]"
                  >
                    <Download size={18} className="mr-2" /> Yes, Download PDF
                  </button>
                  <button
                    onClick={() => setShowDownloadConfirm(false)}
                    className={`w-full rounded-xl border px-4 py-3.5 font-semibold transition-all active:scale-[0.98] ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {themeTransition && (
          <motion.div
            key={themeTransition.key}
            className="fixed inset-0 pointer-events-none z-120 overflow-hidden"
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

        {/* Download Error Modal */}
        <AnimatePresence>
          {downloadError && (
            <motion.div
              className="fixed inset-0 z-110 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <motion.div
                className={`relative w-full max-w-sm overflow-hidden rounded-3xl border shadow-2xl ${isDarkMode ? 'bg-slate-900 border-red-500/20 text-slate-100' : 'bg-white border-red-100 text-slate-900'}`}
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 12 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Red accent bar */}
                <div className="absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-red-500 via-rose-500 to-orange-500" />

                <div className="p-7 pt-8">
                  {/* Icon */}
                  <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border shadow-sm ${isDarkMode ? 'bg-red-500/10 border-red-400/20' : 'bg-red-50 border-red-100'}`}>
                    <AlertCircle className="h-8 w-8 text-red-500" strokeWidth={1.7} />
                  </div>

                  {/* Title */}
                  <h3 className="mb-2 text-center text-xl font-bold tracking-tight">{downloadError.title}</h3>

                  {/* Message */}
                  <p className={`mb-7 text-center text-sm leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {downloadError.message}
                  </p>

                  {/* Hint */}
                  <div className={`mb-6 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-xs font-medium ${isDarkMode ? 'border-slate-700 bg-slate-800 text-slate-400' : 'border-slate-100 bg-slate-50 text-slate-500'}`}>
                    <AlertCircle size={13} className="mt-0.5 shrink-0 text-amber-400" />
                    <span>If this keeps happening, try switching templates or reducing image size before downloading.</span>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => { setDownloadError(null); handlePrint(); }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition-all hover:bg-red-700 active:scale-[0.98]"
                    >
                      <RotateCcw size={16} /> Try Again
                    </button>
                    <button
                      onClick={() => setDownloadError(null)}
                      className={`w-full rounded-xl border px-4 py-3.5 text-sm font-semibold transition-all active:scale-[0.98] ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Loading Overlay */}
        <AnimatePresence>
          {isGeneratingPDF && (
            <motion.div
              className={`fixed inset-0 z-100 flex flex-col items-center justify-center backdrop-blur-md ${isDarkMode ? 'bg-slate-950/80' : 'bg-white/80'}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <motion.div
                className={`p-8 rounded-3xl shadow-2xl flex flex-col items-center border ${isDarkMode ? 'bg-slate-900 border-slate-700/70' : 'bg-white border-gray-100'}`}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
              <div className="relative mb-6">
                <div className={`w-16 h-16 border-4 border-t-violet-600 rounded-full animate-spin ${isDarkMode ? 'border-violet-900/60' : 'border-violet-100'}`}></div>
                <FileText className="absolute inset-0 m-auto text-violet-600" size={24} />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Generating PDF</h3>
              <p className={`text-center max-w-[200px] ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                Please wait while we prepare your professional resume...
              </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
      <AuthModal
        isOpen={authModalOpen}
        initialMode="login"
        onClose={() => setAuthModalOpen(false)}
        redirectTo={authRedirectTo}
        onAuthenticated={(user) => {
          setCurrentUser(user);
          if (authRedirectTo.includes('download=1')) {
            setShowDownloadConfirm(true);
          }
        }}
      />
    </>
  );
}

