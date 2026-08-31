import { NearbyStopRecord } from '@core/services/nearby-stops.service';
import { buildStopIdentity } from '@core/services/stop-identity.util';
import { GeoCoordinate } from '@domain/utils/geo-distance.util';

export type MapAreaKind = 'municipality' | 'nucleus' | 'zone';

export interface MapStopSearchTarget {
  readonly kind: 'stop';
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly municipality: string;
  readonly nucleus: string;
  readonly zone: string | null;
  readonly coordinate: GeoCoordinate;
}

export interface MapAreaSearchTarget {
  readonly kind: 'area';
  readonly id: string;
  readonly areaKind: MapAreaKind;
  readonly name: string;
  readonly context: string | null;
  readonly coordinates: readonly GeoCoordinate[];
}

export type MapSearchTarget = MapStopSearchTarget | MapAreaSearchTarget;

interface MutableAreaTarget {
  readonly kind: 'area';
  readonly id: string;
  readonly areaKind: MapAreaKind;
  readonly name: string;
  readonly context: string | null;
  readonly coordinates: GeoCoordinate[];
}

const SEARCH_LOCALE = 'es-ES' as const;
const NORMALIZE_FORM = 'NFD' as const;
const DIACRITIC_MATCHER = /\p{M}/gu;
const AREA_KEY_SEPARATOR = '|' as const;
const NO_MATCH_SCORE = Number.POSITIVE_INFINITY;
const DEFAULT_LIMIT = 12;

export function buildMapSearchTargets(
  records: readonly NearbyStopRecord[]
): readonly MapSearchTarget[] {
  const stopTargets = records.map(toStopTarget);
  const areaTargets = buildAreaTargets(records);

  return Object.freeze([...areaTargets, ...stopTargets]);
}

export function searchMapTargets(
  targets: readonly MapSearchTarget[],
  query: string,
  limit: number = DEFAULT_LIMIT
): readonly MapSearchTarget[] {
  const normalizedQuery = normalize(query.trim());

  if (!normalizedQuery || limit <= 0) {
    return Object.freeze([]);
  }

  const matches = targets
    .map((target) => ({ target, score: scoreTarget(target, normalizedQuery) }))
    .filter((match) => Number.isFinite(match.score))
    .sort((first, second) => {
      if (first.score !== second.score) {
        return first.score - second.score;
      }

      if (first.target.kind !== second.target.kind) {
        return first.target.kind === 'area' ? -1 : 1;
      }

      return first.target.name.localeCompare(second.target.name, SEARCH_LOCALE);
    })
    .slice(0, limit)
    .map(({ target }) => target);

  return Object.freeze(matches);
}

function toStopTarget(record: NearbyStopRecord): MapStopSearchTarget {
  return {
    kind: 'stop',
    id: buildStopIdentity(record.consortiumId, record.stopId),
    name: record.name,
    code: record.stopCode,
    municipality: record.municipality,
    nucleus: record.nucleus,
    zone: record.zone,
    coordinate: {
      latitude: record.latitude,
      longitude: record.longitude
    }
  };
}

function buildAreaTargets(records: readonly NearbyStopRecord[]): readonly MapAreaSearchTarget[] {
  const areas = new Map<string, MutableAreaTarget>();

  for (const record of records) {
    const coordinate = { latitude: record.latitude, longitude: record.longitude };
    const consortiumKey = String(record.consortiumId);
    const municipalityKey = normalize(record.municipalityId || record.municipality);

    addArea(
      areas,
      ['municipality', consortiumKey, municipalityKey].join(AREA_KEY_SEPARATOR),
      'municipality',
      record.municipality,
      null,
      coordinate
    );

    if (record.nucleus) {
      addArea(
        areas,
        [
          'nucleus',
          consortiumKey,
          municipalityKey,
          normalize(record.nucleusId || record.nucleus)
        ].join(AREA_KEY_SEPARATOR),
        'nucleus',
        record.nucleus,
        record.municipality,
        coordinate
      );
    }

    if (record.zone) {
      addArea(
        areas,
        [
          'zone',
          consortiumKey,
          municipalityKey,
          normalize(record.zone)
        ].join(AREA_KEY_SEPARATOR),
        'zone',
        record.zone,
        record.municipality,
        coordinate
      );
    }
  }

  return Object.freeze(
    Array.from(areas.values(), (area) => ({
      kind: area.kind,
      id: area.id,
      areaKind: area.areaKind,
      name: area.name,
      context: area.context,
      coordinates: Object.freeze([...area.coordinates])
    }))
  );
}

function addArea(
  areas: Map<string, MutableAreaTarget>,
  id: string,
  areaKind: MapAreaKind,
  name: string,
  context: string | null,
  coordinate: GeoCoordinate
): void {
  if (!name) {
    return;
  }

  const existing = areas.get(id);

  if (existing) {
    existing.coordinates.push(coordinate);
    return;
  }

  areas.set(id, {
    kind: 'area',
    id,
    areaKind,
    name,
    context,
    coordinates: [coordinate]
  });
}

function scoreTarget(target: MapSearchTarget, query: string): number {
  const primaryName = normalize(target.name);

  if (primaryName === query) {
    return 0;
  }

  if (target.kind === 'stop' && normalize(target.code) === query) {
    return 0;
  }

  if (primaryName.startsWith(query)) {
    return 1;
  }

  const searchableValues = target.kind === 'stop'
    ? [target.code, target.municipality, target.nucleus, target.zone ?? '']
    : [target.context ?? ''];

  if (searchableValues.some((value) => normalize(value).startsWith(query))) {
    return 2;
  }

  if (
    primaryName.includes(query) ||
    searchableValues.some((value) => normalize(value).includes(query))
  ) {
    return 3;
  }

  return NO_MATCH_SCORE;
}

function normalize(value: string): string {
  return value
    .normalize(NORMALIZE_FORM)
    .replace(DIACRITIC_MATCHER, '')
    .toLocaleLowerCase(SEARCH_LOCALE);
}
