const MAX_PERCENTAGE = 100;
const MIN_PERCENTAGE = 0;
export const ARRIVAL_PROGRESS_WINDOW_MINUTES = 30;

export function calculateArrivalProgress(minutesUntilArrival: number): number {
  if (minutesUntilArrival <= 0) {
    return MAX_PERCENTAGE;
  }

  if (minutesUntilArrival >= ARRIVAL_PROGRESS_WINDOW_MINUTES) {
    return MIN_PERCENTAGE;
  }

  const ratio =
    (ARRIVAL_PROGRESS_WINDOW_MINUTES - minutesUntilArrival) / ARRIVAL_PROGRESS_WINDOW_MINUTES;
  return Math.round(ratio * MAX_PERCENTAGE);
}
