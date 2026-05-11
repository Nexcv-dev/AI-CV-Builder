import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Palette, LayoutTemplate, Upload, ChevronDown, Check, CheckCircle2, Image as ImageIcon, MoveHorizontal, MoveVertical, Layout, Type } from 'lucide-react';
import { CVData } from '../../types';
import { fonts, DESIGN_CARD_CLASS, DESIGN_CARD_LIGHT, DESIGN_CARD_DARK, DESIGN_SECTION_TITLE_CLASS, DESIGN_ICON_CLASS } from './constants';

interface DesignPanelProps {
  cvData: CVData;
  setCvData: React.Dispatch<React.SetStateAction<CVData>>;
  template: string;
  setTemplate: (template: 'classic' | 'modern' | 'professional') => void;
  isDarkMode?: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const TEMPLATES: Array<{ key: 'classic' | 'modern' | 'professional'; label: string; img: string }> = [
  { key: 'classic', label: 'Classic', img: '/templates/classic.png' },
  { key: 'modern', label: 'Modern', img: '/templates/modern.png' },
  { key: 'professional', label: 'Professional', img: '/templates/professional.png' },
];

export const DesignPanel = React.memo(({ cvData, setCvData, template, setTemplate, isDarkMode, fileInputRef, onImageUpload }: DesignPanelProps) => {
  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
  const fontDropdownRef = useRef<HTMLDivElement>(null);

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

  const handleThemeChange = (field: 'themeColor' | 'fontFamily' | 'sidebarColor', value: string) => {
    setCvData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="animate-in fade-in duration-300 space-y-6 flex flex-col flex-1">
      {/* Choose Template */}
      <div className={`${DESIGN_CARD_CLASS} ${isDarkMode ? DESIGN_CARD_DARK : DESIGN_CARD_LIGHT}`}>
        <div className="flex items-center mb-4">
          <LayoutTemplate size={20} className={DESIGN_ICON_CLASS} />
          <h3 className={DESIGN_SECTION_TITLE_CLASS}>Choose Template</h3>
        </div>
        <div className="grid grid-cols-3 gap-3 max-w-[480px]">
          {TEMPLATES.map((t) => (
            <button key={t.key} type="button" onClick={() => setTemplate(t.key)}
              className={`relative flex flex-col items-center p-2 rounded-lg border-2 transition-all duration-200 group ${template === t.key ? 'border-violet-500 bg-violet-50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'}`}>
              {template === t.key && (<div className="absolute top-1.5 right-1.5 text-violet-600 z-10"><CheckCircle2 size={16} fill="currentColor" className="text-white fill-violet-600" /></div>)}
              <div className={`w-full aspect-3/4 rounded-md border mb-2 overflow-hidden transition-all duration-300 ${template === t.key
                ? (isDarkMode ? 'border-violet-500 ring-2 ring-violet-500/30 shadow-lg shadow-violet-900/20 scale-[1.02]' : 'border-violet-400 ring-2 ring-violet-500/20 shadow-md scale-[1.02]')
                : (isDarkMode ? 'border-slate-700 grayscale-[0.4] opacity-70 hover:grayscale-0 hover:opacity-100 hover:border-slate-600' : 'border-gray-200 grayscale-[0.3] opacity-80 hover:grayscale-0 hover:opacity-100 hover:border-gray-300')}`}>
                <img src={t.img} alt={`${t.label} Template`} className="w-full h-full object-cover" />
              </div>
              <span className={`text-xs font-bold ${template === t.key ? 'text-violet-700' : 'text-gray-600'}`}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Profile Picture */}
      <div className={`${DESIGN_CARD_CLASS} ${isDarkMode ? DESIGN_CARD_DARK : DESIGN_CARD_LIGHT}`}>
        <div className="flex items-center mb-4">
          <ImageIcon size={20} className={DESIGN_ICON_CLASS} />
          <h3 className={DESIGN_SECTION_TITLE_CLASS}>Profile Picture</h3>
        </div>
        <div className="flex flex-col space-y-5">
          <div className="flex items-center space-x-5">
            {cvData.profileImage ? (
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 shadow-sm flex items-center justify-center bg-white">
                <img src={cvData.profileImage} alt="Profile" className="w-full h-full object-cover" style={{ transform: `scale(${cvData.imageZoom || 1}) translate(${cvData.imageX || 0}px, ${cvData.imageY || 0}px)` }} />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-white border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400"><Upload size={24} /></div>
            )}
            <div className="flex flex-col space-y-2">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium transition-colors shadow-sm">
                {cvData.profileImage ? 'Change Photo' : 'Upload Photo'}
              </button>
              {cvData.profileImage && (<button type="button" onClick={() => setCvData(prev => ({ ...prev, profileImage: '' }))} className="text-sm text-red-500 hover:text-red-700 font-medium text-left px-1">Remove</button>)}
            </div>
            <input id="profileImageUpload" name="profileImageUpload" type="file" ref={fileInputRef} onChange={onImageUpload} accept="image/*" className="hidden" aria-label="Upload profile picture" />
          </div>
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
              <div className="relative"><input id="themeColor" name="themeColor" type="color" value={cvData.themeColor} onChange={(e) => handleThemeChange('themeColor', e.target.value)} className={`h-10 w-14 p-1 border rounded-lg cursor-pointer ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-300'}`} /></div>
              <span className={`text-sm font-mono px-3 py-1.5 border rounded-md uppercase ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-white border-gray-200 text-gray-600'}`}>{cvData.themeColor}</span>
            </div>
          </div>
          <div>
            <label htmlFor="sidebarColor" className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>Sidebar Background (Modern Template)</label>
            <div className="flex items-center space-x-4">
              <div className="relative"><input id="sidebarColor" name="sidebarColor" type="color" value={cvData.sidebarColor} onChange={(e) => handleThemeChange('sidebarColor', e.target.value)} className={`h-10 w-14 p-1 border rounded-lg cursor-pointer ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-300'}`} /></div>
              <span className={`text-sm font-mono px-3 py-1.5 border rounded-md uppercase ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-white border-gray-200 text-gray-600'}`}>{cvData.sidebarColor}</span>
            </div>
          </div>

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
