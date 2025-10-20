import { Injectable, inject } from '@angular/core';
import { AppConfig } from '@core/config';
import { APP_CONFIG_TOKEN } from '@core/tokens/app-config.token';

export interface RouteSearchPreferencesStored {
  readonly previewEnabled: boolean;
}

const JSON_PARSE_REVIVER = (_key: string, value: unknown): unknown => value;

@Injectable({ providedIn: 'root' })
export class RouteSearchPreferencesStorage {
  private readonly config: AppConfig = inject(APP_CONFIG_TOKEN);
  private memoryStore: string | null = null;

  load(): RouteSearchPreferencesStored | null {
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
    const payload = JSON.stringify(preferences);
    this.writeValue(payload);
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
