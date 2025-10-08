const MAX_PERCENTAGE = 100;
const MIN_PERCENTAGE = 0;
export const ARRIVAL_PROGRESS_WINDOW_MINUTES = 30;

export function calculateUpcomingProgress(minutesUntilArrival: number): number {
  if (minutesUntilArrival <= 0) {
    return MIN_PERCENTAGE;
  }

  if (minutesUntilArrival >= ARRIVAL_PROGRESS_WINDOW_MINUTES) {
    return MAX_PERCENTAGE;
  }

  const ratio = minutesUntilArrival / ARRIVAL_PROGRESS_WINDOW_MINUTES;
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
  return Math.round(ratio * MAX_PERCENTAGE);
}
