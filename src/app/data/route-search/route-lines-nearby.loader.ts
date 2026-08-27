import type { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';
import type {
  RouteLineCoordinate,
  RouteLineSummary
} from '@data/route-search/route-lines-api.service';

const CACHE_COORDINATE_PRECISION = 4;
const nearbyLinesCache = new Map<string, Observable<readonly RouteLineSummary[]>>();

export function loadLinesNearLocation<T>(
  http: HttpClient,
  url: string,
  coordinate: RouteLineCoordinate,
  mapSummaries: (entries: readonly T[]) => readonly RouteLineSummary[]
): Observable<readonly RouteLineSummary[]> {
  const cacheKey = buildNearbyLinesCacheKey(url, coordinate);
  const cached = nearbyLinesCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const request$ = http
    .get<readonly T[]>(url, {
      params: {
        latitud: String(coordinate.latitude),
        longitud: String(coordinate.longitude)
      }
    })
    .pipe(map(mapSummaries), shareReplay({ bufferSize: 1, refCount: true }));

  nearbyLinesCache.set(cacheKey, request$);
  return request$;
}

function buildNearbyLinesCacheKey(url: string, coordinate: RouteLineCoordinate): string {
  return [
    url,
    coordinate.latitude.toFixed(CACHE_COORDINATE_PRECISION),
    coordinate.longitude.toFixed(CACHE_COORDINATE_PRECISION)
  ].join('|');
}
