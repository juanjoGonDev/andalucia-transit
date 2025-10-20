import { GeoCoordinate, calculateDistanceInMeters } from '../utils/geo-distance.util';

export interface RouteOverlayLineStop {
  readonly stopId: string;
  readonly direction: number;
  readonly order: number;
  readonly latitude: number;
  readonly longitude: number;
}

export interface RouteOverlayGeometryRequest {
  readonly stops: readonly RouteOverlayLineStop[];
  readonly originStopIds: readonly string[];
  readonly destinationStopIds: readonly string[];
  readonly direction: number;
}

const MINIMUM_COORDINATE_COUNT = 2;
const INITIAL_LENGTH_IN_METERS = 0;

export function buildRouteSegmentCoordinates(
  request: RouteOverlayGeometryRequest
): readonly GeoCoordinate[] {
  const orderedStops = request.stops
    .filter((stop) => stop.direction === request.direction)
    .sort((first, second) => first.order - second.order);

  if (!orderedStops.length) {
    return Object.freeze([]);
  }

  const originOrder = resolveOriginOrder(orderedStops, request.originStopIds);

  if (originOrder === null) {
    return Object.freeze([]);
  }

  const destinationOrder = resolveDestinationOrder(
    orderedStops,
    request.destinationStopIds,
    originOrder
  );

  const lowerBound = originOrder;
  const upperBound = destinationOrder ?? orderedStops[orderedStops.length - 1]!.order;

  const segment = orderedStops.filter(
    (stop) => stop.order >= lowerBound && stop.order <= upperBound
  );

  if (segment.length < MINIMUM_COORDINATE_COUNT) {
    return Object.freeze([]);
  }

  const coordinates = segment.map((stop) => ({
    latitude: stop.latitude,
    longitude: stop.longitude
  } satisfies GeoCoordinate));

  return Object.freeze(coordinates);
}

export function calculateRouteLengthInMeters(
  coordinates: readonly GeoCoordinate[]
): number {
  if (coordinates.length < MINIMUM_COORDINATE_COUNT) {
    return INITIAL_LENGTH_IN_METERS;
  }

  let lengthInMeters = INITIAL_LENGTH_IN_METERS;

  for (let index = 1; index < coordinates.length; index += 1) {
    const previous = coordinates[index - 1]!;
    const current = coordinates[index]!;
    lengthInMeters += calculateDistanceInMeters(previous, current);
  }

  return lengthInMeters;
}

function resolveOriginOrder(
  stops: readonly RouteOverlayLineStop[],
  originStopIds: readonly string[]
): number | null {
  let candidate: number | null = null;

  for (const stop of stops) {
    if (!originStopIds.includes(stop.stopId)) {
      continue;
    }

    if (candidate === null || stop.order < candidate) {
      candidate = stop.order;
    }
  }

  return candidate;
}

function resolveDestinationOrder(
  stops: readonly RouteOverlayLineStop[],
  destinationStopIds: readonly string[],
  originOrder: number
): number | null {
  let candidate: number | null = null;

  for (const stop of stops) {
    if (stop.order < originOrder) {
      continue;
    }

    if (!destinationStopIds.includes(stop.stopId)) {
      continue;
    }

    if (candidate === null || stop.order < candidate) {
      candidate = stop.order;
    }
  }

  if (candidate !== null && candidate < originOrder) {
    return null;
  }

  return candidate;
}
