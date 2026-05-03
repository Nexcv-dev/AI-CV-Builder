import React from 'react';
import { Trophy, Plus, Trash2 } from 'lucide-react';
import { Award } from '../../types';
import { SortableAccordionSection } from './SortableAccordionSection';
import { INPUT_CLASS_MIN_H, LABEL_CLASS, ADD_BUTTON_CLASS, ITEM_CARD_CLASS, DELETE_BUTTON_CLASS } from './constants';

interface AwardsSectionProps {
  awards: Award[];
  isOpen: boolean;
  onToggle: () => void;
  onChange: (id: string, field: keyof Award, value: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}

export const AwardsSection = React.memo(({ awards, isOpen, onToggle, onChange, onAdd, onRemove }: AwardsSectionProps) => (
  <SortableAccordionSection key="awards" id="awards" title="Awards & Honors" icon={Trophy} isOpen={isOpen} onToggle={onToggle} showDragHandle>
    <div className="space-y-6">
      {awards.map((award) => (
        <div key={award.id} className={ITEM_CARD_CLASS}>
          <button onClick={() => onRemove(award.id)} className={DELETE_BUTTON_CLASS}><Trash2 size={18} /></button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="md:col-span-2">
              <label htmlFor={`award-name-${award.id}`} className={LABEL_CLASS}>Award Name</label>
              <input id={`award-name-${award.id}`} type="text" placeholder="e.g., Employee of the Year" value={award.name} onChange={(e) => onChange(award.id, 'name', e.target.value)} className={INPUT_CLASS_MIN_H} />
            </div>
            <div>
              <label htmlFor={`award-issuer-${award.id}`} className={LABEL_CLASS}>Issuer</label>
              <input id={`award-issuer-${award.id}`} type="text" autoComplete="organization" placeholder="e.g., Tech Solutions Inc." value={award.issuer} onChange={(e) => onChange(award.id, 'issuer', e.target.value)} className={INPUT_CLASS_MIN_H} />
            </div>
            <div>
              <label htmlFor={`award-date-${award.id}`} className={LABEL_CLASS}>Date</label>
              <input id={`award-date-${award.id}`} type="text" placeholder="e.g., Dec 2022" value={award.date} onChange={(e) => onChange(award.id, 'date', e.target.value)} className={INPUT_CLASS_MIN_H} />
            </div>
          </div>
        </div>
      ))}
      <button onClick={onAdd} className={ADD_BUTTON_CLASS}><Plus size={18} className="mr-2" /> Add Award</button>
    </div>
  </SortableAccordionSection>
));
