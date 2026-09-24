import { destinationNucleusLabel } from './destination-nucleus.util';

describe('destinationNucleusLabel', () => {
  it('keeps only the nucleus of a "Núcleo - Lugar" stop name', () => {
    expect(destinationNucleusLabel('Aguadulce - La Gloria')).toBe('Aguadulce');
  });

  it('returns names without a place separator untouched', () => {
    expect(destinationNucleusLabel('Almería')).toBe('Almería');
  });

  it('drops service notes appended after the stop name', () => {
    expect(destinationNucleusLabel('Aguadulce - La Gloria • Servicio escolar')).toBe(
      'Aguadulce'
    );
  });

  it('trims surrounding whitespace from the nucleus', () => {
    expect(destinationNucleusLabel('  El Parador - Centro  ')).toBe('El Parador');
  });

  it('keeps deeper place qualifiers out of the label', () => {
    expect(destinationNucleusLabel('Núcleo - Lugar - Sublugar')).toBe('Núcleo');
  });

  it('falls back to the trimmed original when the nucleus segment is empty', () => {
    expect(destinationNucleusLabel('   - parada suelta')).toBe('- parada suelta');
  });

  it('handles empty input', () => {
    expect(destinationNucleusLabel('')).toBe('');
  });
});
