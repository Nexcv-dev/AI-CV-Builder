import { useEffect, useState } from 'react';
import { TemplateName } from '../templates';

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
    fetch(`/api/templates/${encodeURIComponent(template)}/html`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async (response) => {
        const text = await response.text();
        if (!response.ok) {
          throw new Error(text || 'Could not load template.');
        }
        templateHtmlCache.set(template, text);
        if (!ignore) setTemplateHtml({ template, html: text });
      })
      .catch((fetchError) => {
        if (fetchError?.name === 'AbortError') return;
        if (!ignore) setError(fetchError instanceof Error ? fetchError.message : 'Could not load template.');
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
