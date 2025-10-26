import { Injectable, inject } from '@angular/core';
import { AppConfig } from '@core/config';
import { MockDataMode, RuntimeFlagsService } from '@core/runtime/runtime-flags.service';
import { APP_CONFIG_TOKEN } from '@core/tokens/app-config.token';
import { getMockFavoriteStoredItems } from '@data/mock/home-mock-data';

export interface StopFavoriteStoredItem {
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

const JSON_PARSE_REVIVER = (_key: string, value: unknown): unknown => value;

@Injectable({ providedIn: 'root' })
export class StopFavoritesStorage {
  private readonly config: AppConfig = inject(APP_CONFIG_TOKEN);
  private readonly runtimeFlags = inject(RuntimeFlagsService);
  private memoryStore: string | null = null;

  load(): readonly StopFavoriteStoredItem[] {
    const mode = this.mockDataMode();

    if (mode === 'data') {
      return getMockFavoriteStoredItems();
    }

    if (mode === 'empty') {
      return [];
    }

    const raw = this.readValue();

    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw, JSON_PARSE_REVIVER);

      if (!Array.isArray(parsed)) {
        return [];
      }

      const entries: StopFavoriteStoredItem[] = [];

      for (const candidate of parsed) {
        const item = this.normalize(candidate);

        if (item) {
          entries.push(item);
        }
      }

      return entries;
    } catch {
      return [];
    }
  }

  save(entries: readonly StopFavoriteStoredItem[]): void {
    if (this.isMockModeActive()) {
      return;
    }

    const payload = JSON.stringify(entries);
    this.writeValue(payload);
  }

  clear(): void {
    if (this.isMockModeActive()) {
      return;
    }

    this.writeValue(null);
  }

  private normalize(value: unknown): StopFavoriteStoredItem | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const candidate = value as Partial<StopFavoriteStoredItem>;

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
    } satisfies StopFavoriteStoredItem;
  }

  private readValue(): string | null {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return this.memoryStore;
    }

    return window.localStorage.getItem(this.config.homeData.favoriteStops.storageKey);
  }

  private writeValue(value: string | null): void {
    if (this.isMockModeActive()) {
      this.memoryStore = value;
      return;
    }

    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      this.memoryStore = value;
      return;
    }

    const storageKey = this.config.homeData.favoriteStops.storageKey;

    if (value === null) {
      window.localStorage.removeItem(storageKey);
      this.memoryStore = null;
      return;
    }

    window.localStorage.setItem(storageKey, value);
    this.memoryStore = value;
  }

  private mockDataMode(): MockDataMode {
    return this.runtimeFlags.mockDataMode();
  }

  private isMockModeActive(): boolean {
    return this.mockDataMode() !== null;
  }
}
