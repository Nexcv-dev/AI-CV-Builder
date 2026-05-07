import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check } from 'lucide-react';

export interface PremiumSelectOption {
  value: string;
  label: string;
}

interface PremiumSelectProps {
  label: string;
  id: string;
  name: string;
  value: string;
  options: PremiumSelectOption[];
  onChange: (event: { target: { name: string; value: string } }) => void;
  placeholder?: string;
  isDarkMode?: boolean;
  optional?: boolean;
}

export const PremiumSelect = React.memo(({
  label,
  id,
  name,
  value,
  options,
  onChange,
  placeholder,
  isDarkMode,
  optional = false,
}: PremiumSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {optional && <span className="text-gray-400 font-normal">(Optional)</span>}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-3 border rounded-lg text-left flex items-center justify-between transition-all outline-none ring-offset-2 ${isOpen ? 'border-violet-500 ring-4 ring-violet-500/10' : 'border-gray-300 hover:border-gray-400'} ${isDarkMode ? 'bg-slate-800 text-slate-100 border-slate-700' : 'bg-white text-gray-900'}`}
      >
        <span className={!value ? 'text-gray-400' : ''}>{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown size={18} className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-violet-500' : 'text-gray-400'}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className={`absolute z-100 w-full mt-2 overflow-hidden border rounded-xl shadow-2xl ${isDarkMode ? 'bg-slate-800 border-slate-700 shadow-black/50' : 'bg-white border-gray-100 shadow-violet-500/10'}`}
          >
            <div className="p-1 max-h-60 overflow-y-auto scrollbar-hide">
              {optional && (
                <button
                  type="button"
                  onClick={() => {
                    onChange({ target: { name, value: '' } });
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-between ${!value ? (isDarkMode ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-50 text-violet-600') : (isDarkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-50')}`}
                >
                  None
                  {!value && <Check size={16} />}
                </button>
              )}
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange({ target: { name, value: option.value } });
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-between ${value === option.value ? (isDarkMode ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-50 text-violet-600') : (isDarkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-50')}`}
                >
                  {option.label}
                  {value === option.value && <Check size={16} />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
