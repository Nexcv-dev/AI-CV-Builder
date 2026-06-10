import { AnimatePresence, motion } from 'motion/react';
import { Download } from 'lucide-react';

interface DownloadConfirmModalProps {
  downloadBlocked: boolean;
  downloadBlockedLabel: string;
  isDarkMode: boolean;
  isGeneratingPDF: boolean;
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DownloadConfirmModal({
  downloadBlocked,
  downloadBlockedLabel,
  isDarkMode,
  isGeneratingPDF,
  isOpen,
  onCancel,
  onConfirm,
}: DownloadConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
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
                  onClick={onConfirm}
                  disabled={isGeneratingPDF || downloadBlocked}
                  className="flex w-full items-center justify-center rounded-xl bg-violet-600 px-4 py-3.5 font-semibold text-white shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100"
                >
                  <Download size={18} className="mr-2" /> {downloadBlocked ? downloadBlockedLabel : 'Yes, Download PDF'}
                </button>
                <button
                  onClick={onCancel}
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
  );
}
