import type { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { loadLineDetail } from '@data/route-search/route-line-detail.mapper';
import type {
  RouteLineCoordinate,
  RouteLineDetail,
  RouteLineStop
} from '@data/route-search/route-lines-api.service';

const MIN_PREVIEW_COORDINATES = 2;
const EMPTY_COORDINATES: readonly RouteLineCoordinate[] = Object.freeze([]);

type LoadLineStops = () => Observable<readonly RouteLineStop[]>;

export function loadLineDetailWithStopFallback(
  http: HttpClient,
  detailUrl: string,
  language: string,
  loadLineStops: LoadLineStops
): Observable<RouteLineDetail> {
  return loadLineDetail(http, detailUrl, language).pipe(
    switchMap((detail) => {
      if (detail.coordinates.length >= MIN_PREVIEW_COORDINATES) {
        return of(detail);
      }

      return loadLineStops().pipe(
        map((stops) => ({
          ...detail,
          coordinates: buildLineStopPreview(stops)
        })),
        catchError(() => of(detail))
      );
    })
  );
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
