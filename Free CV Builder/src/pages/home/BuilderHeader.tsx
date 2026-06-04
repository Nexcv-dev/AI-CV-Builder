import type { MouseEvent } from 'react';
import type { AuthUser } from '../../utils/api';
import { AccountMenu } from '../../components/AccountMenu';
import { CheckCircle2, FileText, LayoutTemplate, Loader2, LogIn, Moon, Save, Sun } from 'lucide-react';

interface BuilderHeaderProps {
  authLoaded: boolean;
  cloudSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  currentUser: AuthUser | null;
  isDarkMode: boolean;
  isPopupVisible: boolean;
  mobileView: 'edit' | 'preview';
  onCloudSave: () => void;
  onLogin: () => void;
  onMobileViewChange: (view: 'edit' | 'preview') => void;
  onThemeToggle: (event: MouseEvent<HTMLButtonElement>) => void;
}

export function BuilderHeader({
  authLoaded,
  cloudSaveStatus,
  currentUser,
  isDarkMode,
  isPopupVisible,
  mobileView,
  onCloudSave,
  onLogin,
  onMobileViewChange,
  onThemeToggle,
}: BuilderHeaderProps) {
  return (
    <header
      aria-hidden={isPopupVisible}
      className={`border-b flex flex-col lg:flex-row items-center justify-between px-4 py-3 lg:px-8 lg:py-4 shrink-0 z-50 print:hidden gap-3 lg:gap-0 sticky top-0 shadow-sm transition-[opacity,background-color,border-color] duration-300 ${isPopupVisible ? 'pointer-events-none opacity-0' : 'opacity-100'} ${isDarkMode ? 'bg-slate-900 border-slate-700/70' : 'bg-white border-gray-200/80'}`}
    >
      <div className="flex items-center justify-between w-full lg:w-auto">
        <h1 className="text-lg lg:text-2xl font-extrabold flex items-center">
          <div className={`p-1.5 rounded-xl mr-2.5 lg:mr-3 shadow-md transition-colors duration-500 ${isDarkMode ? 'bg-slate-800 shadow-black/20 ring-1 ring-slate-700' : 'bg-white shadow-violet-600/10 ring-1 ring-violet-100'}`}>
            <img src="/brand/faviconblack.svg" alt="" className="h-6 w-6 rounded-lg lg:h-7 lg:w-7" />
          </div>
          <div className="flex flex-col justify-center">
            <span className={`bg-clip-text text-transparent bg-linear-to-r leading-tight ${isDarkMode ? 'from-slate-100 to-violet-400' : 'from-slate-800 to-violet-600'}`}>
              NexCV
            </span>
          </div>
        </h1>
        <div className="lg:hidden flex items-center gap-2">
          {!authLoaded ? (
            <div
              className={`h-10 w-10 rounded-full border shadow-lg ${isDarkMode ? 'border-slate-700 bg-slate-800 shadow-black/20' : 'border-gray-200 bg-white shadow-slate-900/10'}`}
              aria-hidden="true"
            />
          ) : currentUser ? (
            <AccountMenu isDarkMode={isDarkMode} size="sm" displayName={currentUser.displayName} profileImage={currentUser.profileImage} />
          ) : (
            <button
              type="button"
              onClick={onLogin}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-lg transition-all active:scale-95 ${isDarkMode ? 'border-slate-700 bg-slate-800 text-slate-200 shadow-black/20 hover:bg-slate-700' : 'border-gray-200 bg-white text-slate-700 shadow-slate-900/10 hover:bg-gray-100'}`}
              aria-label="Login"
            >
              <LogIn size={15} />
            </button>
          )}
          <button
            onClick={onThemeToggle}
            data-keep-builder-dropdown-open="true"
            className={`flex h-10 w-10 items-center justify-center rounded-full border shadow-lg transition-all active:scale-95 ${isDarkMode ? 'border-slate-700 bg-slate-800 text-slate-200 shadow-black/20 hover:bg-slate-700' : 'border-gray-200 bg-white text-slate-700 shadow-slate-900/10 hover:bg-gray-100'}`}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      <div className={`lg:hidden flex p-1 rounded-2xl w-full max-w-sm mx-auto border shadow-inner transition-colors duration-500 ${isDarkMode ? 'bg-slate-800/70 border-slate-700/70' : 'bg-gray-100/50 border-gray-200/40'}`}>
        <button
          onClick={() => onMobileViewChange('edit')}
          className={`flex-1 flex items-center justify-center py-2 px-4 text-sm font-semibold rounded-xl transition-all duration-300 ${mobileView === 'edit' ? (isDarkMode ? 'bg-slate-700 text-violet-300 shadow-sm ring-1 ring-violet-200/10 scale-100' : 'bg-white text-violet-600 shadow-sm ring-1 ring-slate-800/5 scale-100') : (isDarkMode ? 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/80 scale-95' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 scale-95')}`}
        >
          <FileText size={16} className="mr-2" />
          Edit
        </button>
        <button
          onClick={() => onMobileViewChange('preview')}
          className={`flex-1 flex items-center justify-center py-2 px-4 text-sm font-semibold rounded-xl transition-all duration-300 ${mobileView === 'preview' ? (isDarkMode ? 'bg-slate-700 text-violet-300 shadow-sm ring-1 ring-violet-200/10 scale-100' : 'bg-white text-violet-600 shadow-sm ring-1 ring-slate-800/5 scale-100') : (isDarkMode ? 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/80 scale-95' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 scale-95')}`}
        >
          <LayoutTemplate size={16} className="mr-2" />
          Preview
        </button>
      </div>

      <div className="hidden lg:flex items-center gap-2">
        {currentUser && (
          <button
            onClick={onCloudSave}
            disabled={cloudSaveStatus === 'saving'}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-500 active:scale-95 disabled:opacity-70"
            aria-label="Save CV"
          >
            {cloudSaveStatus === 'saving' ? (
              <Loader2 size={18} className="animate-spin" />
            ) : cloudSaveStatus === 'saved' ? (
              <CheckCircle2 size={18} />
            ) : (
              <Save size={18} />
            )}
          </button>
        )}
        {!authLoaded ? (
          <div
            className={`h-12 w-12 rounded-full border shadow-lg ${isDarkMode ? 'border-slate-700 bg-slate-800 shadow-black/20' : 'border-gray-200 bg-white shadow-slate-900/10'}`}
            aria-hidden="true"
          />
        ) : currentUser ? (
          <AccountMenu isDarkMode={isDarkMode} displayName={currentUser.displayName} profileImage={currentUser.profileImage} showName />
        ) : (
          <button
            type="button"
            onClick={onLogin}
            className={`inline-flex h-12 items-center justify-center gap-2 rounded-full border px-4 text-sm font-extrabold shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:scale-95 ${isDarkMode ? 'border-slate-700 bg-slate-800 text-slate-200 shadow-black/20 hover:bg-slate-700' : 'border-gray-200 bg-white text-slate-700 shadow-slate-900/10 hover:bg-gray-100'}`}
          >
            <LogIn size={17} />
            Login
          </button>
        )}
        <button
          onClick={onThemeToggle}
          data-keep-builder-dropdown-open="true"
          className={`flex h-12 w-12 items-center justify-center rounded-full border shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:scale-95 ${isDarkMode ? 'border-slate-700 bg-slate-800 text-slate-200 shadow-black/20 hover:bg-slate-700' : 'border-gray-200 bg-white text-slate-700 shadow-slate-900/10 hover:bg-gray-100'}`}
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
}
