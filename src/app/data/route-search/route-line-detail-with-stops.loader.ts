import type { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { loadLineDetail } from '@data/route-search/route-line-detail.mapper';
import type { RouteLineDetail, RouteLineStop } from '@data/route-search/route-lines-api.service';
import { buildLineStopCoordinates } from '@domain/lines/line-route-geometry';

const MIN_PREVIEW_COORDINATES = 2;

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
          coordinates: buildLineStopCoordinates(stops)
        })),
        catchError(() => of(detail))
      );
    })
  );
}
