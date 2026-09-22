const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3_600;

export type CountdownUnit = 'hour' | 'minute' | 'second';

export interface CountdownDuration {
  readonly text: string;
  readonly unit: CountdownUnit;
  readonly value: number;
}

export function buildCountdownDuration(totalSeconds: number): CountdownDuration {
  const magnitude = Math.round(Math.abs(totalSeconds));

  if (magnitude >= SECONDS_PER_HOUR) {
    const value = Math.trunc(magnitude / SECONDS_PER_HOUR);
    return { text: `${value}h`, unit: 'hour', value };
  }

  if (magnitude >= SECONDS_PER_MINUTE) {
    const value = Math.trunc(magnitude / SECONDS_PER_MINUTE);
    return { text: `${value}m`, unit: 'minute', value };
  }

  return { text: `${magnitude}s`, unit: 'second', value: magnitude };
}
