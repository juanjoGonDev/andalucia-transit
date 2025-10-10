const MAX_PERCENTAGE = 100;
const MIN_PERCENTAGE = 0;
const MIN_VISIBLE_PERCENTAGE = 1;

export const ARRIVAL_PROGRESS_WINDOW_MINUTES = 30;

export function calculateUpcomingProgress(minutesUntilArrival: number): number {
  if (minutesUntilArrival >= ARRIVAL_PROGRESS_WINDOW_MINUTES) {
    return MIN_PERCENTAGE;
  }

  const clamped = Math.max(0, minutesUntilArrival);
  const ratio = (ARRIVAL_PROGRESS_WINDOW_MINUTES - clamped) / ARRIVAL_PROGRESS_WINDOW_MINUTES;
  return Math.round(ratio * MAX_PERCENTAGE);
}

export function calculatePastProgress(minutesSinceDeparture: number): number {
  if (minutesSinceDeparture <= 0) {
    return MIN_PERCENTAGE;
  }

  if (minutesSinceDeparture >= ARRIVAL_PROGRESS_WINDOW_MINUTES) {
    return MAX_PERCENTAGE;
  }

  const ratio = minutesSinceDeparture / ARRIVAL_PROGRESS_WINDOW_MINUTES;
  return Math.max(MIN_VISIBLE_PERCENTAGE, Math.ceil(ratio * MAX_PERCENTAGE));
}
