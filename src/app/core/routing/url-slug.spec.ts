import { buildDescriptiveSlug } from '@core/routing/url-slug';

describe('buildDescriptiveSlug', () => {
  it('normalizes diacritics, punctuation and repeated separators', () => {
    expect(buildDescriptiveSlug(' Circular Huércal / de Almería ', 'line')).toBe(
      'circular-huercal-de-almeria'
    );
  });

  it('uses the caller-owned fallback when no descriptive text remains', () => {
    expect(buildDescriptiveSlug('---', 'line')).toBe('line');
    expect(buildDescriptiveSlug('', 'stop')).toBe('stop');
  });
});
