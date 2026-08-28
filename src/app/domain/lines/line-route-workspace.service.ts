import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import {
  RouteLineCoordinate,
  RouteLineDetail,
  RouteLineStop,
  RouteLinesApiService
} from '@data/route-search/route-lines-api.service';
import {
  buildLineStopCoordinates,
  selectLineDirectionStops
} from '@domain/lines/line-route-geometry';

const MIN_ROUTE_COORDINATES = 2;

export interface LineRouteWorkspaceRequest {
  readonly consortiumId: number;
  readonly lineId: string;
  readonly direction?: number | null;
}

export interface LineRouteWorkspaceViewModel {
  readonly detail: RouteLineDetail;
  readonly stops: readonly RouteLineStop[];
  readonly coordinates: readonly RouteLineCoordinate[];
  readonly resolvedDirection: number | null;
}

@Injectable({ providedIn: 'root' })
export class LineRouteWorkspaceService {
  private readonly routeLines = inject(RouteLinesApiService);

  load(request: LineRouteWorkspaceRequest): Observable<LineRouteWorkspaceViewModel> {
    return forkJoin({
      detail: this.routeLines.getLineDetail(request.consortiumId, request.lineId),
      stops: this.routeLines.getLineStops(request.consortiumId, request.lineId)
    }).pipe(map(({ detail, stops }) => buildWorkspaceViewModel(detail, stops, request.direction)));
  }
}

function buildWorkspaceViewModel(
  detail: RouteLineDetail,
  stops: readonly RouteLineStop[],
  direction: number | null | undefined
): LineRouteWorkspaceViewModel {
  const selectedStops = selectLineDirectionStops(stops, direction);
  const stopCoordinates = buildLineStopCoordinates(stops, direction);
  const directionSpecific = direction !== null && direction !== undefined;
  const coordinates = directionSpecific
    ? preferCoordinates(stopCoordinates, detail.coordinates)
    : preferCoordinates(detail.coordinates, stopCoordinates);

  return {
    detail,
    stops: selectedStops,
    coordinates,
    resolvedDirection: selectedStops[0]?.direction ?? null
  };
}

function preferCoordinates(
  preferred: readonly RouteLineCoordinate[],
  fallback: readonly RouteLineCoordinate[]
): readonly RouteLineCoordinate[] {
  return preferred.length >= MIN_ROUTE_COORDINATES ? preferred : fallback;
}
