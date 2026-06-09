import { describe, expect, it } from 'vitest';
import type { TemplateConfigResponse } from './templates';

describe('template config contract', () => {
  it('allows the public template config response shape', () => {
    const response = {
      templates: [
        {
          key: 'modern',
          label: 'Modern',
          category: 'Modern',
          access: 'free',
          thumbnail: '/templates/modern.png',
          builtInThumbnail: '/templates/modern.png',
          surfaceColorRole: 'none',
        },
      ],
    } satisfies TemplateConfigResponse;

    expect(response.templates[0].key).toBe('modern');
  });
});
