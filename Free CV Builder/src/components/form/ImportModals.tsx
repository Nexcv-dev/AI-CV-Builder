import React from 'react';
import { FileText, CloudUpload, Sparkles, Upload, Loader2, Info, CheckCircle, AlertCircle } from 'lucide-react';
import { MODAL_OVERLAY_CLASS, MODAL_CONTAINER_BASE } from './constants';

interface ImportModalsProps {
  showInitialPrompt: boolean;
  setShowInitialPrompt: (show: boolean) => void;
  showUploadModal: boolean;
  setShowUploadModal: (show: boolean) => void;
  isImporting: boolean;
  importMessage: { type: 'success' | 'error'; text: string } | null;
  handleCVImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isDarkMode?: boolean;
}

export const ImportModals = React.memo(({
  showInitialPrompt,
  setShowInitialPrompt,
  showUploadModal,
  setShowUploadModal,
  isImporting,
  importMessage,
  handleCVImport,
  isDarkMode
}: ImportModalsProps) => {
  return (
    <>
      {/* Initial Prompt Modal */}
      {showInitialPrompt && (
        <div className={MODAL_OVERLAY_CLASS}>
          <div className={`${MODAL_CONTAINER_BASE} bg-white w-full max-w-sm border-white/20 p-8`}>
            <div className="relative w-20 h-20 mx-auto mb-6 group">
              <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/20 to-fuchsia-500/20 rounded-full blur-xl scale-125 group-hover:scale-150 transition-transform duration-500 animate-pulse" />
              <div className="relative flex items-center justify-center w-full h-full bg-white/50 backdrop-blur-md border border-white/80 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] group-hover:shadow-[0_8px_30px_rgb(59,130,246,0.15)] group-hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/60 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                <FileText className="text-violet-600 w-9 h-9 drop-shadow-sm group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />
              </div>
            </div>
            <h3 className="text-xl font-bold text-center text-slate-800 mb-2">Do you have a CV?</h3>
            <p className="text-sm text-center text-gray-500 mb-8">
              If you have an existing resume, we can extract your data automatically to save time.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setShowInitialPrompt(false);
                  setShowUploadModal(true);
                }}
                className="w-full py-3.5 px-4 bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-600/20 flex items-center justify-center"
              >
                Yes, I have one
              </button>
              <button
                onClick={() => setShowInitialPrompt(false)}
                className="w-full py-3.5 px-4 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all border border-gray-200"
              >
                No, start from scratch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload CV Modal */}
      {showUploadModal && (
        <div className={MODAL_OVERLAY_CLASS}>
          <div className={`${MODAL_CONTAINER_BASE} w-full max-w-lg p-6 sm:p-8 ${isDarkMode ? 'bg-slate-900 border-slate-700/70' : 'bg-white border-white/20'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className={`text-xl font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Upload Resume</h3>
              <button onClick={() => setShowUploadModal(false)} className={`${isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-gray-400 hover:text-gray-600'}`}>
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>
            <div className="relative overflow-hidden">
              <label
                htmlFor="cv-upload-modal"
                className={`group relative flex flex-col items-center justify-center p-6 sm:p-10 rounded-2xl border-2 border-dashed transition-all duration-500 cursor-pointer ${isImporting
                  ? (isDarkMode ? 'border-slate-600 bg-slate-800/60 cursor-not-allowed' : 'border-gray-300 bg-gray-50 cursor-not-allowed')
                  : (isDarkMode
                    ? 'border-violet-500/70 bg-gradient-to-b from-slate-800/80 via-slate-900 to-violet-950/40 hover:border-violet-400 hover:shadow-lg hover:shadow-violet-900/30'
                    : 'border-violet-300 bg-gradient-to-b from-violet-50/60 via-white to-fuchsia-50/40 hover:border-violet-400 hover:from-violet-50 hover:via-white hover:to-fuchsia-50/60 hover:shadow-lg hover:shadow-violet-100/50')
                  }`}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-violet-100/40 to-transparent rounded-bl-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-violet-100/30 to-transparent rounded-tr-full pointer-events-none" />

                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/30 to-fuchsia-500/30 rounded-full blur-2xl scale-[2.5] group-hover:scale-[3] transition-transform duration-700 ease-out animate-pulse" />
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-400/40 to-violet-400/40 rounded-full blur-xl scale-150 group-hover:scale-[1.8] transition-transform duration-500" />

                  <div className="relative flex items-center justify-center w-20 h-20 bg-white/40 backdrop-blur-md border border-white/60 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] group-hover:shadow-[0_8px_30px_rgb(99,102,241,0.2)] group-hover:bg-white/60 transition-all duration-500 group-hover:-translate-y-2 group-hover:scale-110 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                    <CloudUpload className="text-violet-600 w-10 h-10 drop-shadow-md group-hover:scale-110 transition-transform duration-500" strokeWidth={1.5} />
                    <Sparkles className="absolute top-3 right-3 w-4 h-4 text-fuchsia-500 opacity-0 group-hover:opacity-100 group-hover:animate-bounce transition-opacity duration-300 delay-100" />
                    <Sparkles className="absolute bottom-3 left-3 w-3 h-3 text-violet-500 opacity-0 group-hover:opacity-100 group-hover:animate-bounce transition-opacity duration-300 delay-200" />
                  </div>
                </div>

                <h3 className={`text-lg sm:text-xl font-bold mb-2 relative z-10 ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>
                  {isImporting ? 'Processing your CV...' : 'Drop your CV here'}
                </h3>
                <p className={`text-sm mb-5 relative z-10 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  {isImporting ? 'AI is extracting your data' : 'or click to browse files'}
                </p>

                <div className="flex items-center gap-2 mb-5 relative z-10">
                  {['PDF', 'JPG', 'PNG'].map((format) => (
                    <span
                      key={format}
                      className={`px-3 py-1 text-[11px] font-semibold rounded-full border shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-gray-200 text-gray-500'}`}
                    >
                      {format}
                    </span>
                  ))}
                </div>

                <div className="relative z-10">
                  {isImporting ? (
                    <div className={`flex items-center gap-3 px-6 py-3 rounded-xl border shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
                      <Loader2 size={20} className="animate-spin text-violet-600" />
                      <span className={`text-sm font-semibold ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>Parsing Document...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-violet-200/50 group-hover:shadow-xl group-hover:shadow-violet-300/60 transition-all duration-300 group-hover:scale-[1.03] group-active:scale-[0.97]">
                      <Upload size={18} />
                      Upload CV
                    </div>
                  )}
                </div>

                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handleCVImport}
                  className="hidden"
                  id="cv-upload-modal"
                  data-testid="cv-upload-input"
                  disabled={isImporting}
                />
              </label>

              <p className={`text-center text-xs mt-4 flex items-center justify-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                <Info size={14} />
                AI will auto-fill all fields from your resume — or skip and fill manually
              </p>

              {importMessage && (
                <div className={`mt-5 p-4 rounded-xl text-sm flex items-center justify-center shadow-sm ${importMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                  {importMessage.type === 'success' ? (
                    <CheckCircle size={18} className="mr-2 shrink-0" />
                  ) : (
                    <AlertCircle size={18} className="mr-2 shrink-0" />
                  )}
                  <span className="font-medium text-center">{importMessage.text}</span>
                </div>
              )}
            </div>
            {!isImporting && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className={`px-6 py-2.5 text-sm font-bold rounded-xl border transition-all ${isDarkMode ? 'text-slate-300 border-slate-700 hover:text-slate-100 hover:bg-slate-800 hover:border-slate-600' : 'text-gray-600 border-gray-200 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300'}`}
                >
                  Skip for now
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
});
