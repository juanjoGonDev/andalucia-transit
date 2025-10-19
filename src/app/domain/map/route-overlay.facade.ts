import { Injectable, inject } from '@angular/core';
import {
  Observable,
  Subject,
  catchError,
  filter,
  forkJoin,
  map,
  merge,
  of,
  startWith,
  switchMap,
  tap
} from 'rxjs';

import { RouteLinesApiService, RouteLineStop } from '../../data/route-search/route-lines-api.service';
import { RouteSearchSelection, RouteSearchStateService } from '../route-search/route-search-state.service';
import { GeoCoordinate } from '../utils/geo-distance.util';
import {
  RouteOverlayGeometryRequest,
  buildRouteSegmentCoordinates,
  calculateRouteLengthInMeters,
  RouteOverlayLineStop
} from './route-overlay-geometry';

export type RouteOverlayStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface RouteOverlayRoute {
  readonly id: string;
  readonly lineId: string;
  readonly lineCode: string;
  readonly direction: number;
  readonly destinationName: string;
  readonly coordinates: readonly GeoCoordinate[];
  readonly stopCount: number;
  readonly lengthInMeters: number;
}

export interface RouteOverlaySelectionSummary {
  readonly originName: string;
  readonly destinationName: string;
}

export interface RouteOverlayState {
  readonly status: RouteOverlayStatus;
  readonly routes: readonly RouteOverlayRoute[];
  readonly errorKey: string | null;
  readonly selectionKey: string | null;
  readonly selectionSummary: RouteOverlaySelectionSummary | null;
}

const ROUTE_OVERLAY_ERROR_KEY = 'map.routes.error' as const;

@Injectable({ providedIn: 'root' })
export class RouteOverlayFacade {
  private readonly state = inject(RouteSearchStateService);
  private readonly routeLines = inject(RouteLinesApiService);

  private readonly cache = new Map<string, readonly RouteOverlayRoute[]>();
  private readonly refreshSubject = new Subject<string>();
  private latestSelectionKey: string | null = null;

  watchOverlay(): Observable<RouteOverlayState> {
    return this.state.selection$.pipe(
      switchMap((selection) => {
        if (!selection) {
          this.latestSelectionKey = null;
          return of<RouteOverlayState>({
            status: 'idle',
            routes: Object.freeze([]),
            errorKey: null,
            selectionKey: null,
            selectionSummary: null
          });
        }

        const selectionKey = buildSelectionKey(selection);
        const summary = buildSelectionSummary(selection);
        this.latestSelectionKey = selectionKey;

        return merge(
          of(selectionKey),
          this.refreshSubject.pipe(filter((key) => key === selectionKey))
        ).pipe(switchMap(() => this.resolveState(selection, selectionKey, summary)));
      })
    );
  }

  refresh(): void {
    if (!this.latestSelectionKey) {
      return;
    }

    this.cache.delete(this.latestSelectionKey);
    this.refreshSubject.next(this.latestSelectionKey);
  }

  private resolveState(
    selection: RouteSearchSelection,
    selectionKey: string,
    summary: RouteOverlaySelectionSummary
  ): Observable<RouteOverlayState> {
    const cached = this.cache.get(selectionKey);

    if (cached) {
      return of({
        status: 'ready' as const,
        routes: cached,
        errorKey: null,
        selectionKey,
        selectionSummary: summary
      });
    }

    return this.buildRoutes(selection).pipe(
      tap((routes) => this.cache.set(selectionKey, routes)),
      map((routes) => ({
        status: 'ready' as const,
        routes,
        errorKey: null,
        selectionKey,
        selectionSummary: summary
      })),
      startWith<RouteOverlayState>({
        status: 'loading',
        routes: Object.freeze([]),
        errorKey: null,
        selectionKey,
        selectionSummary: summary
      }),
      catchError(() =>
        of<RouteOverlayState>({
          status: 'error',
          routes: Object.freeze([]),
          errorKey: ROUTE_OVERLAY_ERROR_KEY,
          selectionKey,
          selectionSummary: summary
        })
      )
    );
  }

  private buildRoutes(selection: RouteSearchSelection): Observable<readonly RouteOverlayRoute[]> {
    if (!selection.lineMatches.length) {
      return of(Object.freeze([]));
    }

    const consortiumId = selection.origin.consortiumId;
    const requests = selection.lineMatches.map((match) =>
      this.routeLines.getLineStops(consortiumId, match.lineId).pipe(
        map((stops) =>
          this.createRoute(
            match.lineId,
            match.lineCode,
            match.direction,
            stops,
            match.originStopIds,
            match.destinationStopIds,
            selection.destination.name
          )
        )
      )
    );

    return forkJoin(requests).pipe(
      map((routes) => routes.filter((route): route is RouteOverlayRoute => route !== null)),
      map((routes) => Object.freeze(routes.map((route) => ({ ...route } as RouteOverlayRoute))))
    );
  }

  private createRoute(
    lineId: string,
    lineCode: string,
    direction: number,
    stops: readonly RouteLineStop[],
    originStopIds: readonly string[],
    destinationStopIds: readonly string[],
    destinationName: string
  ): RouteOverlayRoute | null {
    const geometryRequest: RouteOverlayGeometryRequest = {
      stops: mapStops(stops),
      originStopIds,
      destinationStopIds,
      direction
    };

    const coordinates = buildRouteSegmentCoordinates(geometryRequest);

    if (coordinates.length === 0) {
      return null;
    }

    const immutableCoordinates = Object.freeze(coordinates.map((coordinate) => ({ ...coordinate })));

    return {
      id: buildRouteId(lineId, direction, originStopIds, destinationStopIds),
      lineId,
      lineCode,
      direction,
      destinationName,
      coordinates: immutableCoordinates,
      stopCount: immutableCoordinates.length,
      lengthInMeters: calculateRouteLengthInMeters(immutableCoordinates)
    } satisfies RouteOverlayRoute;
  }
}

function mapStops(stops: readonly RouteLineStop[]): readonly RouteOverlayLineStop[] {
  return stops.map((stop) => ({
    stopId: stop.stopId,
    direction: stop.direction,
    order: stop.order,
    latitude: stop.latitude,
    longitude: stop.longitude
  } satisfies RouteOverlayLineStop));
}

function buildSelectionKey(selection: RouteSearchSelection): string {
  const originStops = [...selection.origin.stopIds].sort().join(',');
  const destinationStops = [...selection.destination.stopIds].sort().join(',');
  const lineKeys = selection.lineMatches
    .map((match) => buildRouteId(match.lineId, match.direction, match.originStopIds, match.destinationStopIds))
    .sort()
    .join(';');
  const queryDateKey = selection.queryDate.getTime();

  return [
    selection.origin.consortiumId,
    selection.destination.consortiumId,
    originStops,
    destinationStops,
    lineKeys,
    queryDateKey
  ].join('|');
}

function buildSelectionSummary(selection: RouteSearchSelection): RouteOverlaySelectionSummary {
  return {
    originName: selection.origin.name,
    destinationName: selection.destination.name
  } satisfies RouteOverlaySelectionSummary;
}

function buildRouteId(
  lineId: string,
  direction: number,
  originStopIds: readonly string[],
  destinationStopIds: readonly string[]
): string {
  const originKey = [...originStopIds].sort().join(',');
  const destinationKey = [...destinationStopIds].sort().join(',');
  return [lineId, direction, originKey, destinationKey].join('|');
}
