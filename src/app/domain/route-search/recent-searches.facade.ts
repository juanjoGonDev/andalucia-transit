import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RouteSearchExecutionService } from './route-search-execution.service';
import {
  RouteSearchHistoryEntry,
  RouteSearchHistoryService
} from './route-search-history.service';
import { RouteSearchPreferencesService } from './route-search-preferences.service';
import {
  RouteSearchPreview,
  RouteSearchPreviewService
} from './route-search-preview.service';
import { RouteSearchSelection } from './route-search-state.service';

@Injectable({ providedIn: 'root' })
export class RecentSearchesFacade {
  private readonly history = inject(RouteSearchHistoryService);
  private readonly preview = inject(RouteSearchPreviewService);
  private readonly execution = inject(RouteSearchExecutionService);
  private readonly preferences = inject(RouteSearchPreferencesService);

  readonly entries$ = this.history.entries$;
  readonly previewEnabled$ = this.preferences.previewEnabled$;

  prepareNavigation(selection: RouteSearchSelection): readonly string[] {
    return this.execution.prepare(selection);
  }

  loadPreview(selection: RouteSearchSelection): Observable<RouteSearchPreview> {
    return this.preview.loadPreview(selection);
  }

  remove(id: RouteSearchHistoryEntry['id']): void {
    this.history.remove(id);
  }

  clear(): void {
    this.history.clear();
  }

  previewEnabled(): boolean {
    return this.preferences.previewEnabled();
  }
}
