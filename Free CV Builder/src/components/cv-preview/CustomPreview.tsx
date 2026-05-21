import React, { forwardRef, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { CVData } from '../../types';
import { TemplateName } from '../../templates';
import { useTemplateHtml } from '../../hooks/useTemplateHtml';
import { renderCvTemplateString } from '../../utils/templateRenderer';

interface CustomPreviewProps {
  cvData: CVData;
  template: TemplateName;
}

const CustomPreview = forwardRef<HTMLDivElement, CustomPreviewProps>(({ cvData, template }, ref) => {
  const { html, loading, error } = useTemplateHtml(template);
  const renderedHtml = useMemo(() => html ? renderCvTemplateString(html, cvData) : '', [cvData, html]);

  return (
    <div ref={ref} className="print:p-0">
      <div
        className="cv-preview-surface relative mx-auto mb-8 min-h-[297mm] w-[210mm] overflow-hidden bg-white shadow-2xl print:mb-0 print:shadow-none"
        style={{ minWidth: '210mm' }}
      >
        {loading ? (
          <div className="flex min-h-[297mm] items-center justify-center gap-3 text-sm font-bold text-slate-500">
            <Loader2 className="animate-spin text-violet-500" size={18} />
            Loading custom template...
          </div>
        ) : error ? (
          <div className="flex min-h-[297mm] items-center justify-center px-10 text-center text-sm font-bold text-red-500">
            {error}
          </div>
        ) : (
          <iframe
            key={template}
            title="Custom CV template preview"
            srcDoc={renderedHtml}
            className="block min-h-[297mm] w-full border-0 transition-opacity duration-150"
            sandbox=""
          />
        )}
      </div>
    </div>
  );
});

CustomPreview.displayName = 'CustomPreview';

export default CustomPreview;
