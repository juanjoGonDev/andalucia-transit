import type { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

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

interface ApiRouteLineDetail {
  readonly idLinea: string | number;
  readonly codigo: string;
  readonly nombre: string;
  readonly modo: string;
  readonly polilinea: unknown;
}

const MINIMUM_POLYLINE_COORDINATES = 2;
const ANDALUSIA_MIN_LATITUDE = 35;
const ANDALUSIA_MAX_LATITUDE = 39.5;
const ANDALUSIA_MIN_LONGITUDE = -8;
const ANDALUSIA_MAX_LONGITUDE = 0.5;
const EMPTY_COORDINATES: readonly RouteLineCoordinate[] = Object.freeze([]);

export function loadLineDetail(
  http: HttpClient,
  url: string,
  language: string
): Observable<RouteLineDetail> {
  return http
    .get<ApiRouteLineDetail | readonly ApiRouteLineDetail[]>(url, {
      params: { lang: language }
    })
    .pipe(map(mapLineDetail));
}

function mapLineDetail(
  response: ApiRouteLineDetail | readonly ApiRouteLineDetail[]
): RouteLineDetail {
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
