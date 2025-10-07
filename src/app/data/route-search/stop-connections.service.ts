import { Injectable, inject } from '@angular/core';
import { map, Observable, of, shareReplay } from 'rxjs';

import {
  StopScheduleSnapshot,
  StopScheduleSnapshotRepository
} from '../services/stop-schedule-snapshot.repository';

export interface StopLineSignature {
  readonly lineId: string;
  readonly direction: number;
}

export interface StopConnection {
  readonly stopId: string;
  readonly originStopIds: readonly string[];
  readonly lineSignatures: readonly StopLineSignature[];
}

@Injectable({ providedIn: 'root' })
export class StopConnectionsService {
  private readonly repository = inject(StopScheduleSnapshotRepository);

  private readonly stops$ = this.repository
    .getAllStops()
    .pipe(shareReplay({ bufferSize: 1, refCount: true }));

  getConnections(stopIds: readonly string[]): Observable<ReadonlyMap<string, StopConnection>> {
    if (!stopIds.length) {
      return of(new Map());
    }

    const uniqueStopIds = Array.from(new Set(stopIds));

    return this.stops$.pipe(map((stops) => buildConnections(stops, uniqueStopIds)));
  }
}

function buildConnections(
  stops: ReadonlyMap<string, StopScheduleSnapshot>,
  originStopIds: readonly string[]
): ReadonlyMap<string, StopConnection> {
  const originProfiles = originStopIds
    .map((stopId) => stops.get(stopId))
    .filter((profile): profile is StopScheduleSnapshot => Boolean(profile));

  if (!originProfiles.length) {
    return new Map();
  }

  const originSet = new Set(originProfiles.map((profile) => profile.stopId));
  const consortiumSet = new Set(originProfiles.map((profile) => profile.consortiumId));
  const signatureOrigins = buildSignatureOrigins(originProfiles);

  if (!signatureOrigins.size) {
    return new Map();
  }

  const orderedOrigins = Array.from(new Set(originStopIds));
  const connections = new Map<string, StopConnection>();

  stops.forEach((profile, stopId) => {
    if (originSet.has(stopId)) {
      return;
    }

    if (!consortiumSet.has(profile.consortiumId)) {
      return;
    }

    const matchingOrigins = new Set<string>();
    const signatureMatches = new Set<string>();

    for (const signature of extractSignatures(profile)) {
      const key = toSignatureKey(signature);
      const origins = signatureOrigins.get(key);

      if (!origins) {
        continue;
      }

      signatureMatches.add(key);
      origins.forEach((origin) => matchingOrigins.add(origin));
    }

    if (!matchingOrigins.size) {
      return;
    }

    const orderedOriginIds = orderOrigins(orderedOrigins, matchingOrigins);
    const signatures = Array.from(signatureMatches).map(fromSignatureKey);

    connections.set(stopId, {
      stopId,
      originStopIds: Object.freeze(orderedOriginIds),
      lineSignatures: Object.freeze(signatures)
    });
  });

  return connections;
}

function buildSignatureOrigins(
  profiles: readonly StopScheduleSnapshot[]
): Map<string, Set<string>> {
  const signatureOrigins = new Map<string, Set<string>>();

  for (const profile of profiles) {
    for (const signature of extractSignatures(profile)) {
      const key = toSignatureKey(signature);
      const origins = signatureOrigins.get(key);

      if (origins) {
        origins.add(profile.stopId);
      } else {
        signatureOrigins.set(key, new Set([profile.stopId]));
      }
    }
  }

  return signatureOrigins;
}

function extractSignatures(profile: StopScheduleSnapshot): readonly StopLineSignature[] {
  const seen = new Set<string>();
  const signatures: StopLineSignature[] = [];

  for (const service of profile.services) {
    const signature = { lineId: service.lineId, direction: service.direction } as const;
    const key = toSignatureKey(signature);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    signatures.push({ lineId: signature.lineId, direction: signature.direction });
  }

  return signatures;
}

function toSignatureKey(signature: StopLineSignature): string {
  return `${signature.lineId}|${signature.direction}`;
}

function fromSignatureKey(key: string): StopLineSignature {
  const [lineId, direction] = key.split('|');
  return { lineId, direction: Number(direction) };
}

function orderOrigins(
  orderedOrigins: readonly string[],
  matchingOrigins: Set<string>
): string[] {
  const result: string[] = [];

  for (const originId of orderedOrigins) {
    if (matchingOrigins.has(originId)) {
      result.push(originId);
      matchingOrigins.delete(originId);
    }
  }

  matchingOrigins.forEach((originId) => result.push(originId));

  return result;
}
