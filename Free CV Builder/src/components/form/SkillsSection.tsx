import React from 'react';
import { Wrench, Plus, Trash2 } from 'lucide-react';
import { Skill } from '../../types';
import { SortableAccordionSection } from './SortableAccordionSection';
import { INPUT_CLASS_SM, ADD_BUTTON_CLASS } from './constants';

interface SkillsSectionProps {
  skills: Skill[];
  isOpen: boolean;
  onToggle: () => void;
  onChange: (id: string, field: keyof Skill, value: string | number) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  isDarkMode?: boolean;
}

export const SkillsSection = React.memo(({
  skills, isOpen, onToggle, onChange, onAdd, onRemove, isDarkMode,
}: SkillsSectionProps) => (
  <SortableAccordionSection key="skills" id="skills" title="Skills" icon={Wrench} isOpen={isOpen} onToggle={onToggle}>
    <div className="space-y-4">
      {skills.map((skill) => (
        <div key={skill.id} className={`flex items-center space-x-4 p-3 border rounded-lg transition-colors ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50/50 border-gray-100'}`}>
          <div className="flex-1">
            <input id={`skill-name-${skill.id}`} name={`skill-name-${skill.id}`} type="text" aria-label="Skill name" placeholder="Skill name (e.g. React)" value={skill.name} onChange={(e) => onChange(skill.id, 'name', e.target.value)} className={INPUT_CLASS_SM} />
          </div>
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((level) => (
              <button key={level} type="button" aria-label={`Set skill level to ${level} out of 5`} onClick={() => onChange(skill.id, 'level', level)} className="focus:outline-none transition-all">
                <div className={`h-2.5 w-6 rounded-sm border transition-all ${level <= skill.level ? (isDarkMode ? 'border-violet-400' : 'border-violet-500') : (isDarkMode ? 'border-slate-600 bg-transparent' : 'border-gray-300 bg-transparent')}`} style={{ backgroundColor: level <= skill.level ? (isDarkMode ? '#818cf8' : '#3b82f6') : 'transparent' }} />
              </button>
            ))}
          </div>
          <button onClick={() => onRemove(skill.id)} aria-label="Remove skill" title="Remove skill" className="text-gray-400 hover:text-red-500 transition-colors p-1">
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button onClick={onAdd} className={ADD_BUTTON_CLASS}>
        <Plus size={18} className="mr-2" /> Add Skill
      </button>
    </div>
  </SortableAccordionSection>
));
