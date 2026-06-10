import React, { ChangeEvent, CSSProperties, DragEvent, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Copy, Crown, Download, Eye, FileText, FileUp, Info, Loader2, Palette, ShieldCheck, Type, UploadCloud, X, XCircle, ZoomIn, ZoomOut } from 'lucide-react';
import { ApiError, apiFetch } from '../utils/api';
import { AuthModal } from '../components/AuthModal';
import { SiteHeader } from '../components/SiteHeader';
import { HtmlPdfRuleCheck, validateHtmlPdfRules } from '@nexcv/templates/htmlPdfValidation';
import type { HtmlPdfJobResponse, HtmlPdfQuota, HtmlPdfQuotaResponse, DownloadableJob } from '@nexcv/api-contracts/documents';

type PageSize = 'A4' | 'Letter';
type FontOverride = '' | 'Inter' | 'Arial' | 'Calibri' | 'Georgia' | 'Times New Roman' | 'Roboto';

const MAX_UPLOAD_BYTES = 250 * 1024;
const MAX_PREVIEW_ZOOM = 0.85;
const MIN_HTML_PDF_SCALE = 0.1;
const SINGLE_PAGE_FIT_MAX_PAGES = 2;
const HTML_RULE_ERROR_MESSAGE = 'HTML file needs a few fixes before export. Please fix the failed rules below and upload again.';
const HTML_RULE_SCAN_FIRST_DELAYS_MS = import.meta.env.MODE === 'test' ? [5, 5] : [1000, 1000];
const HTML_RULE_SCAN_REMAINING_MS = import.meta.env.MODE === 'test' ? 20 : 3000;
const HTML_RULE_SCAN_MIN_STEP_MS = import.meta.env.MODE === 'test' ? 1 : 120;
const FONT_OVERRIDE_OPTIONS: { value: FontOverride; label: string }[] = [
  { value: '', label: 'Original font' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Calibri', label: 'Calibri' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Times New Roman', label: 'Times' },
  { value: 'Roboto', label: 'Roboto' },
];
const INITIAL_RULE_CHECKS: HtmlPdfRuleCheck[] = [
  { id: 'body-margin', label: 'body margin is 0', passed: false, error: 'Set body { margin: 0; }.' },
  { id: 'body-background', label: 'body background is white', passed: false, error: 'Set body { background: white; }.' },
  { id: 'page-wrapper', label: 'Use one .page wrapper', passed: false, error: 'Add one page wrapper element, for example <div class="page">...</div>.' },
  { id: 'page-size', label: '.page uses A4 dimensions', passed: false, error: 'Set .page { width: 210mm; min-height: 297mm; }.' },
  { id: 'page-padding', label: 'Spacing is inside .page padding', passed: false, error: 'Put page spacing inside .page with padding.' },
  { id: 'clean-export', label: 'No preview shadows or centered gutters', passed: false, error: 'Remove preview shadows and centered gutters.' },
  { id: 'offline-assets', label: 'Inline CSS and data URI assets only', passed: false, error: 'Use inline CSS and data URI assets only.' },
];

function buildHtmlPdfOverrideCss(fontOverride: FontOverride, headerColor: string) {
  const rules: string[] = [];
  if (fontOverride) {
    const fontStack = fontOverride === 'Times New Roman'
      ? '"Times New Roman", Times, serif'
      : fontOverride === 'Georgia'
        ? 'Georgia, "Times New Roman", serif'
        : `"${fontOverride}", Arial, sans-serif`;
    rules.push(`html,body,.page,.cv,.resume{font-family:${fontStack}!important;}`);
    rules.push(`.page *,.cv *,.resume *{font-family:inherit!important;}`);
  }
  if (/^#[0-9a-f]{6}$/i.test(headerColor)) {
    rules.push(`h1,h2,h3,h4,.name,.title,.section-title,.cv-header,.resume-header,header{color:${headerColor}!important;}`);
    rules.push(`.cv-header a,.resume-header a,header a{color:${headerColor}!important;}`);
  }
  return rules.length ? `\n/* NexCV HTML to PDF overrides */\n${rules.join('\n')}\n` : '';
}

function buildPreviewSrcDoc(html: string, pageSize: PageSize, overrideCss = '') {
  const pageRule = pageSize === 'Letter' ? 'Letter' : 'A4';
  const previewCss = `<style id="nexcv-preview-frame-style">html,body{margin:0!important;padding:0!important;overflow:hidden!important;}body{min-height:100%;}body>.cv:first-child{margin-block:0!important;}*{box-sizing:border-box;}@page{size:${pageRule};margin:0;}${overrideCss}</style>`;
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${previewCss}</head>`);
  if (/<head[\s>]/i.test(html)) return html.replace(/<head([^>]*)>/i, `<head$1>${previewCss}`);
  if (/<html[\s>]/i.test(html)) return html.replace(/<html([^>]*)>/i, `<html$1><head><meta charset="utf-8">${previewCss}</head>`);
  return `<!DOCTYPE html><html><head><meta charset="utf-8">${previewCss}</head><body>${html}</body></html>`;
}

function filenameWithoutExtension(name: string) {
  return name.replace(/\.[^.]+$/, '').replace(/[<>:"/\\|?*]+/g, ' ').replace(/\s+/g, ' ').trim() || 'nexcv-document';
}

function calculateHtmlPdfFitScale(contentWidth: number, contentHeight: number, pageWidth: number, pageHeight: number) {
  const widthScale = contentWidth > pageWidth ? pageWidth / contentWidth : 1;
  const heightScale = contentHeight > pageHeight ? pageHeight / contentHeight : 1;
  return Math.max(MIN_HTML_PDF_SCALE, Math.min(1, widthScale, heightScale));
}

export default function HtmlToPdf() {
  const [html, setHtml] = useState('');
  const [fileName, setFileName] = useState('');
  const [filename, setFilename] = useState('nexcv-document');
  const [pageSize, setPageSize] = useState<PageSize>('A4');
  const [fontOverride, setFontOverride] = useState<FontOverride>('');
  const [headerColor, setHeaderColor] = useState('#2563eb');
  const [quota, setQuota] = useState<HtmlPdfQuota | null>(null);
  const [job, setJob] = useState<DownloadableJob | null>(null);
  const [loadingQuota, setLoadingQuota] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [previewZoom, setPreviewZoom] = useState(0.625);
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [previewOffsetTop, setPreviewOffsetTop] = useState(0);
  const [previewFitScale, setPreviewFitScale] = useState(1);
  const [previewAreaWidth, setPreviewAreaWidth] = useState(0);
  const [readabilityWarning, setReadabilityWarning] = useState('');
  const [ruleChecks, setRuleChecks] = useState<HtmlPdfRuleCheck[]>(INITIAL_RULE_CHECKS);
  const [validatingRules, setValidatingRules] = useState(false);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [scanCompletedCount, setScanCompletedCount] = useState(0);
  const [scanFileName, setScanFileName] = useState('');
  const [rulesCopied, setRulesCopied] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewAreaRef = useRef<HTMLDivElement | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const scanTimersRef = useRef<number[]>([]);
  const scanRunIdRef = useRef(0);
  const scanRuleListRef = useRef<HTMLUListElement | null>(null);

  const overrideCss = useMemo(() => buildHtmlPdfOverrideCss(fontOverride, headerColor), [fontOverride, headerColor]);
  const previewSrcDoc = useMemo(() => buildPreviewSrcDoc(html, pageSize, overrideCss), [html, pageSize, overrideCss]);
  const basePaper = pageSize === 'Letter'
    ? { width: 816, height: 1056 }
    : { width: 794, height: 1123 };
  const previewAvailableWidth = Math.max(0, previewAreaWidth - 24);
  const responsivePreviewZoom = previewAvailableWidth > 0
    ? Math.max(MIN_HTML_PDF_SCALE, Math.min(previewZoom, previewAvailableWidth / basePaper.width))
    : previewZoom;
  const previewViewport = {
    width: `${Math.round(basePaper.width * responsivePreviewZoom)}px`,
    height: `${Math.round(basePaper.height * responsivePreviewZoom)}px`,
  };
  const previewPaper: CSSProperties = {
    width: `${basePaper.width}px`,
    height: `${basePaper.height}px`,
    transform: `scale(${responsivePreviewZoom})`,
    transformOrigin: 'top left',
  };
  const previewFrame: CSSProperties = {
    width: `${basePaper.width / previewFitScale}px`,
    height: `${(basePaper.height * pageCount + previewOffsetTop) / previewFitScale}px`,
    transform: `translateY(-${(previewOffsetTop * previewFitScale) + ((currentPage - 1) * basePaper.height)}px) scale(${responsivePreviewZoom * previewFitScale})`,
    transformOrigin: 'top left',
  };
  const inputBytes = useMemo(() => new Blob([html, html ? overrideCss : '']).size, [html, overrideCss]);
  const inputTooLarge = inputBytes > MAX_UPLOAD_BYTES;
  const canSubmit = html.trim().length > 0 && !inputTooLarge && !submitting && job?.status !== 'queued' && job?.status !== 'processing';

  const clearPollTimer = () => {
    if (pollTimerRef.current) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const clearScanTimers = () => {
    scanTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    scanTimersRef.current = [];
  };

  const resetScanState = () => {
    scanRunIdRef.current += 1;
    clearScanTimers();
    setValidatingRules(false);
    setScanCompletedCount(0);
    setScanFileName('');
  };

  const copyRuleChecks = async () => {
    const text = [
      'CV HTML rules for best PDF output',
      ...ruleChecks.map((check) => {
        const status = validationAttempted ? (check.passed ? 'PASS' : 'FIX') : 'RULE';
        return check.passed || !validationAttempted
          ? `- [${status}] ${check.label}`
          : `- [${status}] ${check.label}: ${check.error}`;
      }),
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setRulesCopied(true);
      window.setTimeout(() => setRulesCopied(false), 1800);
    } catch {
      setError('Could not copy rules. Please allow clipboard access and try again.');
    }
  };

  const runRuleScan = (checks: HtmlPdfRuleCheck[], name: string) => new Promise<boolean>((resolve) => {
    const runId = scanRunIdRef.current + 1;
    scanRunIdRef.current = runId;
    clearScanTimers();
    setScanFileName(name);
    setRuleChecks(checks);
    setScanCompletedCount(0);
    setValidationAttempted(true);
    setValidatingRules(true);

    const firstTwoDelays = HTML_RULE_SCAN_FIRST_DELAYS_MS;
    const remainingCount = Math.max(checks.length - firstTwoDelays.length, 0);
    const remainingTotal = HTML_RULE_SCAN_REMAINING_MS;
    const rawWeights = Array.from({ length: remainingCount }, (_, index) => Math.max(1, remainingCount - index));
    const weightTotal = rawWeights.reduce((total, weight) => total + weight, 0) || 1;
    const remainingDelays = rawWeights.map((weight) => Math.max(HTML_RULE_SCAN_MIN_STEP_MS, Math.round((remainingTotal * weight) / weightTotal)));
    const delays = [...firstTwoDelays, ...remainingDelays].slice(0, checks.length);
    const totalDelay = delays.reduce((total, delay) => total + delay, 0);
    let elapsed = 0;

    delays.forEach((delay, index) => {
      elapsed += delay;
      const timer = window.setTimeout(() => {
        if (scanRunIdRef.current !== runId) return;
        setScanCompletedCount(index + 1);
      }, elapsed);
      scanTimersRef.current.push(timer);
    });

    const doneTimer = window.setTimeout(() => {
      if (scanRunIdRef.current !== runId) return;
      setValidatingRules(false);
      setScanFileName('');
      resolve(true);
    }, totalDelay + 180);
    scanTimersRef.current.push(doneTimer);
  });

  const loadQuota = async () => {
    setLoadingQuota(true);
    try {
      const data = await apiFetch<HtmlPdfQuotaResponse>('/api/html-pdf-quota', { cache: 'no-store' });
      setQuota(data.quota);
    } catch {
      setQuota(null);
    } finally {
      setLoadingQuota(false);
    }
  };

  const pollJob = async (jobId: string) => {
    clearPollTimer();
    try {
      const data = await apiFetch<HtmlPdfJobResponse>(`/api/html-pdf-jobs/${jobId}`, { cache: 'no-store' });
      setJob(data.job);
      if (data.job.status === 'queued' || data.job.status === 'processing') {
        pollTimerRef.current = window.setTimeout(() => pollJob(jobId), 1800);
      } else {
        void loadQuota();
      }
    } catch (pollError) {
      const normalized = pollError instanceof ApiError ? pollError : null;
      setError(normalized?.message || 'Could not check PDF status.');
    }
  };

  useEffect(() => {
    void loadQuota();
    return () => {
      clearPollTimer();
      clearScanTimers();
    };
  }, []);

  useEffect(() => {
    if (!validatingRules || ruleChecks.length === 0) return;
    const targetIndex = Math.min(scanCompletedCount, ruleChecks.length - 1);
    const target = scanRuleListRef.current?.querySelector(`[data-scan-index="${targetIndex}"]`);
    if (target instanceof HTMLElement && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [ruleChecks.length, scanCompletedCount, validatingRules]);

  useEffect(() => {
    setCurrentPage(1);
    setPreviewOffsetTop(0);
    setPreviewFitScale(1);
    setReadabilityWarning('');
  }, [html, pageSize]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, pageCount));
  }, [pageCount]);

  useEffect(() => {
    const previewArea = previewAreaRef.current;
    if (!previewArea) return undefined;

    const updatePreviewAreaWidth = () => setPreviewAreaWidth(previewArea.clientWidth);
    updatePreviewAreaWidth();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updatePreviewAreaWidth);
      return () => window.removeEventListener('resize', updatePreviewAreaWidth);
    }

    const observer = new ResizeObserver(updatePreviewAreaWidth);
    observer.observe(previewArea);
    return () => observer.disconnect();
  }, []);

  const loadHtmlFile = async (file: File | undefined) => {
    setError('');
    setJob(null);
    resetScanState();
    setValidationAttempted(false);
    if (!file) return;
    const looksLikeHtml = file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm') || file.type === 'text/html';
    if (!looksLikeHtml) {
      setError('Upload a .html or .htm file.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('HTML file must stay under 250 KB.');
      return;
    }
    const text = await file.text();
    const ruleValidation = validateHtmlPdfRules(text);
    const scanCompleted = await runRuleScan(ruleValidation.checks, file.name);
    if (!scanCompleted) return;
    if (!ruleValidation.valid) {
      setError(HTML_RULE_ERROR_MESSAGE);
      return;
    }
    setPageCount(1);
    setHtml(text);
    setFileName(file.name);
    setFilename(filenameWithoutExtension(file.name));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    void loadHtmlFile(event.target.files?.[0]);
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    void loadHtmlFile(event.dataTransfer.files?.[0]);
  };

  const clearFile = () => {
    setHtml('');
    setFileName('');
    setFilename('nexcv-document');
    setJob(null);
    setError('');
    setPageCount(1);
    resetScanState();
    setValidationAttempted(false);
    setRuleChecks(INITIAL_RULE_CHECKS);
  };

  const setZoom = (value: number) => {
    setPreviewZoom(Math.min(Math.max(value, 0.35), MAX_PREVIEW_ZOOM));
  };

  const fitPreviewWidth = () => {
    const availableWidth = Math.max(0, (previewAreaRef.current?.clientWidth || basePaper.width) - 24);
    setZoom(availableWidth / basePaper.width);
  };

  const handlePreviewLoad = (event: React.SyntheticEvent<HTMLIFrameElement>) => {
    const frame = event.currentTarget;
    try {
      const documentElement = frame.contentDocument?.documentElement;
      const body = frame.contentDocument?.body;
      documentElement?.style.setProperty('margin', '0', 'important');
      documentElement?.style.setProperty('padding', '0', 'important');
      documentElement?.style.setProperty('overflow', 'hidden', 'important');
      body?.style.setProperty('margin', '0', 'important');
      body?.style.setProperty('padding', '0', 'important');
      body?.style.setProperty('overflow', 'hidden', 'important');
      if (documentElement) documentElement.scrollTop = 0;
      if (body) body.scrollTop = 0;
      const contentOffsetTop = body
        ? Array.from(body.children).reduce((minTop, element) => {
          if (!(element instanceof HTMLElement)) return minTop;
          const style = frame.contentWindow?.getComputedStyle(element);
          if (style?.display === 'none' || style?.visibility === 'hidden') return minTop;
          const rect = element.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return minTop;
          return Math.min(minTop, Math.max(0, rect.top));
        }, Number.POSITIVE_INFINITY)
        : 0;
      const normalizedOffsetTop = Number.isFinite(contentOffsetTop) ? Math.min(contentOffsetTop, basePaper.height / 2) : 0;
      const pageLikeElements = Array.from(frame.contentDocument?.querySelectorAll('main.cv, .cv, main.page, .page, [data-pdf-page]') || [])
        .filter((element): element is HTMLElement => element instanceof HTMLElement)
        .filter((element) => {
          const style = frame.contentWindow?.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style?.display !== 'none' && style?.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        });
      const contentHeight = pageLikeElements.length > 0
        ? Math.max(
          ...pageLikeElements.map((element) => {
            const rect = element.getBoundingClientRect();
            return Math.ceil(Math.max(element.scrollHeight, element.offsetHeight, rect.height));
          }),
          basePaper.height,
        )
        : Math.max(
          documentElement?.scrollHeight || 0,
          documentElement?.offsetHeight || 0,
          body?.scrollHeight || 0,
          body?.offsetHeight || 0,
          basePaper.height,
        );
      const contentWidth = pageLikeElements.length > 0
        ? Math.max(
          ...pageLikeElements.map((element) => Math.ceil(element.getBoundingClientRect().width)),
          basePaper.width,
        )
        : Math.max(
          documentElement?.scrollWidth || 0,
          documentElement?.offsetWidth || 0,
          body?.scrollWidth || 0,
          body?.offsetWidth || 0,
          basePaper.width,
        );
      const normalizedContentHeight = Math.max(basePaper.height, contentHeight - normalizedOffsetTop);
      const rawPageCount = Math.max(1, Math.ceil(normalizedContentHeight / basePaper.height));
      const widthScale = contentWidth > basePaper.width ? Math.max(MIN_HTML_PDF_SCALE, basePaper.width / contentWidth) : 1;
      const shouldFitSinglePage = rawPageCount <= SINGLE_PAGE_FIT_MAX_PAGES;
      const fitScale = shouldFitSinglePage
        ? calculateHtmlPdfFitScale(contentWidth, normalizedContentHeight, basePaper.width, basePaper.height)
        : widthScale;
      const finalPageCount = shouldFitSinglePage
        ? 1
        : Math.max(1, Math.ceil((normalizedContentHeight * fitScale) / basePaper.height));
      setPreviewOffsetTop(normalizedOffsetTop);
      setPreviewFitScale(fitScale);
      setPageCount(finalPageCount);
      setCurrentPage(1);
      setReadabilityWarning(
        shouldFitSinglePage
          ? ''
          : `This document is too long for a readable single-page PDF, so it will export as ${finalPageCount} pages.`
      );
    } catch {
      setPreviewOffsetTop(0);
      setPreviewFitScale(1);
      setPageCount(1);
      setReadabilityWarning('');
    }
  };

  const generatePdf = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    setJob(null);
    try {
      const data = await apiFetch<HtmlPdfJobResponse>('/api/html-pdf-jobs', {
        method: 'POST',
        body: JSON.stringify({ html, css: overrideCss, filename, pageSize }),
      });
      setJob(data.job);
      setQuota(data.quota);
      void pollJob(data.job.id);
    } catch (submitError) {
      const normalized = submitError instanceof ApiError ? submitError : null;
      setError(normalized?.message || 'Could not queue PDF generation.');
      if (normalized?.data?.quota) setQuota(normalized.data.quota);
    } finally {
      setSubmitting(false);
    }
  };

  const jobBusy = job?.status === 'queued' || job?.status === 'processing';
  const quotaText = loadingQuota
    ? 'Loading limit'
    : quota?.limit === null
      ? 'Unlimited'
      : `${quota?.remaining ?? 0} of ${quota?.limit ?? 3} left today`;
  const quotaPlanLabel = quota?.plan === 'guest'
    ? 'Guest'
    : quota?.plan === 'payg'
      ? 'Pass'
      : quota?.plan === 'monthly'
        ? 'Monthly'
        : quota?.plan === 'quarterly'
          ? 'Quarterly'
          : quota?.plan === 'unlimited'
            ? 'Admin'
            : 'Free';
  const showPaidQuotaBadge = quota?.plan === 'payg' || quota?.plan === 'monthly' || quota?.plan === 'quarterly';
  const uploadProgress = Math.min(Math.round((inputBytes / MAX_UPLOAD_BYTES) * 100), 100);
  const scanProgress = ruleChecks.length > 0 ? Math.round((scanCompletedCount / ruleChecks.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <SiteHeader />
      {validatingRules && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-md">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-emerald-300/20 bg-[#081225] p-5 shadow-2xl shadow-black/45">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_0%,rgba(16,185,129,0.22),transparent_34%),radial-gradient(circle_at_92%_12%,rgba(99,102,241,0.2),transparent_34%)]" />
            <div className="relative">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/25 bg-emerald-300/10 text-emerald-200">
                  <ShieldCheck size={25} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-wide text-emerald-300">Scanning CV HTML</p>
                  <h3 className="mt-1 truncate text-lg font-black text-white">{scanFileName || 'Checking upload'}</h3>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
                    Verifying PDF-safe structure rule by rule.
                  </p>
                </div>
              </div>

              <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-linear-to-r from-emerald-300 to-indigo-400 transition-[width] duration-300" style={{ width: `${scanProgress}%` }} />
              </div>

              <ul ref={scanRuleListRef} className="max-h-72 space-y-2 overflow-y-auto pr-1 scrollbar-hide">
                {ruleChecks.map((check, index) => {
                  const done = index < scanCompletedCount;
                  const active = index === scanCompletedCount;
                  return (
                    <li
                      key={check.id}
                      data-scan-index={index}
                      className={`flex items-start gap-3 rounded-2xl border px-3 py-2.5 transition ${
                        done
                          ? check.passed
                            ? 'border-emerald-300/20 bg-emerald-300/8 text-emerald-100'
                            : 'border-red-300/25 bg-red-400/10 text-red-100'
                          : active
                            ? 'border-indigo-300/25 bg-indigo-400/10 text-indigo-100'
                            : 'border-white/8 bg-white/[0.03] text-slate-500'
                      }`}
                    >
                      <span className="mt-0.5 shrink-0">
                        {done ? (
                          check.passed ? <CheckCircle2 size={16} className="text-emerald-300" /> : <XCircle size={16} className="text-red-300" />
                        ) : active ? (
                          <Loader2 size={16} className="animate-spin text-indigo-300" />
                        ) : (
                          <span className="block h-4 w-4 rounded-full border border-slate-600" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1 text-xs font-bold leading-5">{check.label}</span>
                    </li>
                  );
                })}
              </ul>

              <p className="mt-4 text-center text-[11px] font-bold text-slate-500">
                {scanProgress}% complete
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-8 pt-24 sm:px-6 lg:px-8">
        <main className="flex min-h-0 flex-1 flex-col overflow-x-hidden bg-[#070d1c]">
          <div className="flex flex-col gap-4 border-b border-white/8 pb-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-[22px] font-black tracking-tight text-white sm:text-2xl">Custom CV PDF Exporter</h1>
              <p className="mt-1 text-sm font-semibold text-slate-400">Upload a finished CV layout as self-contained HTML and export a polished PDF. Paid plans get more export room.</p>
            </div>

            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:gap-3 lg:ml-auto lg:w-auto">
              {showPaidQuotaBadge && (
                <span className={`inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-extrabold sm:px-4 ${
                  quota?.reached ? 'border-red-400/30 bg-red-500/10 text-red-200' : 'border-emerald-400/25 bg-emerald-400/8 text-emerald-200'
                }`}>
                  <Crown size={15} className="shrink-0" />
                  <span className="truncate">{quotaPlanLabel}: {quotaText}</span>
                </span>
              )}
              <button
                type="button"
                onClick={generatePdf}
                disabled={!canSubmit || quota?.reached}
                className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-lg bg-linear-to-r from-emerald-400 to-indigo-500 px-3 text-sm font-extrabold text-white shadow-lg shadow-indigo-950/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-400 sm:px-6"
              >
                {submitting || jobBusy ? <Loader2 size={16} className="shrink-0 animate-spin" /> : <FileText size={16} className="shrink-0" />}
                <span className="truncate">Generate PDF</span>
              </button>
            </div>
          </div>

          {quota?.plan === 'guest' && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-indigo-300/25 bg-indigo-400/10 px-4 py-3 text-sm font-semibold text-indigo-100">
              <span>Sign in to get more daily custom CV PDF exports.</span>
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="ml-auto inline-flex h-9 items-center justify-center rounded-lg bg-white px-4 text-xs font-black text-slate-950 transition hover:bg-indigo-100"
              >
                Sign in
              </button>
            </div>
          )}

          {(error || inputTooLarge || job?.error) && (
            <div className="mt-4 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-3 text-sm font-semibold leading-5 text-red-100 sm:px-4">
              {inputTooLarge ? 'HTML and CSS must stay under 250 KB combined.' : error || job?.error}
            </div>
          )}

          {readabilityWarning && !error && !job?.error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-100">
              <AlertTriangle size={16} className="shrink-0 text-amber-300" />
              {readabilityWarning}
            </div>
          )}

          {job && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-bold text-slate-300">
              <div className="flex min-w-0 items-center gap-2">
                <FileText size={16} className="shrink-0 text-emerald-300" />
                <span>Job {job.status}</span>
                {jobBusy && <Loader2 size={15} className="animate-spin text-slate-500" />}
              </div>
              {job.downloadUrl && (
                <a
                  href={job.downloadUrl}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-emerald-300/30 bg-emerald-400/10 px-4 text-sm font-extrabold text-emerald-100 transition hover:bg-emerald-400/20"
                >
                  <Download size={16} />
                  Download
                </a>
              )}
            </div>
          )}

          <div className="grid min-h-[680px] min-w-0 flex-1 gap-4 pt-6 xl:grid-cols-[330px_minmax(0,1fr)] xl:gap-5">
            <section className="flex min-h-0 min-w-0 flex-col gap-4 rounded-lg border border-white/10 bg-[#10182b]/95 p-3 shadow-2xl shadow-black/20 sm:p-5">
              <div className="flex items-center gap-2 text-sm font-black text-white">
                <FileText size={17} className="text-emerald-300" />
                Document Settings
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-xs font-extrabold text-slate-300">
                  Filename
                  <input
                    value={filename}
                    onChange={(event) => setFilename(event.target.value)}
                    className="h-11 min-w-0 rounded-lg border border-white/10 bg-[#0b1223] px-3 text-xs font-semibold text-white outline-none transition focus:border-emerald-400"
                    maxLength={80}
                  />
                </label>

                <label className="grid gap-2 text-xs font-extrabold text-slate-300">
                  Page Size
                  <select
                    value={pageSize}
                    onChange={(event) => {
                      setPageCount(1);
                      setPageSize(event.target.value as PageSize);
                    }}
                    className="h-11 min-w-0 rounded-lg border border-white/10 bg-[#0b1223] px-3 text-xs font-semibold text-white outline-none transition focus:border-emerald-400"
                  >
                    <option value="A4">A4 (210 x 297 mm)</option>
                    <option value="Letter">Letter (8.5 x 11 in)</option>
                  </select>
                </label>
              </div>

              <input ref={fileInputRef} type="file" accept=".html,.htm,text/html" onChange={handleFileChange} className="hidden" />
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={`flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed px-4 py-6 text-center transition sm:min-h-56 sm:px-6 sm:py-7 ${
                  dragActive ? 'border-emerald-300 bg-emerald-400/10' : 'border-slate-500/50 bg-[#0c1426]'
                }`}
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-emerald-300 text-emerald-300">
                  <UploadCloud size={30} />
                </span>
                <h2 className="mt-4 text-base font-black text-white">Upload CV HTML file</h2>
                <p className="mt-2 max-w-60 text-xs font-semibold leading-5 text-slate-400">
                  Use a self-contained CV .html file with inline CSS and data URI images.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-linear-to-r from-emerald-400 to-indigo-500 px-5 text-sm font-extrabold text-white shadow-lg shadow-indigo-950/30 transition hover:brightness-110"
                >
                  <FileUp size={16} />
                  Choose file
                </button>
              </div>

              <div className="rounded-lg border border-white/10 bg-[#0b1223] p-4">
                <p className="mb-3 text-xs font-black text-emerald-300">Selected File</p>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-400 text-slate-950">
                      <FileText size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-white">{fileName || 'No file selected'}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{fileName ? `${(inputBytes / 1024).toFixed(2)} KB • text/html` : 'Choose a file to preview'}</p>
                    </div>
                  </div>
                  {fileName && (
                    <div className="grid shrink-0 gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-emerald-400 text-emerald-300">
                        <Download size={13} />
                      </span>
                      <button
                        type="button"
                        onClick={clearFile}
                        className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white"
                        aria-label="Remove selected file"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-emerald-400" style={{ width: `${fileName ? uploadProgress : 0}%` }} />
                </div>
                <p className="mt-2 text-xs font-bold text-emerald-300">{fileName ? `${(inputBytes / 1024).toFixed(2)} KB` : '0 KB'} <span className="text-slate-500">/ 250 KB</span></p>
              </div>

              <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-xs font-semibold leading-5 text-amber-100">
                <span className="mb-1 block font-black text-amber-300">Important</span>
                External CSS, scripts, fonts, and remote images are blocked during PDF rendering. Keep every CV asset inside the HTML file.
              </div>

              <div className="rounded-lg border border-white/10 bg-[#0b1223] p-4 text-xs font-semibold leading-5 text-slate-300">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="block font-black text-emerald-300">CV HTML rules for best PDF output</span>
                  <div className="flex shrink-0 items-center gap-2">
                    {validatingRules && <Loader2 size={14} className="animate-spin text-emerald-300" />}
                    <button
                      type="button"
                      onClick={copyRuleChecks}
                      className="inline-flex h-7 items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 text-[11px] font-black text-slate-300 transition hover:border-emerald-300/40 hover:bg-emerald-300/10 hover:text-emerald-200"
                      aria-label="Copy CV HTML rules"
                    >
                      <Copy size={13} />
                      {rulesCopied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
                <ul className="space-y-2">
                  {ruleChecks.map((check) => {
                    const index = ruleChecks.findIndex((item) => item.id === check.id);
                    const scanDone = !validatingRules || index < scanCompletedCount;
                    const scanActive = validatingRules && index === scanCompletedCount;
                    const passed = validationAttempted && scanDone && check.passed;
                    const failed = validationAttempted && scanDone && !check.passed;
                    return (
                      <li key={check.id} className="flex items-start gap-2">
                        <span className="mt-0.5 shrink-0">
                          {scanActive ? (
                            <Loader2 size={14} className="animate-spin text-slate-500" />
                          ) : passed ? (
                            <CheckCircle2 size={14} className="text-emerald-300" />
                          ) : failed ? (
                            <XCircle size={14} className="text-red-300" />
                          ) : (
                            <span className="block h-3.5 w-3.5 rounded-full border border-slate-600" />
                          )}
                        </span>
                        <span className={`min-w-0 flex-1 ${failed ? 'text-red-100' : passed ? 'text-emerald-100' : 'text-slate-400'}`}>
                          {check.label}
                        </span>
                        {failed && (
                          <span
                            title={check.error}
                            className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-red-200"
                            aria-label={check.error}
                          >
                            <Info size={13} />
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>

            <section className="flex min-h-0 min-w-0 flex-col rounded-lg border border-white/10 bg-[#10182b]/95 p-3 shadow-2xl shadow-black/20 sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Eye size={17} className="text-slate-300" />
                  <span className="text-sm font-black text-white">Preview</span>
                </div>
                <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
                  <label className="flex h-9 w-full min-w-0 flex-none items-center gap-2 rounded-lg border border-white/10 bg-white/8 px-2 text-slate-300 sm:w-auto">
                    <Type size={15} className="shrink-0" />
                    <span className="sr-only">Font override</span>
                    <select
                      value={fontOverride}
                      onChange={(event) => setFontOverride(event.target.value as FontOverride)}
                      className="h-7 min-w-0 flex-1 bg-transparent text-xs font-extrabold text-white outline-none sm:min-w-24"
                    >
                      {FONT_OVERRIDE_OPTIONS.map((option) => (
                        <option key={option.value || 'original'} value={option.value} className="bg-slate-900 text-white">{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex h-9 shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-white/8 px-2 text-slate-300">
                    <Palette size={15} className="shrink-0" />
                    <span className="sr-only">Header color override</span>
                    <input
                      type="color"
                      value={headerColor}
                      onChange={(event) => setHeaderColor(event.target.value)}
                      className="h-6 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
                      aria-label="Header color override"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setPageSize('A4')}
                    className={`inline-flex h-9 shrink-0 items-center rounded-lg border px-3 text-xs font-extrabold sm:px-4 ${
                      pageSize === 'A4' ? 'border-emerald-300/40 bg-emerald-400/10 text-emerald-200' : 'border-white/10 bg-white/8 text-slate-300'
                    }`}
                  >
                    A4
                  </button>
                  <button type="button" onClick={fitPreviewWidth} className="h-9 shrink-0 rounded-lg bg-white/8 px-3 text-xs font-extrabold text-white transition hover:bg-white/12 sm:px-4"><span className="sm:hidden">Fit</span><span className="hidden sm:inline">Fit Width</span></button>
                  <button type="button" onClick={() => setZoom(MAX_PREVIEW_ZOOM)} className="h-9 shrink-0 rounded-lg bg-white/8 px-3 text-xs font-extrabold text-white transition hover:bg-white/12 sm:px-4">{Math.round((responsivePreviewZoom / MAX_PREVIEW_ZOOM) * 100)}%</button>
                  <button type="button" onClick={() => setZoom(previewZoom - 0.1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/8 text-slate-300 transition hover:bg-white/12" aria-label="Zoom out"><ZoomOut size={16} /></button>
                  <button type="button" onClick={() => setZoom(previewZoom + 0.1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/8 text-slate-300 transition hover:bg-white/12" aria-label="Zoom in"><ZoomIn size={16} /></button>
                </div>
              </div>

              <div ref={previewAreaRef} className="flex min-h-[360px] flex-1 items-start justify-center overflow-hidden rounded-lg bg-[#172238] p-3 sm:min-h-0 sm:p-8">
                <div className="overflow-hidden rounded-sm bg-white shadow-2xl shadow-black/40" style={previewViewport}>
                  {html ? (
                    <iframe
                      key={previewSrcDoc}
                      title="CV PDF preview"
                      sandbox="allow-same-origin"
                      srcDoc={previewSrcDoc}
                      scrolling="no"
                      onLoad={handlePreviewLoad}
                      className="block shrink-0 border-0 bg-white"
                      style={previewFrame}
                    />
                  ) : (
                    <div
                      className="flex shrink-0 items-center justify-center bg-white text-center text-sm font-bold text-slate-400"
                      style={previewPaper}
                    >
                      <span className="max-w-xs px-8">Upload a CV HTML file to preview it here.</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage <= 1}
                  className="flex h-10 w-11 items-center justify-center rounded-lg bg-white/8 text-slate-300 transition hover:bg-white/12 disabled:cursor-not-allowed disabled:text-slate-600"
                  aria-label="Previous page"
                >
                  &lsaquo;
                </button>
                <span className="inline-flex h-10 min-w-24 items-center justify-center rounded-lg bg-[#0b1223] text-sm font-extrabold text-white">{currentPage} / {pageCount}</span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
                  disabled={currentPage >= pageCount}
                  className="flex h-10 w-11 items-center justify-center rounded-lg bg-white/8 text-slate-300 transition hover:bg-white/12 disabled:cursor-not-allowed disabled:text-slate-600"
                  aria-label="Next page"
                >
                  &rsaquo;
                </button>
              </div>
            </section>
          </div>
        </main>
        <AuthModal
          isOpen={authModalOpen}
          initialMode="login"
          redirectTo="/html-to-pdf"
          onClose={() => setAuthModalOpen(false)}
          onAuthenticated={() => {
            setAuthModalOpen(false);
            void loadQuota();
          }}
        />
      </div>
    </div>
  );
}
