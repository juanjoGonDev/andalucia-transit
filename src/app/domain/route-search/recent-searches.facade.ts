import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RouteSearchExecutionService } from '@domain/route-search/route-search-execution.service';
import {
  RouteSearchHistoryEntry,
  RouteSearchHistoryService
} from '@domain/route-search/route-search-history.service';
import { RouteSearchPreferencesService } from '@domain/route-search/route-search-preferences.service';
import {
  RouteSearchPreview,
  RouteSearchPreviewService
} from '@domain/route-search/route-search-preview.service';
import { RouteSearchSelection } from '@domain/route-search/route-search-state.service';

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
