import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AppConfig } from '@core/config';
import { APP_CONFIG_TOKEN } from '@core/tokens/app-config.token';
import { StopAlarmsStorage } from '@data/stop-alarms/stop-alarms.storage';
import {
  StopAlarm,
  StopAlarmRuntime,
  buildStopAlarmId,
  computeNextTriggerAt,
  normalizeRepeatWeekdays
} from '@domain/stop-alarms/stop-alarm.model';

export interface StopAlarmCandidate {
  readonly stopId: string;
  readonly serviceId: string;
  readonly consortiumId: number | null;
  readonly stopName: string;
  readonly lineCode: string;
  readonly destination: string;
  readonly scheduledArrival: Date;
  readonly offsetMinutes: number;
  readonly repeatWeekdays: readonly number[];
}

/**
 * Source of truth for stop alarms: hydrates persisted alarms on boot, exposes
 * the runtime view (with resolved next trigger) and owns all mutations.
 * The scheduler consumes `alarms$`; the UI consumes the query helpers.
 * One alarm exists per (stop, service) pair: creating it again updates it.
 */
@Injectable({ providedIn: 'root' })
export class StopAlarmsService {
  private readonly storage = inject(StopAlarmsStorage);
  private readonly config: AppConfig = inject(APP_CONFIG_TOKEN);

  private readonly alarmsSubject = new BehaviorSubject<readonly StopAlarmRuntime[]>(
    this.hydrate(this.storage.load())
  );
  readonly alarms$: Observable<readonly StopAlarmRuntime[]> = this.alarmsSubject.asObservable();

  get snapshot(): readonly StopAlarmRuntime[] {
    return this.alarmsSubject.getValue();
  }

  serviceAlarmId(stopId: string, serviceId: string): string {
    return buildStopAlarmId(stopId, serviceId);
  }

  has(alarmId: string): boolean {
    return this.snapshot.some((alarm) => alarm.id === alarmId);
  }

  hasServiceAlarm(stopId: string, serviceId: string): boolean {
    return this.has(this.serviceAlarmId(stopId, serviceId));
  }

  get(alarmId: string): StopAlarmRuntime | null {
    return this.snapshot.find((alarm) => alarm.id === alarmId) ?? null;
  }

  countForStop(stopId: string): number {
    return this.snapshot.filter((alarm) => alarm.stopId === stopId).length;
  }

  /**
   * Creates (or updates) the alarm for a service. Returns null when the target
   * time is unreachable or the per-stop limit would be exceeded.
   */
  add(candidate: StopAlarmCandidate): StopAlarm | null {
    const existing = this.get(this.serviceAlarmId(candidate.stopId, candidate.serviceId));

    if (!existing && this.countForStop(candidate.stopId) >= this.config.alarms.maxPerStop) {
      return null;
    }

    const alarm: StopAlarm = {
      id: this.serviceAlarmId(candidate.stopId, candidate.serviceId),
      stopId: candidate.stopId,
      consortiumId: candidate.consortiumId,
      stopName: candidate.stopName,
      lineCode: candidate.lineCode,
      destination: candidate.destination,
      scheduledArrival: candidate.scheduledArrival.toISOString(),
      offsetMinutes: candidate.offsetMinutes,
      repeatWeekdays: normalizeRepeatWeekdays(candidate.repeatWeekdays),
      enabled: true,
      createdAt: existing?.createdAt ?? new Date().toISOString()
    };
    const nextTriggerAt = computeNextTriggerAt(alarm, {
      now: Date.now(),
      maxRepeatDays: this.config.alarms.maxRepeatDays
    });

    if (nextTriggerAt === null) {
      return null;
    }

    this.upsert({ ...alarm, nextTriggerAt });
    return alarm;
  }

  remove(alarmId: string): void {
    this.replace(this.snapshot.filter((alarm) => alarm.id !== alarmId));
  }

  /**
   * Re-saves an existing alarm's offset and recurrence, preserving identity and enabled
   * state. Returns false when the alarm is unknown or the new schedule can never ring
   * again (the alarm is dropped in that case, mirroring `add()` semantics).
   */
  update(
    alarmId: string,
    changes: {
      readonly offsetMinutes: number;
      readonly repeatWeekdays: readonly number[]
    }
  ): boolean {
    const alarm = this.get(alarmId);

    if (!alarm) {
      return false;
    }

    const { nextTriggerAt: _previousTrigger, ...persistent } = alarm;
    const updated: StopAlarm = {
      ...persistent,
      offsetMinutes: changes.offsetMinutes,
      repeatWeekdays: normalizeRepeatWeekdays(changes.repeatWeekdays)
    };
    const nextTriggerAt = computeNextTriggerAt(updated, {
      now: Date.now(),
      maxRepeatDays: this.config.alarms.maxRepeatDays
    });

    if (nextTriggerAt === null) {
      this.remove(alarmId);
      return false;
    }

    this.upsert({ ...updated, nextTriggerAt });
    return true;
  }

  /**
   * Enables or disables an alarm. Disabled alarms stay listed but never ring
   * or advance. Re-enabling reschedules from scratch: one-shot alarms whose
   * target already elapsed are dropped (returns false), repeating alarms roll
   * to their next daily slot.
   */
  setEnabled(alarmId: string, enabled: boolean): boolean {
    const alarm = this.get(alarmId);

    if (!alarm || alarm.enabled === enabled) {
      return alarm !== null;
    }

    if (!enabled) {
      this.upsert({ ...alarm, enabled: false });
      return true;
    }

    const nextTriggerAt = computeNextTriggerAt(alarm, {
      now: Date.now(),
      maxRepeatDays: this.config.alarms.maxRepeatDays
    });

    if (nextTriggerAt === null) {
      this.remove(alarmId);
      return false;
    }

    this.upsert({ ...alarm, enabled: true, nextTriggerAt });
    return true;
  }

  removeAll(): void {
    this.replace([]);
  }

  removeServiceAlarm(stopId: string, serviceId: string): void {
    this.remove(this.serviceAlarmId(stopId, serviceId));
  }

  removeAllForStop(stopId: string): void {
    this.replace(this.snapshot.filter((alarm) => alarm.stopId !== stopId));
  }

  /** Re-arms an alarm that just fired, advancing the daily repetition, or drops it. */
  rescheduleAfterFiring(alarm: StopAlarmRuntime, nextTriggerAt: number | null): void {
    if (nextTriggerAt === null) {
      this.remove(alarm.id);
      return;
    }

    this.upsert({ ...alarm, nextTriggerAt });
  }

  /** Drops expired alarms and recomputes triggers after the app was closed. */
  refreshRuntime(): void {
    this.replace(this.hydrate(this.snapshot));
  }

  private upsert(alarm: StopAlarmRuntime): void {
    const rest = this.snapshot.filter((entry) => entry.id !== alarm.id);
    this.replace([...rest, alarm].sort(compareByTrigger));
  }

  private replace(entries: readonly StopAlarmRuntime[]): void {
    const sorted = [...entries].sort(compareByTrigger);
    this.alarmsSubject.next(sorted);
    this.storage.save(sorted.map(toPersistentAlarm));
  }

  private hydrate(entries: readonly StopAlarm[]): readonly StopAlarmRuntime[] {
    const now = Date.now();
    const hydrated: StopAlarmRuntime[] = [];

    for (const entry of entries) {
      const nextTriggerAt = computeNextTriggerAt(entry, {
        now,
        maxRepeatDays: this.config.alarms.maxRepeatDays,
        graceMs: entry.enabled ? this.config.alarms.missedTriggerGraceMs : undefined
      });

      // Disabled alarms are kept listed even when unreachable; the scheduler
      // skips them until the user re-enables (and reschedules) or deletes them.
      if (nextTriggerAt !== null || !entry.enabled) {
        hydrated.push({ ...entry, nextTriggerAt });
      }
    }

    return hydrated.sort(compareByTrigger);
  }
}

function compareByTrigger(
  first: StopAlarmRuntime,
  second: StopAlarmRuntime
): number {
  const firstTrigger = first.nextTriggerAt ?? Number.MAX_SAFE_INTEGER;
  const secondTrigger = second.nextTriggerAt ?? Number.MAX_SAFE_INTEGER;

  return firstTrigger - secondTrigger;
}

function toPersistentAlarm(alarm: StopAlarmRuntime): StopAlarm {
  const { nextTriggerAt: _nextTriggerAt, ...persistent } = alarm;
  return persistent satisfies StopAlarm;
}
