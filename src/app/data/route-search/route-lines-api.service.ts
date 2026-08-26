import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, shareReplay } from 'rxjs';
import { AppConfig } from '@core/config';
import { APP_CONFIG_TOKEN } from '@core/tokens/app-config.token';

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

export interface RouteLineCoordinate {
  readonly latitude: number;
  readonly longitude: number;
}

export interface RouteLineDetail {
  readonly lineId: string;
  readonly code: string;
  readonly name: string;
  readonly mode: string;
  readonly coordinates: readonly RouteLineCoordinate[];
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
  private readonly nearbyLinesCache = new Map<string, Observable<readonly RouteLineSummary[]>>();

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

    const url = this.buildLinesUrl(consortiumId);
    const request$ = this.http
      .get<readonly ApiLineSummary[]>(url, {
        params: {
          latitud: String(coordinate.latitude),
          longitud: String(coordinate.longitude)
        }
      })
      .pipe(map(mapLineSummaries), shareReplay({ bufferSize: 1, refCount: true }));

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
    const cacheKey = buildLineStopsCacheKey(consortiumId, lineId);
    const cached = this.lineDetailsCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const url = this.buildLineDetailUrl(consortiumId, lineId);
    const request$ = this.http
      .get<ApiLineDetail | readonly ApiLineDetail[]>(url, { params: { lang: this.language } })
      .pipe(map(mapLineDetail), shareReplay({ bufferSize: 1, refCount: true }));

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

interface ApiLineDetail {
  readonly idLinea: string | number;
  readonly codigo: string;
  readonly nombre: string;
  readonly modo: string;
  readonly polilinea: unknown;
}

interface ApiLineStopsResponse {
  readonly paradas: readonly ApiLineStop[];
}

interface ApiLineStop {
  readonly idParada: string;
  readonly idLinea: string;
  readonly idNucleo: string;
  readonly idZona: string;
  readonly latitud: string;
  readonly longitud: string | number;
  readonly nombre: string;
  readonly sentido: number;
  readonly orden: number;
  readonly modos: number;
}

const DEFAULT_LANGUAGE = 'ES' as const;
const API_VERSION = 'v1' as const;
const CONSORTIA_SEGMENT = 'Consorcios' as const;
const STOPS_SEGMENT = 'paradas' as const;
const LINES_SEGMENT = 'lineas' as const;
const LINES_BY_STOPS_SEGMENT = 'lineasPorParadas' as const;
const PATH_SEPARATOR = '/' as const;
const CACHE_COORDINATE_PRECISION = 4;
const MINIMUM_POLYLINE_COORDINATES = 2;
const ANDALUSIA_MIN_LATITUDE = 35;
const ANDALUSIA_MAX_LATITUDE = 39.5;
const ANDALUSIA_MIN_LONGITUDE = -8;
const ANDALUSIA_MAX_LONGITUDE = 0.5;

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

function buildLineStopsCacheKey(consortiumId: number, lineId: string): string {
  return `${consortiumId}|${lineId}`;
}

function buildNearbyLinesCacheKey(
  consortiumId: number,
  coordinate: RouteLineCoordinate
): string {
  return [
    consortiumId,
    coordinate.latitude.toFixed(CACHE_COORDINATE_PRECISION),
    coordinate.longitude.toFixed(CACHE_COORDINATE_PRECISION)
  ].join('|');
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

function mapLineStops(response: ApiLineStopsResponse): readonly RouteLineStop[] {
  if (!response.paradas?.length) {
    return EMPTY_LINE_STOPS;
  }

  const stops = response.paradas.map((stop) => ({
    stopId: stop.idParada,
    lineId: stop.idLinea,
    direction: Number(stop.sentido),
    order: Number(stop.orden),
    nucleusId: stop.idNucleo,
    zoneId: stop.idZona || null,
    latitude: Number(stop.latitud),
    longitude: Number(stop.longitud),
    name: stop.nombre
  } satisfies RouteLineStop));

  return Object.freeze(stops);
}

function mapLineDetail(response: ApiLineDetail | readonly ApiLineDetail[]): RouteLineDetail {
  const detail = Array.isArray(response) ? response[0] : response;

  if (!detail) {
    return {
      lineId: '',
      code: '',
      name: '',
      mode: '',
      coordinates: EMPTY_COORDINATES
    };
  }

  return {
    lineId: String(detail.idLinea),
    code: detail.codigo,
    name: detail.nombre,
    mode: detail.modo,
    coordinates: parseRoutePolyline(detail.polilinea)
  };
}

function parseRoutePolyline(rawValue: unknown): readonly RouteLineCoordinate[] {
  const structuredCoordinates = parseStructuredPolyline(rawValue);

  if (structuredCoordinates.length >= MINIMUM_POLYLINE_COORDINATES) {
    return structuredCoordinates;
  }

  if (typeof rawValue !== 'string') {
    return EMPTY_COORDINATES;
  }

  const values = rawValue.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const coordinates: RouteLineCoordinate[] = [];

  for (let index = 0; index + 1 < values.length; index += 2) {
    const coordinate = normalizeCoordinatePair(values[index]!, values[index + 1]!);

    if (coordinate) {
      coordinates.push(coordinate);
    }
  }

  return coordinates.length >= MINIMUM_POLYLINE_COORDINATES
    ? Object.freeze(coordinates)
    : EMPTY_COORDINATES;
}

function parseStructuredPolyline(rawValue: unknown): readonly RouteLineCoordinate[] {
  let value = rawValue;

  if (typeof rawValue === 'string') {
    const trimmed = rawValue.trim();

    if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
      return EMPTY_COORDINATES;
    }

    try {
      value = JSON.parse(trimmed) as unknown;
    } catch {
      return EMPTY_COORDINATES;
    }
  }

  if (!Array.isArray(value)) {
    return EMPTY_COORDINATES;
  }

  const coordinates: RouteLineCoordinate[] = [];

  for (const entry of value) {
    const coordinate = parseStructuredCoordinate(entry);

    if (coordinate) {
      coordinates.push(coordinate);
    }
  }

  return coordinates.length >= MINIMUM_POLYLINE_COORDINATES
    ? Object.freeze(coordinates)
    : EMPTY_COORDINATES;
}

function parseStructuredCoordinate(value: unknown): RouteLineCoordinate | null {
  if (Array.isArray(value) && value.length >= 2) {
    return normalizeCoordinatePair(Number(value[0]), Number(value[1]));
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const latitude = Number(record['latitude'] ?? record['latitud'] ?? record['lat']);
  const longitude = Number(record['longitude'] ?? record['longitud'] ?? record['lng']);

  return buildCoordinate(latitude, longitude);
}

function normalizeCoordinatePair(first: number, second: number): RouteLineCoordinate | null {
  if (!Number.isFinite(first) || !Number.isFinite(second)) {
    return null;
  }

  if (isAndalusianCoordinate(first, second)) {
    return buildCoordinate(first, second);
  }

  if (isAndalusianCoordinate(second, first)) {
    return buildCoordinate(second, first);
  }

  return buildCoordinate(first, second);
}

function buildCoordinate(latitude: number, longitude: number): RouteLineCoordinate | null {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return { latitude, longitude };
}

function isAndalusianCoordinate(latitude: number, longitude: number): boolean {
  return (
    latitude >= ANDALUSIA_MIN_LATITUDE &&
    latitude <= ANDALUSIA_MAX_LATITUDE &&
    longitude >= ANDALUSIA_MIN_LONGITUDE &&
    longitude <= ANDALUSIA_MAX_LONGITUDE
  );
}
