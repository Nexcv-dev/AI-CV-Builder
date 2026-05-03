import React from 'react';
import { BookOpen, Plus, Trash2 } from 'lucide-react';
import { Course } from '../../types';
import { SortableAccordionSection } from './SortableAccordionSection';
import { INPUT_CLASS_MIN_H, LABEL_CLASS, ADD_BUTTON_CLASS, ITEM_CARD_CLASS, DELETE_BUTTON_CLASS } from './constants';

interface CoursesSectionProps {
  courses: Course[];
  isOpen: boolean;
  onToggle: () => void;
  onChange: (id: string, field: keyof Course, value: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}

export const CoursesSection = React.memo(({ courses, isOpen, onToggle, onChange, onAdd, onRemove }: CoursesSectionProps) => (
  <SortableAccordionSection key="courses" id="courses" title="Courses & Certifications" icon={BookOpen} isOpen={isOpen} onToggle={onToggle} showDragHandle>
    <div className="space-y-6">
      {courses.map((course) => (
        <div key={course.id} className={ITEM_CARD_CLASS}>
          <button onClick={() => onRemove(course.id)} className={DELETE_BUTTON_CLASS}><Trash2 size={18} /></button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div>
              <label htmlFor={`course-name-${course.id}`} className={LABEL_CLASS}>Course Name</label>
              <input id={`course-name-${course.id}`} type="text" placeholder="e.g., Advanced React Patterns" value={course.name} onChange={(e) => onChange(course.id, 'name', e.target.value)} className={INPUT_CLASS_MIN_H} />
            </div>
            <div>
              <label htmlFor={`course-inst-${course.id}`} className={LABEL_CLASS}>Institution</label>
              <input id={`course-inst-${course.id}`} type="text" autoComplete="organization" placeholder="e.g., Coursera" value={course.institution} onChange={(e) => onChange(course.id, 'institution', e.target.value)} className={INPUT_CLASS_MIN_H} />
            </div>
            <div>
              <label htmlFor={`course-startDate-${course.id}`} className={LABEL_CLASS}>Start Date</label>
              <input id={`course-startDate-${course.id}`} type="text" placeholder="e.g., Jan 2023" value={course.startDate} onChange={(e) => onChange(course.id, 'startDate', e.target.value)} className={INPUT_CLASS_MIN_H} />
            </div>
            <div>
              <label htmlFor={`course-endDate-${course.id}`} className={LABEL_CLASS}>End Date</label>
              <input id={`course-endDate-${course.id}`} type="text" placeholder="e.g., Mar 2023" value={course.endDate} onChange={(e) => onChange(course.id, 'endDate', e.target.value)} className={INPUT_CLASS_MIN_H} />
            </div>
          </div>
        </div>
      ))}
      <button onClick={onAdd} className={ADD_BUTTON_CLASS}><Plus size={18} className="mr-2" /> Add Course</button>
    </div>
  </SortableAccordionSection>
));
