import {
  RIDE_MOTION_DEFAULTS,
  RidePositionSample,
  angularGapDeg,
  computeOverallHeadingDeg,
  initialBearingDeg,
  isRidingVehicle,
  windowMedianSpeedMps
} from './ride-detection.util';

const SEVILLA = { latitude: 37.3891, longitude: -5.9845 };
function movedByBearing(
  from: { latitude: number; longitude: number },
  bearingDeg: number,
  meters: number
): { latitude: number; longitude: number } {
  const radians = (bearingDeg * Math.PI) / 180;
  const distanceFactor = meters / 111_320; // rough meters/lat-degree
  return {
    latitude: from.latitude + Math.cos(radians) * distanceFactor,
    longitude:
      from.longitude +
      (Math.sin(radians) * distanceFactor) / Math.cos((from.latitude * Math.PI) / 180)
  };
}

function fastSample(at: number, index: number): RidePositionSample {
  return {
    coordinate: movedByBearing(SEVILLA, 90, index * 200),
    speedMps: 12,
    bearingDeg: 90,
    at
  };
}

describe('ride-detection.util', () => {
  describe('isRidingVehicle', () => {
    it('requires a minimum number of samples before classifying', () => {
      const now = 1_000_000;
      const samples = [fastSample(now - 4_000, 0), fastSample(now - 2_000, 1)];

      expect(isRidingVehicle(samples, now)).toBeFalse();
    });

    it('classifies sustained vehicle movement from recent fast fixes', () => {
      const now = 1_000_000;
      const samples = Array.from({ length: 6 }, (_, index) =>
        fastSample(now - (6 - index) * 5_000, index)
      );

      expect(isRidingVehicle(samples, now)).toBeTrue();
    });

    it('ignores stale fixes outside the sliding window', () => {
      const now = 1_000_000;
      const samples = Array.from({ length: 6 }, (_, index) =>
        fastSample(now - 120_000 - index * 5_000, index)
      );

      expect(isRidingVehicle(samples, now)).toBeFalse();
    });

    it('ignores short fast bursts below the agreeing ratio', () => {
      const now = 1_000_000;
      const samples: RidePositionSample[] = [
        fastSample(now - 10_000, 0),
        fastSample(now - 8_000, 1),
        {
          coordinate: SEVILLA,
          speedMps: 1.2,
          bearingDeg: null,
          at: now - 6_000
        },
        {
          coordinate: SEVILLA,
          speedMps: 0.5,
          bearingDeg: null,
          at: now - 4_000
        },
        {
          coordinate: SEVILLA,
          speedMps: 2,
          bearingDeg: null,
          at: now - 2_000
        }
      ];

      expect(isRidingVehicle(samples, now)).toBeFalse();
    });

    it('derives speeds from positions when the browser reports none', () => {
      const now = 1_000_000;
      const samples = Array.from({ length: 6 }, (_, index) => ({
        coordinate: movedByBearing(SEVILLA, 90, index * 150),
        speedMps: null,
        bearingDeg: null,
        at: now - (6 - index) * 5_000
      }));

      expect(isRidingVehicle(samples, now)).toBeTrue();
    });
  });

  describe('windowMedianSpeedMps', () => {
    it('returns the median speed of recent window samples', () => {
      const now = 1_000_000;
      const samples = [fastSample(now - 1_000, 0), { ...fastSample(now - 2_000, 1), speedMps: 20 }];

      expect(windowMedianSpeedMps(samples, now)).toBe(16);
    });

    it('returns zero with no recent samples', () => {
      expect(windowMedianSpeedMps([], 1_000_000)).toBe(0);
    });
  });

  describe('initialBearingDeg / angularGapDeg', () => {
    it('estimates east travel at ~90 degrees', () => {
      const east = movedByBearing(SEVILLA, 90, 1_000);

      expect(initialBearingDeg(SEVILLA, east)).toBeGreaterThan(85);
      expect(initialBearingDeg(SEVILLA, east)).toBeLessThan(95);
    });

    it('measures the opposite direction with ~180 gap', () => {
      expect(angularGapDeg(10, 190)).toBe(180);
      expect(angularGapDeg(350, 10)).toBe(20);
    });
  });

  describe('computeOverallHeadingDeg', () => {
    it('prefers the freshest GPS bearing when available', () => {
      const now = 1_000_000;
      const samples = [fastSample(now - 2_000, 0), fastSample(now - 1_000, 1)];

      expect(computeOverallHeadingDeg(samples)).toBe(90);
    });

    it('falls back to the path heading when bearings are absent', () => {
      const samples: RidePositionSample[] = [
        { coordinate: SEVILLA, speedMps: null, bearingDeg: null, at: 0 },
        {
          coordinate: movedByBearing(SEVILLA, 45, 1_000),
          speedMps: null,
          bearingDeg: null,
          at: 10_000
        }
      ];

      const heading = computeOverallHeadingDeg(samples);
      expect(heading).not.toBeNull();
      expect(heading as number).toBeGreaterThan(38);
      expect(heading as number).toBeLessThan(52);
    });
  });

  describe('RIDE_MOTION_DEFAULTS', () => {
    it('exposes a vehicle threshold compatible with urban buses', () => {
      expect(RIDE_MOTION_DEFAULTS.minVehicleSpeedMps).toBeGreaterThan(7);
      expect(RIDE_MOTION_DEFAULTS.minVehicleSpeedMps).toBeLessThan(12);
    });
  });
});
