import type { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of, shareReplay, switchMap } from 'rxjs';
import type {
  RouteLineCoordinate,
  RouteLineSummary
} from '@data/route-search/route-lines-api.service';
import { calculateDistanceInMeters } from '@domain/utils/geo-distance.util';

interface ApiNearbyStop {
  readonly idParada: string | number;
  readonly idZona?: string | number | null;
  readonly latitud: string | number;
  readonly longitud: string | number;
}

interface FocusedStopCandidate {
  readonly stopId: string;
  readonly zoneId: string | null;
  readonly distanceInMeters: number;
}

type LoadLinesForStop = (stopId: string) => Observable<readonly RouteLineSummary[]>;

const MAX_FOCUSED_AREA_STOPS = 4;
const CACHE_COORDINATE_PRECISION = 4;
const EMPTY_LINE_LIST: readonly RouteLineSummary[] = Object.freeze([]);
const nearbyLinesCache = new Map<string, Observable<readonly RouteLineSummary[]>>();

export function loadLinesNearLocation(
  http: HttpClient,
  stopsUrl: string,
  coordinate: RouteLineCoordinate,
  loadLinesForStop: LoadLinesForStop
): Observable<readonly RouteLineSummary[]> {
  const cacheKey = buildNearbyLinesCacheKey(stopsUrl, coordinate);
  const cached = nearbyLinesCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const request$ = http
    .get<readonly ApiNearbyStop[]>(stopsUrl, {
      params: {
        latitud: String(coordinate.latitude),
        longitud: String(coordinate.longitude)
      }
    })
    .pipe(
      map((stops) => selectFocusedAreaStopIds(stops, coordinate)),
      switchMap((stopIds) => loadAreaLines(stopIds, loadLinesForStop)),
      shareReplay({ bufferSize: 1, refCount: true })
    );

  nearbyLinesCache.set(cacheKey, request$);
  return request$;
}

function loadAreaLines(
  stopIds: readonly string[],
  loadLinesForStop: LoadLinesForStop
): Observable<readonly RouteLineSummary[]> {
  if (!stopIds.length) {
    return of(EMPTY_LINE_LIST);
  }

  return forkJoin(stopIds.map((stopId) => loadLinesForStop(stopId))).pipe(map(mergeLineSummaries));
}

function selectFocusedAreaStopIds(
  entries: readonly ApiNearbyStop[],
  coordinate: RouteLineCoordinate
): readonly string[] {
  const candidates = entries
    .map((entry) => toFocusedStopCandidate(entry, coordinate))
    .filter((candidate): candidate is FocusedStopCandidate => candidate !== null)
    .sort((left, right) => left.distanceInMeters - right.distanceInMeters);

  const nearest = candidates[0];

  if (!nearest) {
    return Object.freeze([]);
  }

  const zoneCandidates = nearest.zoneId
    ? candidates.filter((candidate) => candidate.zoneId === nearest.zoneId)
    : candidates;

  return Object.freeze(
    zoneCandidates.slice(0, MAX_FOCUSED_AREA_STOPS).map((candidate) => candidate.stopId)
  );
}

function toFocusedStopCandidate(
  entry: ApiNearbyStop,
  coordinate: RouteLineCoordinate
): FocusedStopCandidate | null {
  const latitude = Number(entry.latitud);
  const longitude = Number(entry.longitud);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    stopId: String(entry.idParada),
    zoneId: normalizeZoneId(entry.idZona),
    distanceInMeters: calculateDistanceInMeters(coordinate, { latitude, longitude })
  };
}

function normalizeZoneId(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function mergeLineSummaries(
  groups: readonly (readonly RouteLineSummary[])[]
): readonly RouteLineSummary[] {
  const unique = new Map<string, RouteLineSummary>();

  for (const group of groups) {
    for (const line of group) {
      const existing = unique.get(line.lineId);

      if (!existing || line.priority > existing.priority) {
        unique.set(line.lineId, line);
      }
    }
  }

  return Object.freeze(
    [...unique.values()].sort(
      (left, right) => right.priority - left.priority || left.code.localeCompare(right.code)
    )
  );
}

function buildNearbyLinesCacheKey(url: string, coordinate: RouteLineCoordinate): string {
  return [
    url,
    coordinate.latitude.toFixed(CACHE_COORDINATE_PRECISION),
    coordinate.longitude.toFixed(CACHE_COORDINATE_PRECISION)
  ].join('|');
}
