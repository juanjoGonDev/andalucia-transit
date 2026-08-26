import { Injectable, inject } from '@angular/core';
import { AppConfig } from '@core/config';
import { RuntimeFlagsService } from '@core/runtime/runtime-flags.service';
import { APP_CONFIG_TOKEN } from '@core/tokens/app-config.token';

export interface RouteSearchPreferencesStored {
  readonly previewEnabled: boolean;
}

const JSON_PARSE_REVIVER = (_key: string, value: unknown): unknown => value;
const MOCK_PREVIEW_PREFERENCES: RouteSearchPreferencesStored = Object.freeze({
  previewEnabled: false,
});

@Injectable({ providedIn: 'root' })
export class RouteSearchPreferencesStorage {
  private readonly config: AppConfig = inject(APP_CONFIG_TOKEN);
  private readonly runtimeFlags = inject(RuntimeFlagsService);
  private memoryStore: string | null = null;

  load(): RouteSearchPreferencesStored | null {
    if (this.isMockModeActive()) {
      return MOCK_PREVIEW_PREFERENCES;
    }

    const raw = this.readValue();

    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw, JSON_PARSE_REVIVER);

      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      const candidate = parsed as Partial<RouteSearchPreferencesStored>;

      if (typeof candidate.previewEnabled !== 'boolean') {
        return null;
      }

      return { previewEnabled: candidate.previewEnabled } satisfies RouteSearchPreferencesStored;
    } catch {
      return null;
    }
  }

  save(preferences: RouteSearchPreferencesStored): void {
    if (this.isMockModeActive()) {
      return;
    }

    const payload = JSON.stringify(preferences);
    this.writeValue(payload);
  }

  private isMockModeActive(): boolean {
    return this.runtimeFlags.mockDataMode() !== null;
  }

  private readValue(): string | null {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return this.memoryStore;
    }

    return window.localStorage.getItem(this.storageKey);
  }

  private writeValue(value: string | null): void {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      this.memoryStore = value;
      return;
    }

    if (value === null) {
      window.localStorage.removeItem(this.storageKey);
      return;
    }

    window.localStorage.setItem(this.storageKey, value);
  }

  private get storageKey(): string {
    return this.config.homeData.recentStops.preferences.storageKey;
  }
}
