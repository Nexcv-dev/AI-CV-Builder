import React from 'react';
import { GraduationCap, Plus, Trash2, Loader2, Sparkles } from 'lucide-react';
import { Education } from '../../types';
import { SortableAccordionSection } from './SortableAccordionSection';
import { RichTextEditor } from '../RichTextEditor';
import { INPUT_CLASS, INPUT_CLASS_MIN_H, LABEL_CLASS, AI_BUTTON_CLASS, ADD_BUTTON_CLASS, ITEM_CARD_CLASS, DELETE_BUTTON_CLASS, TEXT_FIELD_LIMITS } from './constants';

interface EducationSectionProps {
  education: Education[];
  isOpen: boolean;
  onToggle: () => void;
  onChange: (id: string, field: keyof Education, value: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onRefineText: (id: string, text: string, sectionType: string, context: any, onUpdate: (refined: string) => void) => void;
  refiningIds: Record<string, boolean>;
}

export const EducationSection = React.memo(({
  education,
  isOpen,
  onToggle,
  onChange,
  onAdd,
  onRemove,
  onRefineText,
  refiningIds,
}: EducationSectionProps) => (
  <SortableAccordionSection
    key="education"
    id="education"
    title="Education"
    icon={GraduationCap}
    isOpen={isOpen}
    onToggle={onToggle}
  >
    <div className="space-y-6">
      {education.map((edu) => (
        <div key={edu.id} className={ITEM_CARD_CLASS}>
          <button
            onClick={() => onRemove(edu.id)}
            className={DELETE_BUTTON_CLASS}
          >
            <Trash2 size={18} />
          </button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div>
              <label htmlFor={`edu-inst-${edu.id}`} className={LABEL_CLASS}>Institution</label>
              <input
                id={`edu-inst-${edu.id}`}
                name={`edu-inst-${edu.id}`}
                type="text"
                autoComplete="organization"
                placeholder="University or School"
                value={edu.institution}
                onChange={(e) => onChange(edu.id, 'institution', e.target.value)}
                maxLength={TEXT_FIELD_LIMITS.mediumText}
                className={INPUT_CLASS_MIN_H}
              />
            </div>
            <div>
              <label htmlFor={`edu-degree-${edu.id}`} className={LABEL_CLASS}>Degree</label>
              <input
                id={`edu-degree-${edu.id}`}
                name={`edu-degree-${edu.id}`}
                type="text"
                placeholder="e.g., Bachelor of Science"
                value={edu.degree}
                onChange={(e) => onChange(edu.id, 'degree', e.target.value)}
                maxLength={TEXT_FIELD_LIMITS.mediumText}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label htmlFor={`edu-startDate-${edu.id}`} className={LABEL_CLASS}>Start Date</label>
              <input
                id={`edu-startDate-${edu.id}`}
                name={`edu-startDate-${edu.id}`}
                type="text"
                placeholder="e.g., Sep 2015"
                value={edu.startDate}
                onChange={(e) => onChange(edu.id, 'startDate', e.target.value)}
                maxLength={TEXT_FIELD_LIMITS.dateText}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label htmlFor={`edu-endDate-${edu.id}`} className={LABEL_CLASS}>End Date</label>
              <input
                id={`edu-endDate-${edu.id}`}
                name={`edu-endDate-${edu.id}`}
                type="text"
                placeholder="e.g., May 2019"
                value={edu.endDate}
                onChange={(e) => onChange(edu.id, 'endDate', e.target.value)}
                maxLength={TEXT_FIELD_LIMITS.dateText}
                className={INPUT_CLASS}
              />
            </div>
            <div className="md:col-span-2 mt-2 space-y-2">
              <div id={`edu-desc-label-${edu.id}`} className={LABEL_CLASS}>Description (Optional)</div>
              <RichTextEditor
                id={`edu-desc-${edu.id}`}
                labelId={`edu-desc-label-${edu.id}`}
                value={edu.description || ''}
                onChange={(val) => onChange(edu.id, 'description', val)}
                maxLength={TEXT_FIELD_LIMITS.richText}
                placeholder="Honors, coursework, or achievements..."
              />
              <button
                type="button"
                onClick={() => onRefineText(
                  `edu-${edu.id}`,
                  edu.description || '',
                  'education',
                  { degree: edu.degree, institution: edu.institution },
                  (refined) => onChange(edu.id, 'description', refined)
                )}
                disabled={refiningIds[`edu-${edu.id}`] || !edu.description?.trim()}
                className={AI_BUTTON_CLASS}
              >
                {refiningIds[`edu-${edu.id}`] ? (
                  <><Loader2 size={13} className="mr-1.5 animate-spin" /> Refining...</>
                ) : (
                  <><Sparkles size={13} className="mr-1.5" /> Refine with AI</>
                )}
              </button>
            </div>
          </div>
        </div>
      ))}
      <button onClick={onAdd} className={ADD_BUTTON_CLASS}>
        <Plus size={18} className="mr-2" /> Add Education
      </button>
    </div>
  </SortableAccordionSection>
));
