import React from 'react';
import { Globe, Plus, Trash2 } from 'lucide-react';
import { Language } from '../../types';
import { SortableAccordionSection } from './SortableAccordionSection';
import { INPUT_CLASS_SM, ADD_BUTTON_CLASS, TEXT_FIELD_LIMITS } from './constants';
import { PremiumSelect } from './PremiumSelect';

interface LanguagesSectionProps {
  languages: Language[];
  isOpen: boolean;
  onToggle: () => void;
  onChange: (id: string, field: keyof Language, value: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  isDarkMode?: boolean;
}

const PROFICIENCY_OPTIONS = [
  { value: 'Native', label: 'Native' },
  { value: 'Fluent', label: 'Fluent' },
  { value: 'Advanced', label: 'Advanced' },
  { value: 'Intermediate', label: 'Intermediate' },
  { value: 'Beginner', label: 'Beginner' },
];

export const LanguagesSection = React.memo(({ languages, isOpen, onToggle, onChange, onAdd, onRemove, isDarkMode }: LanguagesSectionProps) => (
  <SortableAccordionSection key="languages" id="languages" title="Languages" icon={Globe} isOpen={isOpen} onToggle={onToggle} showDragHandle>
    <div className="space-y-4">
      {languages.map((lang) => (
        <div key={lang.id} className={`flex items-center space-x-4 p-3 border rounded-lg transition-colors ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50/50 border-gray-100'}`}>
          <div className="flex-1">
            <input id={`lang-name-${lang.id}`} name={`lang-name-${lang.id}`} type="text" autoComplete="language" aria-label="Language name" placeholder="Language (e.g. English)" value={lang.name} onChange={(e) => onChange(lang.id, 'name', e.target.value)} maxLength={TEXT_FIELD_LIMITS.shortText} className={INPUT_CLASS_SM} />
          </div>
          <div className="flex-1">
            <PremiumSelect
              id={`lang-prof-${lang.id}`}
              name={`lang-prof-${lang.id}`}
              label="Proficiency level"
              value={lang.proficiency}
              options={PROFICIENCY_OPTIONS}
              onChange={(event) => onChange(lang.id, 'proficiency', event.target.value)}
              isDarkMode={isDarkMode}
              hideLabel
            />
          </div>
          <button onClick={() => onRemove(lang.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1"><Trash2 size={16} /></button>
        </div>
      ))}
      <button onClick={onAdd} className={ADD_BUTTON_CLASS}><Plus size={18} className="mr-2" /> Add Language</button>
    </div>
  </SortableAccordionSection>
));
