import { useEffect, useMemo, useState } from 'react';
import { CV_TEMPLATES, TemplateName } from '../templates';
import { apiFetch } from '../utils/api';

export interface TemplateConfigItem {
  key: TemplateName;
  label: string;
  category: string;
  access: 'free' | 'paid';
  thumbnail: string;
  builtInThumbnail: string;
  surfaceColorRole: string;
  usageCount?: number;
}

const fallbackTemplates: TemplateConfigItem[] = CV_TEMPLATES.map((template) => ({
  key: template.key,
  label: template.label,
  category: 'Modern',
  access: template.access,
  thumbnail: template.image,
  builtInThumbnail: template.image,
  surfaceColorRole: template.surfaceColorRole,
}));

export function useTemplateConfig() {
  const [templates, setTemplates] = useState<TemplateConfigItem[]>(fallbackTemplates);

  useEffect(() => {
    let ignore = false;
    apiFetch<{ templates: TemplateConfigItem[] }>('/api/templates/config')
      .then((data) => {
        if (!ignore && Array.isArray(data.templates) && data.templates.length) {
          setTemplates(data.templates);
        }
      })
      .catch(() => undefined);

    return () => {
      ignore = true;
    };
  }, []);

  const templateMap = useMemo(() => new Map(templates.map((template) => [template.key, template])), [templates]);

  return {
    templates,
    templateMap,
    isTemplatePaid: (template: TemplateName) => templateMap.get(template)?.access === 'paid',
    getTemplateLabel: (template: TemplateName) => templateMap.get(template)?.label || template,
  };
}
