import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, FileUp, Upload, Loader2, X, Sparkles, Lock, Image as ImageIcon } from 'lucide-react';
import { MODAL_OVERLAY_CLASS, MODAL_CONTAINER_BASE } from './constants';

interface ImportModalsProps {
  showInitialPrompt: boolean;
  setShowInitialPrompt: (show: boolean) => void;
  showUploadModal: boolean;
  setShowUploadModal: (show: boolean) => void;
  isImporting: boolean;
  importMessage: { type: 'success' | 'error'; text: string } | null;
  handleCVImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isDarkMode?: boolean;
  onImportSkipped?: () => void;
}

const overlayTransition = { duration: 0.22, ease: 'easeOut' as const };
const modalTransition = { duration: 0.22, ease: 'easeOut' as const };
const modalSurface = 'relative w-full overflow-hidden rounded-2xl border shadow-2xl';
const iconShell = 'mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border shadow-sm';

function LinkedInMark() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#0A66C2" d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
    </svg>
  );
}

export const ImportModals = React.memo(({
  showInitialPrompt,
  setShowInitialPrompt,
  showUploadModal,
  setShowUploadModal,
  isImporting,
  importMessage,
  handleCVImport,
  isDarkMode,
  onImportSkipped
}: ImportModalsProps) => {
  const activeModal = showInitialPrompt ? 'prompt' : showUploadModal ? 'upload' : null;

  return (
    <AnimatePresence>
      {activeModal && (
        <motion.div
          key="cv-import-overlay"
          className={MODAL_OVERLAY_CLASS}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={overlayTransition}
        >
          <AnimatePresence mode="wait" initial={false}>
            {activeModal === 'prompt' ? (
              <motion.div
                key="cv-import-prompt"
                className={`${MODAL_CONTAINER_BASE} ${modalSurface} max-w-sm p-7 ${isDarkMode ? 'bg-slate-900 border-slate-700/80 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={modalTransition}
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-violet-600 via-fuchsia-500 to-sky-500" />
                <div className={`${iconShell} ${isDarkMode ? 'bg-violet-500/10 border-violet-400/30' : 'bg-violet-50 border-violet-100'}`}>
                  <FileText className="h-8 w-8 text-violet-600" strokeWidth={1.8} />
                </div>
                <h3 className="mb-2 text-center text-xl font-bold">Start Faster With Your Resume</h3>
                <p className={`mb-7 text-center text-sm leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Upload your resume or LinkedIn profile PDF and we will extract matching CV sections automatically.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setShowUploadModal(true);
                      setShowInitialPrompt(false);
                    }}
                    className="flex w-full items-center justify-center rounded-xl bg-violet-600 px-4 py-3.5 font-semibold text-white shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-700 active:scale-[0.98]"
                  >
                    Yes, I have one
                  </button>
                  <button
                    onClick={() => {
                      setShowInitialPrompt(false);
                      onImportSkipped?.();
                    }}
                    className={`w-full rounded-xl border px-4 py-3.5 font-semibold transition-all active:scale-[0.98] ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                  >
                    No, start from scratch
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="cv-upload-modal"
                className={`${MODAL_CONTAINER_BASE} relative w-[calc(100vw-1rem)] max-w-2xl overflow-hidden rounded-3xl border border-sky-400/70 bg-[#071123] p-4 text-slate-100 shadow-[0_0_0_1px_rgba(168,85,247,0.45),0_0_38px_rgba(59,130,246,0.32),0_0_70px_rgba(168,85,247,0.18)] sm:p-6`}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={modalTransition}
              >
                <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_8%_4%,rgba(168,85,247,0.22),transparent_24%),radial-gradient(circle_at_96%_92%,rgba(56,189,248,0.14),transparent_30%)]" />
                <div className="pointer-events-none absolute inset-0 rounded-3xl border border-violet-400/55" />
                <div className="relative max-h-[calc(100vh-1.5rem)] overflow-y-auto pr-1 scrollbar-hide">
                  <div className="mb-4 flex items-start justify-between gap-3 sm:mb-5 sm:gap-4">
                    <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-violet-400/30 bg-white/[0.06] shadow-[0_0_20px_rgba(139,92,246,0.16)] sm:h-14 sm:w-14">
                        <FileUp className="h-6 w-6 text-sky-300 sm:h-7 sm:w-7" strokeWidth={1.9} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xl font-extrabold leading-tight tracking-normal text-white sm:text-3xl">
                          Import your Resume<br className="hidden sm:block" /> or LinkedIn PDF
                        </h3>
                        <p className="mt-2 max-w-xl text-xs leading-relaxed text-slate-400 sm:text-sm">
                          Upload your file and let AI clean it up, extract key details, and build a professional resume for you.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowUploadModal(false);
                        onImportSkipped?.();
                      }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-600/80 bg-white/[0.04] text-slate-300 transition-colors hover:border-sky-300/80 hover:bg-sky-400/10 hover:text-white sm:h-10 sm:w-10"
                      aria-label="Close upload modal"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <label
                    htmlFor="cv-upload-modal"
                    className={`group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed px-3 py-5 text-center transition-all duration-300 sm:px-6 sm:py-7 ${
                      isImporting
                        ? 'cursor-not-allowed border-slate-600 bg-slate-900/70'
                        : 'border-sky-400/70 bg-slate-950/45 hover:border-violet-300 hover:bg-slate-900/70 hover:shadow-[0_0_35px_rgba(96,165,250,0.18)]'
                    }`}
                  >
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(96,165,250,0.12),transparent_48%)] opacity-80" />
                    <div className="relative z-10 mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-fuchsia-500 via-violet-500 to-sky-400 shadow-[0_14px_30px_rgba(99,102,241,0.32)] sm:h-16 sm:w-16">
                      {isImporting ? (
                        <Loader2 className="h-7 w-7 animate-spin text-white sm:h-8 sm:w-8" strokeWidth={2} />
                      ) : (
                        <Upload className="h-7 w-7 text-white sm:h-8 sm:w-8" strokeWidth={2.1} />
                      )}
                    </div>

                    <h3 className="relative z-10 mb-1.5 text-lg font-extrabold text-white sm:text-xl">
                      {isImporting ? 'Processing your CV...' : 'Drag & drop your resume'}
                    </h3>
                    <p className="relative z-10 mb-4 text-xs text-slate-400 sm:text-sm">
                      {isImporting ? 'Extracting and matching CV sections' : (
                        <>
                          or <span className="font-bold text-violet-300">browse files</span> from your device
                        </>
                      )}
                    </p>

                    <div className="relative z-10 mb-5 flex flex-wrap items-center justify-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-600/80 bg-slate-950/70 px-2.5 py-1 text-[11px] font-bold text-slate-200">
                        <FileText size={13} className="text-rose-400" />
                        PDF
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-600/80 bg-slate-950/70 px-2.5 py-1 text-[11px] font-bold text-slate-200">
                        <ImageIcon size={13} className="text-emerald-400" />
                        JPG
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-600/80 bg-slate-950/70 px-2.5 py-1 text-[11px] font-bold text-slate-200">
                        <ImageIcon size={13} className="text-amber-400" />
                        PNG
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-600/80 bg-slate-950/70 px-2.5 py-1 text-[11px] font-bold text-slate-200">
                        <LinkedInMark />
                        LinkedIn PDF
                      </span>
                    </div>

                    <div className="relative z-10">
                      <div className="flex min-h-12 items-center justify-center gap-3 rounded-2xl bg-linear-to-r from-fuchsia-500 via-violet-500 to-blue-500 px-7 py-3 text-sm font-extrabold text-white shadow-[0_14px_32px_rgba(124,58,237,0.28)] transition-transform duration-300 group-hover:scale-[1.02] group-active:scale-[0.98] sm:min-w-72">
                        {isImporting ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                        {isImporting ? 'Parsing Document...' : 'Upload Resume'}
                      </div>
                    </div>

                    <div className="relative z-10 mt-4 flex items-center justify-center gap-2 text-xs font-medium text-slate-400">
                      <Lock size={14} />
                      Your files are secure and never shared.
                    </div>

                    <input
                      name="cv-upload-modal"
                      type="file"
                      accept=".pdf,image/*"
                      onChange={handleCVImport}
                      className="hidden"
                      id="cv-upload-modal"
                      data-testid="cv-upload-input"
                      disabled={isImporting}
                    />
                  </label>

                  {importMessage && (
                    <div className={`mt-4 rounded-2xl border p-3 text-center text-sm font-semibold shadow-sm ${
                      importMessage.type === 'success'
                        ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
                        : 'border-red-400/40 bg-red-500/10 text-red-200'
                    }`}>
                      {importMessage.text}
                    </div>
                  )}

                  <div className="mt-4 flex items-start gap-3 rounded-2xl border border-violet-400/25 bg-white/[0.05] p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/30 bg-violet-500/10 text-violet-300">
                      <Sparkles size={21} />
                    </div>
                    <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
                      <span className="font-bold text-white">We will extract your experience, skills, and education automatically.</span>
                      <br />
                      <span className="text-slate-400">You can review and edit everything before you finalize.</span>
                    </p>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 border-t border-slate-700/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 text-xs leading-relaxed text-slate-400 sm:text-sm">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-400/10">
                        <LinkedInMark />
                      </span>
                      <span>
                        <span className="font-bold text-slate-200">LinkedIn:</span> Profile &gt; More &gt; Save to PDF
                        <br />
                        Then upload it here to get started.
                      </span>
                    </div>
                    {!isImporting && (
                      <button
                        onClick={() => {
                          setShowUploadModal(false);
                        onImportSkipped?.();
                      }}
                        className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-600/80 bg-white/[0.03] px-6 text-sm font-extrabold text-slate-200 transition-colors hover:border-sky-300/80 hover:bg-sky-400/10 hover:text-white sm:min-w-40"
                      >
                        Skip for now
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
