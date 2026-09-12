import { normalizeStopNucleus } from '@data/stops/stop-metadata.util';

describe('normalizeStopNucleus', () => {
  it('treats the CTAN NN sentinel as missing regardless of case and whitespace', () => {
    expect(normalizeStopNucleus('NN')).toBeNull();
    expect(normalizeStopNucleus(' nn ')).toBeNull();
    expect(normalizeStopNucleus('Nn')).toBeNull();
  });

  it('treats empty values as missing', () => {
    expect(normalizeStopNucleus(null)).toBeNull();
    expect(normalizeStopNucleus(undefined)).toBeNull();
    expect(normalizeStopNucleus('   ')).toBeNull();
  });

  it('preserves legitimate nucleus names and trims surrounding whitespace', () => {
    expect(normalizeStopNucleus('  Málaga Centro  ')).toBe('Málaga Centro');
    expect(normalizeStopNucleus('Anna')).toBe('Anna');
  });
});
