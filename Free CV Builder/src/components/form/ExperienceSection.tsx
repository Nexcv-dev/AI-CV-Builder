import React from 'react';
import { Briefcase, Plus, Trash2, Loader2, Sparkles } from 'lucide-react';
import { Experience } from '../../types';
import { SortableAccordionSection } from './SortableAccordionSection';
import { RichTextEditor } from '../RichTextEditor';
import { INPUT_CLASS, INPUT_CLASS_MIN_H, LABEL_CLASS, AI_BUTTON_CLASS, ADD_BUTTON_CLASS, ITEM_CARD_CLASS, DELETE_BUTTON_CLASS } from './constants';

interface ExperienceSectionProps {
  experience: Experience[];
  isOpen: boolean;
  onToggle: () => void;
  onChange: (id: string, field: keyof Experience, value: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onRefineText: (id: string, text: string, sectionType: string, context: any, onUpdate: (refined: string) => void) => void;
  refiningIds: Record<string, boolean>;
}

export const ExperienceSection = React.memo(({
  experience,
  isOpen,
  onToggle,
  onChange,
  onAdd,
  onRemove,
  onRefineText,
  refiningIds,
}: ExperienceSectionProps) => (
  <SortableAccordionSection
    key="experience"
    id="experience"
    title="Work Experience"
    icon={Briefcase}
    isOpen={isOpen}
    onToggle={onToggle}
  >
    <div className="space-y-6">
      {experience.map((exp) => (
        <div key={exp.id} className={ITEM_CARD_CLASS}>
          <button
            onClick={() => onRemove(exp.id)}
            className={DELETE_BUTTON_CLASS}
          >
            <Trash2 size={18} />
          </button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div>
              <label htmlFor={`exp-company-${exp.id}`} className={LABEL_CLASS}>Company</label>
              <input
                id={`exp-company-${exp.id}`}
                name={`exp-company-${exp.id}`}
                type="text"
                autoComplete="organization"
                placeholder="Company Name"
                value={exp.company}
                onChange={(e) => onChange(exp.id, 'company', e.target.value)}
                className={INPUT_CLASS_MIN_H}
              />
            </div>
            <div>
              <label htmlFor={`exp-position-${exp.id}`} className={LABEL_CLASS}>Position</label>
              <input
                id={`exp-position-${exp.id}`}
                name={`exp-position-${exp.id}`}
                type="text"
                autoComplete="organization-title"
                placeholder="Job Title"
                value={exp.position}
                onChange={(e) => onChange(exp.id, 'position', e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label htmlFor={`exp-startDate-${exp.id}`} className={LABEL_CLASS}>Start Date</label>
              <input
                id={`exp-startDate-${exp.id}`}
                name={`exp-startDate-${exp.id}`}
                type="text"
                placeholder="e.g., Jan 2020"
                value={exp.startDate}
                onChange={(e) => onChange(exp.id, 'startDate', e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label htmlFor={`exp-endDate-${exp.id}`} className={LABEL_CLASS}>End Date</label>
              <input
                id={`exp-endDate-${exp.id}`}
                name={`exp-endDate-${exp.id}`}
                type="text"
                placeholder="e.g., Present"
                value={exp.endDate}
                onChange={(e) => onChange(exp.id, 'endDate', e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div className="md:col-span-2 space-y-2 mt-2">
              <div className="flex justify-between items-center">
                <div id={`exp-desc-label-${exp.id}`} className={LABEL_CLASS}>Description</div>
              </div>
              <RichTextEditor
                id={`exp-desc-${exp.id}`}
                labelId={`exp-desc-label-${exp.id}`}
                value={exp.description}
                onChange={(val) => onChange(exp.id, 'description', val)}
                placeholder="Describe your responsibilities and achievements..."
              />
              <button
                type="button"
                onClick={() => onRefineText(
                  `exp-${exp.id}`,
                  exp.description,
                  'experience',
                  { position: exp.position, company: exp.company },
                  (refined) => onChange(exp.id, 'description', refined)
                )}
                disabled={refiningIds[`exp-${exp.id}`] || !exp.description?.trim()}
                className={AI_BUTTON_CLASS}
              >
                {refiningIds[`exp-${exp.id}`] ? (
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
        <Plus size={18} className="mr-2" /> Add Experience
      </button>
    </div>
  </SortableAccordionSection>
));
