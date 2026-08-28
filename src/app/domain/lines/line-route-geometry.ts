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

  const groups = new Map<number, RouteLineStop[]>();
  for (const stop of stops) {
    const group = groups.get(stop.direction) ?? [];
    group.push(stop);
    groups.set(stop.direction, group);
  }

  const selected = [...groups.values()].sort(compareDirectionGroups)[0];
  if (!selected) {
    return EMPTY_STOPS;
  }

  return Object.freeze([...selected].sort((left, right) => left.order - right.order));
}

export function buildLineStopCoordinates(
  stops: readonly RouteLineStop[]
): readonly RouteLineCoordinate[] {
  const selected = selectPrimaryLineDirectionStops(stops);
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

function compareDirectionGroups(left: readonly RouteLineStop[], right: readonly RouteLineStop[]): number {
  if (left.length !== right.length) {
    return right.length - left.length;
  }

  const leftDirection = left[0]?.direction ?? Number.MAX_SAFE_INTEGER;
  const rightDirection = right[0]?.direction ?? Number.MAX_SAFE_INTEGER;
  return leftDirection - rightDirection;
}
