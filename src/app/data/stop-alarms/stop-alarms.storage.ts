import { Injectable, inject } from '@angular/core';
import { AppConfig } from '@core/config';
import { MockDataMode, RuntimeFlagsService } from '@core/runtime/runtime-flags.service';
import { APP_CONFIG_TOKEN } from '@core/tokens/app-config.token';
import {
  StopAlarm,
  normalizeRepeatWeekdays
} from '@domain/stop-alarms/stop-alarm.model';

const MAX_OFFSET_MINUTES = 24 * 60;

/**
 * localStorage persistence for stop alarms. Mirrors the conventions of the
 * favorites storages: strict normalization on read, mock-mode aware on write.
 */
@Injectable({ providedIn: 'root' })
export class StopAlarmsStorage {
  private readonly config: AppConfig = inject(APP_CONFIG_TOKEN);
  private readonly runtimeFlags = inject(RuntimeFlagsService);
  private memoryStore: string | null = null;

  load(): readonly StopAlarm[] {
    const mode = this.mockDataMode();

    if (mode === 'data') {
      return [];
    }

    if (mode === 'empty') {
      return [];
    }

    const raw = this.readValue();

    if (!raw) {
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        return [];
      }

      const entries: StopAlarm[] = [];

      for (const candidate of parsed) {
        const alarm = normalizeAlarm(candidate);

        if (alarm) {
          entries.push(alarm);
        }
      }

      return entries;
    } catch {
      return [];
    }
  }

  save(entries: readonly StopAlarm[]): void {
    if (this.isMockModeActive()) {
      this.memoryStore = JSON.stringify(entries);
      return;
    }

    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      this.memoryStore = JSON.stringify(entries);
      return;
    }

    const storageKey = this.config.alarms.storageKey;
    window.localStorage.setItem(storageKey, JSON.stringify(entries));
    this.memoryStore = null;
  }

  clear(): void {
    if (this.isMockModeActive()) {
      this.memoryStore = null;
      return;
    }

    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      this.memoryStore = null;
      return;
    }

    window.localStorage.removeItem(this.config.alarms.storageKey);
  }

  private mockDataMode(): MockDataMode {
    return this.runtimeFlags.mockDataMode();
  }

  private isMockModeActive(): boolean {
    return this.mockDataMode() !== null;
  }

  private readValue(): string | null {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return this.memoryStore;
    }

    return window.localStorage.getItem(this.config.alarms.storageKey);
  }
}

function normalizeAlarm(value: unknown): StopAlarm | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<StopAlarm>;

  if (
    typeof candidate.id !== 'string' ||
    candidate.id.length === 0 ||
    typeof candidate.stopId !== 'string' ||
    typeof candidate.stopName !== 'string' ||
    typeof candidate.lineCode !== 'string' ||
    typeof candidate.destination !== 'string' ||
    typeof candidate.scheduledArrival !== 'string' ||
    Number.isNaN(Date.parse(candidate.scheduledArrival)) ||
    typeof candidate.offsetMinutes !== 'number' ||
    !Number.isFinite(candidate.offsetMinutes) ||
    candidate.offsetMinutes <= 0 ||
    candidate.offsetMinutes > MAX_OFFSET_MINUTES ||
    !isWeekdayList(candidate.repeatWeekdays) ||
    typeof candidate.createdAt !== 'string' ||
    Number.isNaN(Date.parse(candidate.createdAt))
  ) {
    return null;
  }

  return {
    id: candidate.id,
    stopId: candidate.stopId,
    consortiumId: typeof candidate.consortiumId === 'number' ? candidate.consortiumId : null,
    stopName: candidate.stopName,
    lineCode: candidate.lineCode,
    destination: candidate.destination,
    scheduledArrival: candidate.scheduledArrival,
    offsetMinutes: Math.round(candidate.offsetMinutes),
    repeatWeekdays: normalizeRepeatWeekdays(candidate.repeatWeekdays),
    enabled: candidate.enabled !== false,
    createdAt: candidate.createdAt
  } satisfies StopAlarm;
}

function isWeekdayList(value: unknown): value is readonly number[] {
  return (
    Array.isArray(value) &&
    value.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)
  );
}
