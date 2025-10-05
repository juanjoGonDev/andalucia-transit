const MILLISECONDS_PER_MINUTE = 60_000;

export function addMinutesToDate(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MILLISECONDS_PER_MINUTE);
}

export function differenceInMinutes(from: Date, to: Date): number {
  return Math.round((from.getTime() - to.getTime()) / MILLISECONDS_PER_MINUTE);
}

export function startOfMinute(date: Date): Date {
  const result = new Date(date);
  result.setSeconds(0, 0);
  return result;
}
