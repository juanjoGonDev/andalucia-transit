import { normalizeLineDisplayName } from '@data/lines/line-metadata.util';

describe('normalizeLineDisplayName', () => {
  it('removes only an isolated terminal CTAN NN sentinel', () => {
    expect(normalizeLineDisplayName('Almería - Huércal - Viator - Campamento NN')).toBe(
      'Almería - Huércal - Viator - Campamento'
    );
    expect(normalizeLineDisplayName('Destino nN   ')).toBe('Destino');
    expect(normalizeLineDisplayName(' NN ')).toBe('');
  });

  it('preserves legitimate internal NN text', () => {
    expect(normalizeLineDisplayName('Annarosa - Centro')).toBe('Annarosa - Centro');
    expect(normalizeLineDisplayName('NN Express - Centro')).toBe('NN Express - Centro');
    expect(normalizeLineDisplayName('Línea ANN')).toBe('Línea ANN');
  });

  it('rejects non-string CTAN metadata without throwing', () => {
    expect(normalizeLineDisplayName(null as unknown as string)).toBe('');
    expect(normalizeLineDisplayName(42 as unknown as string)).toBe('');
    expect(normalizeLineDisplayName(undefined as unknown as string)).toBe('');
  });
});