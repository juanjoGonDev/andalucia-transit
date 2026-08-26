import { Observable, firstValueFrom } from 'rxjs';
import { GeoCoordinate, calculateDistanceInMeters } from '@domain/utils/geo-distance.util';

interface StopDirectoryIndexFile {
  readonly chunks: readonly StopDirectoryChunkDescriptor[];
}

interface StopDirectoryChunkDescriptor {
  readonly path: string;
}

interface StopDirectoryChunkFile {
  readonly stops: readonly StopDirectoryChunkEntry[];
}

interface StopDirectoryChunkEntry {
  readonly consortiumId: number;
  readonly stopId: string;
  readonly stopCode: string;
  readonly name: string;
  readonly municipality: string;
  readonly municipalityId: string;
  readonly nucleus: string;
  readonly nucleusId: string;
  readonly zone: string | null;
  readonly location: {
    readonly latitude: number;
    readonly longitude: number;
  };
}

export interface NearbyStopsHttpClient {
  get<T>(url: string): Observable<T>;
}

export interface NearbyStopRecord {
  readonly consortiumId: number;
  readonly stopId: string;
  readonly stopCode: string;
  readonly name: string;
  readonly municipality: string;
  readonly municipalityId: string;
  readonly nucleus: string;
  readonly nucleusId: string;
  readonly zone: string | null;
  readonly latitude: number;
  readonly longitude: number;
}

export interface NearbyStopResult {
  readonly consortiumId: number;
  readonly id: string;
  readonly name: string;
  readonly distanceInMeters: number;
}

const EMPTY_RECORDS: readonly NearbyStopRecord[] = Object.freeze([]);
const EMPTY_RESULTS: readonly NearbyStopResult[] = Object.freeze([]);
const STOP_IDENTITY_SEPARATOR = ':' as const;

export async function loadNearbyStopRecords(
  http: NearbyStopsHttpClient,
  indexPath: string
): Promise<readonly NearbyStopRecord[]> {
  const index = await firstValueFrom(http.get<StopDirectoryIndexFile>(indexPath));

  if (!index.chunks.length) {
    return EMPTY_RECORDS;
  }

  const basePath = resolveChunkBasePath(indexPath);
  const seen = new Set<string>();
  const records: NearbyStopRecord[] = [];

  for (const descriptor of index.chunks) {
    const chunk = await firstValueFrom(
      http.get<StopDirectoryChunkFile>(`${basePath}${descriptor.path}`)
    );

    for (const stop of chunk.stops) {
      const identity = buildNearbyStopIdentity(stop.consortiumId, stop.stopId);

      if (seen.has(identity)) {
        continue;
      }

      seen.add(identity);
      records.push({
        consortiumId: stop.consortiumId,
        stopId: stop.stopId,
        stopCode: stop.stopCode,
        name: stop.name,
        municipality: stop.municipality,
        municipalityId: stop.municipalityId,
        nucleus: stop.nucleus,
        nucleusId: stop.nucleusId,
        zone: stop.zone,
        latitude: stop.location.latitude,
        longitude: stop.location.longitude
      });
    }
  }

  return Object.freeze(records);
}

export function buildNearbyStopResults(
  records: readonly NearbyStopRecord[],
  position: GeoCoordinate,
  limit: number,
  maxDistanceInMeters: number
): readonly NearbyStopResult[] {
  if (!records.length || limit <= 0) {
    return EMPTY_RESULTS;
  }

  const candidates: NearbyStopResult[] = [];

  for (const record of records) {
    const distance = calculateDistanceInMeters(position, {
      latitude: record.latitude,
      longitude: record.longitude
    });

    if (distance > maxDistanceInMeters) {
      continue;
    }

    candidates.push({
      consortiumId: record.consortiumId,
      id: record.stopId,
      name: record.name,
      distanceInMeters: distance
    });
  }

  if (!candidates.length) {
    return EMPTY_RESULTS;
  }

  candidates.sort((first, second) => first.distanceInMeters - second.distanceInMeters);
  return Object.freeze(candidates.slice(0, limit));
}

export function buildNearbyStopIdentity(consortiumId: number, stopId: string): string {
  return `${consortiumId}${STOP_IDENTITY_SEPARATOR}${stopId}`;
}

function resolveChunkBasePath(indexPath: string): string {
  const lastSlash = indexPath.lastIndexOf('/');

  if (lastSlash === -1) {
    return '';
  }

  return indexPath.slice(0, lastSlash + 1);
}

export const EMPTY_NEARBY_STOP_RECORDS = EMPTY_RECORDS;
export const EMPTY_NEARBY_STOP_RESULTS = EMPTY_RESULTS;
