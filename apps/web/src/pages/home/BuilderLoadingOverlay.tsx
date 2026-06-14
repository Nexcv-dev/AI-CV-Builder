import { motion } from 'motion/react';

export function BuilderLoadingOverlay({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed inset-0 z-200 flex items-center justify-center ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}
      role="status"
      aria-label="Loading NexCV builder"
    >
      <div className="relative flex h-24 w-24 items-center justify-center">
        <div className={`absolute inset-0 animate-spin rounded-full border-4 border-t-violet-600 ${isDarkMode ? 'border-violet-900/60' : 'border-violet-100'}`} />
        <div className="absolute inset-2 animate-pulse rounded-full bg-violet-500/10 blur-md" />
        <img
          src="/brand/faviconblack.svg"
          alt=""
          className="relative h-14 w-14 rounded-2xl drop-shadow-[0_12px_24px_rgba(124,58,237,0.35)]"
        />
      </div>
    </motion.div>
  );
}
