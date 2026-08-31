import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, from, map, of, shareReplay, switchMap } from 'rxjs';
import { AppConfig } from '@core/config';
import { APP_CONFIG_TOKEN } from '@core/tokens/app-config.token';
import type {
  RouteLineCoordinate,
  RouteLineDetail,
} from '@data/route-search/route-line-detail.mapper';

export type {
  RouteLineCoordinate,
  RouteLineDetail,
} from '@data/route-search/route-line-detail.mapper';

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
  private readonly lineStopsCache = new Map<string, Observable<readonly RouteLineStop[]>>();
  private readonly lineDetailsCache = new Map<string, Observable<RouteLineDetail>>();

  getLinesForStops(
    consortiumId: number,
    stopIds: readonly string[],
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
    coordinate: RouteLineCoordinate,
  ): Observable<readonly RouteLineSummary[]> {
    const stopsUrl = this.buildStopsUrl(consortiumId);

    return from(import('./route-lines-nearby.loader')).pipe(
      switchMap(({ loadLinesNearLocation }) =>
        loadLinesNearLocation(this.http, stopsUrl, coordinate, (stopId) =>
          this.getLinesForStops(consortiumId, [stopId]),
        ),
      ),
    );
  }

  getLineStops(consortiumId: number, lineId: string): Observable<readonly RouteLineStop[]> {
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
    const cacheKey = buildLineDetailCacheKey(consortiumId, lineId);
    const cached = this.lineDetailsCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const detailUrl = this.buildLineDetailUrl(consortiumId, lineId);
    const request$ = from(import('./route-line-detail-with-stops.loader')).pipe(
      switchMap(({ loadLineDetailWithStopFallback }) =>
        loadLineDetailWithStopFallback(this.http, detailUrl, this.language, () =>
          this.getLineStops(consortiumId, lineId),
        ),
      ),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    this.lineDetailsCache.set(cacheKey, request$);
    return request$;
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

const DEFAULT_LANGUAGE = 'ES' as const;
const API_VERSION = 'v1' as const;
const CONSORTIA_SEGMENT = 'Consorcios' as const;
const STOPS_SEGMENT = 'paradas' as const;
const LINES_SEGMENT = 'lineas' as const;
const LINES_BY_STOPS_SEGMENT = 'lineasPorParadas' as const;
const PATH_SEPARATOR = '/' as const;
const TERMINAL_NUCLEUS_SENTINEL_PATTERN = /(?:^|\s)NN\s*$/i;

const EMPTY_LINE_LIST: readonly RouteLineSummary[] = Object.freeze([]);
const EMPTY_LINE_STOPS: readonly RouteLineStop[] = Object.freeze([]);

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

function buildLineStopsCacheKey(consortiumId: number, lineId: string): string {
  return `${consortiumId}|${lineId}`;
}

function buildLineDetailCacheKey(consortiumId: number, lineId: string): string {
  return `${consortiumId}|${lineId}`;
}

function mapLineSummaries(entries: readonly ApiLineSummary[]): readonly RouteLineSummary[] {
  const summaries = entries.map(
    (entry) =>
      ({
        lineId: String(entry.idLinea),
        code: entry.codigo,
        name: normalizeRouteLineName(entry.nombre),
        mode: entry.descripcion ?? entry.modo ?? '',
        priority: Number(entry.prioridad ?? 0),
      }) satisfies RouteLineSummary,
  );

  return Object.freeze(summaries);
}

function normalizeRouteLineName(name: string): string {
  return name.trim().replace(TERMINAL_NUCLEUS_SENTINEL_PATTERN, '').trimEnd();
}

function normalizeZoneId(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function mapLineStops(response: ApiLineStopsResponse): readonly RouteLineStop[] {
  const entries: readonly ApiLineStop[] = isLineStopsEnvelope(response)
    ? response.paradas
    : response;

  if (!entries.length) {
    return EMPTY_LINE_STOPS;
  }

  const stops = entries
    .map(
      (stop: ApiLineStop) =>
        ({
          stopId: String(stop.idParada),
          lineId: String(stop.idLinea),
          direction: Number(stop.sentido),
          order: Number(stop.orden),
          nucleusId: String(stop.idNucleo),
          zoneId: normalizeZoneId(stop.idZona),
          latitude: Number(stop.latitud),
          longitude: Number(stop.longitud),
          name: stop.nombre,
        }) satisfies RouteLineStop,
    )
    .filter(
      (stop: RouteLineStop) =>
        Number.isFinite(stop.latitude) &&
        Number.isFinite(stop.longitude) &&
        Number.isFinite(stop.direction) &&
        Number.isFinite(stop.order),
    );

  return Object.freeze(stops);
}

function isLineStopsEnvelope(response: ApiLineStopsResponse): response is ApiLineStopsEnvelope {
  return !Array.isArray(response);
}
