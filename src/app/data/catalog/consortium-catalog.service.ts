import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, shareReplay, switchMap } from 'rxjs';
import { normalizeLineDisplayName } from '@data/lines/line-metadata.util';

export interface ConsortiumCatalogDatasets {
  readonly municipalities: string;
  readonly nuclei: string;
  readonly lines: string;
}

export interface ConsortiumCatalogEntry {
  readonly id: number;
  readonly name: string;
  readonly shortName: string;
  readonly province?: string | null;
  readonly datasets?: ConsortiumCatalogDatasets;
}

export interface CatalogMunicipalityEntry {
  readonly id: string;
  readonly name: string;
}

export interface CatalogNucleusEntry {
  readonly id: string;
  readonly municipalityId: string;
  readonly zone: string | null;
  readonly name: string;
}

export interface CatalogLineEntry {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly mode: string;
  readonly operators: readonly string[];
}

interface CatalogIndex {
  readonly consortia: readonly ConsortiumCatalogEntry[];
}

const CATALOG_PATH = 'assets/data/catalog/index.json' as const;
const CATALOG_BASE_PATH = 'assets/data/catalog/' as const;
const EMPTY_CONSORTIA: readonly ConsortiumCatalogEntry[] = Object.freeze([]);
const EMPTY_MUNICIPALITIES: readonly CatalogMunicipalityEntry[] = Object.freeze([]);
const EMPTY_NUCLEI: readonly CatalogNucleusEntry[] = Object.freeze([]);
const EMPTY_LINES: readonly CatalogLineEntry[] = Object.freeze([]);

@Injectable({ providedIn: 'root' })
export class ConsortiumCatalogService {
  private readonly http = inject(HttpClient);

  private readonly catalog$: Observable<CatalogIndex> = this.http.get<unknown>(CATALOG_PATH).pipe(
    map(readCatalogIndex),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly municipalitiesCache = new Map<number, Observable<readonly CatalogMunicipalityEntry[]>>();
  private readonly nucleiCache = new Map<number, Observable<readonly CatalogNucleusEntry[]>>();
  private readonly linesCache = new Map<number, Observable<readonly CatalogLineEntry[]>>();

  loadConsortiums(): Observable<readonly ConsortiumCatalogEntry[]> {
    return this.catalog$.pipe(map((catalog) => catalog.consortia));
  }

  loadMunicipalities(consortiumId: number): Observable<readonly CatalogMunicipalityEntry[]> {
    const cached = this.municipalitiesCache.get(consortiumId);
    if (cached) {
      return cached;
    }

    const request$ = this.loadDataset(consortiumId, 'municipalities').pipe(
      switchMap((path) => (path ? this.http.get<unknown>(path) : of(null))),
      map(readMunicipalities),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    this.municipalitiesCache.set(consortiumId, request$);
    return request$;
  }

  loadNuclei(consortiumId: number): Observable<readonly CatalogNucleusEntry[]> {
    const cached = this.nucleiCache.get(consortiumId);
    if (cached) {
      return cached;
    }

    const request$ = this.loadDataset(consortiumId, 'nuclei').pipe(
      switchMap((path) => (path ? this.http.get<unknown>(path) : of(null))),
      map(readNuclei),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    this.nucleiCache.set(consortiumId, request$);
    return request$;
  }

  loadLines(consortiumId: number): Observable<readonly CatalogLineEntry[]> {
    const cached = this.linesCache.get(consortiumId);
    if (cached) {
      return cached;
    }

    const request$ = this.loadDataset(consortiumId, 'lines').pipe(
      switchMap((path) => (path ? this.http.get<unknown>(path) : of(null))),
      map(readLines),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    this.linesCache.set(consortiumId, request$);
    return request$;
  }

  private loadDataset(
    consortiumId: number,
    dataset: keyof ConsortiumCatalogDatasets
  ): Observable<string | null> {
    return this.catalog$.pipe(
      map((catalog) => {
        const entry = catalog.consortia.find((candidate) => candidate.id === consortiumId);
        const relativePath = entry?.datasets?.[dataset];
        return relativePath ? `${CATALOG_BASE_PATH}${relativePath}` : null;
      })
    );
  }
}

function readCatalogIndex(payload: unknown): CatalogIndex {
  const root = readObject(payload);
  if (!root) {
    return { consortia: EMPTY_CONSORTIA };
  }

  const candidates = readConsortiumCandidates(root);
  const entries = candidates
    .map(readConsortium)
    .filter((entry): entry is ConsortiumCatalogEntry => entry !== null)
    .sort((left, right) => left.name.localeCompare(right.name, 'es-ES'));

  return { consortia: entries.length > 0 ? Object.freeze(entries) : EMPTY_CONSORTIA };
}

function readConsortiumCandidates(root: Readonly<Record<string, unknown>>): readonly unknown[] {
  const rootConsortia = root['consortia'];
  if (Array.isArray(rootConsortia)) {
    return rootConsortia;
  }

  const metadata = readObject(root['metadata']);
  const metadataConsortiums = metadata?.['consortiums'];
  return Array.isArray(metadataConsortiums) ? metadataConsortiums : EMPTY_CONSORTIA;
}

function readConsortium(value: unknown): ConsortiumCatalogEntry | null {
  const entry = readObject(value);
  if (!entry) {
    return null;
  }

  const id = Number(entry['id']);
  const name = readText(entry['name']);
  const shortName = readText(entry['shortName']);
  if (!Number.isSafeInteger(id) || id <= 0 || !name) {
    return null;
  }

  const province = readText(entry['province']);
  const datasets = readDatasets(entry['datasets']);
  return {
    id,
    name,
    shortName: shortName ?? '',
    province,
    ...(datasets ? { datasets } : {})
  };
}

function readDatasets(value: unknown): ConsortiumCatalogDatasets | null {
  const datasets = readObject(value);
  if (!datasets) {
    return null;
  }

  const municipalities = readText(datasets['municipalities']);
  const nuclei = readText(datasets['nuclei']);
  const lines = readText(datasets['lines']);
  if (!municipalities || !nuclei || !lines) {
    return null;
  }

  return { municipalities, nuclei, lines };
}

function readMunicipalities(payload: unknown): readonly CatalogMunicipalityEntry[] {
  const entries = readArray(payload, 'municipalities');
  const result = entries
    .map((value) => {
      const entry = readObject(value);
      const id = readText(entry?.['id']);
      const name = readText(entry?.['name']);
      return id && name ? { id, name } : null;
    })
    .filter((entry): entry is CatalogMunicipalityEntry => entry !== null)
    .sort((left, right) => left.name.localeCompare(right.name, 'es-ES'));
  return result.length ? Object.freeze(result) : EMPTY_MUNICIPALITIES;
}

function readNuclei(payload: unknown): readonly CatalogNucleusEntry[] {
  const entries = readArray(payload, 'nuclei');
  const result = entries
    .map((value) => {
      const entry = readObject(value);
      const id = readText(entry?.['id']);
      const municipalityId = readText(entry?.['municipalityId']);
      const name = readText(entry?.['name']);
      const zone = readText(entry?.['zone']);
      return id && municipalityId && name ? { id, municipalityId, zone, name } : null;
    })
    .filter((entry): entry is CatalogNucleusEntry => entry !== null)
    .sort((left, right) => left.name.localeCompare(right.name, 'es-ES'));
  return result.length ? Object.freeze(result) : EMPTY_NUCLEI;
}

function readLines(payload: unknown): readonly CatalogLineEntry[] {
  const entries = readArray(payload, 'lines');
  const result = entries
    .map((value) => {
      const entry = readObject(value);
      const id = readText(entry?.['id']);
      const code = readText(entry?.['code']);
      const rawName = readText(entry?.['name']);
      const name = rawName ? normalizeLineDisplayName(rawName) : '';
      const mode = readText(entry?.['mode']) ?? '';
      const operators = readStringArray(entry?.['operators']);
      return id && code && name ? { id, code, name, mode, operators } : null;
    })
    .filter((entry): entry is CatalogLineEntry => entry !== null)
    .sort((left, right) => left.code.localeCompare(right.code, 'es-ES', { numeric: true }));
  return result.length ? Object.freeze(result) : EMPTY_LINES;
}

function readArray(payload: unknown, key: string): readonly unknown[] {
  const root = readObject(payload);
  const value = root?.[key];
  return Array.isArray(value) ? value : [];
}

function readStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return Object.freeze([]);
  }

  return Object.freeze(
    value
      .map(readText)
      .filter((entry): entry is string => entry !== null)
  );
}

function readObject(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : null;
}

function readText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}
