import { Injectable, inject } from '@angular/core';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';

import { RouteLineStop, RouteLineSummary, RouteLinesApiService } from './route-lines-api.service';
import {
  StopDirectoryRecord,
  StopDirectoryService,
  StopDirectoryStopSignature
} from '../stops/stop-directory.service';

export interface StopLineSignature {
  readonly lineId: string;
  readonly lineCode: string;
  readonly direction: number;
}

export interface StopConnection {
  readonly consortiumId: number;
  readonly stopId: string;
  readonly originStopIds: readonly string[];
  readonly lineSignatures: readonly StopLineSignature[];
}

export const STOP_CONNECTION_DIRECTION = {
  Forward: 'forward',
  Backward: 'backward'
} as const;

export type StopConnectionDirection =
  (typeof STOP_CONNECTION_DIRECTION)[keyof typeof STOP_CONNECTION_DIRECTION];

@Injectable({ providedIn: 'root' })
export class StopConnectionsService {
  private readonly directory = inject(StopDirectoryService);
  private readonly api = inject(RouteLinesApiService);

  getConnections(
    signatures: readonly StopDirectoryStopSignature[],
    direction: StopConnectionDirection = STOP_CONNECTION_DIRECTION.Forward
  ): Observable<ReadonlyMap<string, StopConnection>> {
    if (!signatures.length) {
      return of(EMPTY_CONNECTIONS);
    }

    const uniqueSignatures = dedupeSignatures(signatures);
    const originOrderMap = buildOriginOrderMap(uniqueSignatures.map((signature) => signature.stopId));

    return this.loadDirectoryRecords(uniqueSignatures).pipe(
      switchMap((records) => {
        if (!records.length) {
          return of(EMPTY_CONNECTIONS);
        }

        const groups = groupByConsortium(records);
        const observables = groups.map((group) =>
          this.resolveGroupConnections(group, direction)
        );

        if (!observables.length) {
          return of(EMPTY_CONNECTIONS);
        }

        return forkJoin(observables).pipe(
          map((groupMaps) => mergeGroupConnections(groupMaps, originOrderMap))
        );
      })
    );
  }

  private loadDirectoryRecords(
    signatures: readonly StopDirectoryStopSignature[]
  ): Observable<readonly StopDirectoryRecord[]> {
    if (!signatures.length) {
      return of([]);
    }

    const requests = signatures.map((signature) =>
      this.directory.getStopBySignature(signature.consortiumId, signature.stopId)
    );

    return forkJoin(requests).pipe(map((records) => records.filter(isRecord)));
  }

  private resolveGroupConnections(
    group: ConsortiumGroup,
    direction: StopConnectionDirection
  ): Observable<ConsortiumConnectionGroup> {
    return this.api.getLinesForStops(group.consortiumId, group.stopIds).pipe(
      switchMap((summaries) => {
        if (!summaries.length) {
          return of(createEmptyGroup(group.consortiumId));
        }

        const lineObservables = summaries.map((summary) =>
          this.api
            .getLineStops(group.consortiumId, summary.lineId)
            .pipe(
              map((stops) =>
                buildLineAccumulator(summary, stops, group.stopIdSet, direction)
              )
            )
        );

        return forkJoin(lineObservables).pipe(
          map((accumulators) => ({
            consortiumId: group.consortiumId,
            connections: mergeAccumulators(accumulators)
          }))
        );
      })
    );
  }
}

interface ConsortiumGroup {
  readonly consortiumId: number;
  readonly stopIds: readonly string[];
  readonly stopIdSet: ReadonlySet<string>;
}

interface ConnectionAccumulator {
  readonly stopId: string;
  readonly originIds: Set<string>;
  readonly signatureKeys: Set<string>;
}

interface ConsortiumConnectionGroup {
  readonly consortiumId: number;
  readonly connections: ReadonlyMap<string, ConnectionAccumulator>;
}

const EMPTY_CONNECTIONS: ReadonlyMap<string, StopConnection> = new Map();
const EMPTY_ACCUMULATORS: ReadonlyMap<string, ConnectionAccumulator> = new Map();
const SIGNATURE_SEPARATOR = '|' as const;
const CONNECTION_KEY_SEPARATOR = ':' as const;

function isRecord(value: StopDirectoryRecord | null): value is StopDirectoryRecord {
  return Boolean(value);
}

function groupByConsortium(records: readonly StopDirectoryRecord[]): readonly ConsortiumGroup[] {
  const groups = new Map<number, StopDirectoryRecord[]>();

  for (const record of records) {
    const existing = groups.get(record.consortiumId);

    if (existing) {
      existing.push(record);
    } else {
      groups.set(record.consortiumId, [record]);
    }
  }

  return Array.from(groups.entries()).map(([consortiumId, members]) => {
    const ids = members.map((record) => record.stopId);
    return {
      consortiumId,
      stopIds: Object.freeze(ids),
      stopIdSet: new Set(ids)
    } satisfies ConsortiumGroup;
  });
}

function buildOriginOrderMap(stopIds: readonly string[]): ReadonlyMap<string, number> {
  const entries = stopIds.map((stopId, index) => [stopId, index] as const);
  return new Map(entries);
}

function dedupeSignatures(
  signatures: readonly StopDirectoryStopSignature[]
): readonly StopDirectoryStopSignature[] {
  const unique = new Map<string, StopDirectoryStopSignature>();

  signatures.forEach((signature) => {
    const key = buildStopConnectionKey(signature.consortiumId, signature.stopId);

    if (!unique.has(key)) {
      unique.set(key, signature);
    }
  });

  return Array.from(unique.values());
}

function buildLineAccumulator(
  summary: RouteLineSummary,
  stops: readonly RouteLineStop[],
  originIds: ReadonlySet<string>,
  connectionDirection: StopConnectionDirection
): ReadonlyMap<string, ConnectionAccumulator> {
  if (!stops.length) {
    return EMPTY_ACCUMULATORS;
  }

  const byDirection = groupStopsByDirection(stops);
  const accumulator = new Map<string, ConnectionAccumulator>();

  byDirection.forEach((directionStops, routeDirection) => {
    const orderedStops = [...directionStops].sort((first, second) => first.order - second.order);
    const originPositions = orderedStops.filter((stop) => originIds.has(stop.stopId));

    if (!originPositions.length) {
      return;
    }

    for (const originStop of originPositions) {
      for (const candidate of orderedStops) {
        if (
          connectionDirection === STOP_CONNECTION_DIRECTION.Forward &&
          candidate.order <= originStop.order
        ) {
          continue;
        }

        if (
          connectionDirection === STOP_CONNECTION_DIRECTION.Backward &&
          candidate.order >= originStop.order
        ) {
          continue;
        }

        if (originIds.has(candidate.stopId)) {
          continue;
        }

        const signatureKey = buildSignatureKey(summary.lineId, summary.code, routeDirection);
        const existing = accumulator.get(candidate.stopId);

        if (existing) {
          existing.originIds.add(originStop.stopId);
          existing.signatureKeys.add(signatureKey);
        } else {
          accumulator.set(candidate.stopId, {
            stopId: candidate.stopId,
            originIds: new Set([originStop.stopId]),
            signatureKeys: new Set([signatureKey])
          });
        }
      }
    }
  });

  return accumulator;
}

function groupStopsByDirection(stops: readonly RouteLineStop[]): Map<number, RouteLineStop[]> {
  const mapByDirection = new Map<number, RouteLineStop[]>();

  for (const stop of stops) {
    const directionStops = mapByDirection.get(stop.direction);

    if (directionStops) {
      directionStops.push(stop);
    } else {
      mapByDirection.set(stop.direction, [stop]);
    }
  }

  return mapByDirection;
}

function mergeAccumulators(
  accumulators: readonly ReadonlyMap<string, ConnectionAccumulator>[]
): ReadonlyMap<string, ConnectionAccumulator> {
  if (!accumulators.length) {
    return EMPTY_ACCUMULATORS;
  }

  const merged = new Map<string, ConnectionAccumulator>();

  for (const mapEntry of accumulators) {
    mapEntry.forEach((value, stopId) => {
      const existing = merged.get(stopId);

      if (existing) {
        value.originIds.forEach((originId) => existing.originIds.add(originId));
        value.signatureKeys.forEach((key) => existing.signatureKeys.add(key));
      } else {
        merged.set(stopId, {
          stopId,
          originIds: new Set(value.originIds),
          signatureKeys: new Set(value.signatureKeys)
        });
      }
    });
  }

  return merged;
}

function mergeGroupConnections(
  groups: readonly ConsortiumConnectionGroup[],
  originOrderMap: ReadonlyMap<string, number>
): ReadonlyMap<string, StopConnection> {
  if (!groups.length) {
    return EMPTY_CONNECTIONS;
  }

  const merged = new Map<
    string,
    {
      consortiumId: number;
      accumulator: ConnectionAccumulator;
    }
  >();

  for (const group of groups) {
    group.connections.forEach((value, stopId) => {
      const key = buildStopConnectionKey(group.consortiumId, stopId);
      const existing = merged.get(key);

      if (existing) {
        value.originIds.forEach((originId) => existing.accumulator.originIds.add(originId));
        value.signatureKeys.forEach((signatureKey) => existing.accumulator.signatureKeys.add(signatureKey));
      } else {
        merged.set(key, {
          consortiumId: group.consortiumId,
          accumulator: {
            stopId,
            originIds: new Set(value.originIds),
            signatureKeys: new Set(value.signatureKeys)
          }
        });
      }
    });
  }

  const connections = Array.from(merged.entries(), ([key, value]) => {
    const connection = buildConnection(value.consortiumId, value.accumulator, originOrderMap);
    return [key, connection] as const;
  });

  return new Map(connections);
}

function buildConnection(
  consortiumId: number,
  accumulator: ConnectionAccumulator,
  originOrderMap: ReadonlyMap<string, number>
): StopConnection {
  const orderedOrigins = orderOrigins(accumulator.originIds, originOrderMap);
  const signatures = Array.from(accumulator.signatureKeys, parseSignatureKey);

  return {
    consortiumId,
    stopId: accumulator.stopId,
    originStopIds: Object.freeze(orderedOrigins),
    lineSignatures: Object.freeze(signatures)
  } satisfies StopConnection;
}

function orderOrigins(
  originIds: Set<string>,
  originOrderMap: ReadonlyMap<string, number>
): readonly string[] {
  const referencedOrigins = Array.from(originIds);
  const sorted = referencedOrigins.sort((first, second) => {
    const firstOrder = originOrderMap.get(first) ?? Number.MAX_SAFE_INTEGER;
    const secondOrder = originOrderMap.get(second) ?? Number.MAX_SAFE_INTEGER;
    return firstOrder - secondOrder;
  });

  return Object.freeze(sorted);
}

function buildSignatureKey(lineId: string, lineCode: string, direction: number): string {
  return `${lineId}${SIGNATURE_SEPARATOR}${lineCode}${SIGNATURE_SEPARATOR}${direction}`;
}

function parseSignatureKey(key: string): StopLineSignature {
  const [lineId, lineCode, direction] = key.split(SIGNATURE_SEPARATOR);
  return { lineId, lineCode, direction: Number(direction) };
}

export function buildStopConnectionKey(consortiumId: number, stopId: string): string {
  return `${consortiumId}${CONNECTION_KEY_SEPARATOR}${stopId}`;
}

function createEmptyGroup(consortiumId: number): ConsortiumConnectionGroup {
  return { consortiumId, connections: EMPTY_ACCUMULATORS };
}
