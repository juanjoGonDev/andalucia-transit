import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, of, shareReplay } from 'rxjs';

import { APP_CONFIG_TOKEN } from '../../core/tokens/app-config.token';
import { AppConfig } from '../../core/config';

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

  private buildLinesByStopsUrl(consortiumId: number, stopIds: readonly string[]): string {
    const stopsPath = stopIds.join(PATH_SEPARATOR);
    return `${this.apiBaseUrl}/${CONSORTIA_SEGMENT}/${consortiumId}/${STOPS_SEGMENT}/${LINES_BY_STOPS_SEGMENT}/${stopsPath}`;
  }

  private buildLineStopsUrl(consortiumId: number, lineId: string): string {
    return `${this.apiBaseUrl}/${CONSORTIA_SEGMENT}/${consortiumId}/${LINES_SEGMENT}/${lineId}/paradas`;
  }
}

interface ApiLineSummary {
  readonly idLinea: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly descripcion: string;
  readonly prioridad: string | number;
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

function mapLineSummaries(entries: readonly ApiLineSummary[]): readonly RouteLineSummary[] {
  const summaries = entries.map((entry) => ({
    lineId: entry.idLinea,
    code: entry.codigo,
    name: entry.nombre,
    mode: entry.descripcion,
    priority: Number(entry.prioridad)
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
