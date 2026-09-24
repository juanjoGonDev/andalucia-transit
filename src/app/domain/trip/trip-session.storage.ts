import { Injectable } from '@angular/core';

export const TRIP_SESSION_STORAGE_KEY = 'andalucia-transit.tripSession' as const;

export interface TripSessionRecord {
  readonly departureId: string;
  readonly consortiumId: number;
  readonly lineId: string;
  readonly lineCode: string;
  readonly direction: number;
  readonly destination: string;
  readonly originStopId: string;
  readonly destinationStopId: string;
  readonly originName: string;
  readonly destinationName: string;
  readonly departTime: string;
  readonly arriveTime: string;
}

/**
 * Persists the single active live-trip session so the tracking page survives reloads and
 * stays deep-linkable. Sessions are replaced wholesale when a new trip starts.
 */
@Injectable({ providedIn: 'root' })
export class TripSessionStorage {
  load(): TripSessionRecord | null {
    const raw = this.readRaw();

    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;

      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      return this.normalize(parsed as Partial<TripSessionRecord>);
    } catch {
      return null;
    }
  }

  save(record: TripSessionRecord): void {
    this.writeRaw(JSON.stringify(record));
  }

  clear(): void {
    this.writeRaw(null);
  }

  private normalize(candidate: Partial<TripSessionRecord>): TripSessionRecord | null {
    if (
      typeof candidate.departureId !== 'string' ||
      typeof candidate.consortiumId !== 'number' ||
      !Number.isFinite(candidate.consortiumId) ||
      typeof candidate.lineId !== 'string' ||
      typeof candidate.lineCode !== 'string' ||
      typeof candidate.direction !== 'number' ||
      typeof candidate.destination !== 'string' ||
      typeof candidate.originStopId !== 'string' ||
      typeof candidate.destinationStopId !== 'string' ||
      typeof candidate.originName !== 'string' ||
      typeof candidate.destinationName !== 'string' ||
      typeof candidate.departTime !== 'string' ||
      typeof candidate.arriveTime !== 'string' ||
      Number.isNaN(Date.parse(candidate.departTime)) ||
      Number.isNaN(Date.parse(candidate.arriveTime))
    ) {
      return null;
    }

    return candidate as TripSessionRecord;
  }

  private readRaw(): string | null {
    try {
      return window.localStorage.getItem(TRIP_SESSION_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private writeRaw(value: string | null): void {
    try {
      if (value === null) {
        window.localStorage.removeItem(TRIP_SESSION_STORAGE_KEY);
      } else {
        window.localStorage.setItem(TRIP_SESSION_STORAGE_KEY, value);
      }
    } catch {
      // Storage may be unavailable (private mode, quota); tracking still works in-memory.
    }
  }
}
