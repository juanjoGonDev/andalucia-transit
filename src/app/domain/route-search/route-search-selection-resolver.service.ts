import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { collectRouteLineMatches, createRouteSearchSelection } from '@domain/route-search/route-search-selection.util';
import { RouteSearchSelection } from '@domain/route-search/route-search-state.service';
import { parseDateSlug, parseStopSlug } from '@domain/route-search/route-search-url.util';
import {
  STOP_CONNECTION_DIRECTION,
  StopConnection,
  StopConnectionsFacade
} from '@domain/route-search/stop-connections.facade';
import { StopDirectoryFacade, StopDirectoryOption, StopDirectoryStopSignature } from '@domain/stops/stop-directory.facade';

@Injectable({ providedIn: 'root' })
export class RouteSearchSelectionResolverService {
  private readonly directory = inject(StopDirectoryFacade);
  private readonly connections = inject(StopConnectionsFacade);

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
      origin: this.loadOption(originResult),
      destination: this.loadOption(destinationResult)
    }).pipe(
      switchMap(({ origin, destination }) => {
        if (!origin || !destination) {
          return of<RouteSearchSelection | null>(null);
        }

        return this.loadConnections(origin).pipe(
          map((connectionMap) => {
            const matches = collectRouteLineMatches(origin, destination, connectionMap);
            return createRouteSearchSelection(origin, destination, matches, queryDate);
          })
        );
      }),
      catchError(() => of(null))
    );
  }

  private loadOption({
    consortiumId,
    stopId
  }: {
    readonly consortiumId: number | null;
    readonly stopId: string;
  }): Observable<StopDirectoryOption | null> {
    if (consortiumId !== null) {
      return this.directory.getOptionByStopSignature(consortiumId, stopId);
    }

    return this.directory.getOptionByStopId(stopId);
  }

  private loadConnections(origin: StopDirectoryOption): Observable<ReadonlyMap<string, StopConnection>> {
    const signatures: readonly StopDirectoryStopSignature[] = origin.stopIds.map((stopId) => ({
      consortiumId: origin.consortiumId,
      stopId
    }));

    return forkJoin([
      this.connections.getConnections(signatures, STOP_CONNECTION_DIRECTION.Forward),
      this.connections.getConnections(signatures, STOP_CONNECTION_DIRECTION.Backward)
    ]).pipe(map((connections) => this.connections.mergeConnections(connections)));
  }
}

