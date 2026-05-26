import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { CVData } from '../../types';
import { TemplateName } from '../../templates';
import { useTemplateHtml } from '../../hooks/useTemplateHtml';
import { renderCvTemplateString } from '../../utils/templateRenderer';

interface CustomPreviewProps {
  cvData: CVData;
  template: TemplateName;
  fallback?: React.ReactNode;
}

const A4_PREVIEW_WIDTH_PX = 794;
const A4_PREVIEW_HEIGHT_PX = 1122;

const CustomPreview = forwardRef<HTMLDivElement, CustomPreviewProps>(({ cvData, template, fallback }, ref) => {
  const { html, loading, error } = useTemplateHtml(template);
  const renderedHtml = useMemo(() => html ? renderCvTemplateString(html, { ...cvData, template }) : '', [cvData, html, template]);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeHeight, setIframeHeight] = useState('297mm');

  const syncIframeHeight = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return;

    const documentElement = iframe.contentDocument.documentElement;
    const body = iframe.contentDocument.body;
    const nextHeight = Math.max(
      documentElement?.scrollHeight || 0,
      body?.scrollHeight || 0,
      A4_PREVIEW_HEIGHT_PX
    );
    setIframeHeight(`${nextHeight}px`);
  };

  useEffect(() => {
    setIframeHeight('297mm');
  }, [renderedHtml, template]);

  return (
    <div ref={ref} className="print:p-0">
      <div
        className="cv-preview-surface relative mx-auto mb-0 overflow-visible bg-white shadow-2xl print:mb-0 print:shadow-none lg:mb-8"
        style={{
          width: `${A4_PREVIEW_WIDTH_PX}px`,
          minWidth: `${A4_PREVIEW_WIDTH_PX}px`,
          minHeight: `${A4_PREVIEW_HEIGHT_PX}px`,
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center gap-3 text-sm font-bold text-slate-500" style={{ minHeight: `${A4_PREVIEW_HEIGHT_PX}px` }}>
            <Loader2 className="animate-spin text-violet-500" size={18} />
            Loading custom template...
          </div>
        ) : error && fallback ? (
          fallback
        ) : error ? (
          <div className="flex items-center justify-center px-10 text-center text-sm font-bold text-red-500" style={{ minHeight: `${A4_PREVIEW_HEIGHT_PX}px` }}>
            {error}
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            key={template}
            title="Custom CV template preview"
            srcDoc={renderedHtml}
            className="block w-full border-0 transition-opacity duration-150"
            sandbox="allow-same-origin"
            scrolling="no"
            style={{ height: iframeHeight, minHeight: `${A4_PREVIEW_HEIGHT_PX}px` }}
            onLoad={syncIframeHeight}
          />
        )}
      </div>
    </div>
  );
});

CustomPreview.displayName = 'CustomPreview';

export default CustomPreview;
