import { buildDescriptiveSlug } from './url-slug';

describe('buildDescriptiveSlug', () => {
  it('removes a trailing separator introduced by max-length truncation', () => {
    const value = `${'a'.repeat(119)} b`;

    const slug = buildDescriptiveSlug(value, 'fallback');

    expect(slug).toBe('a'.repeat(119));
    expect(slug).not.toMatch(/-$/);
    expect(slug.length).toBeLessThanOrEqual(120);
  });
});
