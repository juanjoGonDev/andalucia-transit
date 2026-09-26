import { GeoCoordinate, calculateDistanceInMeters } from '@domain/utils/geo-distance.util';

export interface TripStopGeoPoint extends GeoCoordinate {
  readonly stopId: string;
}

export interface TripStopTiming {
  readonly stopId: string;
  readonly fraction: number;
  readonly estimatedTime: Date;
}

export interface TripProgressState {
  readonly fraction: number;
  readonly currentStopIndex: number;
  readonly nextStopIndex: number;
  readonly nextStop: TripStopTiming | null;
  readonly completed: boolean;
}

const EARTH_RADIUS_METERS = 6_371_008.8;
const STOP_EPSILON_FRACTION = 0.0005;

export function buildPolylineLengths(polyline: readonly GeoCoordinate[]): readonly number[] {
  const lengths: number[] = [0];

  for (let index = 1; index < polyline.length; index += 1) {
    const previous = polyline[index - 1];
    const current = polyline[index];
    lengths.push(lengths[index - 1] + calculateDistanceInMeters(previous, current));
  }

  return lengths;
}

export function projectPointOnPolyline(
  point: GeoCoordinate,
  polyline: readonly GeoCoordinate[],
): { readonly fraction: number; readonly distanceMeters: number } {
  if (polyline.length === 0) {
    return { fraction: 0, distanceMeters: Number.POSITIVE_INFINITY };
  }

  if (polyline.length === 1) {
    return { fraction: 0, distanceMeters: calculateDistanceInMeters(point, polyline[0]) };
  }

  const lengths = buildPolylineLengths(polyline);
  const totalLength = lengths[lengths.length - 1];
  const referenceLatitude = toRadians(point.latitude);

  let bestDistance = Number.POSITIVE_INFINITY;
  let bestLengthAlong = 0;

  for (let index = 0; index < polyline.length - 1; index += 1) {
    const start = toMeters(polyline[index], referenceLatitude);
    const end = toMeters(polyline[index + 1], referenceLatitude);
    const target = toMeters(point, referenceLatitude);

    const segmentX = end.x - start.x;
    const segmentY = end.y - start.y;
    const segmentLengthSq = segmentX * segmentX + segmentY * segmentY;
    const t =
      segmentLengthSq === 0
        ? 0
        : Math.max(
            0,
            Math.min(
              1,
              ((target.x - start.x) * segmentX + (target.y - start.y) * segmentY) / segmentLengthSq,
            ),
          );

    const projectedX = start.x + t * segmentX;
    const projectedY = start.y + t * segmentY;
    const distance = Math.hypot(target.x - projectedX, target.y - projectedY);

    if (distance < bestDistance) {
      bestDistance = distance;
      const segmentLength = lengths[index + 1] - lengths[index];
      bestLengthAlong = lengths[index] + t * segmentLength;
    }
  }

  const fraction = totalLength === 0 ? 0 : bestLengthAlong / totalLength;
  return { fraction, distanceMeters: bestDistance };
}

/**
 * Assigns an estimated time to every stop by position along the route, so progress fills
 * smoothly between nodes instead of jumping from stop to stop. Fractions are forced to be
 * monotonic so a miscatalogued stop cannot rewind the timeline.
 */
export function buildTripStopTimes(
  stops: readonly TripStopGeoPoint[],
  polyline: readonly GeoCoordinate[],
  departTime: Date,
  arriveTime: Date,
): readonly TripStopTiming[] {
  const span = arriveTime.getTime() - departTime.getTime();
  let previousFraction = 0;

  return stops.map((stop) => {
    const projection = polyline.length >= 2 ? projectPointOnPolyline(stop, polyline) : null;
    const rawFraction = projection ? projection.fraction : previousFraction;
    const fraction = Math.max(previousFraction, rawFraction);
    previousFraction = fraction;

    return {
      stopId: stop.stopId,
      fraction,
      estimatedTime: new Date(departTime.getTime() + span * fraction),
    };
  });
}

/**
 * GPS-anchored countdown to a stop: takes the remaining plan time between the anchor
 * fraction (last GPS projection) and the target stop fraction, then decays it with the
 * wall-clock time elapsed since that fix so the value keeps ticking between GPS updates.
 */
export function estimateEtaMs(
  targetFraction: number,
  anchorFraction: number,
  anchorAt: number,
  planSpanMs: number,
  now: number,
): number {
  const remainingAtAnchor = Math.max(0, targetFraction - anchorFraction) * planSpanMs;
  const elapsedSinceAnchor = Math.max(0, now - anchorAt);
  return Math.max(0, Math.round(remainingAtAnchor - elapsedSinceAnchor));
}

export function resolveTripProgress(
  point: GeoCoordinate,
  polyline: readonly GeoCoordinate[],
  stopTimes: readonly TripStopTiming[],
): TripProgressState {
  if (stopTimes.length === 0) {
    return {
      fraction: 0,
      currentStopIndex: -1,
      nextStopIndex: -1,
      nextStop: null,
      completed: false,
    };
  }

  const { fraction } = projectPointOnPolyline(point, polyline);

  if (fraction <= STOP_EPSILON_FRACTION) {
    return {
      fraction: 0,
      currentStopIndex: -1,
      nextStopIndex: 0,
      nextStop: stopTimes[0],
      completed: false,
    };
  }

  const nextStopIndex = stopTimes.findIndex(
    (stop) => stop.fraction > fraction + STOP_EPSILON_FRACTION,
  );

  if (nextStopIndex === -1) {
    return {
      fraction: 1,
      currentStopIndex: stopTimes.length - 1,
      nextStopIndex: -1,
      nextStop: null,
      completed: true,
    };
  }

  return {
    fraction,
    currentStopIndex: nextStopIndex - 1,
    nextStopIndex,
    nextStop: stopTimes[nextStopIndex],
    completed: false,
  };
}

function toMeters(point: GeoCoordinate, referenceLatitude: number): { x: number; y: number } {
  return {
    x: EARTH_RADIUS_METERS * toRadians(point.longitude) * Math.cos(referenceLatitude),
    y: EARTH_RADIUS_METERS * toRadians(point.latitude),
  };
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}
