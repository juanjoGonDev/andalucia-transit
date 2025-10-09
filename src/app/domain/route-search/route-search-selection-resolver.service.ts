import { Injectable, inject } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, switchMap } from 'rxjs';

import { StopDirectoryService, StopDirectoryOption } from '../../data/stops/stop-directory.service';
import {
  StopConnection,
  StopConnectionsService,
  STOP_CONNECTION_DIRECTION
} from '../../data/route-search/stop-connections.service';
import { RouteSearchSelection } from './route-search-state.service';
import { collectRouteLineMatches, createRouteSearchSelection } from './route-search-selection.util';
import { parseDateSlug, parseStopSlug } from './route-search-url.util';

@Injectable({ providedIn: 'root' })
export class RouteSearchSelectionResolverService {
  private readonly directory = inject(StopDirectoryService);
  private readonly connections = inject(StopConnectionsService);

  resolveFromSlugs(
    originSlug: string | null,
    destinationSlug: string | null,
    dateSlug: string | null
  ): Observable<RouteSearchSelection | null> {
    if (!originSlug || !destinationSlug || !dateSlug) {
      return of(null);
    }

    const originResult = parseStopSlug(originSlug);
    const destinationResult = parseStopSlug(destinationSlug);
    const queryDate = parseDateSlug(dateSlug);

    if (!originResult || !destinationResult || !queryDate) {
      return of(null);
    }

    return forkJoin({
      origin: this.loadOption(originResult),
      destination: this.loadOption(destinationResult)
    }).pipe(
      switchMap(({ origin, destination }) => {
        if (!origin || !destination) {
          return of<RouteSearchSelection | null>(null);
        }

        return this.loadConnections(origin).pipe(
          map((connectionMap) => {
            const matches = collectRouteLineMatches(origin, destination, connectionMap);
            return createRouteSearchSelection(origin, destination, matches, queryDate);
          })
        );
      }),
      catchError(() => of(null))
    );
  }

  private loadOption({
    consortiumId,
    stopId
  }: {
    readonly consortiumId: number | null;
    readonly stopId: string;
  }): Observable<StopDirectoryOption | null> {
    if (consortiumId !== null) {
      return this.directory.getOptionByStopSignature(consortiumId, stopId);
    }

    return this.directory.getOptionByStopId(stopId);
  }

  private loadConnections(origin: StopDirectoryOption): Observable<ReadonlyMap<string, StopConnection>> {
    const signatures = origin.stopIds.map((stopId) => ({
      consortiumId: origin.consortiumId,
      stopId
    }));

    return forkJoin([
      this.connections.getConnections(signatures, STOP_CONNECTION_DIRECTION.Forward),
      this.connections.getConnections(signatures, STOP_CONNECTION_DIRECTION.Backward)
    ]).pipe(map((connections) => mergeConnections(connections)));
  }
}

const SIGNATURE_KEY_SEPARATOR = '|' as const;

function mergeConnections(
  maps: readonly ReadonlyMap<string, StopConnection>[]
): ReadonlyMap<string, StopConnection> {
  if (!maps.length) {
    return new Map<string, StopConnection>();
  }

  const aggregates = new Map<
    string,
    {
      consortiumId: number;
      stopId: string;
      originIds: Set<string>;
      signatures: Map<string, StopConnection['lineSignatures'][number]>;
    }
  >();

  for (const mapEntry of maps) {
    mapEntry.forEach((connection, key) => {
      const aggregate =
        aggregates.get(key) ??
        {
          consortiumId: connection.consortiumId,
          stopId: connection.stopId,
          originIds: new Set<string>(),
          signatures: new Map<string, StopConnection['lineSignatures'][number]>()
        };

      connection.originStopIds.forEach((originId) => aggregate.originIds.add(originId));
      connection.lineSignatures.forEach((signature) =>
        aggregate.signatures.set(buildSignatureKey(signature), signature)
      );

      aggregates.set(key, aggregate);
    });
  }

  const merged = new Map<string, StopConnection>();

  aggregates.forEach((aggregate, key) => {
    merged.set(key, {
      consortiumId: aggregate.consortiumId,
      stopId: aggregate.stopId,
      originStopIds: Array.from(aggregate.originIds),
      lineSignatures: Array.from(aggregate.signatures.values())
    });
  });

  return merged;
}

function buildSignatureKey(
  signature: StopConnection['lineSignatures'][number]
): string {
  return [signature.lineId, signature.lineCode, signature.direction]
    .join(SIGNATURE_KEY_SEPARATOR);
}
