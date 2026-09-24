import { Injectable, inject } from '@angular/core';
import { RouteSearchHistoryStoredSelection } from '@data/route-search/route-search-history.storage';
import { RouteSearchHistoryStorage } from '@data/route-search/route-search-history.storage';

export const PINNED_DEPARTURE_STORAGE_KEY = 'andalucia-transit.pinnedDeparture' as const;

export interface PinnedDepartureRecord {
  readonly departureId: string;
  readonly lineId: string;
  readonly lineCode: string;
  readonly direction: number;
  readonly destination: string;
  readonly consortiumId: number;
  readonly arrivalTime: string;
  readonly pinnedAt: string;
  readonly selection: RouteSearchHistoryStoredSelection;
}

/**
 * Persists the single active pinned departure. The stored selection reuses the recent-search
 * history shape, so validation is delegated to the history storage normalizer.
 */
@Injectable({ providedIn: 'root' })
export class PinnedDepartureStorage {
  private readonly historyStorage = inject(RouteSearchHistoryStorage);

  load(): PinnedDepartureRecord | null {
    const raw = this.readRaw();

    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;

      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      return this.normalize(parsed as Partial<PinnedDepartureRecord>);
    } catch {
      return null;
    }
  }

  save(record: PinnedDepartureRecord): void {
    this.writeRaw(JSON.stringify(record));
  }

  clear(): void {
    this.writeRaw(null);
  }

  private normalize(candidate: Partial<PinnedDepartureRecord>): PinnedDepartureRecord | null {
    if (
      typeof candidate.departureId !== 'string' ||
      typeof candidate.lineId !== 'string' ||
      typeof candidate.lineCode !== 'string' ||
      typeof candidate.direction !== 'number' ||
      typeof candidate.destination !== 'string' ||
      typeof candidate.consortiumId !== 'number' ||
      typeof candidate.arrivalTime !== 'string' ||
      typeof candidate.pinnedAt !== 'string' ||
      !candidate.selection
    ) {
      return null;
    }

    const selection = this.historyStorage.normalizeSelection(candidate.selection);

    if (!selection) {
      return null;
    }

    if (
      Number.isNaN(Date.parse(candidate.arrivalTime)) ||
      Number.isNaN(Date.parse(candidate.pinnedAt))
    ) {
      return null;
    }

    return {
      departureId: candidate.departureId,
      lineId: candidate.lineId,
      lineCode: candidate.lineCode,
      direction: candidate.direction,
      destination: candidate.destination,
      consortiumId: candidate.consortiumId,
      arrivalTime: candidate.arrivalTime,
      pinnedAt: candidate.pinnedAt,
      selection
    } satisfies PinnedDepartureRecord;
  }

  private readRaw(): string | null {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return null;
    }

    return window.localStorage.getItem(PINNED_DEPARTURE_STORAGE_KEY);
  }

  private writeRaw(value: string | null): void {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return;
    }

    if (value === null) {
      window.localStorage.removeItem(PINNED_DEPARTURE_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(PINNED_DEPARTURE_STORAGE_KEY, value);
  }
}
