import { Injectable, inject } from '@angular/core';
import { RuntimeFlagsService } from '@core/runtime/runtime-flags.service';

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

  load(): readonly LineFavoriteStoredItem[] {
    if (this.isMockModeActive()) {
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
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return this.memoryStore;
    }

    return window.localStorage.getItem(LINE_FAVORITES_STORAGE_KEY);
  }

  private writeValue(value: string | null): void {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      this.memoryStore = value;
      return;
    }

    if (value === null) {
      window.localStorage.removeItem(LINE_FAVORITES_STORAGE_KEY);
      this.memoryStore = null;
      return;
    }

    window.localStorage.setItem(LINE_FAVORITES_STORAGE_KEY, value);
    this.memoryStore = value;
  }

  private isMockModeActive(): boolean {
    return this.runtimeFlags.mockDataMode() !== null;
  }
}
