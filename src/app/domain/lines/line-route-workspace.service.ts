import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import {
  CatalogNucleusEntry,
  ConsortiumCatalogService
} from '@data/catalog/consortium-catalog.service';
import {
  RouteLineCoordinate,
  RouteLineDetail,
  RouteLineStop,
  RouteLinesApiService
} from '@data/route-search/route-lines-api.service';
import {
  buildLineStopCoordinates,
  orientCoordinatesTowards,
  selectLineDirectionStops,
  selectSegmentStopIds
} from '@domain/lines/line-route-geometry';

const MIN_ROUTE_COORDINATES = 2;
const EMPTY_SEGMENTS: readonly string[] = Object.freeze([]);

export interface LineRouteWorkspaceSegment {
  readonly originStopIds: readonly string[];
  readonly destinationStopIds: readonly string[];
}

export interface LineRouteWorkspaceRequest {
  readonly consortiumId: number;
  readonly lineId: string;
  readonly direction?: number | null;
  readonly segment?: LineRouteWorkspaceSegment;
}

export interface LineRouteWorkspaceStop extends RouteLineStop {
  readonly nucleusName?: string | null;
  readonly nucleusOrdinal?: number | null;
}

export interface LineRouteWorkspaceViewModel {
  readonly detail: RouteLineDetail;
  readonly stops: readonly LineRouteWorkspaceStop[];
  readonly coordinates: readonly RouteLineCoordinate[];
  readonly resolvedDirection: number | null;
  readonly originStopIds: readonly string[];
  readonly destinationStopIds: readonly string[];
}

@Injectable({ providedIn: 'root' })
export class LineRouteWorkspaceService {
  private readonly routeLines = inject(RouteLinesApiService);
  private readonly catalog = inject(ConsortiumCatalogService);

  load(request: LineRouteWorkspaceRequest): Observable<LineRouteWorkspaceViewModel> {
    return forkJoin({
      detail: this.routeLines.getLineDetail(request.consortiumId, request.lineId),
      stops: this.routeLines.getLineStops(request.consortiumId, request.lineId),
      nuclei: this.catalog
        .loadNuclei(request.consortiumId)
        .pipe(catchError(() => of([] as readonly CatalogNucleusEntry[])))
    }).pipe(
      map(({ detail, stops, nuclei }) =>
        buildWorkspaceViewModel(detail, stops, request.direction, request.segment, nuclei)
      )
    );
  }
}

function buildWorkspaceViewModel(
  detail: RouteLineDetail,
  stops: readonly RouteLineStop[],
  direction: number | null | undefined,
  segment?: LineRouteWorkspaceSegment,
  nuclei: readonly CatalogNucleusEntry[] = []
): LineRouteWorkspaceViewModel {
  const selectedStops = selectLineDirectionStops(stops, direction);
  const stopCoordinates = buildLineStopCoordinates(stops, direction);
  const directionSpecific = direction !== null && direction !== undefined;
  const coordinates = directionSpecific
    ? resolveDirectedCoordinates(stopCoordinates, detail.coordinates, selectedStops)
    : preferCoordinates(detail.coordinates, stopCoordinates);

  const enrichedStops = enrichStopsWithNuclei(selectedStops, nuclei);

  return {
    detail,
    stops: enrichedStops,
    coordinates,
    resolvedDirection: selectedStops[0]?.direction ?? null,
    originStopIds: segment
      ? selectSegmentStopIds(selectedStops, segment.originStopIds)
      : EMPTY_SEGMENTS,
    destinationStopIds: segment
      ? selectSegmentStopIds(selectedStops, segment.destinationStopIds)
      : EMPTY_SEGMENTS
  };
}

/**
 * CTAN line stop tables occasionally carry a stale `idNucleo` (e.g. the M-301 La Gangosa
 * stops classified under Las Salinas). The catalog follows the "Núcleo - Lugar" stop-name
 * convention, so when the name prefix matches a real nucleus name we trust it over the
 * reported id. Ordinals restart every time the resolved nucleus name changes counters.
 */
function enrichStopsWithNuclei(
  stops: readonly RouteLineStop[],
  nuclei: readonly CatalogNucleusEntry[]
): readonly LineRouteWorkspaceStop[] {
  const nameById = new Map(nuclei.map((entry) => [entry.id, entry.name]));
  const nameByKey = new Map(nuclei.map((entry) => [normalizeNucleusKey(entry.name), entry.name]));
  const counters = new Map<string, number>();

  return stops.map((stop) => {
    const detected = detectNucleusNameFromStopName(stop.name, nameByKey);
    const nucleusName = detected ?? nameById.get(stop.nucleusId) ?? null;

    if (!nucleusName) {
      return { ...stop, nucleusName: null, nucleusOrdinal: null };
    }

    const key = normalizeNucleusKey(nucleusName);
    const ordinal = (counters.get(key) ?? 0) + 1;
    counters.set(key, ordinal);
    return { ...stop, nucleusName, nucleusOrdinal: ordinal };
  });
}

const STOP_NAME_SEPARATOR = ' - ';

function detectNucleusNameFromStopName(
  stopName: string,
  nameByKey: ReadonlyMap<string, string>
): string | null {
  const separatorIndex = stopName.indexOf(STOP_NAME_SEPARATOR);

  if (separatorIndex <= 0) {
    return null;
  }

  const prefix = stopName.slice(0, separatorIndex).trim();

  if (!prefix) {
    return null;
  }

  return nameByKey.get(normalizeNucleusKey(prefix)) ?? null;
}

function normalizeNucleusKey(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Direction-filtered stop geometry always wins because it follows the searched travel
 * order. The official polyline is direction-blind, so it is only drawn once oriented
 * towards the searched direction; drawing it as-is for the opposite direction is what
 * made routes look reversed on the map.
 */
function resolveDirectedCoordinates(
  stopCoordinates: readonly RouteLineCoordinate[],
  officialCoordinates: readonly RouteLineCoordinate[],
  selectedStops: readonly RouteLineStop[]
): readonly RouteLineCoordinate[] {
  if (stopCoordinates.length >= MIN_ROUTE_COORDINATES) {
    return stopCoordinates;
  }

  const firstStop = selectedStops[0];
  const reference: RouteLineCoordinate | null = firstStop
    ? { latitude: firstStop.latitude, longitude: firstStop.longitude }
    : null;

  return orientCoordinatesTowards(officialCoordinates, reference);
}

function preferCoordinates(
  preferred: readonly RouteLineCoordinate[],
  fallback: readonly RouteLineCoordinate[]
): readonly RouteLineCoordinate[] {
  return preferred.length >= MIN_ROUTE_COORDINATES ? preferred : fallback;
}
