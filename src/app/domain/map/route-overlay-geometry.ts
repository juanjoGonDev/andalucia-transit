import { GeoCoordinate, calculateDistanceInMeters } from '@domain/utils/geo-distance.util';

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

export interface RouteDirectionIndicator {
  readonly coordinate: GeoCoordinate;
  readonly rotationDegrees: number;
}

interface RouteDirectionSegment {
  readonly from: GeoCoordinate;
  readonly to: GeoCoordinate;
}

const MINIMUM_COORDINATE_COUNT = 2;
const INITIAL_LENGTH_IN_METERS = 0;
const DEFAULT_DIRECTION_INDICATOR_COUNT = 3;
const RADIANS_TO_DEGREES = 180 / Math.PI;

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

export function buildOfficialRouteSegmentCoordinates(
  officialRoute: readonly GeoCoordinate[],
  selectedStops: readonly GeoCoordinate[]
): readonly GeoCoordinate[] {
  if (
    officialRoute.length < MINIMUM_COORDINATE_COUNT ||
    selectedStops.length < MINIMUM_COORDINATE_COUNT
  ) {
    return Object.freeze([]);
  }

  const origin = selectedStops[0]!;
  const destination = selectedStops[selectedStops.length - 1]!;
  const originIndex = findNearestCoordinateIndex(officialRoute, origin);
  const destinationIndex = findNearestCoordinateIndex(officialRoute, destination);

  if (originIndex === null || destinationIndex === null || originIndex === destinationIndex) {
    return Object.freeze([]);
  }

  const lowerBound = Math.min(originIndex, destinationIndex);
  const upperBound = Math.max(originIndex, destinationIndex);
  const segment = officialRoute.slice(lowerBound, upperBound + 1);

  if (originIndex > destinationIndex) {
    segment.reverse();
  }

  return Object.freeze(
    segment.map((coordinate) => ({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude
    }))
  );
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

export function buildRouteDirectionIndicators(
  coordinates: readonly GeoCoordinate[],
  maxIndicators: number = DEFAULT_DIRECTION_INDICATOR_COUNT
): readonly RouteDirectionIndicator[] {
  if (coordinates.length < MINIMUM_COORDINATE_COUNT || maxIndicators <= 0) {
    return Object.freeze([]);
  }

  const segments = buildDirectionSegments(coordinates);

  if (!segments.length) {
    return Object.freeze([]);
  }

  const indicatorCount = Math.min(Math.floor(maxIndicators), segments.length);
  const indicators: RouteDirectionIndicator[] = [];

  for (let index = 0; index < indicatorCount; index += 1) {
    const segmentIndex = Math.min(
      segments.length - 1,
      Math.floor(((index + 0.5) * segments.length) / indicatorCount)
    );
    const segment = segments[segmentIndex]!;
    indicators.push({
      coordinate: midpoint(segment.from, segment.to),
      rotationDegrees: calculateDirectionRotation(segment.from, segment.to)
    });
  }

  return Object.freeze(indicators);
}

function findNearestCoordinateIndex(
  coordinates: readonly GeoCoordinate[],
  target: GeoCoordinate
): number | null {
  if (!isFiniteCoordinate(target)) {
    return null;
  }

  let nearestIndex: number | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  coordinates.forEach((coordinate, index) => {
    if (!isFiniteCoordinate(coordinate)) {
      return;
    }

    const distance = calculateDistanceInMeters(target, coordinate);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });

  return nearestIndex;
}

function isFiniteCoordinate(coordinate: GeoCoordinate): boolean {
  return Number.isFinite(coordinate.latitude) && Number.isFinite(coordinate.longitude);
}

function buildDirectionSegments(
  coordinates: readonly GeoCoordinate[]
): readonly RouteDirectionSegment[] {
  const segments: RouteDirectionSegment[] = [];

  for (let index = 1; index < coordinates.length; index += 1) {
    const from = coordinates[index - 1]!;
    const to = coordinates[index]!;

    if (from.latitude === to.latitude && from.longitude === to.longitude) {
      continue;
    }

    segments.push({ from, to });
  }

  return segments;
}

function midpoint(from: GeoCoordinate, to: GeoCoordinate): GeoCoordinate {
  return {
    latitude: (from.latitude + to.latitude) / 2,
    longitude: (from.longitude + to.longitude) / 2
  };
}

function calculateDirectionRotation(from: GeoCoordinate, to: GeoCoordinate): number {
  const verticalDelta = -(to.latitude - from.latitude);
  const horizontalDelta = to.longitude - from.longitude;
  const rotationDegrees = Math.atan2(verticalDelta, horizontalDelta) * RADIANS_TO_DEGREES;

  return Object.is(rotationDegrees, -0) ? 0 : rotationDegrees;
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
