import { AnimatePresence, motion } from 'motion/react';
import { FileText } from 'lucide-react';

export function PdfLoadingOverlay({
  isDarkMode,
  isGeneratingPDF,
}: {
  isDarkMode: boolean;
  isGeneratingPDF: boolean;
}) {
  return (
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
  );
}
