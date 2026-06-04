import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Crown, Save, X, Zap } from 'lucide-react';
import type { UpgradePlan, UpgradePrompt } from './homeTypes';

interface UpgradePromptModalProps {
  isDarkMode: boolean;
  prompt: UpgradePrompt | null;
  savedCvLimitLabel: string;
  savedCvRemainingLabel: string;
  savedCvUsed: number;
  selectedPlan: UpgradePlan | null;
  onClose: () => void;
  onSelectedPlanChange: (plan: UpgradePlan) => void;
}

function MobileUpgradeActions({ plan, onClose }: { plan: UpgradePlan; onClose: () => void }) {
  return (
    <div className="mt-3 grid gap-2 sm:hidden">
      <Link
        to={plan === 'free' ? '/builder?import=1' : `/checkout?plan=${plan}`}
        onClick={onClose}
        className="inline-flex h-11 items-center justify-center rounded-xl bg-violet-600 px-4 text-sm font-black text-white shadow-lg shadow-violet-600/20 transition active:scale-[0.98]"
      >
        {plan === 'free' ? 'Get Started' : 'Choose this plan'}
      </Link>
    </div>
  );
}

export function UpgradePromptModal({
  isDarkMode,
  prompt,
  savedCvLimitLabel,
  savedCvRemainingLabel,
  savedCvUsed,
  selectedPlan,
  onClose,
  onSelectedPlanChange,
}: UpgradePromptModalProps) {
  return (
    <AnimatePresence>
      {prompt && (
        <motion.div
          className="fixed inset-0 z-110 flex items-end justify-center bg-slate-950/55 p-2 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <motion.div
            className={`relative flex max-h-[calc(100svh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border shadow-2xl sm:max-h-[calc(100svh-2rem)] sm:max-w-3xl sm:rounded-3xl ${isDarkMode ? 'bg-slate-900 border-violet-300/20 text-slate-100' : 'bg-white border-violet-100 text-slate-900'}`}
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 14 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-violet-600 via-fuchsia-500 to-sky-500" />
            <button
              type="button"
              onClick={onClose}
              className={`absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border transition active:scale-95 ${isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              aria-label="Close upgrade prompt"
            >
              <X size={16} />
            </button>

            <div className="overflow-y-auto px-4 pb-4 pt-5 sm:p-9">
              <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl border sm:mb-5 sm:h-14 sm:w-14 ${isDarkMode ? 'border-violet-300/25 bg-violet-400/10' : 'border-violet-100 bg-violet-50'}`}>
                <Crown className="h-6 w-6 text-violet-600 sm:h-7 sm:w-7" strokeWidth={1.8} />
              </div>
              <h3 className="pr-12 text-xl font-black tracking-tight sm:text-2xl">{prompt.title}</h3>
              <p className={`mt-2 max-w-xl text-sm font-semibold leading-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {prompt.message}
              </p>

              <div className={`mt-3 grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border p-3 sm:hidden ${isDarkMode ? 'border-emerald-300/20 bg-emerald-400/10' : 'border-emerald-100 bg-emerald-50'}`}>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isDarkMode ? 'bg-emerald-300/15 text-emerald-200' : 'bg-white text-emerald-600'}`}>
                  <Save size={18} />
                </div>
                <div className="min-w-0">
                  <p className={`text-[11px] font-black uppercase tracking-wide ${isDarkMode ? 'text-emerald-100/75' : 'text-emerald-700'}`}>Saved CVs</p>
                  <p className={`truncate text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{savedCvRemainingLabel}</p>
                </div>
                <div className={`text-right text-2xl font-black tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                  {savedCvUsed}<span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>/{savedCvLimitLabel}</span>
                </div>
              </div>

              <div className="mt-4 grid gap-2.5 sm:mt-7 sm:grid-cols-4 sm:gap-4">
                <div className="flex flex-col h-full">
                  <button
                    type="button"
                    onClick={() => onSelectedPlanChange('free')}
                    className={`w-full h-full min-h-[14.75rem] flex flex-col text-left transition active:scale-[0.99] sm:pointer-events-none sm:rounded-2xl sm:p-5 rounded-xl border p-3 ${selectedPlan === 'free' ? 'ring-2 ring-violet-500/40' : ''} ${isDarkMode ? 'border-slate-700 bg-slate-950/45' : 'border-slate-200 bg-slate-50'}`}
                  >
                    <div className="text-sm font-black">Free</div>
                    <div className="mt-1.5 flex items-baseline gap-1.5 whitespace-nowrap font-black sm:mt-2">
                      <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">LKR</span>
                      <span className="text-xl sm:text-2xl">0</span>
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">Starter access • Free forever</div>
                    <p className={`mt-2 text-xs font-semibold leading-5 flex-1 sm:mt-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>1 saved CV, 1 watermarked download.</p>
                  </button>
                  {selectedPlan === 'free' && <MobileUpgradeActions plan="free" onClose={onClose} />}
                </div>
                <div className="flex flex-col h-full">
                  <button
                    type="button"
                    onClick={() => onSelectedPlanChange('payg')}
                    className={`w-full h-full min-h-[14.75rem] flex flex-col text-left ring-2 ring-violet-500/40 transition active:scale-[0.99] sm:pointer-events-none sm:rounded-2xl sm:p-5 rounded-xl border p-3 ${isDarkMode ? 'border-violet-300/30 bg-violet-400/10' : 'border-violet-200 bg-violet-50'}`}
                  >
                    <div className="flex items-center gap-2 text-sm font-black"><Zap size={15} className="text-violet-600" /> Single CV Pass</div>
                    <div className="mt-1.5 flex items-baseline gap-1.5 whitespace-nowrap font-black sm:mt-2">
                      <span className="text-[11px] uppercase tracking-wide text-violet-300/90">LKR</span>
                      <span className="text-xl sm:text-2xl">499</span>
                    </div>
                    <div className="text-[10px] font-bold text-violet-400/90 dark:text-violet-300/90 mt-0.5">7 days access • One-time payment</div>
                    <p className={`mt-2 text-xs font-semibold leading-5 flex-1 sm:mt-3 ${isDarkMode ? 'text-violet-100/75' : 'text-violet-900/65'}`}>1 extra CV, any template, unlimited edits, and faster PDF downloads for 7 days.</p>
                  </button>
                  {selectedPlan === 'payg' && <MobileUpgradeActions plan="payg" onClose={onClose} />}
                </div>
                <div className="flex flex-col h-full">
                  <button
                    type="button"
                    onClick={() => onSelectedPlanChange('monthly')}
                    className={`w-full h-full min-h-[14.75rem] flex flex-col text-left transition active:scale-[0.99] sm:pointer-events-none sm:rounded-2xl sm:p-5 rounded-xl border p-3 ${selectedPlan === 'monthly' ? 'ring-2 ring-violet-500/40' : ''} ${isDarkMode ? 'border-slate-700 bg-slate-950/45' : 'border-slate-200 bg-white'}`}
                  >
                    <div className="text-sm font-black">Monthly Pro</div>
                    <div className="mt-1.5 flex items-baseline gap-1.5 whitespace-nowrap font-black sm:mt-2">
                      <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">LKR</span>
                      <span className="text-xl sm:text-2xl">2199</span>
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">30 days access • One-time payment</div>
                    <p className={`mt-2 text-xs font-semibold leading-5 flex-1 sm:mt-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Unlimited CV creation, saves, faster PDF downloads, and AI features.</p>
                  </button>
                  {selectedPlan === 'monthly' && <MobileUpgradeActions plan="monthly" onClose={onClose} />}
                </div>
                <div className="flex flex-col h-full">
                  <button
                    type="button"
                    onClick={() => onSelectedPlanChange('quarterly')}
                    className={`w-full h-full min-h-[14.75rem] flex flex-col text-left transition active:scale-[0.99] sm:pointer-events-none sm:rounded-2xl sm:p-5 rounded-xl border p-3 ${selectedPlan === 'quarterly' ? 'ring-2 ring-violet-500/40' : ''} ${isDarkMode ? 'border-emerald-300/30 bg-emerald-400/10' : 'border-emerald-200 bg-emerald-50'}`}
                  >
                    <div className="text-sm font-black">Pro Quarterly</div>
                    <div className="mt-1.5 flex items-baseline gap-1.5 whitespace-nowrap font-black sm:mt-2">
                      <span className="text-[11px] uppercase tracking-wide text-emerald-300">LKR</span>
                      <span className="text-xl sm:text-2xl">4999</span>
                    </div>
                    <div className="text-[10px] font-bold text-emerald-500 dark:text-emerald-300 mt-0.5">90 days access &bull; Most popular</div>
                    <p className={`mt-2 text-xs font-semibold leading-5 flex-1 sm:mt-3 ${isDarkMode ? 'text-emerald-100/75' : 'text-emerald-950/65'}`}>Unlimited CV creation, saves, downloads, and AI tools for a focused job search.</p>
                  </button>
                  {selectedPlan === 'quarterly' && <MobileUpgradeActions plan="quarterly" onClose={onClose} />}
                </div>
              </div>

              <div className="mt-6 hidden gap-3 sm:flex sm:flex-row">
                <Link
                  to="/pricing"
                  onClick={onClose}
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-violet-600 px-4 text-sm font-black text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-700 active:scale-[0.98]"
                >
                  View upgrade options
                </Link>
                <button
                  type="button"
                  onClick={onClose}
                  className={`inline-flex h-12 flex-1 items-center justify-center rounded-xl border px-4 text-sm font-black transition active:scale-[0.98] ${isDarkMode ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                >
                  Continue editing
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
