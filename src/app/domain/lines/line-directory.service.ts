import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, from, map, of, shareReplay, switchMap } from 'rxjs';
import {
  CatalogLineEntry,
  ConsortiumCatalogService
} from '@data/catalog/consortium-catalog.service';
import { RouteLinesApiService } from '@data/route-search/route-lines-api.service';
import { NearbyStopsService } from '@core/services/nearby-stops.service';
import type { GeoCoordinate } from '@domain/utils/geo-distance.util';

export interface LineDirectoryEntry {
  readonly consortiumId: number;
  readonly areaName: string;
  readonly lineId: string;
  readonly code: string;
  readonly name: string;
  readonly mode: string;
  readonly operators: readonly string[];
}

const EMPTY_ENTRIES: readonly LineDirectoryEntry[] = Object.freeze([]);
const EMPTY_KEYS: ReadonlySet<string> = new Set<string>();
const STOP_BATCH_SIZE = 20;
const NEARBY_STOP_LIMIT = 12;

@Injectable({ providedIn: 'root' })
export class LineDirectoryService {
  private readonly catalog = inject(ConsortiumCatalogService);
  private readonly routeLines = inject(RouteLinesApiService);
  private readonly nearbyStops = inject(NearbyStopsService);

  private readonly entries$ = this.catalog.loadConsortiums().pipe(
    switchMap((areas) => {
      if (!areas.length) {
        return of(EMPTY_ENTRIES);
      }

      return forkJoin(
        areas.map((area) =>
          this.catalog.loadLines(area.id).pipe(
            map((lines) => lines.map((line) => toDirectoryEntry(area.id, area.name, line)))
          )
        )
      ).pipe(
        map((groups) => {
          const entries = groups.flat();
          entries.sort(compareLines);
          return entries.length ? Object.freeze(entries) : EMPTY_ENTRIES;
        })
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  loadAllLines(): Observable<readonly LineDirectoryEntry[]> {
    return this.entries$;
  }

  loadLineKeysForGeography(
    consortiumId: number | null,
    municipalityId: string | null,
    nucleusId: string | null
  ): Observable<ReadonlySet<string> | null> {
    if (!consortiumId || (!municipalityId && !nucleusId)) {
      return of(null);
    }

    return from(this.nearbyStops.getAllStops()).pipe(
      map((stops) =>
        stops.filter(
          (stop) =>
            stop.consortiumId === consortiumId &&
            (!municipalityId || stop.municipalityId === municipalityId) &&
            (!nucleusId || stop.nucleusId === nucleusId)
        )
      ),
      switchMap((stops) => this.loadLineKeysForStops(consortiumId, stops.map((stop) => stop.stopId)))
    );
  }

  loadNearbyLineKeys(position: GeoCoordinate): Observable<ReadonlySet<string>> {
    return from(this.nearbyStops.findClosestStops(position, NEARBY_STOP_LIMIT)).pipe(
      switchMap((stops) => {
        if (!stops.length) {
          return of(EMPTY_KEYS);
        }

        const groups = new Map<number, string[]>();
        for (const stop of stops) {
          const ids = groups.get(stop.consortiumId) ?? [];
          ids.push(stop.id);
          groups.set(stop.consortiumId, ids);
        }

        const requests = [...groups.entries()].map(([consortiumId, stopIds]) =>
          this.loadLineKeysForStops(consortiumId, stopIds)
        );
        return forkJoin(requests).pipe(
          map((sets) => {
            const keys = new Set<string>();
            for (const set of sets) {
              for (const key of set) {
                keys.add(key);
              }
            }
            return keys;
          })
        );
      })
    );
  }

  private loadLineKeysForStops(
    consortiumId: number,
    stopIds: readonly string[]
  ): Observable<ReadonlySet<string>> {
    const uniqueStopIds = [...new Set(stopIds.filter((id) => id.trim().length > 0))];
    if (!uniqueStopIds.length) {
      return of(EMPTY_KEYS);
    }

    const batches: string[][] = [];
    for (let index = 0; index < uniqueStopIds.length; index += STOP_BATCH_SIZE) {
      batches.push(uniqueStopIds.slice(index, index + STOP_BATCH_SIZE));
    }

    return forkJoin(
      batches.map((batch) => this.routeLines.getLinesForStops(consortiumId, batch))
    ).pipe(
      map((responses) => {
        const keys = new Set<string>();
        for (const lines of responses) {
          for (const line of lines) {
            keys.add(buildLineKey(consortiumId, line.lineId));
          }
        }
        return keys;
      })
    );
  }
}

export function buildLineKey(consortiumId: number, lineId: string): string {
  return `${consortiumId}|${lineId}`;
}

function toDirectoryEntry(
  consortiumId: number,
  areaName: string,
  line: CatalogLineEntry
): LineDirectoryEntry {
  return {
    consortiumId,
    areaName,
    lineId: line.id,
    code: line.code,
    name: line.name,
    mode: line.mode,
    operators: line.operators
  };
}

function compareLines(left: LineDirectoryEntry, right: LineDirectoryEntry): number {
  const areaComparison = left.areaName.localeCompare(right.areaName, 'es-ES');
  if (areaComparison !== 0) {
    return areaComparison;
  }

  return left.code.localeCompare(right.code, 'es-ES', { numeric: true });
}
