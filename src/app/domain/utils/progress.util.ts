const MAX_PERCENTAGE = 100;
const MIN_PERCENTAGE = 0;
const MIN_VISIBLE_PERCENTAGE = 1;
const UPCOMING_EARLY_WINDOW_START_MINUTES = 10;
const UPCOMING_EARLY_WINDOW_END_MINUTES = 5;
const PAST_DELAY_WINDOW_START_MINUTES = 5;
const PAST_DELAY_WINDOW_END_MINUTES = 10;

export const ARRIVAL_PROGRESS_WINDOW_MINUTES = 30;

export type ProgressMarkerPhase = 'before' | 'after';

export interface ProgressMarker {
  readonly startPercentage: number;
  readonly endPercentage: number;
  readonly phase: ProgressMarkerPhase;
  readonly startOffsetMinutes: number;
  readonly endOffsetMinutes: number;
}

export const UPCOMING_EARLY_MARKER = buildUpcomingMarker(
  UPCOMING_EARLY_WINDOW_START_MINUTES,
  UPCOMING_EARLY_WINDOW_END_MINUTES
);

export const PAST_DELAY_MARKER = buildPastMarker(
  PAST_DELAY_WINDOW_START_MINUTES,
  PAST_DELAY_WINDOW_END_MINUTES
);

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

function buildUpcomingMarker(
  windowStartMinutes: number,
  windowEndMinutes: number
): ProgressMarker {
  const start = toUpcomingPercentage(windowStartMinutes);
  const end = toUpcomingPercentage(windowEndMinutes);

  return createMarker(
    'before',
    windowStartMinutes,
    windowEndMinutes,
    Math.min(start, end),
    Math.max(start, end)
  );
}

function buildPastMarker(windowStartMinutes: number, windowEndMinutes: number): ProgressMarker {
  const start = toPastPercentage(windowStartMinutes);
  const end = toPastPercentage(windowEndMinutes);

  return createMarker(
    'after',
    windowStartMinutes,
    windowEndMinutes,
    Math.min(start, end),
    Math.max(start, end)
  );
}

function toUpcomingPercentage(minutesUntilArrival: number): number {
  const clamped = clamp(minutesUntilArrival, 0, ARRIVAL_PROGRESS_WINDOW_MINUTES);
  const ratio = (ARRIVAL_PROGRESS_WINDOW_MINUTES - clamped) / ARRIVAL_PROGRESS_WINDOW_MINUTES;
  return toTwoDecimalPercentage(ratio * MAX_PERCENTAGE);
}

function toPastPercentage(minutesSinceDeparture: number): number {
  const clamped = clamp(minutesSinceDeparture, 0, ARRIVAL_PROGRESS_WINDOW_MINUTES);
  const ratio = clamped / ARRIVAL_PROGRESS_WINDOW_MINUTES;
  return toTwoDecimalPercentage(ratio * MAX_PERCENTAGE);
}

function createMarker(
  phase: ProgressMarkerPhase,
  firstOffsetMinutes: number,
  secondOffsetMinutes: number,
  startPercentage: number,
  endPercentage: number
): ProgressMarker {
  const orderedOffsets = orderOffsets(phase, firstOffsetMinutes, secondOffsetMinutes);

  return {
    startPercentage,
    endPercentage,
    phase,
    startOffsetMinutes: orderedOffsets.start,
    endOffsetMinutes: orderedOffsets.end
  } satisfies ProgressMarker;
}

function orderOffsets(
  phase: ProgressMarkerPhase,
  firstOffsetMinutes: number,
  secondOffsetMinutes: number
): { start: number; end: number } {
  if (phase === 'before') {
    const maximum = Math.max(firstOffsetMinutes, secondOffsetMinutes);
    const minimum = Math.min(firstOffsetMinutes, secondOffsetMinutes);
    return { start: maximum, end: minimum };
  }

  const minimum = Math.min(firstOffsetMinutes, secondOffsetMinutes);
  const maximum = Math.max(firstOffsetMinutes, secondOffsetMinutes);
  return { start: minimum, end: maximum };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function toTwoDecimalPercentage(value: number): number {
  return Number(value.toFixed(2));
}
