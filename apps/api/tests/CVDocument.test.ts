import { describe, expect, it } from 'vitest';
import CVDocument from '../server-models/CVDocument';

describe('CVDocument share slug index', () => {
  it('only enforces uniqueness for string share slugs', () => {
    const shareSlugIndex = CVDocument.schema.indexes().find(([keys]) => 'shareSlug' in keys);

    expect(shareSlugIndex).toBeDefined();
    expect(shareSlugIndex?.[0]).toEqual({ shareSlug: 1 });
    expect(shareSlugIndex?.[1]).toMatchObject({
      unique: true,
      partialFilterExpression: { shareSlug: { $type: 'string' } },
    });
    expect(CVDocument.schema.path('shareSlug')?.options.default).toBeUndefined();
  });
});
