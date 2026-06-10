import React from 'react';
import { Plus, Trash2, UserCheck } from 'lucide-react';
import { Reference } from '../../types';
import { SortableAccordionSection } from './SortableAccordionSection';
import { INPUT_CLASS_MIN_H, LABEL_CLASS, ADD_BUTTON_CLASS, ITEM_CARD_CLASS, DELETE_BUTTON_CLASS, TEXT_FIELD_LIMITS } from './constants';

interface ReferencesSectionProps {
  references: Reference[];
  isOpen: boolean;
  onToggle: () => void;
  onChange: (id: string, field: keyof Reference, value: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}

export const ReferencesSection = React.memo(({ references, isOpen, onToggle, onChange, onAdd, onRemove }: ReferencesSectionProps) => (
  <SortableAccordionSection key="references" id="references" title="References" icon={UserCheck} isOpen={isOpen} onToggle={onToggle} showDragHandle>
    <div className="space-y-6">
      {references.map((reference) => (
        <div key={reference.id} className={ITEM_CARD_CLASS}>
          <button onClick={() => onRemove(reference.id)} className={DELETE_BUTTON_CLASS}><Trash2 size={18} /></button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div>
              <label htmlFor={`reference-name-${reference.id}`} className={LABEL_CLASS}>Reference Name</label>
              <input id={`reference-name-${reference.id}`} name={`reference-name-${reference.id}`} type="text" autoComplete="name" placeholder="e.g., Jane Cooper" value={reference.name} onChange={(e) => onChange(reference.id, 'name', e.target.value)} maxLength={TEXT_FIELD_LIMITS.mediumText} className={INPUT_CLASS_MIN_H} />
            </div>
            <div>
              <label htmlFor={`reference-position-${reference.id}`} className={LABEL_CLASS}>Position</label>
              <input id={`reference-position-${reference.id}`} name={`reference-position-${reference.id}`} type="text" autoComplete="organization-title" placeholder="e.g., HR Manager" value={reference.position} onChange={(e) => onChange(reference.id, 'position', e.target.value)} maxLength={TEXT_FIELD_LIMITS.mediumText} className={INPUT_CLASS_MIN_H} />
            </div>
            <div>
              <label htmlFor={`reference-company-${reference.id}`} className={LABEL_CLASS}>Company</label>
              <input id={`reference-company-${reference.id}`} name={`reference-company-${reference.id}`} type="text" autoComplete="organization" placeholder="e.g., Acme Ltd." value={reference.company} onChange={(e) => onChange(reference.id, 'company', e.target.value)} maxLength={TEXT_FIELD_LIMITS.mediumText} className={INPUT_CLASS_MIN_H} />
            </div>
            <div>
              <label htmlFor={`reference-email-${reference.id}`} className={LABEL_CLASS}>Email</label>
              <input id={`reference-email-${reference.id}`} name={`reference-email-${reference.id}`} type="email" autoComplete="email" placeholder="e.g., jane@company.com" value={reference.email} onChange={(e) => onChange(reference.id, 'email', e.target.value)} maxLength={TEXT_FIELD_LIMITS.email} className={INPUT_CLASS_MIN_H} />
            </div>
            <div className="md:col-span-2">
              <label htmlFor={`reference-phone-${reference.id}`} className={LABEL_CLASS}>Phone</label>
              <input id={`reference-phone-${reference.id}`} name={`reference-phone-${reference.id}`} type="tel" autoComplete="tel" placeholder="e.g., +94 77 123 4567" value={reference.phone} onChange={(e) => onChange(reference.id, 'phone', e.target.value)} maxLength={TEXT_FIELD_LIMITS.phone} className={INPUT_CLASS_MIN_H} />
            </div>
          </div>
        </div>
      ))}
      <button onClick={onAdd} className={ADD_BUTTON_CLASS}><Plus size={18} className="mr-2" /> Add Reference</button>
    </div>
  </SortableAccordionSection>
));
