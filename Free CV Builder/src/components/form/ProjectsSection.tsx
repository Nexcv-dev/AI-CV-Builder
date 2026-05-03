import React from 'react';
import { FolderGit2, Plus, Trash2, Loader2, Sparkles } from 'lucide-react';
import { Project } from '../../types';
import { SortableAccordionSection } from './SortableAccordionSection';
import { RichTextEditor } from '../RichTextEditor';
import { INPUT_CLASS_MIN_H, LABEL_CLASS, AI_BUTTON_CLASS, ADD_BUTTON_CLASS, ITEM_CARD_CLASS, DELETE_BUTTON_CLASS } from './constants';

interface ProjectsSectionProps {
  projects: Project[];
  isOpen: boolean;
  onToggle: () => void;
  onChange: (id: string, field: keyof Project, value: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onRefineText: (id: string, text: string, sectionType: string, context: any, onUpdate: (refined: string) => void) => void;
  refiningIds: Record<string, boolean>;
}

export const ProjectsSection = React.memo(({ projects, isOpen, onToggle, onChange, onAdd, onRemove, onRefineText, refiningIds }: ProjectsSectionProps) => (
  <SortableAccordionSection key="projects" id="projects" title="Projects" icon={FolderGit2} isOpen={isOpen} onToggle={onToggle} showDragHandle>
    <div className="space-y-6">
      {projects.map((proj) => (
        <div key={proj.id} className={ITEM_CARD_CLASS}>
          <button onClick={() => onRemove(proj.id)} className={DELETE_BUTTON_CLASS}><Trash2 size={18} /></button>
          <div className="grid grid-cols-1 gap-4 mt-2">
            <div>
              <label htmlFor={`proj-name-${proj.id}`} className={LABEL_CLASS}>Project Name</label>
              <input id={`proj-name-${proj.id}`} type="text" placeholder="e.g., E-commerce Website" value={proj.name} onChange={(e) => onChange(proj.id, 'name', e.target.value)} className={INPUT_CLASS_MIN_H} />
            </div>
            <div>
              <label htmlFor={`proj-link-${proj.id}`} className={LABEL_CLASS}>Link (Optional)</label>
              <input id={`proj-link-${proj.id}`} type="text" autoComplete="url" placeholder="e.g., https://github.com/..." value={proj.link} onChange={(e) => onChange(proj.id, 'link', e.target.value)} className={INPUT_CLASS_MIN_H} />
            </div>
            <div className="space-y-2">
              <label id={`proj-desc-label-${proj.id}`} className={LABEL_CLASS}>Description</label>
              <RichTextEditor id={`proj-desc-${proj.id}`} labelId={`proj-desc-label-${proj.id}`} value={proj.description} onChange={(val) => onChange(proj.id, 'description', val)} placeholder="Describe the project and your role..." />
              <button type="button" onClick={() => onRefineText(`proj-${proj.id}`, proj.description, 'project', { name: proj.name }, (refined) => onChange(proj.id, 'description', refined))} disabled={refiningIds[`proj-${proj.id}`] || !proj.description?.trim()} className={AI_BUTTON_CLASS}>
                {refiningIds[`proj-${proj.id}`] ? (<><Loader2 size={13} className="mr-1.5 animate-spin" /> Refining...</>) : (<><Sparkles size={13} className="mr-1.5" /> Refine with AI</>)}
              </button>
            </div>
          </div>
        </div>
      ))}
      <button onClick={onAdd} className={ADD_BUTTON_CLASS}><Plus size={18} className="mr-2" /> Add Project</button>
    </div>
  </SortableAccordionSection>
));
