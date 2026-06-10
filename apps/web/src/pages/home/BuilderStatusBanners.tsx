import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, Clock3, X } from 'lucide-react';
import type { AuthUser } from '../../utils/api';

interface PlanExpiryReminder {
  planName: string;
  daysLeft: number;
  expiresAt: string;
  renewalPlan: string;
}

interface BuilderStatusBannersProps {
  currentUser: AuthUser | null;
  isDarkMode: boolean;
  isPopupVisible: boolean;
  planExpiryReminder: PlanExpiryReminder | null;
  verificationBannerDismissed: boolean;
  onDismissVerificationBanner: () => void;
  onOpenVerificationModal: () => void;
}

export function BuilderStatusBanners({
  currentUser,
  isDarkMode,
  isPopupVisible,
  planExpiryReminder,
  verificationBannerDismissed,
  onDismissVerificationBanner,
  onOpenVerificationModal,
}: BuilderStatusBannersProps) {
  return (
    <AnimatePresence initial={false}>
      {!isPopupVisible && planExpiryReminder && (
        <motion.div
          key="builder-plan-expiry-banner"
          className="shrink-0 overflow-hidden print:hidden"
          initial={{ height: 0, opacity: 0, y: -8 }}
          animate={{ height: 'auto', opacity: 1, y: 0 }}
          exit={{ height: 0, opacity: 0, y: -8 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
        >
          <div className="px-3 py-2 sm:px-4">
            <div className={`mx-auto grid max-w-xl gap-2 rounded-2xl border py-2.5 pl-3 pr-3 shadow-lg sm:flex sm:max-w-2xl sm:items-center sm:justify-between sm:gap-3 sm:px-4 ${isDarkMode ? 'border-violet-300/20 bg-violet-950/80 shadow-black/20' : 'border-violet-200 bg-violet-50 shadow-violet-900/5'}`}>
              <div className="flex min-w-0 items-start gap-2 sm:items-center">
                <Clock3 size={17} className={`mt-0.5 shrink-0 sm:mt-0 ${isDarkMode ? 'text-violet-200' : 'text-violet-700'}`} />
                <p className={`text-xs font-extrabold leading-5 sm:text-sm ${isDarkMode ? 'text-violet-100' : 'text-violet-950'}`}>
                  Your {planExpiryReminder.planName} plan expires in {planExpiryReminder.daysLeft} day{planExpiryReminder.daysLeft === 1 ? '' : 's'} on {planExpiryReminder.expiresAt}.
                </p>
              </div>
              <Link
                to={`/checkout?plan=${planExpiryReminder.renewalPlan}`}
                className={`inline-flex h-8 shrink-0 items-center justify-center rounded-full px-3 text-[11px] font-extrabold transition active:scale-95 sm:h-9 sm:px-4 sm:text-xs ${isDarkMode ? 'bg-violet-300 text-slate-950 hover:bg-violet-200' : 'bg-violet-600 text-white hover:bg-violet-500'}`}
              >
                Renew plan
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {!isPopupVisible && currentUser && !currentUser.emailVerified && !verificationBannerDismissed && (
        <motion.div
          key="verify-email-banner"
          className="shrink-0 overflow-hidden print:hidden"
          initial={{ height: 0, opacity: 0, y: -8 }}
          animate={{ height: 'auto', opacity: 1, y: 0 }}
          exit={{ height: 0, opacity: 0, y: -8 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
        >
          <div className="px-3 py-2 sm:px-4">
            <div className={`relative mx-auto grid max-w-xl gap-2 rounded-2xl border py-2.5 pl-3 pr-12 shadow-lg sm:flex sm:max-w-2xl sm:items-center sm:justify-between sm:gap-3 sm:px-4 ${isDarkMode ? 'border-amber-300/20 bg-amber-950/80 shadow-black/20' : 'border-amber-200 bg-amber-50 shadow-amber-900/5'}`}>
              <div className="flex min-w-0 items-start gap-2 sm:items-center">
                <AlertCircle size={17} className={`mt-0.5 shrink-0 sm:mt-0 ${isDarkMode ? 'text-amber-300' : 'text-amber-600'}`} />
                <p className={`text-xs font-extrabold leading-5 sm:text-sm ${isDarkMode ? 'text-amber-100' : 'text-amber-900'}`}>
                  Verify your email to save and download.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenVerificationModal}
                  className={`inline-flex h-8 shrink-0 items-center justify-center rounded-full px-3 text-[11px] font-extrabold transition active:scale-95 disabled:opacity-70 sm:h-9 sm:px-4 sm:text-xs ${isDarkMode ? 'bg-amber-300 text-slate-950 hover:bg-amber-200' : 'bg-amber-600 text-white hover:bg-amber-500'}`}
                >
                  Verify
                </button>
                <button
                  type="button"
                  onClick={onDismissVerificationBanner}
                  className={`absolute right-2 top-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition active:scale-95 sm:static sm:h-9 sm:w-9 ${isDarkMode ? 'border-amber-200/20 text-amber-100 hover:bg-amber-200/10' : 'border-amber-700/20 text-amber-900 hover:bg-amber-100'}`}
                  aria-label="Dismiss verification banner"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
