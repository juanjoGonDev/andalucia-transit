import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, shareReplay, switchMap } from 'rxjs';
import { AppConfig } from '../../core/config';
import { APP_CONFIG_TOKEN } from '../../core/tokens/app-config.token';

const SEARCH_LOCALE = 'es-ES' as const;
const MIN_QUERY_LENGTH = 2;
const NORMALIZE_FORM = 'NFD' as const;
const DIACRITIC_MATCHER = /\p{M}/gu;
const ENTRY_KEY_SEPARATOR = ':' as const;
const SIGNATURE_KEY_SEPARATOR = '|' as const;

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
  readonly municipalityId: string;
  readonly nucleus: string;
  readonly nucleusId: string;
  readonly consortiumId: number;
  readonly stopIds: readonly string[];
}

export interface StopDirectoryStopSignature {
  readonly consortiumId: number;
  readonly stopId: string;
}

export interface StopSearchRequest {
  readonly query: string;
  readonly limit: number;
  readonly includeStopSignatures?: readonly StopDirectoryStopSignature[];
  readonly excludeStopSignature?: StopDirectoryStopSignature;
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
  readonly compositeEntries: ReadonlyMap<string, StopDirectorySearchEntry>;
  readonly chunks: ReadonlyMap<string, StopDirectoryChunkDescriptor>;
  readonly groups: ReadonlyMap<string, readonly StopDirectorySearchEntry[]>;
  readonly optionsByComposite: ReadonlyMap<string, StopDirectoryOption>;
}

interface SearchableStopRecord {
  readonly entry: StopDirectorySearchEntry;
  readonly normalizedName: string;
  readonly normalizedMunicipality: string;
  readonly normalizedNucleus: string;
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

        return this.loadRecord(index, entry);
      })
    );
  }

  getStopBySignature(
    consortiumId: number,
    stopId: string
  ): Observable<StopDirectoryRecord | null> {
    return this.index$.pipe(
      switchMap((index) => {
        const entryKey = buildEntryKey(consortiumId, stopId);
        const entry = index.compositeEntries.get(entryKey);

        if (!entry) {
          return of(null);
        }

        return this.loadRecord(index, entry);
      })
    );
  }

  getOptionByStopId(stopId: string): Observable<StopDirectoryOption | null> {
    return this.index$.pipe(
      map((index) => {
        const entry = index.entries.get(stopId);

        if (!entry) {
          return null;
        }

        const key = buildEntryKey(entry.consortiumId, stopId);
        const option = index.optionsByComposite.get(key);

        if (option) {
          return option;
        }

        const groupKey = buildGroupKey(entry);
        const members = index.groups.get(groupKey) ?? [entry];
        const primaryEntry = members.find((member) => member.stopId === stopId) ?? entry;
        const orderedMembers = orderGroupMembers(members, primaryEntry);

        return toOption(primaryEntry, orderedMembers);
      })
    );
  }

  getOptionByStopSignature(
    consortiumId: number,
    stopId: string
  ): Observable<StopDirectoryOption | null> {
    return this.index$.pipe(
      map((index) => index.optionsByComposite.get(buildEntryKey(consortiumId, stopId)) ?? null)
    );
  }

  searchStops(request: StopSearchRequest): Observable<readonly StopDirectoryOption[]> {
    return this.index$.pipe(map((index) => searchDirectory(index, request)));
  }

  private loadRecord(
    index: StopDirectoryIndex,
    entry: StopDirectorySearchEntry
  ): Observable<StopDirectoryRecord | null> {
    const descriptor = index.chunks.get(entry.chunkId);

    if (!descriptor) {
      return of(null);
    }

    return this.loadChunkRecords(descriptor).pipe(
      map((records) => records.get(entry.stopId) ?? null)
    );
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
  const compositeEntries = new Map<string, StopDirectorySearchEntry>();
  const groups = new Map<string, StopDirectorySearchEntry[]>();

  for (const entry of file.searchIndex) {
    if (!entries.has(entry.stopId)) {
      entries.set(entry.stopId, entry);
    }
    compositeEntries.set(buildEntryKey(entry.consortiumId, entry.stopId), entry);
    const key = buildGroupKey(entry);
    const bucket = groups.get(key);

    if (bucket) {
      bucket.push(entry);
    } else {
      groups.set(key, [entry]);
    }
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
      normalizedNucleus: normalize(entry.nucleus),
      normalizedCode: normalize(entry.stopCode)
    }))
    .sort((first, second) => first.entry.name.localeCompare(second.entry.name, SEARCH_LOCALE));

  const frozenGroups = freezeGroups(groups);
  const optionsByComposite = buildCompositeOptionMap(frozenGroups);

  return {
    searchable: Object.freeze(searchable),
    entries,
    compositeEntries,
    chunks,
    groups: frozenGroups,
    optionsByComposite
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

function freezeGroups(
  groups: Map<string, StopDirectorySearchEntry[]>
): ReadonlyMap<string, readonly StopDirectorySearchEntry[]> {
  const entries = Array.from(groups.entries(), ([key, value]) => {
    const sorted = [...value].sort(compareGroupEntries);
    return [key, Object.freeze(sorted)] as const;
  });

  return new Map(entries);
}

function compareGroupEntries(
  first: StopDirectorySearchEntry,
  second: StopDirectorySearchEntry
): number {
  const nameComparison = first.name.localeCompare(second.name, SEARCH_LOCALE);

  if (nameComparison !== 0) {
    return nameComparison;
  }

  const municipalityComparison = first.municipality.localeCompare(
    second.municipality,
    SEARCH_LOCALE
  );

  if (municipalityComparison !== 0) {
    return municipalityComparison;
  }

  return first.stopId.localeCompare(second.stopId, SEARCH_LOCALE);
}

function searchDirectory(
  index: StopDirectoryIndex,
  request: StopSearchRequest
): readonly StopDirectoryOption[] {
  if (request.limit <= 0) {
    return EMPTY_OPTIONS;
  }

  const trimmedQuery = request.query.trim();
  const includeSet = request.includeStopSignatures
    ? new Set(request.includeStopSignatures.map(buildSignatureKey))
    : null;
  const excludeSignatureKey = request.excludeStopSignature
    ? buildSignatureKey(request.excludeStopSignature)
    : null;
  const hasSufficientQuery = trimmedQuery.length >= MIN_QUERY_LENGTH;
  const normalizedQuery = hasSufficientQuery ? normalize(trimmedQuery) : null;

  if (!normalizedQuery && !includeSet) {
    return EMPTY_OPTIONS;
  }

  const results: StopDirectoryOption[] = [];
  const addedGroups = new Set<string>();

  for (const item of index.searchable) {
    const entry = item.entry;
    const groupKey = buildGroupKey(entry);
    const groupMembers = index.groups.get(groupKey) ?? [entry];
    const memberKeys = groupMembers.map((member) => buildEntryKey(member.consortiumId, member.stopId));
    const groupIncludesExcludedStop = excludeSignatureKey
      ? memberKeys.some((key) => key === excludeSignatureKey)
      : false;

    if (groupIncludesExcludedStop) {
      continue;
    }

    const isIncluded = includeSet ? memberKeys.some((key) => includeSet.has(key)) : false;
    const matchesQuery = normalizedQuery ? matchesSearch(item, normalizedQuery) : false;

    if (!normalizedQuery && includeSet && !isIncluded) {
      continue;
    }

    if (normalizedQuery && !matchesQuery) {
      continue;
    }

    if (addedGroups.has(groupKey)) {
      continue;
    }

    if (results.length >= request.limit) {
      continue;
    }

    results.push(toOption(groupMembers[0] ?? entry, groupMembers));
    addedGroups.add(groupKey);
  }

  return Object.freeze(results);
}

function buildCompositeOptionMap(
  groups: ReadonlyMap<string, readonly StopDirectorySearchEntry[]>
): ReadonlyMap<string, StopDirectoryOption> {
  const entries = new Map<string, StopDirectoryOption>();

  groups.forEach((members) => {
    members.forEach((member) => {
      const orderedMembers = orderGroupMembers(members, member);
      const option = toOption(member, orderedMembers);
      entries.set(buildEntryKey(member.consortiumId, member.stopId), option);
    });
  });

  return new Map(entries);
}

function buildGroupKey(entry: StopDirectorySearchEntry): string {
  const normalizedName = normalize(entry.name);

  return [entry.consortiumId, entry.nucleusId, normalizedName].join(
    SIGNATURE_KEY_SEPARATOR
  );
}

function buildEntryKey(consortiumId: number, stopId: string): string {
  return `${consortiumId}${ENTRY_KEY_SEPARATOR}${stopId}`;
}

function buildSignatureKey(signature: StopDirectoryStopSignature): string {
  return buildEntryKey(signature.consortiumId, signature.stopId);
}

function matchesSearch(record: SearchableStopRecord, normalizedQuery: string): boolean {
  return (
    record.normalizedName.includes(normalizedQuery) ||
    record.normalizedMunicipality.includes(normalizedQuery) ||
    record.normalizedNucleus.includes(normalizedQuery) ||
    record.normalizedCode.includes(normalizedQuery)
  );
}

function toOption(
  entry: StopDirectorySearchEntry,
  members: readonly StopDirectorySearchEntry[]
): StopDirectoryOption {
  const uniqueIds = new Set<string>();
  const orderedIds: string[] = [];

  for (const member of members) {
    if (uniqueIds.has(member.stopId)) {
      continue;
    }

    uniqueIds.add(member.stopId);
    orderedIds.push(member.stopId);
  }

  return {
    id: buildEntryKey(entry.consortiumId, entry.stopId),
    code: entry.stopCode,
    name: entry.name,
    municipality: entry.municipality,
    municipalityId: entry.municipalityId,
    nucleus: entry.nucleus,
    nucleusId: entry.nucleusId,
    consortiumId: entry.consortiumId,
    stopIds: Object.freeze(orderedIds)
  } satisfies StopDirectoryOption;
}

function normalize(value: string): string {
  return value
    .normalize(NORMALIZE_FORM)
    .replace(DIACRITIC_MATCHER, '')
    .toLocaleLowerCase(SEARCH_LOCALE);
}

function orderGroupMembers(
  members: readonly StopDirectorySearchEntry[],
  primary: StopDirectorySearchEntry
): readonly StopDirectorySearchEntry[] {
  if (!members.length || members[0] === primary) {
    return members;
  }

  const remaining = members.filter((member) => member !== primary);
  return Object.freeze([primary, ...remaining]);
}

const EMPTY_OPTIONS: readonly StopDirectoryOption[] = Object.freeze([] as StopDirectoryOption[]);
