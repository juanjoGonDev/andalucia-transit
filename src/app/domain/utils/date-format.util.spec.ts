import { formatShortNumericDate } from './date-format.util';

describe('formatShortNumericDate', () => {
  const cases: readonly { readonly language: string; readonly expected: string }[] = [
    { language: 'es', expected: '05/01/2026' },
    { language: 'en', expected: '01/05/2026' }
  ];

  it('formats a date with zero-padded day and month and a four digit year', () => {
    const date = new Date(2026, 0, 5);

    for (const { language, expected } of cases) {
      expect(formatShortNumericDate(date, language)).toBe(expected);
    }
  });

  it('keeps two digit padding at the end of the year', () => {
    const date = new Date(2026, 11, 31);

    expect(formatShortNumericDate(date, 'es')).toBe('31/12/2026');
    expect(formatShortNumericDate(date, 'en')).toBe('12/31/2026');
  });

  it('falls back to day-first order for unknown languages', () => {
    const date = new Date(2026, 8, 21);

    expect(formatShortNumericDate(date, 'fr')).toBe('21/09/2026');
  });
});
