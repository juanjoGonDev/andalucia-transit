import { Injectable, inject } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, switchMap } from 'rxjs';

import { StopDirectoryService } from '../../data/stops/stop-directory.service';
import {
  StopConnectionsService,
  STOP_CONNECTION_DIRECTION
} from '../../data/route-search/stop-connections.service';
import { RouteSearchSelection } from './route-search-state.service';
import { collectRouteLineMatches, createRouteSearchSelection } from './route-search-selection.util';
import { parseDateSlug, parseStopSlug } from './route-search-url.util';

@Injectable({ providedIn: 'root' })
export class RouteSearchSelectionResolverService {
  private readonly directory = inject(StopDirectoryService);
  private readonly connections = inject(StopConnectionsService);

  resolveFromSlugs(
    originSlug: string | null,
    destinationSlug: string | null,
    dateSlug: string | null
  ): Observable<RouteSearchSelection | null> {
    if (!originSlug || !destinationSlug || !dateSlug) {
      return of(null);
    }

    const originResult = parseStopSlug(originSlug);
    const destinationResult = parseStopSlug(destinationSlug);
    const queryDate = parseDateSlug(dateSlug);

    if (!originResult || !destinationResult || !queryDate) {
      return of(null);
    }

    return forkJoin({
      origin: this.directory.getOptionByStopId(originResult.stopId),
      destination: this.directory.getOptionByStopId(destinationResult.stopId)
    }).pipe(
      switchMap(({ origin, destination }) => {
        if (!origin || !destination) {
          return of<RouteSearchSelection | null>(null);
        }

        return this.connections
          .getConnections(origin.stopIds, STOP_CONNECTION_DIRECTION.Forward)
          .pipe(
            map((connectionMap) => {
              const matches = collectRouteLineMatches(origin, destination, connectionMap);
              return createRouteSearchSelection(origin, destination, matches, queryDate);
            })
          );
      }),
      catchError(() => of(null))
    );
  }
}
