import { useEffect, useState } from 'react';
import { TemplateName } from '../templates';

const templateHtmlCache = new Map<string, string>();

export function useTemplateHtml(template: TemplateName) {
  const [html, setHtml] = useState(() => templateHtmlCache.get(template) || '');
  const [loading, setLoading] = useState(() => !templateHtmlCache.has(template));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    const cached = templateHtmlCache.get(template);
    if (cached) {
      setHtml(cached);
      setLoading(false);
      setError(null);
      return () => {
        ignore = true;
      };
    }

    setLoading(true);
    setError(null);
    fetch(`/api/templates/${encodeURIComponent(template)}/html`, { credentials: 'include' })
      .then(async (response) => {
        const text = await response.text();
        if (!response.ok) {
          throw new Error(text || 'Could not load template.');
        }
        templateHtmlCache.set(template, text);
        if (!ignore) setHtml(text);
      })
      .catch((fetchError) => {
        if (!ignore) setError(fetchError instanceof Error ? fetchError.message : 'Could not load template.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [template]);

  return { html, loading, error };
}
