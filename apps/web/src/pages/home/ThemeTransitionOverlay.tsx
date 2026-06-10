import { motion } from 'motion/react';
import type { ThemeTransitionState } from './homeTypes';

interface ThemeTransitionOverlayProps {
  transition: ThemeTransitionState | null;
  onComplete: () => void;
}

export function ThemeTransitionOverlay({ transition, onComplete }: ThemeTransitionOverlayProps) {
  if (!transition) return null;

  return (
    <motion.div
      key={transition.key}
      className="fixed inset-0 pointer-events-none z-120 overflow-hidden"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={onComplete}
    >
      <motion.div
        className={`absolute rounded-full ${transition.targetDark ? 'bg-slate-950' : 'bg-slate-50'}`}
        style={{
          left: transition.x,
          top: transition.y,
          width: Math.hypot(window.innerWidth, window.innerHeight) * 2,
          height: Math.hypot(window.innerWidth, window.innerHeight) * 2,
          transform: 'translate(-50%, -50%)',
        }}
        initial={{ scale: 0, opacity: 0.9 }}
        animate={{ scale: 1, opacity: 0 }}
        transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
      />
    </motion.div>
  );
}
