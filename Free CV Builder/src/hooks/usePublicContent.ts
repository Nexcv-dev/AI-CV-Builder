import { useEffect, useState } from 'react';
import { DEFAULT_CMS_CONTENT, mergeCmsContent, type CmsContent } from '../contentDefaults';

interface PublicContentResponse {
  cmsContent?: unknown;
}

export function usePublicContent() {
  const [content, setContent] = useState<CmsContent>(DEFAULT_CMS_CONTENT);

  useEffect(() => {
    let ignore = false;
    fetch('/api/public/app-settings', { credentials: 'include' })
      .then((response) => response.ok ? response.json() : null)
      .then((data: PublicContentResponse | null) => {
        if (!ignore && data?.cmsContent) {
          setContent(mergeCmsContent(data.cmsContent));
        }
      })
      .catch(() => undefined);

    return () => {
      ignore = true;
    };
  }, []);

  return content;
}
