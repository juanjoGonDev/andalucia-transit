import type {
  RouteLineCoordinate,
  RouteLineStop
} from '@data/route-search/route-lines-api.service';

const MIN_ROUTE_COORDINATES = 2;
const EMPTY_STOPS: readonly RouteLineStop[] = Object.freeze([]);
const EMPTY_COORDINATES: readonly RouteLineCoordinate[] = Object.freeze([]);

export function selectPrimaryLineDirectionStops(
  stops: readonly RouteLineStop[]
): readonly RouteLineStop[] {
  if (!stops.length) {
    return EMPTY_STOPS;
  }

  const groups = groupStopsByDirection(stops);
  const selected = [...groups.values()].sort(compareDirectionGroups)[0];

  return selected ? sortStops(selected) : EMPTY_STOPS;
}

export function selectLineDirectionStops(
  stops: readonly RouteLineStop[],
  direction: number | null | undefined
): readonly RouteLineStop[] {
  if (direction === null || direction === undefined) {
    return selectPrimaryLineDirectionStops(stops);
  }

  const matching = stops.filter((stop) => stop.direction === direction);
  return matching.length ? sortStops(matching) : selectPrimaryLineDirectionStops(stops);
}

/**
 * Orients a polyline so it starts close to the reference stop: the official line
 * polyline is direction-blind, so drawing it as-is for the opposite direction makes
 * the route look reversed. When the last point is nearer the reference than the
 * first, a reversed copy is returned; otherwise the input order is preserved.
 */
export function orientCoordinatesTowards(
  coordinates: readonly RouteLineCoordinate[],
  reference: RouteLineCoordinate | null
): readonly RouteLineCoordinate[] {
  if (!reference || coordinates.length < MIN_ROUTE_COORDINATES) {
    return coordinates;
  }

  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  const startDistance = squaredDistance(reference, first);
  const endDistance = squaredDistance(reference, last);

  return endDistance < startDistance
    ? Object.freeze([...coordinates].reverse())
    : coordinates;
}

/**
 * Keeps the searched segment stop ids that are actually displayed, preserving the
 * travel order of the selected direction instead of the candidate order.
 */
export function selectSegmentStopIds(
  stops: readonly RouteLineStop[],
  candidateIds: readonly string[]
): readonly string[] {
  if (!stops.length || !candidateIds.length) {
    return Object.freeze([]);
  }

  const candidates = new Set(candidateIds);
  return Object.freeze(
    [...stops].sort(compareStopOrder).flatMap((entry) => (candidates.has(entry.stopId) ? [entry.stopId] : []))
  );
}

export function buildLineStopCoordinates(
  stops: readonly RouteLineStop[],
  direction?: number | null
): readonly RouteLineCoordinate[] {
  const selected = selectLineDirectionStops(stops, direction);
  if (selected.length < MIN_ROUTE_COORDINATES) {
    return EMPTY_COORDINATES;
  }

  const coordinates: RouteLineCoordinate[] = [];
  let previousKey: string | null = null;

  for (const stop of selected) {
    if (!Number.isFinite(stop.latitude) || !Number.isFinite(stop.longitude)) {
      continue;
    }

    const key = `${stop.latitude}|${stop.longitude}`;
    if (key === previousKey) {
      continue;
    }

    coordinates.push({ latitude: stop.latitude, longitude: stop.longitude });
    previousKey = key;
  }

  return coordinates.length >= MIN_ROUTE_COORDINATES
    ? Object.freeze(coordinates)
    : EMPTY_COORDINATES;
}

function groupStopsByDirection(
  stops: readonly RouteLineStop[]
): ReadonlyMap<number, readonly RouteLineStop[]> {
  const groups = new Map<number, RouteLineStop[]>();

  for (const stop of stops) {
    const group = groups.get(stop.direction) ?? [];
    group.push(stop);
    groups.set(stop.direction, group);
  }

  return groups;
}

function sortStops(stops: readonly RouteLineStop[]): readonly RouteLineStop[] {
  return Object.freeze([...stops].sort((left, right) => left.order - right.order));
}

function compareDirectionGroups(left: readonly RouteLineStop[], right: readonly RouteLineStop[]): number {
  if (left.length !== right.length) {
    return right.length - left.length;
  }

  const leftDirection = left[0]?.direction ?? Number.MAX_SAFE_INTEGER;
  const rightDirection = right[0]?.direction ?? Number.MAX_SAFE_INTEGER;
  return leftDirection - rightDirection;
}

function compareStopOrder(left: RouteLineStop, right: RouteLineStop): number {
  return left.order - right.order;
}

function squaredDistance(first: RouteLineCoordinate, second: RouteLineCoordinate): number {
  const latitudeDelta = first.latitude - second.latitude;
  const longitudeDelta = first.longitude - second.longitude;
  return latitudeDelta * latitudeDelta + longitudeDelta * longitudeDelta;
}

/**
 * Numbers the stops of a direction within each nucleus following the travel order, so
 * the first stop of a nucleus towards the destination is "1.ª", mirroring how drivers
 * answer "bájate en la primera de ...". Stops without a nucleus are omitted.
 */
export function buildStopNucleusOrdinals(
  stops: readonly RouteLineStop[]
): ReadonlyMap<string, number> {
  const seenByNucleus = new Map<string, number>();
  const ordinals = new Map<string, number>();

  for (const stop of stops) {
    const nucleusId = stop.nucleusId.trim();

    if (!nucleusId) {
      continue;
    }

    const ordinal = (seenByNucleus.get(nucleusId) ?? 0) + 1;
    seenByNucleus.set(nucleusId, ordinal);
    ordinals.set(stop.stopId, ordinal);
  }

  return ordinals;
}
