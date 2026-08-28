import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, from, map, of, shareReplay, switchMap } from 'rxjs';
import { AppConfig } from '@core/config';
import { APP_CONFIG_TOKEN } from '@core/tokens/app-config.token';
import type {
  RouteLineCoordinate,
  RouteLineDetail
} from '@data/route-search/route-line-detail.mapper';
import { calculateDistanceInMeters } from '@domain/utils/geo-distance.util';

export type { RouteLineCoordinate, RouteLineDetail } from '@data/route-search/route-line-detail.mapper';

export interface RouteLineSummary {
  readonly lineId: string;
  readonly code: string;
  readonly name: string;
  readonly mode: string;
  readonly priority: number;
}

export interface RouteLineStop {
  readonly stopId: string;
  readonly lineId: string;
  readonly direction: number;
  readonly order: number;
  readonly nucleusId: string;
  readonly zoneId: string | null;
  readonly latitude: number;
  readonly longitude: number;
  readonly name: string;
}

@Injectable({ providedIn: 'root' })
export class RouteLinesApiService {
  private readonly http = inject(HttpClient);
  private readonly config: AppConfig = inject(APP_CONFIG_TOKEN);

  private readonly apiBaseUrl = buildApiBaseUrl(this.config.apiBaseUrl);
  private readonly language = DEFAULT_LANGUAGE;

  private readonly linesCache = new Map<string, Observable<readonly RouteLineSummary[]>>();
  private readonly nearbyLinesCache = new Map<string, Observable<readonly RouteLineSummary[]>>();
  private readonly lineStopsCache = new Map<string, Observable<readonly RouteLineStop[]>>();

  getLinesForStops(
    consortiumId: number,
    stopIds: readonly string[]
  ): Observable<readonly RouteLineSummary[]> {
    if (!stopIds.length) {
      return of(EMPTY_LINE_LIST);
    }

    const uniqueIds = Array.from(new Set(stopIds));
    const cacheKey = buildLinesCacheKey(consortiumId, uniqueIds);
    const cached = this.linesCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const url = this.buildLinesByStopsUrl(consortiumId, uniqueIds);
    const request$ = this.http
      .get<readonly ApiLineSummary[]>(url, { params: { lang: this.language } })
      .pipe(map(mapLineSummaries), shareReplay({ bufferSize: 1, refCount: true }));

    this.linesCache.set(cacheKey, request$);
    return request$;
  }

  getLinesNearLocation(
    consortiumId: number,
    coordinate: RouteLineCoordinate
  ): Observable<readonly RouteLineSummary[]> {
    const cacheKey = buildNearbyLinesCacheKey(consortiumId, coordinate);
    const cached = this.nearbyLinesCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const request$ = this.http
      .get<readonly ApiNearbyStop[]>(this.buildStopsUrl(consortiumId), {
        params: {
          latitud: String(coordinate.latitude),
          longitud: String(coordinate.longitude)
        }
      })
      .pipe(
        map((stops) => selectFocusedAreaStopIds(stops, coordinate)),
        switchMap((stopIds) => this.loadLinesForAreaStops(consortiumId, stopIds)),
        shareReplay({ bufferSize: 1, refCount: true })
      );

    this.nearbyLinesCache.set(cacheKey, request$);
    return request$;
  }

  getLineStops(
    consortiumId: number,
    lineId: string
  ): Observable<readonly RouteLineStop[]> {
    if (!lineId) {
      return of(EMPTY_LINE_STOPS);
    }

    const cacheKey = buildLineStopsCacheKey(consortiumId, lineId);
    const cached = this.lineStopsCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const url = this.buildLineStopsUrl(consortiumId, lineId);
    const request$ = this.http
      .get<ApiLineStopsResponse>(url, { params: { lang: this.language } })
      .pipe(map(mapLineStops), shareReplay({ bufferSize: 1, refCount: true }));

    this.lineStopsCache.set(cacheKey, request$);
    return request$;
  }

  getLineDetail(consortiumId: number, lineId: string): Observable<RouteLineDetail> {
    const url = this.buildLineDetailUrl(consortiumId, lineId);

    return from(import('./route-line-detail.mapper')).pipe(
      switchMap(({ loadLineDetail }) => loadLineDetail(this.http, url, this.language)),
      switchMap((detail) => {
        if (detail.coordinates.length >= MIN_PREVIEW_COORDINATES) {
          return of(detail);
        }

        return this.getLineStops(consortiumId, lineId).pipe(
          map((stops) => ({
            ...detail,
            coordinates: buildLineStopPreview(stops)
          })),
          catchError(() => of(detail))
        );
      })
    );
  }

  private loadLinesForAreaStops(
    consortiumId: number,
    stopIds: readonly string[]
  ): Observable<readonly RouteLineSummary[]> {
    if (!stopIds.length) {
      return of(EMPTY_LINE_LIST);
    }

    return forkJoin(stopIds.map((stopId) => this.getLinesForStops(consortiumId, [stopId]))).pipe(
      map(mergeLineSummaries)
    );
  }

  private buildLinesByStopsUrl(consortiumId: number, stopIds: readonly string[]): string {
    const stopsPath = stopIds.join(PATH_SEPARATOR);
    return `${this.apiBaseUrl}/${CONSORTIA_SEGMENT}/${consortiumId}/${STOPS_SEGMENT}/${LINES_BY_STOPS_SEGMENT}/${stopsPath}`;
  }

  private buildLinesUrl(consortiumId: number): string {
    return `${this.apiBaseUrl}/${CONSORTIA_SEGMENT}/${consortiumId}/${LINES_SEGMENT}`;
  }

  private buildStopsUrl(consortiumId: number): string {
    return `${this.apiBaseUrl}/${CONSORTIA_SEGMENT}/${consortiumId}/${STOPS_SEGMENT}`;
  }

  private buildLineStopsUrl(consortiumId: number, lineId: string): string {
    return `${this.buildLinesUrl(consortiumId)}/${lineId}/${STOPS_SEGMENT}`;
  }

  private buildLineDetailUrl(consortiumId: number, lineId: string): string {
    return `${this.buildLinesUrl(consortiumId)}/${lineId}`;
  }
}

interface ApiLineSummary {
  readonly idLinea: string | number;
  readonly codigo: string;
  readonly nombre: string;
  readonly descripcion?: string;
  readonly modo?: string;
  readonly prioridad?: string | number;
}

interface ApiNearbyStop {
  readonly idParada: string | number;
  readonly idZona?: string | number | null;
  readonly latitud: string | number;
  readonly longitud: string | number;
}

type ApiLineStopsResponse = readonly ApiLineStop[] | { readonly paradas: readonly ApiLineStop[] };

interface ApiLineStop {
  readonly idParada: string | number;
  readonly idLinea: string | number;
  readonly idNucleo: string | number;
  readonly idZona: string | number | null;
  readonly latitud: string | number;
  readonly longitud: string | number;
  readonly nombre: string;
  readonly sentido: string | number;
  readonly orden: string | number;
  readonly modos: string | number;
}

interface ApiLineStopsEnvelope {
  readonly paradas: readonly ApiLineStop[];
}

interface FocusedStopCandidate {
  readonly stopId: string;
  readonly zoneId: string | null;
  readonly distanceInMeters: number;
}

const DEFAULT_LANGUAGE = 'ES' as const;
const API_VERSION = 'v1' as const;
const CONSORTIA_SEGMENT = 'Consorcios' as const;
const STOPS_SEGMENT = 'paradas' as const;
const LINES_SEGMENT = 'lineas' as const;
const LINES_BY_STOPS_SEGMENT = 'lineasPorParadas' as const;
const PATH_SEPARATOR = '/' as const;
const MAX_FOCUSED_AREA_STOPS = 4;
const CACHE_COORDINATE_PRECISION = 4;
const MIN_PREVIEW_COORDINATES = 2;

const EMPTY_LINE_LIST: readonly RouteLineSummary[] = Object.freeze([]);
const EMPTY_LINE_STOPS: readonly RouteLineStop[] = Object.freeze([]);
const EMPTY_COORDINATES: readonly RouteLineCoordinate[] = Object.freeze([]);

function buildApiBaseUrl(rawBaseUrl: string): string {
  const trimmed = rawBaseUrl.endsWith(PATH_SEPARATOR)
    ? rawBaseUrl.slice(0, rawBaseUrl.length - 1)
    : rawBaseUrl;
  return `${trimmed}/${API_VERSION}`;
}

function buildLinesCacheKey(consortiumId: number, stopIds: readonly string[]): string {
  const sorted = [...stopIds].sort();
  return `${consortiumId}|${sorted.join('|')}`;
}

function buildNearbyLinesCacheKey(consortiumId: number, coordinate: RouteLineCoordinate): string {
  return [
    consortiumId,
    coordinate.latitude.toFixed(CACHE_COORDINATE_PRECISION),
    coordinate.longitude.toFixed(CACHE_COORDINATE_PRECISION)
  ].join('|');
}

function buildLineStopsCacheKey(consortiumId: number, lineId: string): string {
  return `${consortiumId}|${lineId}`;
}

function mapLineSummaries(entries: readonly ApiLineSummary[]): readonly RouteLineSummary[] {
  const summaries = entries.map((entry) => ({
    lineId: String(entry.idLinea),
    code: entry.codigo,
    name: entry.nombre,
    mode: entry.descripcion ?? entry.modo ?? '',
    priority: Number(entry.prioridad ?? 0)
  } satisfies RouteLineSummary));

  return Object.freeze(summaries);
}

function selectFocusedAreaStopIds(
  entries: readonly ApiNearbyStop[],
  coordinate: RouteLineCoordinate
): readonly string[] {
  const candidates = entries
    .map(toFocusedStopCandidate)
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

  function toFocusedStopCandidate(entry: ApiNearbyStop): FocusedStopCandidate | null {
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
}

function normalizeZoneId(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function mergeLineSummaries(groups: readonly (readonly RouteLineSummary[])[]): readonly RouteLineSummary[] {
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

function mapLineStops(response: ApiLineStopsResponse): readonly RouteLineStop[] {
  const entries: readonly ApiLineStop[] = isLineStopsEnvelope(response)
    ? response.paradas
    : response;

  if (!entries.length) {
    return EMPTY_LINE_STOPS;
  }

  const stops = entries
    .map((stop: ApiLineStop) => ({
      stopId: String(stop.idParada),
      lineId: String(stop.idLinea),
      direction: Number(stop.sentido),
      order: Number(stop.orden),
      nucleusId: String(stop.idNucleo),
      zoneId: normalizeZoneId(stop.idZona),
      latitude: Number(stop.latitud),
      longitude: Number(stop.longitud),
      name: stop.nombre
    } satisfies RouteLineStop))
    .filter(
      (stop: RouteLineStop) =>
        Number.isFinite(stop.latitude) &&
        Number.isFinite(stop.longitude) &&
        Number.isFinite(stop.direction) &&
        Number.isFinite(stop.order)
    );

  return Object.freeze(stops);
}

function isLineStopsEnvelope(response: ApiLineStopsResponse): response is ApiLineStopsEnvelope {
  return !Array.isArray(response);
}

function buildLineStopPreview(stops: readonly RouteLineStop[]): readonly RouteLineCoordinate[] {
  if (!stops.length) {
    return EMPTY_COORDINATES;
  }

  const byDirection = new Map<number, RouteLineStop[]>();

  for (const stop of stops) {
    const group = byDirection.get(stop.direction) ?? [];
    group.push(stop);
    byDirection.set(stop.direction, group);
  }

  const selected = [...byDirection.values()].sort((left, right) => right.length - left.length)[0];

  if (!selected || selected.length < MIN_PREVIEW_COORDINATES) {
    return EMPTY_COORDINATES;
  }

  selected.sort((left, right) => left.order - right.order);
  const coordinates: RouteLineCoordinate[] = [];
  let previousKey: string | null = null;

  for (const stop of selected) {
    const key = `${stop.latitude}|${stop.longitude}`;

    if (key === previousKey) {
      continue;
    }

    coordinates.push({ latitude: stop.latitude, longitude: stop.longitude });
    previousKey = key;
  }

  return coordinates.length >= MIN_PREVIEW_COORDINATES
    ? Object.freeze(coordinates)
    : EMPTY_COORDINATES;
}
