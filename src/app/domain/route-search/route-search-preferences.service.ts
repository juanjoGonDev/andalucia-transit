import { Injectable, WritableSignal, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable, distinctUntilChanged, map } from 'rxjs';
import { AppConfig } from '@core/config';
import { APP_CONFIG_TOKEN } from '@core/tokens/app-config.token';
import { RouteSearchPreferencesStorage, RouteSearchPreferencesStored } from '@data/route-search/route-search-preferences.storage';

interface RouteSearchPreferencesState {
  readonly previewEnabled: boolean;
}

@Injectable({ providedIn: 'root' })
export class RouteSearchPreferencesService {
  private readonly storage = inject(RouteSearchPreferencesStorage);
  private readonly config: AppConfig = inject(APP_CONFIG_TOKEN);
  private readonly state: WritableSignal<RouteSearchPreferencesState> = signal(this.loadInitial());
  readonly previewEnabled$: Observable<boolean> = toObservable(this.state).pipe(
    map((preferences) => preferences.previewEnabled),
    distinctUntilChanged()
  );

  previewEnabled(): boolean {
    return this.state().previewEnabled;
  }

  setPreviewEnabled(enabled: boolean): void {
    this.state.update((current) => {
      if (current.previewEnabled === enabled) {
        return current;
      }

      const next: RouteSearchPreferencesState = { previewEnabled: enabled };
      this.storage.save(next);
      return next;
    });
  }

  private loadInitial(): RouteSearchPreferencesState {
    const stored = this.storage.load();

    if (stored) {
      return this.normalizeStored(stored);
    }

    return {
      previewEnabled: this.config.homeData.recentStops.preferences.previewEnabledDefault
    } satisfies RouteSearchPreferencesState;
  }

  private normalizeStored(stored: RouteSearchPreferencesStored): RouteSearchPreferencesState {
    return { previewEnabled: stored.previewEnabled } satisfies RouteSearchPreferencesState;
  }
}
