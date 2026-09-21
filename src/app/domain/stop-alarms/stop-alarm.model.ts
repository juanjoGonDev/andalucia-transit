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
  /** When true the alarm re-arms every day at the same time until deactivated. */
  readonly repeatDaily: boolean;
  readonly createdAt: string;
}

/** Alarm enriched with the derived scheduling state used while the app runs. */
export interface StopAlarmRuntime extends StopAlarm {
  readonly nextTriggerAt: number;
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

/**
 * Resolves the next pending trigger for an alarm.
 * - One-shot alarms in the past return null (expired).
 * - Repeating alarms roll forward day by day until they are in the future, and
 *   expire once they would ring beyond `maxRepeatDays` after the scheduled arrival.
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

  if (!alarm.repeatDaily) {
    if (base > options.now) {
      return base;
    }

    return options.graceMs !== undefined && options.now - base <= options.graceMs ? base : null;
  }

  const maxTriggerAt = expiration + options.maxRepeatDays * MILLISECONDS_PER_DAY;
  let candidate = base;

  if (candidate <= options.now) {
    if (options.graceMs !== undefined && options.now - candidate <= options.graceMs) {
      return candidate <= maxTriggerAt ? candidate : null;
    }

    do {
      candidate += MILLISECONDS_PER_DAY;
    } while (candidate <= options.now);
  }

  return candidate <= maxTriggerAt ? candidate : null;
}

/** Advances a repeating alarm that just fired to its next day slot, or null when it expires. */
export function advanceRepeatTrigger(
  alarm: StopAlarm,
  firedTriggerAt: number,
  options: AlarmTriggerOptions
): number | null {
  const arrivalMs = Date.parse(alarm.scheduledArrival);

  if (Number.isNaN(arrivalMs)) {
    return null;
  }

  const maxTriggerAt =
    arrivalMs - alarm.offsetMinutes * MILLISECONDS_PER_MINUTE + options.maxRepeatDays * MILLISECONDS_PER_DAY;
  let candidate = firedTriggerAt + MILLISECONDS_PER_DAY;

  while (candidate <= options.now) {
    candidate += MILLISECONDS_PER_DAY;
  }

  return candidate <= maxTriggerAt ? candidate : null;
}

/** True when the alarm would fire for a departure that already happened (or is too close). */
export function isAlarmTargetInThePast(scheduledArrival: string, offsetMinutes: number, now: number): boolean {
  const triggerAt = computeTriggerAt(scheduledArrival, offsetMinutes);

  return triggerAt === null || triggerAt <= now;
}

export function minutesUntilTrigger(triggerAt: number, now: number): number {
  return Math.max(0, differenceInMinutes(new Date(triggerAt), new Date(now)));
}
