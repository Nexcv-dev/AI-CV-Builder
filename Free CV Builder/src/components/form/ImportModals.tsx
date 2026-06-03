import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, FileUp, Upload, Loader2 } from 'lucide-react';
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
                className={`${MODAL_CONTAINER_BASE} ${modalSurface} max-w-lg p-6 sm:p-7 ${isDarkMode ? 'bg-slate-900 border-slate-700/80 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={modalTransition}
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-violet-600 via-fuchsia-500 to-sky-500" />
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold">Upload Resume or LinkedIn PDF</h3>
                    <p className={`mt-1 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>PDF, JPG, or PNG. OCR handles basic import, with AI cleanup on paid plans.</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      onImportSkipped?.();
                    }}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border text-xl leading-none transition-colors ${isDarkMode ? 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-100' : 'border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700'}`}
                    aria-label="Close upload modal"
                  >
                    &times;
                  </button>
                </div>
                <div className="relative overflow-hidden">
                  <label
                    htmlFor="cv-upload-modal"
                    className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 transition-all duration-300 sm:p-9 ${isImporting
                      ? (isDarkMode ? 'border-slate-600 bg-slate-800/70 cursor-not-allowed' : 'border-slate-300 bg-slate-50 cursor-not-allowed')
                      : (isDarkMode
                        ? 'border-violet-500/70 bg-slate-800/60 hover:border-violet-400 hover:bg-slate-800'
                        : 'border-violet-300 bg-violet-50/50 hover:border-violet-400 hover:bg-violet-50')
                      }`}
                  >
                    <div className={`${iconShell} mb-5 ${isDarkMode ? 'bg-violet-500/10 border-violet-400/30' : 'bg-white border-violet-100'}`}>
                      <FileUp className="h-8 w-8 text-violet-600" strokeWidth={1.8} />
                    </div>

                    <h3 className="relative z-10 mb-2 text-lg font-bold sm:text-xl">
                      {isImporting ? 'Processing your CV...' : 'Drop your CV here'}
                    </h3>
                    <p className={`relative z-10 mb-5 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {isImporting ? 'Reading and matching CV sections' : 'or click to browse files'}
                    </p>

                    <div className="flex items-center gap-2 mb-5 relative z-10">
                      {['PDF', 'JPG', 'PNG'].map((format) => (
                        <span
                          key={format}
                          className={`px-3 py-1 text-[11px] font-semibold rounded-full border shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-gray-200 text-gray-500'}`}
                        >
                          {format}
                        </span>
                      ))}
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold rounded-full border shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-gray-200 text-gray-500'}`}>
                        <LinkedInMark />
                        LinkedIn PDF
                      </span>
                    </div>

                    <div className="relative z-10">
                      {isImporting ? (
                        <div className={`flex items-center gap-3 px-6 py-3 rounded-xl border shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
                          <Loader2 size={20} className="animate-spin text-violet-600" />
                          <span className={`text-sm font-semibold ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>Parsing Document...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-8 py-3 bg-linear-to-r from-violet-600 via-fuchsia-600 to-violet-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-violet-200/50 group-hover:shadow-xl group-hover:shadow-violet-300/60 transition-all duration-300 group-hover:scale-[1.03] group-active:scale-[0.97]">
                          <Upload size={18} />
                          Upload CV
                        </div>
                      )}
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

                  <p className={`text-center text-xs mt-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                    LinkedIn: Profile &gt; More &gt; Save to PDF, then upload it here
                  </p>

                  {importMessage && (
                    <div className={`mt-5 p-4 rounded-xl text-sm text-center font-medium shadow-sm border ${
                      importMessage.type === 'success'
                        ? (isDarkMode ? 'bg-green-900/30 text-green-300 border-green-700/50' : 'bg-green-50 text-green-700 border-green-200')
                        : (isDarkMode ? 'bg-red-900/30 text-red-300 border-red-700/50' : 'bg-red-50 text-red-700 border-red-200')
                    }`}>
                      {importMessage.text}
                    </div>
                  )}
                </div>
                {!isImporting && (
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => {
                        setShowUploadModal(false);
                        onImportSkipped?.();
                      }}
                      className={`px-6 py-2.5 text-sm font-bold rounded-xl border transition-all ${isDarkMode ? 'text-slate-300 border-slate-700 hover:text-slate-100 hover:bg-slate-800 hover:border-slate-600' : 'text-gray-600 border-gray-200 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300'}`}
                    >
                      Skip for now
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
