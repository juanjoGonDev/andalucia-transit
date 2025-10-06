import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable, shareReplay } from 'rxjs';

import { APP_CONFIG_TOKEN } from '../../core/tokens/app-config.token';
import { AppConfig } from '../../core/config';

const SEARCH_LOCALE = 'es-ES' as const;

export interface StopDirectoryRecord {
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

export interface StopDirectoryOption {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly municipality: string;
  readonly nucleus: string;
  readonly consortiumId: number;
}

export interface StopSearchRequest {
  readonly query: string;
  readonly limit: number;
  readonly includeStopIds?: readonly string[];
  readonly excludeStopId?: string;
}

interface StopDirectoryFile {
  readonly metadata: {
    readonly generatedAt: string;
    readonly timezone: string;
  };
  readonly stops: readonly StopDirectoryEntry[];
}

interface StopDirectoryEntry {
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

interface StopDirectoryIndex {
  readonly records: ReadonlyMap<string, StopDirectoryRecord>;
  readonly searchable: readonly SearchableStopRecord[];
}

interface SearchableStopRecord {
  readonly record: StopDirectoryRecord;
  readonly normalizedName: string;
  readonly normalizedMunicipality: string;
  readonly normalizedCode: string;
}

@Injectable({ providedIn: 'root' })
export class StopDirectoryService {
  private readonly http = inject(HttpClient);
  private readonly config: AppConfig = inject(APP_CONFIG_TOKEN);

  private readonly index$: Observable<StopDirectoryIndex> = this.http
    .get<StopDirectoryFile>(this.config.data.snapshots.stopDirectoryPath)
    .pipe(map((file) => buildDirectoryIndex(file)), shareReplay({ bufferSize: 1, refCount: true }));

  getStopById(stopId: string): Observable<StopDirectoryRecord | null> {
    return this.index$.pipe(map((index) => index.records.get(stopId) ?? null));
  }

  searchStops(request: StopSearchRequest): Observable<readonly StopDirectoryOption[]> {
    return this.index$.pipe(map((index) => searchDirectory(index, request)));
  }
}

function buildDirectoryIndex(file: StopDirectoryFile): StopDirectoryIndex {
  const records = file.stops.map(mapEntryToRecord);
  const orderedRecords = records.sort((first, second) =>
    first.name.localeCompare(second.name, SEARCH_LOCALE)
  );
  const searchable = orderedRecords.map<SearchableStopRecord>((record) => ({
    record,
    normalizedName: normalize(record.name),
    normalizedMunicipality: normalize(record.municipality),
    normalizedCode: normalize(record.stopCode)
  }));

  return {
    records: new Map(orderedRecords.map((record) => [record.stopId, record] as const)),
    searchable: Object.freeze(searchable)
  } satisfies StopDirectoryIndex;
}

function mapEntryToRecord(entry: StopDirectoryEntry): StopDirectoryRecord {
  return {
    consortiumId: entry.consortiumId,
    stopId: entry.stopId,
    stopCode: entry.stopCode,
    name: entry.name,
    municipality: entry.municipality,
    municipalityId: entry.municipalityId,
    nucleus: entry.nucleus,
    nucleusId: entry.nucleusId,
    zone: entry.zone,
    location: {
      latitude: entry.location.latitude,
      longitude: entry.location.longitude
    }
  } satisfies StopDirectoryRecord;
}

function searchDirectory(
  index: StopDirectoryIndex,
  request: StopSearchRequest
): readonly StopDirectoryOption[] {
  if (request.limit <= 0) {
    return Object.freeze([] as StopDirectoryOption[]);
  }

  const trimmedQuery = request.query.trim();
  const normalizedQuery = trimmedQuery ? normalize(trimmedQuery) : '';
  const includeSet = request.includeStopIds ? new Set(request.includeStopIds) : null;
  const excludeStopId = request.excludeStopId ?? null;
  const results: StopDirectoryOption[] = [];

  for (const item of index.searchable) {
    const record = item.record;

    if (excludeStopId && record.stopId === excludeStopId) {
      continue;
    }

    if (includeSet && !includeSet.has(record.stopId)) {
      continue;
    }

    if (normalizedQuery && !matchesSearch(item, normalizedQuery)) {
      continue;
    }

    results.push(toOption(record));

    if (results.length >= request.limit) {
      break;
    }
  }

  return Object.freeze(results);
}

function matchesSearch(record: SearchableStopRecord, normalizedQuery: string): boolean {
  return (
    record.normalizedName.includes(normalizedQuery) ||
    record.normalizedMunicipality.includes(normalizedQuery) ||
    record.normalizedCode.includes(normalizedQuery)
  );
}

function toOption(record: StopDirectoryRecord): StopDirectoryOption {
  return {
    id: record.stopId,
    code: record.stopCode,
    name: record.name,
    municipality: record.municipality,
    nucleus: record.nucleus,
    consortiumId: record.consortiumId
  } satisfies StopDirectoryOption;
}

function normalize(value: string): string {
  return value.toLocaleLowerCase(SEARCH_LOCALE);
}
