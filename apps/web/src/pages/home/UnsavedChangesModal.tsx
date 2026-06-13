import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Loader2, Save, Trash2 } from 'lucide-react';

interface UnsavedChangesModalProps {
  isDarkMode: boolean;
  isOpen: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onDiscard: () => void;
  onSaveDraft: () => void;
}

export function UnsavedChangesModal({
  isDarkMode,
  isOpen,
  isSaving,
  onCancel,
  onDiscard,
  onSaveDraft,
}: UnsavedChangesModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="unsaved-changes-title"
            className={`w-full max-w-md overflow-hidden rounded-3xl border p-6 shadow-2xl ${
              isDarkMode
                ? 'border-slate-700 bg-slate-900 text-slate-100'
                : 'border-slate-200 bg-white text-slate-900'
            }`}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
          >
            <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${
              isDarkMode ? 'bg-amber-400/10 text-amber-300' : 'bg-amber-50 text-amber-600'
            }`}>
              <AlertTriangle size={28} />
            </div>
            <h2 id="unsaved-changes-title" className="text-xl font-black">Save your draft?</h2>
            <p className={`mt-2 text-sm font-semibold leading-6 ${
              isDarkMode ? 'text-slate-400' : 'text-slate-600'
            }`}>
              You have unsaved changes. Save them as a draft before leaving, or discard them.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={onSaveDraft}
                disabled={isSaving}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-extrabold text-white transition hover:bg-violet-500 disabled:opacity-60"
              >
                {isSaving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
                {isSaving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                type="button"
                onClick={onDiscard}
                disabled={isSaving}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-red-500/10 px-4 text-sm font-extrabold text-red-500 transition hover:bg-red-500/20 disabled:opacity-60"
              >
                <Trash2 size={17} />
                Discard
              </button>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className={`mt-3 min-h-11 w-full rounded-xl border px-4 text-sm font-extrabold transition disabled:opacity-60 ${
                isDarkMode
                  ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Stay on this page
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
