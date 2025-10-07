import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable, of, shareReplay, switchMap } from 'rxjs';

import { APP_CONFIG_TOKEN } from '../../core/tokens/app-config.token';
import { AppConfig } from '../../core/config';

const SEARCH_LOCALE = 'es-ES' as const;
const MIN_QUERY_LENGTH = 2;

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

interface StopDirectoryIndexFile {
  readonly metadata: StopDirectoryFileMetadata;
  readonly chunks: readonly StopDirectoryChunkDescriptor[];
  readonly searchIndex: readonly StopDirectorySearchEntry[];
}

interface StopDirectoryFileMetadata {
  readonly generatedAt: string;
  readonly timezone: string;
  readonly providerName: string;
  readonly consortiums: readonly StopDirectoryConsortiumSummary[];
  readonly totalStops: number;
}

interface StopDirectoryConsortiumSummary {
  readonly id: number;
  readonly name: string;
  readonly shortName: string;
}

interface StopDirectoryChunkDescriptor {
  readonly id: string;
  readonly consortiumId: number;
  readonly path: string;
  readonly stopCount: number;
}

interface StopDirectorySearchEntry {
  readonly stopId: string;
  readonly stopCode: string;
  readonly name: string;
  readonly municipality: string;
  readonly municipalityId: string;
  readonly nucleus: string;
  readonly nucleusId: string;
  readonly consortiumId: number;
  readonly chunkId: string;
}

interface StopDirectoryChunkFile {
  readonly metadata: {
    readonly generatedAt: string;
    readonly timezone: string;
    readonly providerName: string;
    readonly consortiumId: number;
    readonly consortiumName: string;
    readonly stopCount: number;
  };
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

interface StopDirectoryIndex {
  readonly searchable: readonly SearchableStopRecord[];
  readonly entries: ReadonlyMap<string, StopDirectorySearchEntry>;
  readonly chunks: ReadonlyMap<string, StopDirectoryChunkDescriptor>;
}

interface SearchableStopRecord {
  readonly entry: StopDirectorySearchEntry;
  readonly normalizedName: string;
  readonly normalizedMunicipality: string;
  readonly normalizedCode: string;
}

type ChunkRecords = ReadonlyMap<string, StopDirectoryRecord>;

@Injectable({ providedIn: 'root' })
export class StopDirectoryService {
  private readonly http = inject(HttpClient);
  private readonly config: AppConfig = inject(APP_CONFIG_TOKEN);

  private readonly index$: Observable<StopDirectoryIndex> = this.http
    .get<StopDirectoryIndexFile>(this.config.data.snapshots.stopDirectoryPath)
    .pipe(map((file) => buildDirectoryIndex(file)), shareReplay({ bufferSize: 1, refCount: true }));

  private readonly chunkBasePath = resolveChunkBasePath(
    this.config.data.snapshots.stopDirectoryPath
  );

  private readonly chunkCache = new Map<string, Observable<ChunkRecords>>();

  getStopById(stopId: string): Observable<StopDirectoryRecord | null> {
    return this.index$.pipe(
      switchMap((index) => {
        const entry = index.entries.get(stopId);

        if (!entry) {
          return of(null);
        }

        const descriptor = index.chunks.get(entry.chunkId);

        if (!descriptor) {
          return of(null);
        }

        return this.loadChunkRecords(descriptor).pipe(
          map((records) => records.get(stopId) ?? null)
        );
      })
    );
  }

  searchStops(request: StopSearchRequest): Observable<readonly StopDirectoryOption[]> {
    return this.index$.pipe(map((index) => searchDirectory(index, request)));
  }

  private loadChunkRecords(descriptor: StopDirectoryChunkDescriptor): Observable<ChunkRecords> {
    const cached = this.chunkCache.get(descriptor.id);

    if (cached) {
      return cached;
    }

    const url = `${this.chunkBasePath}${descriptor.path}`;
    const records$ = this.http
      .get<StopDirectoryChunkFile>(url)
      .pipe(map((file) => mapChunkToRecords(file)), shareReplay({ bufferSize: 1, refCount: true }));

    this.chunkCache.set(descriptor.id, records$);
    return records$;
  }
}

function resolveChunkBasePath(indexPath: string): string {
  const lastSlash = indexPath.lastIndexOf('/');

  if (lastSlash === -1) {
    return '';
  }

  return `${indexPath.slice(0, lastSlash + 1)}`;
}

function buildDirectoryIndex(file: StopDirectoryIndexFile): StopDirectoryIndex {
  const entries = new Map<string, StopDirectorySearchEntry>();

  for (const entry of file.searchIndex) {
    entries.set(entry.stopId, entry);
  }

  const chunks = new Map<string, StopDirectoryChunkDescriptor>();

  for (const descriptor of file.chunks) {
    chunks.set(descriptor.id, descriptor);
  }

  const searchable = file.searchIndex
    .map<SearchableStopRecord>((entry) => ({
      entry,
      normalizedName: normalize(entry.name),
      normalizedMunicipality: normalize(entry.municipality),
      normalizedCode: normalize(entry.stopCode)
    }))
    .sort((first, second) => first.entry.name.localeCompare(second.entry.name, SEARCH_LOCALE));

  return {
    searchable: Object.freeze(searchable),
    entries,
    chunks
  } satisfies StopDirectoryIndex;
}

function mapChunkToRecords(file: StopDirectoryChunkFile): ChunkRecords {
  const records = file.stops.map(mapChunkEntryToRecord);

  return new Map(records.map((record) => [record.stopId, record] as const));
}

function mapChunkEntryToRecord(entry: StopDirectoryChunkEntry): StopDirectoryRecord {
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

function searchDirectory(index: StopDirectoryIndex, request: StopSearchRequest): readonly StopDirectoryOption[] {
  if (request.limit <= 0) {
    return EMPTY_OPTIONS;
  }

  const trimmedQuery = request.query.trim();
  const includeSet = request.includeStopIds ? new Set(request.includeStopIds) : null;
  const excludeStopId = request.excludeStopId ?? null;
  const hasSufficientQuery = trimmedQuery.length >= MIN_QUERY_LENGTH;
  const normalizedQuery = hasSufficientQuery ? normalize(trimmedQuery) : null;

  if (!normalizedQuery && !includeSet) {
    return EMPTY_OPTIONS;
  }

  const results: StopDirectoryOption[] = [];

  for (const item of index.searchable) {
    const entry = item.entry;

    if (excludeStopId && entry.stopId === excludeStopId) {
      continue;
    }

    const isIncluded = includeSet?.has(entry.stopId) ?? false;
    const matchesQuery = normalizedQuery ? matchesSearch(item, normalizedQuery) : false;

    if (!normalizedQuery && includeSet && !isIncluded) {
      continue;
    }

    if (normalizedQuery && !matchesQuery && !isIncluded) {
      continue;
    }

    results.push(toOption(entry));

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

function toOption(entry: StopDirectorySearchEntry): StopDirectoryOption {
  return {
    id: entry.stopId,
    code: entry.stopCode,
    name: entry.name,
    municipality: entry.municipality,
    nucleus: entry.nucleus,
    consortiumId: entry.consortiumId
  } satisfies StopDirectoryOption;
}

function normalize(value: string): string {
  return value.toLocaleLowerCase(SEARCH_LOCALE);
}

const EMPTY_OPTIONS: readonly StopDirectoryOption[] = Object.freeze([] as StopDirectoryOption[]);
