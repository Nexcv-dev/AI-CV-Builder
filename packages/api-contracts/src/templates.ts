import type { TemplateName } from '@nexcv/templates';

export type PublicTemplateSource = 'built_in' | 'custom';
export type PublicTemplateStatus = 'draft' | 'active' | 'archived';

export interface TemplateConfigItem {
  key: TemplateName;
  label: string;
  category: string;
  access: 'free' | 'paid';
  thumbnail: string;
  builtInThumbnail: string;
  surfaceColorRole: string;
  surfaceColorLabel?: string | null;
  defaultThemeColor?: string;
  source?: PublicTemplateSource;
  status?: PublicTemplateStatus;
  usageCount?: number;
  updatedAt?: string;
}

export interface TemplateConfigResponse {
  templates: TemplateConfigItem[];
}
