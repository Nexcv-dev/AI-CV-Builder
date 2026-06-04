import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface DownloadErrorModalProps {
  error: { title: string; message: string } | null;
  isDarkMode: boolean;
  onDismiss: () => void;
  onRetry: () => void;
}

export function DownloadErrorModal({ error, isDarkMode, onDismiss, onRetry }: DownloadErrorModalProps) {
  return (
    <AnimatePresence>
      {error && (
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
            <div className="absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-red-500 via-rose-500 to-orange-500" />

            <div className="p-7 pt-8">
              <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border shadow-sm ${isDarkMode ? 'bg-red-500/10 border-red-400/20' : 'bg-red-50 border-red-100'}`}>
                <AlertCircle className="h-8 w-8 text-red-500" strokeWidth={1.7} />
              </div>

              <h3 className="mb-2 text-center text-xl font-bold tracking-tight">{error.title}</h3>

              <p className={`mb-7 text-center text-sm leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {error.message}
              </p>

              <div className={`mb-6 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-xs font-medium ${isDarkMode ? 'border-slate-700 bg-slate-800 text-slate-400' : 'border-slate-100 bg-slate-50 text-slate-500'}`}>
                <AlertCircle size={13} className="mt-0.5 shrink-0 text-amber-400" />
                <span>If this keeps happening, try switching templates or reducing image size before downloading.</span>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={onRetry}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition-all hover:bg-red-700 active:scale-[0.98]"
                >
                  <RotateCcw size={16} /> Try Again
                </button>
                <button
                  onClick={onDismiss}
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
  );
}
