import { buildCountdownDuration } from './countdown-labels.util';

describe('buildCountdownDuration', () => {
  it('keeps only the largest unit with a compact text and its spoken parts', () => {
    const cases: readonly {
      readonly seconds: number;
      readonly text: string;
      readonly unit: string;
      readonly value: number;
    }[] = [
      { seconds: 5400, text: '1h', unit: 'hour', value: 1 },
      { seconds: 3915, text: '1h', unit: 'hour', value: 1 },
      { seconds: 86400, text: '24h', unit: 'hour', value: 24 },
      { seconds: 3599, text: '59m', unit: 'minute', value: 59 },
      { seconds: 120, text: '2m', unit: 'minute', value: 2 },
      { seconds: 60, text: '1m', unit: 'minute', value: 1 },
      { seconds: 59, text: '59s', unit: 'second', value: 59 },
      { seconds: 0, text: '0s', unit: 'second', value: 0 }
    ];

    for (const { seconds, text, unit, value } of cases) {
      const duration = buildCountdownDuration(seconds);
      expect(duration.text).toBe(text);
      expect(duration.unit).toBe(unit);
      expect(duration.value).toBe(value);
    }
  });

  it('uses the absolute magnitude for past departures', () => {
    expect(buildCountdownDuration(-90)).toEqual({ text: '1m', unit: 'minute', value: 1 });
    expect(buildCountdownDuration(-3700)).toEqual({ text: '1h', unit: 'hour', value: 1 });
  });
});
