import { differenceInMinutes } from '@domain/utils/time.util';

/** Persisted alarm definition, targeted at one scheduled service of a stop. */
export interface StopAlarm {
  readonly id: string;
  readonly stopId: string;
  readonly consortiumId: number | null;
  readonly stopName: string;
  readonly lineCode: string;
  readonly destination: string;
  /** ISO timestamp of the scheduled arrival the alarm was created for. */
  readonly scheduledArrival: string;
  /** Minutes before the scheduled arrival at which the notification fires. */
  readonly offsetMinutes: number;
  /**
   * Weekdays (0 = Sunday ... 6 = Saturday) on which the alarm re-arms at the same
   * time-of-day. An empty list marks the alarm as one-shot.
   */
  readonly repeatWeekdays: readonly number[];
  /** Disabled alarms stay listed but never ring or advance until re-enabled. */
  readonly enabled: boolean;
  readonly createdAt: string;
}

/** Alarm enriched with the derived scheduling state used while the app runs. */
export interface StopAlarmRuntime extends StopAlarm {
  /** Epoch ms of the next pending ring; null when the alarm is disabled and unreachable. */
  readonly nextTriggerAt: number | null;
}

export interface AlarmTriggerOptions {
  readonly now: number;
  readonly maxRepeatDays: number;
  /**
   * When set, triggers that elapsed within this window are kept as pending
   * (they still ring, e.g. right after the app was reopened) instead of being
   * silently rolled forward or dropped.
   */
  readonly graceMs?: number;
}

const MILLISECONDS_PER_MINUTE = 60_000;
const MILLISECONDS_PER_DAY = 24 * 60 * MILLISECONDS_PER_MINUTE;
const WEEKDAY_COUNT = 7;
const WEEKDAY_MIN = 0;
const WEEKDAY_MAX = 6;
const WEEKDAY_ROLL_LIMIT = WEEKDAY_COUNT + 1;

export function buildStopAlarmId(stopId: string, serviceId: string): string {
  return `${stopId}::${serviceId}`;
}

export function splitStopAlarmId(id: string): { stopId: string; serviceId: string } | null {
  const separatorIndex = id.indexOf('::');

  if (separatorIndex <= 0 || separatorIndex === id.length - 2) {
    return null;
  }

  return {
    stopId: id.slice(0, separatorIndex),
    serviceId: id.slice(separatorIndex + 2)
  };
}

/** Epoch ms at which the notification for `scheduledArrival` should fire, or null when unreachable. */
export function computeTriggerAt(scheduledArrival: string, offsetMinutes: number): number | null {
  const arrival = Date.parse(scheduledArrival);

  if (Number.isNaN(arrival)) {
    return null;
  }

  return arrival - offsetMinutes * MILLISECONDS_PER_MINUTE;
}

/** True when the alarm re-arms on a weekly schedule instead of firing once. */
export function isRecurringAlarm(alarm: StopAlarm): boolean {
  return alarm.repeatWeekdays.length > 0;
}

function isSelectedWeekday(weekdays: readonly number[], epochMs: number): boolean {
  return weekdays.includes(new Date(epochMs).getDay());
}

function findRecurringTrigger(
  base: number,
  alarm: StopAlarm,
  options: AlarmTriggerOptions,
  expiration: number
): number | null {
  const maxTriggerAt = expiration + options.maxRepeatDays * MILLISECONDS_PER_DAY;
  const searchLimit = options.maxRepeatDays + WEEKDAY_ROLL_LIMIT;

  for (let dayOffset = 0; dayOffset <= searchLimit; dayOffset++) {
    const candidate = base + dayOffset * MILLISECONDS_PER_DAY;

    if (candidate > maxTriggerAt) {
      return null;
    }

    if (!isSelectedWeekday(alarm.repeatWeekdays, candidate)) {
      continue;
    }

    if (candidate > options.now) {
      return candidate;
    }

    if (
      dayOffset === 0 &&
      options.graceMs !== undefined &&
      options.now - candidate <= options.graceMs
    ) {
      return candidate;
    }
  }

  return null;
}

/**
 * Resolves the next pending trigger for an alarm.
 * - One-shot alarms in the past return null (expired).
 * - Recurring alarms roll forward to the soonest selected weekday within the
 *   repeat window; otherwise they expire.
 */
export function computeNextTriggerAt(
  alarm: StopAlarm,
  options: AlarmTriggerOptions
): number | null {
  const base = computeTriggerAt(alarm.scheduledArrival, alarm.offsetMinutes);

  if (base === null) {
    return null;
  }

  const expiration = computeTriggerAt(alarm.scheduledArrival, 0);

  if (expiration === null) {
    return null;
  }

  if (!isRecurringAlarm(alarm)) {
    if (base > options.now) {
      return base;
    }

    return options.graceMs !== undefined && options.now - base <= options.graceMs ? base : null;
  }

  return findRecurringTrigger(base, alarm, options, expiration);
}

/** Advances a recurring alarm that just fired to its next selected weekday, or null when it expires. */
export function advanceRepeatTrigger(
  alarm: StopAlarm,
  firedTriggerAt: number,
  options: AlarmTriggerOptions
): number | null {
  if (!isRecurringAlarm(alarm)) {
    return null;
  }

  const arrivalMs = Date.parse(alarm.scheduledArrival);

  if (Number.isNaN(arrivalMs)) {
    return null;
  }

  const maxTriggerAt =
    arrivalMs -
    alarm.offsetMinutes * MILLISECONDS_PER_MINUTE +
    options.maxRepeatDays * MILLISECONDS_PER_DAY;

  for (let dayOffset = 1; dayOffset <= WEEKDAY_ROLL_LIMIT; dayOffset++) {
    const candidate = firedTriggerAt + dayOffset * MILLISECONDS_PER_DAY;

    if (!isSelectedWeekday(alarm.repeatWeekdays, candidate)) {
      continue;
    }

    if (candidate <= options.now) {
      continue;
    }

    return candidate <= maxTriggerAt ? candidate : null;
  }

  return null;
}

/** True when the alarm would fire for a departure that already happened (or is too close). */
export function isAlarmTargetInThePast(
  scheduledArrival: string,
  offsetMinutes: number,
  now: number
): boolean {
  const triggerAt = computeTriggerAt(scheduledArrival, offsetMinutes);

  return triggerAt === null || triggerAt <= now;
}

export function minutesUntilTrigger(triggerAt: number, now: number): number {
  return Math.max(0, differenceInMinutes(new Date(triggerAt), new Date(now)));
}

/** Sanitizes raw weekday selections into a deterministic ascending list. */
export function normalizeRepeatWeekdays(raw: readonly number[]): number[] {
  return [...new Set(raw)]
    .filter(
      (day): day is number =>
        typeof day === 'number' &&
        Number.isInteger(day) &&
        day >= WEEKDAY_MIN &&
        day <= WEEKDAY_MAX
    )
    .sort((a, b) => a - b);
}
