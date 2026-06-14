import { useEffect, useState } from 'react';
import { TemplateName } from '../templates';
import { apiFetchText, isCancelledError, normalizeApiError } from '../utils/api';

const templateHtmlCache = new Map<string, string>();

export function useTemplateHtml(template: TemplateName) {
  const [templateHtml, setTemplateHtml] = useState(() => ({
    template,
    html: templateHtmlCache.get(template) || '',
  }));
  const [loading, setLoading] = useState(() => !templateHtmlCache.has(template));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();
    const cached = templateHtmlCache.get(template);
    if (cached) {
      setTemplateHtml({ template, html: cached });
    } else {
      setTemplateHtml({ template, html: '' });
    }

    setLoading(!cached);
    setError(null);
    apiFetchText(`/api/templates/${encodeURIComponent(template)}/html`, {
      signal: controller.signal,
    }, 'Could not load template.')
      .then((text) => {
        templateHtmlCache.set(template, text);
        if (!ignore) setTemplateHtml({ template, html: text });
      })
      .catch((fetchError) => {
        if (isCancelledError(fetchError, controller.signal)) return;
        if (!ignore) setError(normalizeApiError(fetchError, 'Could not load template.').message);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [template]);

  return {
    html: templateHtml.template === template ? templateHtml.html : '',
    loading,
    error,
  };
}
