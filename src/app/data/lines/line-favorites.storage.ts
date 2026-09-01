import { Injectable, inject } from '@angular/core';
import { MockDataMode, RuntimeFlagsService } from '@core/runtime/runtime-flags.service';
import { getMockLineFavoriteStoredItems } from '@data/mock/home-mock-data';

export interface LineFavoriteStoredItem {
  readonly id: string;
  readonly consortiumId: number;
  readonly lineId: string;
  readonly code: string;
  readonly name: string;
  readonly mode: string;
}

const LINE_FAVORITES_STORAGE_KEY = 'andalucia-transit.lineFavorites' as const;
const JSON_PARSE_REVIVER = (_key: string, value: unknown): unknown => value;

@Injectable({ providedIn: 'root' })
export class LineFavoritesStorage {
  private readonly runtimeFlags = inject(RuntimeFlagsService);
  private memoryStore: string | null = null;
  private preferMemoryStore = false;

  load(): readonly LineFavoriteStoredItem[] {
    const mode = this.mockDataMode();

    if (mode === 'data') {
      return getMockLineFavoriteStoredItems();
    }

    if (mode === 'empty') {
      return [];
    }

    const raw = this.readValue();
    if (!raw) {
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(raw, JSON_PARSE_REVIVER);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .map((candidate) => this.normalize(candidate))
        .filter((candidate): candidate is LineFavoriteStoredItem => candidate !== null);
    } catch {
      return [];
    }
  }

  save(entries: readonly LineFavoriteStoredItem[]): void {
    if (this.isMockModeActive()) {
      return;
    }

    this.writeValue(JSON.stringify(entries));
  }

  clear(): void {
    if (this.isMockModeActive()) {
      return;
    }

    this.writeValue(null);
  }

  private normalize(value: unknown): LineFavoriteStoredItem | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const candidate = value as Partial<LineFavoriteStoredItem>;
    if (
      typeof candidate.id !== 'string' ||
      typeof candidate.consortiumId !== 'number' ||
      !Number.isSafeInteger(candidate.consortiumId) ||
      candidate.consortiumId <= 0 ||
      typeof candidate.lineId !== 'string' ||
      typeof candidate.code !== 'string' ||
      typeof candidate.name !== 'string' ||
      typeof candidate.mode !== 'string'
    ) {
      return null;
    }

    const lineId = candidate.lineId.trim();
    const code = candidate.code.trim();
    const name = candidate.name.trim();
    if (!lineId || !code || !name) {
      return null;
    }

    return {
      id: candidate.id,
      consortiumId: candidate.consortiumId,
      lineId,
      code,
      name,
      mode: candidate.mode.trim()
    };
  }

  private readValue(): string | null {
    if (this.preferMemoryStore) {
      return this.memoryStore;
    }

    const storage = this.resolveStorage();
    if (!storage) {
      return this.memoryStore;
    }

    try {
      const value = storage.getItem(LINE_FAVORITES_STORAGE_KEY);
      this.memoryStore = value;
      return value;
    } catch {
      this.preferMemoryStore = true;
      return this.memoryStore;
    }
  }

  private writeValue(value: string | null): void {
    this.memoryStore = value;
    const storage = this.resolveStorage();
    if (!storage) {
      return;
    }

    try {
      if (value === null) {
        storage.removeItem(LINE_FAVORITES_STORAGE_KEY);
      } else {
        storage.setItem(LINE_FAVORITES_STORAGE_KEY, value);
      }
      this.preferMemoryStore = false;
    } catch {
      this.preferMemoryStore = true;
    }
  }

  private resolveStorage(): Storage | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }

  private mockDataMode(): MockDataMode {
    return this.runtimeFlags.mockDataMode();
  }

  private isMockModeActive(): boolean {
    return this.mockDataMode() !== null;
  }
}
