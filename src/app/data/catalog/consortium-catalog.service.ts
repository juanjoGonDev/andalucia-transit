import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';

export interface ConsortiumCatalogEntry {
  readonly id: number;
  readonly name: string;
  readonly shortName: string;
}

const CATALOG_PATH = 'assets/data/catalog/index.json' as const;
const EMPTY_CONSORTIA: readonly ConsortiumCatalogEntry[] = Object.freeze([]);

@Injectable({ providedIn: 'root' })
export class ConsortiumCatalogService {
  private readonly http = inject(HttpClient);

  private readonly consortiums$: Observable<readonly ConsortiumCatalogEntry[]> = this.http
    .get<unknown>(CATALOG_PATH)
    .pipe(
      map(readConsortiumCatalog),
      shareReplay({ bufferSize: 1, refCount: true })
    );

  loadConsortiums(): Observable<readonly ConsortiumCatalogEntry[]> {
    return this.consortiums$;
  }
}

function readConsortiumCatalog(payload: unknown): readonly ConsortiumCatalogEntry[] {
  const root = readObject(payload);

  if (!root) {
    return EMPTY_CONSORTIA;
  }

  const candidates = readConsortiumCandidates(root);
  const entries = candidates
    .map(readConsortium)
    .filter((entry): entry is ConsortiumCatalogEntry => entry !== null)
    .sort((left, right) => left.name.localeCompare(right.name, 'es-ES'));

  return entries.length > 0 ? Object.freeze(entries) : EMPTY_CONSORTIA;
}

function readConsortiumCandidates(root: Readonly<Record<string, unknown>>): readonly unknown[] {
  const metadata = readObject(root['metadata']);
  const metadataConsortiums = metadata?.['consortiums'];

  if (Array.isArray(metadataConsortiums)) {
    return metadataConsortiums;
  }

  const rootConsortia = root['consortia'];
  return Array.isArray(rootConsortia) ? rootConsortia : EMPTY_CONSORTIA;
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

  return { id, name, shortName: shortName ?? '' };
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
