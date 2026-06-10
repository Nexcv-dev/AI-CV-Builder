import { useEffect, useState } from 'react';
import { DEFAULT_CMS_CONTENT, mergeCmsContent, type CmsContent } from '@nexcv/shared/contentDefaults';
import type { PublicAppSettingsResponse } from '@nexcv/api-contracts/public';

export function usePublicContent() {
  const [content, setContent] = useState<CmsContent>(DEFAULT_CMS_CONTENT);

  useEffect(() => {
    let ignore = false;
    fetch('/api/public/app-settings', { credentials: 'include' })
      .then((response) => response.ok ? response.json() : null)
      .then((data: PublicAppSettingsResponse | null) => {
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
