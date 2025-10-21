import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of } from 'rxjs';
import { NearbyStopResult } from '@core/services/nearby-stops.service';
import {
  StopDirectoryOption,
  StopDirectoryService
} from '@data/stops/stop-directory.service';

export interface NearbyStopOption extends StopDirectoryOption {
  readonly distanceInMeters: number;
}

const EMPTY_NEARBY_STOP_OPTIONS: readonly NearbyStopOption[] = Object.freeze(
  [] as NearbyStopOption[]
);

@Injectable({ providedIn: 'root' })
export class NearbyStopOptionsService {
  private readonly stopDirectory = inject(StopDirectoryService);

  loadOptions(
    stops: readonly NearbyStopResult[]
  ): Observable<readonly NearbyStopOption[]> {
    if (!stops.length) {
      return of(EMPTY_NEARBY_STOP_OPTIONS);
    }

    const loaders = stops.map((stop) =>
      this.stopDirectory
        .getOptionByStopId(stop.id)
        .pipe(map((option) => (option ? { option, distanceInMeters: stop.distanceInMeters } : null)))
    );

    return forkJoin(loaders).pipe(
      map((entries) => {
        const unique = new Map<string, NearbyStopOption>();

        for (const entry of entries) {
          if (!entry) {
            continue;
          }

          const candidate: NearbyStopOption = {
            ...entry.option,
            distanceInMeters: entry.distanceInMeters
          };
          const existing = unique.get(candidate.id);

          if (existing && existing.distanceInMeters <= candidate.distanceInMeters) {
            continue;
          }

          unique.set(candidate.id, candidate);
        }

        return Object.freeze(Array.from(unique.values(), (value) => ({ ...value })));
      })
    );
  }
}
