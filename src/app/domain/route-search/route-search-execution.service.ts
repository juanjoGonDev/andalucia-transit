import { Injectable, inject } from '@angular/core';
import { AppConfig } from '@core/config';
import { APP_CONFIG_TOKEN } from '@core/tokens/app-config.token';
import { RouteSearchHistoryService } from '@domain/route-search/route-search-history.service';
import { RouteSearchSelection, RouteSearchStateService } from '@domain/route-search/route-search-state.service';
import { buildRouteSearchPath } from '@domain/route-search/route-search-url.util';

@Injectable({ providedIn: 'root' })
export class RouteSearchExecutionService {
  private readonly state = inject(RouteSearchStateService);
  private readonly history = inject(RouteSearchHistoryService);
  private readonly config: AppConfig = inject(APP_CONFIG_TOKEN);

  prepare(selection: RouteSearchSelection): readonly string[] {
    this.state.setSelection(selection);
    this.history.record(selection, new Date());

    return buildRouteSearchPath(selection.origin, selection.destination, selection.queryDate, {
      base: this.config.routes.routeSearch,
      connector: this.config.routeSegments.routeSearch.connector,
      date: this.config.routeSegments.routeSearch.date
    });
  }
}
