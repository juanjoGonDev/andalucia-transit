import { Injectable, inject } from '@angular/core';
import { AppConfig } from '@core/config';
import { APP_CONFIG_TOKEN } from '@core/tokens/app-config.token';
import { RouteSearchLineMatch } from '@domain/route-search/route-search-state.service';

interface RouteSearchHistoryStoredSelection {
  readonly origin: RouteSearchStoredStopOption;
  readonly destination: RouteSearchStoredStopOption;
  readonly queryDate: string;
  readonly lineMatches: readonly RouteSearchLineMatch[];
}

interface RouteSearchStoredStopOption {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly municipality: string;
  readonly municipalityId: string;
  readonly nucleus: string;
  readonly nucleusId: string;
  readonly consortiumId: number;
  readonly stopIds: readonly string[];
}

export interface RouteSearchHistoryStoredEntry {
  readonly id: string;
  readonly executedAt: string;
  readonly selection: RouteSearchHistoryStoredSelection;
}

const JSON_PARSE_REVIVER = (_key: string, value: unknown): unknown => value;

@Injectable({ providedIn: 'root' })
export class RouteSearchHistoryStorage {
  private readonly config: AppConfig = inject(APP_CONFIG_TOKEN);
  private memoryStore: string | null = null;

  load(): readonly RouteSearchHistoryStoredEntry[] {
    const raw = this.readValue();

    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw, JSON_PARSE_REVIVER);

      if (!Array.isArray(parsed)) {
        return [];
      }

      const entries: RouteSearchHistoryStoredEntry[] = [];

      for (const item of parsed) {
        const entry = this.normalizeEntry(item);

        if (entry) {
          entries.push(entry);
        }
      }

      return entries;
    } catch {
      return [];
    }
  }

  save(entries: readonly RouteSearchHistoryStoredEntry[]): void {
    const payload = JSON.stringify(entries);
    this.writeValue(payload);
  }

  clear(): void {
    this.writeValue(null);
  }

  private normalizeEntry(value: unknown): RouteSearchHistoryStoredEntry | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const candidate = value as Partial<RouteSearchHistoryStoredEntry>;

    if (!candidate.id || !candidate.executedAt || !candidate.selection) {
      return null;
    }

    if (typeof candidate.id !== 'string' || typeof candidate.executedAt !== 'string') {
      return null;
    }

    const selection = this.normalizeSelection(candidate.selection);

    if (!selection) {
      return null;
    }

    return {
      id: candidate.id,
      executedAt: candidate.executedAt,
      selection
    } satisfies RouteSearchHistoryStoredEntry;
  }

  private normalizeSelection(value: unknown): RouteSearchHistoryStoredSelection | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const candidate = value as Partial<RouteSearchHistoryStoredSelection>;

    if (!candidate.origin || !candidate.destination || !candidate.queryDate || !candidate.lineMatches) {
      return null;
    }

    if (typeof candidate.queryDate !== 'string' || !Array.isArray(candidate.lineMatches)) {
      return null;
    }

    const origin = this.normalizeStopOption(candidate.origin);
    const destination = this.normalizeStopOption(candidate.destination);

    if (!origin || !destination) {
      return null;
    }

    if (!candidate.lineMatches.every((match) => this.isValidLineMatch(match))) {
      return null;
    }

    return {
      origin,
      destination,
      queryDate: candidate.queryDate,
      lineMatches: candidate.lineMatches as readonly RouteSearchLineMatch[]
    } satisfies RouteSearchHistoryStoredSelection;
  }

  private normalizeStopOption(value: unknown): RouteSearchStoredStopOption | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const candidate = value as Partial<RouteSearchStoredStopOption>;

    if (
      typeof candidate.id !== 'string' ||
      typeof candidate.code !== 'string' ||
      typeof candidate.name !== 'string' ||
      typeof candidate.municipality !== 'string' ||
      typeof candidate.municipalityId !== 'string' ||
      typeof candidate.nucleus !== 'string' ||
      typeof candidate.nucleusId !== 'string' ||
      typeof candidate.consortiumId !== 'number' ||
      !Array.isArray(candidate.stopIds)
    ) {
      return null;
    }

    if (!candidate.stopIds.every((stopId) => typeof stopId === 'string')) {
      return null;
    }

    return {
      id: candidate.id,
      code: candidate.code,
      name: candidate.name,
      municipality: candidate.municipality,
      municipalityId: candidate.municipalityId,
      nucleus: candidate.nucleus,
      nucleusId: candidate.nucleusId,
      consortiumId: candidate.consortiumId,
      stopIds: candidate.stopIds as readonly string[]
    } satisfies RouteSearchStoredStopOption;
  }

  private isValidLineMatch(value: unknown): value is RouteSearchLineMatch {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<RouteSearchLineMatch>;

    if (
      typeof candidate.lineId !== 'string' ||
      typeof candidate.lineCode !== 'string' ||
      typeof candidate.direction !== 'number' ||
      !Array.isArray(candidate.originStopIds) ||
      !Array.isArray(candidate.destinationStopIds)
    ) {
      return false;
    }

    return (
      candidate.originStopIds.every((stopId) => typeof stopId === 'string') &&
      candidate.destinationStopIds.every((stopId) => typeof stopId === 'string')
    );
  }

  private readValue(): string | null {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return this.memoryStore;
    }

    return window.localStorage.getItem(this.config.homeData.recentStops.storageKey);
  }

  private writeValue(value: string | null): void {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      this.memoryStore = value;
      return;
    }

    const storageKey = this.config.homeData.recentStops.storageKey;

    if (value === null) {
      window.localStorage.removeItem(storageKey);
      this.memoryStore = null;
      return;
    }

    window.localStorage.setItem(storageKey, value);
    this.memoryStore = value;
  }
}
