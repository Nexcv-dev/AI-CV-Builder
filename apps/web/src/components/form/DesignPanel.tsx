import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Palette, Upload, ChevronDown, Check, Image as ImageIcon, MoveHorizontal, MoveVertical, Layout, Type, RotateCcw, Loader2 } from 'lucide-react';
import { getTemplateSurfaceColorFallback, getTemplateSurfaceColorLabel } from '../../templates';
import { resolveTemplateSurfaceColorForData, resolveTemplateThemeColor, resolveTemplateThemeColorForData } from '@nexcv/templates/templateData';
import { useBuilderStore } from '../../stores/useBuilderStore';
import { fonts, DESIGN_CARD_CLASS, DESIGN_CARD_LIGHT, DESIGN_CARD_DARK, DESIGN_SECTION_TITLE_CLASS, DESIGN_ICON_CLASS } from './constants';

interface DesignPanelProps {
  templateDefaultThemeColor?: string;
  isDarkMode?: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isImageUploading?: boolean;
}

export const DesignPanel = React.memo(({ templateDefaultThemeColor, isDarkMode, fileInputRef, onImageUpload, isImageUploading = false }: DesignPanelProps) => {
  const cvData = useBuilderStore((state) => state.cvData);
  const setCvData = useBuilderStore((state) => state.setCvData);
  const template = useBuilderStore((state) => state.template);
  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
  const fontDropdownRef = useRef<HTMLDivElement>(null);
  const templateSurfaceColorLabel = getTemplateSurfaceColorLabel(template);
  const defaultThemeColor = resolveTemplateThemeColor(template, templateDefaultThemeColor || '#000000');
  const themeColor = resolveTemplateThemeColorForData(template, cvData, defaultThemeColor);
  const templateSurfaceFallback = getTemplateSurfaceColorFallback(template, {
    themeColor,
    sidebarColor: cvData.sidebarColor,
  });
  const templateSurfaceColor = resolveTemplateSurfaceColorForData(template, cvData, templateSurfaceFallback);
  const canResetThemeColor =
    themeColor.toLowerCase() !== defaultThemeColor.toLowerCase() ||
    Boolean(cvData.templateThemeColors?.[template]) ||
    Boolean(cvData.templateSurfaceColors?.[template]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (target?.closest('[data-keep-builder-dropdown-open="true"]')) {
        return;
      }

      if (fontDropdownRef.current && !fontDropdownRef.current.contains(event.target as Node)) {
        setIsFontDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleThemeChange = (field: 'themeColor' | 'fontFamily' | 'sidebarColor' | 'templateSurfaceColor', value: string) => {
    setCvData((prev) => ({ ...prev, [field]: value }));
  };

  const handleThemeColorChange = (value: string) => {
    setCvData((prev) => ({
      ...prev,
      themeColor: value,
      templateThemeColors: {
        ...(prev.templateThemeColors || {}),
        [template]: value,
      },
    }));
  };

  const handleTemplateSurfaceColorChange = (value: string) => {
    setCvData((prev) => ({
      ...prev,
      templateSurfaceColor: value,
      templateSurfaceColors: {
        ...(prev.templateSurfaceColors || {}),
        [template]: value,
      },
      sidebarColor: template === 'modern' ? value : prev.sidebarColor,
    }));
  };

  const handleResetTemplateColors = () => {
    setCvData((prev) => ({
      ...prev,
      themeColor: defaultThemeColor,
      templateThemeColors: Object.fromEntries(Object.entries(prev.templateThemeColors || {}).filter(([key]) => key !== template)),
      templateSurfaceColor: undefined,
      templateSurfaceColors: Object.fromEntries(Object.entries(prev.templateSurfaceColors || {}).filter(([key]) => key !== template)),
    }));
  };

  return (
    <div className="animate-in fade-in duration-300 space-y-6 flex flex-col flex-1">
      {/* Profile Picture */}
      <div className={`${DESIGN_CARD_CLASS} ${isDarkMode ? DESIGN_CARD_DARK : DESIGN_CARD_LIGHT}`} aria-busy={isImageUploading}>
        <div className="flex items-center mb-4">
          <ImageIcon size={20} className={DESIGN_ICON_CLASS} />
          <h3 className={DESIGN_SECTION_TITLE_CLASS}>Profile Picture</h3>
        </div>
        <div className="flex flex-col space-y-5">
          <div className="flex items-center space-x-5">
            <div className="relative w-24 h-24 shrink-0">
              {cvData.profileImage ? (
                <div className="w-full h-full rounded-full overflow-hidden border-2 border-gray-200 shadow-sm flex items-center justify-center bg-white">
                  <img src={cvData.profileImage} alt="Profile" className="w-full h-full object-cover" style={{ transform: `scale(${cvData.imageZoom || 1}) translate(${cvData.imageX || 0}px, ${cvData.imageY || 0}px)` }} />
                </div>
              ) : (
                <div className="w-full h-full rounded-full bg-white border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400"><Upload size={24} /></div>
              )}
              {isImageUploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-900/65 text-white" aria-hidden="true">
                  <Loader2 size={28} className="animate-spin" />
                </div>
              )}
            </div>
            <div className="flex flex-col space-y-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImageUploading}
                className="inline-flex items-center justify-center gap-2 text-sm px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium transition-colors shadow-sm disabled:cursor-wait disabled:opacity-70"
              >
                {isImageUploading ? 'Uploading...' : cvData.profileImage ? 'Change Photo' : 'Upload Photo'}
              </button>
              {cvData.profileImage && (<button type="button" disabled={isImageUploading} onClick={() => setCvData(prev => ({ ...prev, profileImage: '' }))} className="text-sm text-red-500 hover:text-red-700 font-medium text-left px-1 disabled:cursor-not-allowed disabled:opacity-50">Remove</button>)}
            </div>
            <input id="profileImageUpload" name="profileImageUpload" type="file" ref={fileInputRef} onChange={onImageUpload} accept="image/*" disabled={isImageUploading} className="hidden" aria-label="Upload profile picture" />
          </div>
          <p className="sr-only" role="status" aria-live="polite">{isImageUploading ? 'Profile photo is uploading.' : ''}</p>
          {cvData.profileImage && (
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <div>
                <div className="flex justify-between mb-1"><label htmlFor="imageZoom" className="text-xs font-medium text-gray-600 uppercase tracking-wider">Zoom</label><span className="text-xs text-gray-500">{cvData.imageZoom || 1}x</span></div>
                <input id="imageZoom" name="imageZoom" type="range" min="0.5" max="3" step="0.1" value={cvData.imageZoom || 1} onChange={(e) => setCvData(prev => ({ ...prev, imageZoom: parseFloat(e.target.value) }))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between mb-1"><label htmlFor="imageX" className="text-xs font-medium text-gray-600 uppercase tracking-wider">Position X</label><span className="text-xs text-gray-500">{cvData.imageX || 0}px</span></div>
                  <input id="imageX" name="imageX" type="range" min="-100" max="100" step="1" value={cvData.imageX || 0} onChange={(e) => setCvData(prev => ({ ...prev, imageX: parseInt(e.target.value) }))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                </div>
                <div>
                  <div className="flex justify-between mb-1"><label htmlFor="imageY" className="text-xs font-medium text-gray-600 uppercase tracking-wider">Position Y</label><span className="text-xs text-gray-500">{cvData.imageY || 0}px</span></div>
                  <input id="imageY" name="imageY" type="range" min="-100" max="100" step="1" value={cvData.imageY || 0} onChange={(e) => setCvData(prev => ({ ...prev, imageY: parseInt(e.target.value) }))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Theme Settings */}
      <div className={`${DESIGN_CARD_CLASS} ${isDarkMode ? DESIGN_CARD_DARK : DESIGN_CARD_LIGHT}`}>
        <div className="flex items-center mb-4">
          <Palette size={20} className={DESIGN_ICON_CLASS} />
          <h3 className={DESIGN_SECTION_TITLE_CLASS}>Theme Settings</h3>
        </div>
        <div className="space-y-5">
          <div>
            <label htmlFor="themeColor" className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>Primary Theme Color</label>
            <div className="flex items-center space-x-4">
              <div className="relative"><input id="themeColor" name="themeColor" type="color" value={themeColor} onChange={(e) => handleThemeColorChange(e.target.value)} className={`h-10 w-14 p-1 border rounded-lg cursor-pointer ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-300'}`} /></div>
              <span className={`text-sm font-mono px-3 py-1.5 border rounded-md uppercase ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-white border-gray-200 text-gray-600'}`}>{themeColor}</span>
              <button
                type="button"
                onClick={handleResetTemplateColors}
                disabled={!canResetThemeColor}
                title="Reset to template color"
                aria-label="Reset to template color"
                className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${isDarkMode ? 'border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>
          {templateSurfaceColorLabel && (
            <div>
              <label htmlFor="templateSurfaceColor" className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>{templateSurfaceColorLabel}</label>
              <div className="flex items-center space-x-4">
                <div className="relative"><input id="templateSurfaceColor" name="templateSurfaceColor" type="color" value={templateSurfaceColor} onChange={(e) => handleTemplateSurfaceColorChange(e.target.value)} className={`h-10 w-14 p-1 border rounded-lg cursor-pointer ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-300'}`} /></div>
                <span className={`text-sm font-mono px-3 py-1.5 border rounded-md uppercase ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-white border-gray-200 text-gray-600'}`}>{templateSurfaceColor}</span>
              </div>
            </div>
          )}

          {/* Font Dropdown */}
          <div className="relative" ref={fontDropdownRef}>
            <label htmlFor="fontFamily" className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>Font Family</label>
            <button id="fontFamily" name="fontFamily" type="button" aria-haspopup="listbox" aria-expanded={isFontDropdownOpen} onClick={() => setIsFontDropdownOpen(!isFontDropdownOpen)} className={`w-full flex items-center justify-between p-3 rounded-xl focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all shadow-sm border ${isDarkMode ? 'bg-slate-800 border-slate-700 hover:border-violet-500/50' : 'bg-white border-gray-300 hover:border-violet-400'}`}>
              <div className="flex items-center">
                <span className={`mr-3 shrink-0 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}><Type size={18} /></span>
                <div className="flex flex-col items-start overflow-hidden">
                  <span className={`text-sm font-bold truncate ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>{cvData.fontFamily}</span>
                  <span className={`text-[10px] font-medium uppercase tracking-wider truncate ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{fonts.find(f => f.name === cvData.fontFamily)?.description}</span>
                </div>
              </div>
              <ChevronDown size={18} className={`shrink-0 transition-transform duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'} ${isFontDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {isFontDropdownOpen && (
                <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} transition={{ duration: 0.2 }} className={`absolute z-100 w-full mt-2 max-h-72 overflow-y-auto overscroll-contain rounded-2xl shadow-xl py-2 border light-scrollbar ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
                  {fonts.map((f) => (
                    <button key={f.name} type="button" onClick={() => { handleThemeChange('fontFamily', f.name); setIsFontDropdownOpen(false); }} className={`w-full flex items-center px-4 py-3 transition-colors text-left ${cvData.fontFamily === f.name ? (isDarkMode ? 'bg-violet-900/40' : 'bg-violet-50/50') : (isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-violet-50')}`}>
                      <div className={`flex flex-col w-full ${f.className}`}>
                        <div className="flex items-center justify-between w-full">
                          <span className={`text-base font-bold ${cvData.fontFamily === f.name ? (isDarkMode ? 'text-violet-400' : 'text-violet-600') : (isDarkMode ? 'text-slate-200' : 'text-gray-800')}`}>{f.name}</span>
                          {cvData.fontFamily === f.name && (<Check size={16} className={`shrink-0 ${isDarkMode ? 'text-violet-400' : 'text-violet-600'}`} />)}
                        </div>
                        <span className={`text-xs font-medium mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{f.description}</span>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Spacing Controls */}
          <div className={`space-y-6 pt-6 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
            <h4 className={`text-sm font-bold flex items-center gap-2 uppercase tracking-wider ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}><Layout size={16} className="text-violet-600" /> Document Spacing</h4>
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label htmlFor="textScale" className={`text-xs font-semibold flex items-center gap-2 uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}><Type size={14} /> Text Size</label>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${isDarkMode ? 'text-violet-300 bg-violet-900/40 border-violet-800/50' : 'text-violet-600 bg-violet-50 border-violet-100'}`}>{Math.round((cvData.textScale || 1) * 100)}%</span>
                </div>
                <input id="textScale" name="textScale" type="range" min="0.85" max="1.2" step="0.01" value={cvData.textScale || 1} onChange={(e) => setCvData(prev => ({ ...prev, textScale: parseFloat(e.target.value) }))} className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-violet-600 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`} />
                <div className={`flex justify-between text-[10px] font-bold uppercase tracking-tighter ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}><span>Small</span><span>Large</span></div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label htmlFor="lineSpacing" className={`text-xs font-semibold flex items-center gap-2 uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}><MoveVertical size={14} /> Line Spacing</label>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${isDarkMode ? 'text-violet-300 bg-violet-900/40 border-violet-800/50' : 'text-violet-600 bg-violet-50 border-violet-100'}`}>{cvData.lineSpacing || 1.5}</span>
                </div>
                <input id="lineSpacing" name="lineSpacing" type="range" min="1" max="2.5" step="0.1" value={cvData.lineSpacing || 1.5} onChange={(e) => setCvData(prev => ({ ...prev, lineSpacing: parseFloat(e.target.value) }))} className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-violet-600 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`} />
                <div className={`flex justify-between text-[10px] font-bold uppercase tracking-tighter ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}><span>Compact</span><span>Relaxed</span></div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label htmlFor="sectionGap" className={`text-xs font-semibold flex items-center gap-2 uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}><MoveHorizontal size={14} /> Section Gap</label>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${isDarkMode ? 'text-violet-300 bg-violet-900/40 border-violet-800/50' : 'text-violet-600 bg-violet-50 border-violet-100'}`}>{cvData.sectionGap || 2}</span>
                </div>
                <input id="sectionGap" name="sectionGap" type="range" min="0.5" max="4" step="0.1" value={cvData.sectionGap || 2} onChange={(e) => setCvData(prev => ({ ...prev, sectionGap: parseFloat(e.target.value) }))} className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-violet-600 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`} />
                <div className={`flex justify-between text-[10px] font-bold uppercase tracking-tighter ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}><span>Tight</span><span>Spacious</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="h-8 w-full shrink-0"></div>
    </div>
  );
});
