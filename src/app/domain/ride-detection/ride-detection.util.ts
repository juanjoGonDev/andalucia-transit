import {
  GeoCoordinate,
  calculateDistanceInMeters
} from '@domain/utils/geo-distance.util';

/** One GPS observation captured while classification is active. */
export interface RidePositionSample {
  readonly coordinate: GeoCoordinate;
  /** Instantaneous speed in m/s (null when the browser cannot determine it). */
  readonly speedMps: number | null;
  /** Heading in degrees clockwise from north (null when unavailable). */
  readonly bearingDeg: number | null;
  /** Epoch ms timestamp of the fix. */
  readonly at: number;
}

export interface RideMotionOptions {
  /** Sustained speed (m/s) above which the user is considered in a vehicle. */
  readonly minVehicleSpeedMps: number;
  /** Fraction of recent samples that must exceed the threshold. */
  readonly minAgreeingRatio: number;
  /** Minimum number of samples required before classifying. */
  readonly minSamples: number;
  /** Sliding analysis window in milliseconds. */
  readonly windowMs: number;
}

export const RIDE_MOTION_DEFAULTS: RideMotionOptions = {
  minVehicleSpeedMps: 8.34, // ≈ 30 km/h (city bus travel, tolerating stop dwell)
  minAgreeingRatio: 0.7,
  minSamples: 5,
  windowMs: 45_000
};

/** Speed derived from neighbouring fixes when the browser reports none. */
function derivedSampleSpeedMps(
  sample: RidePositionSample,
  samples: readonly RidePositionSample[]
): number {
  const index = samples.indexOf(sample);
  const previous = index > 0 ? samples[index - 1] : undefined;

  if (!previous) {
    return 0;
  }

  const elapsedSeconds = (sample.at - previous.at) / 1000;

  if (elapsedSeconds <= 0) {
    return 0;
  }

  return (
    calculateDistanceInMeters(previous.coordinate, sample.coordinate) / elapsedSeconds
  );
}

function sampleSpeedMps(
  sample: RidePositionSample,
  samples: readonly RidePositionSample[]
): number {
  return sample.speedMps ?? derivedSampleSpeedMps(sample, samples);
}

/**
 * True while the recent GPS history ends in sustained vehicle movement:
 * fresh samples inside the window and enough of them above the speed floor.
 * Transient GPS noise does not trigger the state.
 */
export function isRidingVehicle(
  samples: readonly RidePositionSample[],
  now: number,
  options: RideMotionOptions = RIDE_MOTION_DEFAULTS
): boolean {
  const recent = samples.filter((sample) => now - sample.at <= options.windowMs);

  if (recent.length < options.minSamples) {
    return false;
  }

  const agreeing = recent.filter(
    (sample) => sampleSpeedMps(sample, samples) >= options.minVehicleSpeedMps
  );

  return agreeing.length / recent.length >= options.minAgreeingRatio;
}

/** Median speed over the analyzed window (m/s); 0 when it cannot be derived. */
export function windowMedianSpeedMps(
  samples: readonly RidePositionSample[],
  now: number,
  options: RideMotionOptions = RIDE_MOTION_DEFAULTS
): number {
  const recent = samples.filter((sample) => now - sample.at <= options.windowMs);

  if (recent.length === 0) {
    return 0;
  }

  const speeds = recent.map((sample) => sampleSpeedMps(sample, samples));
  const sorted = [...speeds].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle] ?? 0;
  }

  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

/** Great-circle initial bearing from→to in degrees (0=N, 90=E). */
export function initialBearingDeg(from: GeoCoordinate, to: GeoCoordinate): number {
  if (from.latitude === to.latitude && from.longitude === to.longitude) {
    return 0;
  }

  const fromLatRad = (from.latitude * Math.PI) / 180;
  const toLatRad = (to.latitude * Math.PI) / 180;
  const deltaLonRad = ((to.longitude - from.longitude) * Math.PI) / 180;

  const y = Math.sin(deltaLonRad) * Math.cos(toLatRad);
  const x =
    Math.cos(fromLatRad) * Math.sin(toLatRad) -
    Math.sin(fromLatRad) * Math.cos(toLatRad) * Math.cos(deltaLonRad);

  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/** Smallest absolute angular gap between two headings (0..180). */
export function angularGapDeg(a: number, b: number): number {
  const delta = Math.abs(a - b) % 360;
  return delta > 180 ? 360 - delta : delta;
}

/** Smallest absolute circular gap between two latitude/longitude points set head-wise. */
export function computeOverallHeadingDeg(
  samples: readonly RidePositionSample[]
): number | null {
  const withBearing = samples.filter((sample) => sample.bearingDeg !== null);

  if (withBearing.length > 0) {
    return (withBearing[withBearing.length - 1]?.bearingDeg as number) ?? null;
  }

  if (samples.length < 2) {
    return null;
  }

  const first = samples[0];
  const last = samples[samples.length - 1];

  if (!first || !last) {
    return null;
  }

  if (
    first.coordinate.latitude === last.coordinate.latitude &&
    first.coordinate.longitude === last.coordinate.longitude
  ) {
    return null;
  }

  return initialBearingDeg(first.coordinate, last.coordinate);
}
