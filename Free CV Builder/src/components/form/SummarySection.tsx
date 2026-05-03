import React from 'react';
import { FileText, Loader2, Sparkles } from 'lucide-react';
import { SortableAccordionSection } from './SortableAccordionSection';
import { RichTextEditor } from '../RichTextEditor';
import { AI_BUTTON_CLASS } from './constants';

interface SummarySectionProps {
  summary: string;
  isOpen: boolean;
  onToggle: () => void;
  onSummaryChange: (value: string) => void;
  onGenerateSummary: () => void;
  isRefining: boolean;
}

export const SummarySection = React.memo(({
  summary,
  isOpen,
  onToggle,
  onSummaryChange,
  onGenerateSummary,
  isRefining,
}: SummarySectionProps) => (
  <SortableAccordionSection
    key="summary"
    id="summary"
    title="Professional Summary"
    icon={FileText}
    isOpen={isOpen}
    onToggle={onToggle}
  >
    <div className="grid grid-cols-1 gap-5">
      <div className="md:col-span-2">
        <label id="summary-label" className="block text-sm font-medium text-gray-700 mb-1">Professional Summary</label>
        <RichTextEditor
          id="summary"
          labelId="summary-label"
          value={summary}
          onChange={onSummaryChange}
          placeholder="Brief overview of your professional background..."
        />
        <button
          type="button"
          onClick={onGenerateSummary}
          disabled={isRefining}
          className={`mt-2 ${AI_BUTTON_CLASS}`}
        >
          {isRefining ? (
            <><Loader2 size={13} className="mr-1.5 animate-spin" /> Generating...</>
          ) : (
            <><Sparkles size={13} className="mr-1.5" /> Generate with AI</>
          )}
        </button>
      </div>
    </div>
  </SortableAccordionSection>
));
