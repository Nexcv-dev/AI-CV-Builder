import { motion } from 'motion/react';

export function BuilderLoadingOverlay({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed inset-0 flex flex-col items-center justify-center z-200 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}
    >
      <div className="relative mb-6">
        <div className={`w-20 h-20 border-4 border-t-violet-600 rounded-full animate-spin ${isDarkMode ? 'border-violet-900/60' : 'border-violet-100'}`}></div>
        <img src="/brand/faviconblack.svg" alt="NexCV" className="absolute inset-0 m-auto h-12 w-12 rounded-2xl" />
      </div>
      <h2 className={`text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r ${isDarkMode ? 'from-slate-100 to-violet-400' : 'from-slate-800 to-violet-600'}`}>
        NexCV
      </h2>
      <p className={`text-sm mt-2 font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Preparing your workspace...</p>
    </motion.div>
  );
}
