import {
  buildPolylineLengths,
  buildTripStopTimes,
  projectPointOnPolyline,
  resolveTripProgress,
  slicePolylineBetweenPoints
} from './trip-progress.util';

const REVERSE_START = { latitude: 36.9, longitude: -2.0 };
const MIDPOINT = { latitude: 37.0, longitude: -2.1 };
const REVERSE_END = { latitude: 37.1, longitude: -2.2 };
const POLYLINE = [REVERSE_START, MIDPOINT, REVERSE_END];

describe('buildPolylineLengths', () => {
  it('accumulates segment distances in meters', () => {
    const lengths = buildPolylineLengths(POLYLINE);

    expect(lengths.length).toBe(3);
    expect(lengths[0]).toBe(0);
    expect(lengths[1]).toBeGreaterThan(0);
    expect(lengths[2]).toBeGreaterThan(lengths[1]);
    expect(Math.abs((lengths[2] - lengths[1]) - lengths[1])).toBeLessThan(50);
  });
});

describe('projectPointOnPolyline', () => {
  it('projects a point at 50 percent of the polyline', () => {
    const result = projectPointOnPolyline({ latitude: 37.0, longitude: -2.1005 }, POLYLINE);

    expect(result.fraction).toBeGreaterThan(0.48);
    expect(result.fraction).toBeLessThan(0.53);
    expect(result.distanceMeters).toBeLessThan(80);
  });

  it('snaps to the ends for points beyond the polyline', () => {
    expect(projectPointOnPolyline({ latitude: 36.5, longitude: -2.0 }, POLYLINE).fraction).toBe(0);
    expect(projectPointOnPolyline({ latitude: 37.5, longitude: -2.3 }, POLYLINE).fraction).toBe(1);
  });
});

describe('buildTripStopTimes', () => {
  const depart = new Date('2026-09-21T14:00:00.000Z');
  const arrive = new Date('2026-09-21T15:00:00.000Z');

  const stops = [
    { stopId: 'stop-a', latitude: 36.9, longitude: -2.0 },
    { stopId: 'stop-b', latitude: 37.0, longitude: -2.1 },
    { stopId: 'stop-c', latitude: 37.1, longitude: -2.2 }
  ];

  it('interpolates stop times along the path so gaps fill progressively', () => {
    const times = buildTripStopTimes(stops, POLYLINE, depart, arrive);

    expect(times.map((entry) => entry.stopId)).toEqual(['stop-a', 'stop-b', 'stop-c']);
    expect(times[0].estimatedTime.getTime()).toBe(depart.getTime());
    expect(times[2].estimatedTime.getTime()).toBe(arrive.getTime());
    expect(times[1].estimatedTime.getTime()).toBeGreaterThan(depart.getTime());
    expect(times[1].estimatedTime.getTime()).toBeLessThan(arrive.getTime());
    expect(times[1].fraction).toBeCloseTo(0.5, 1);
  });

  it('keeps fractions monotonic even for slightly out-of-line stops', () => {
    const noisyStops = [
      { stopId: 'stop-a', latitude: 36.9, longitude: -2.0 },
      { stopId: 'stop-b1', latitude: 37.1, longitude: -2.19 },
      { stopId: 'stop-b2', latitude: 36.95, longitude: -2.05 },
      { stopId: 'stop-c', latitude: 37.1, longitude: -2.2 }
    ];

    const times = buildTripStopTimes(noisyStops, POLYLINE, depart, arrive);

    for (let index = 1; index < times.length; index += 1) {
      expect(times[index].fraction).toBeGreaterThanOrEqual(times[index - 1].fraction);
    }
  });
});

describe('resolveTripProgress', () => {
  const depart = new Date('2026-09-21T14:00:00.000Z');
  const arrive = new Date('2026-09-21T15:00:00.000Z');
  const stops = [
    { stopId: 'stop-a', latitude: 36.9, longitude: -2.0 },
    { stopId: 'stop-b', latitude: 37.0, longitude: -2.1 },
    { stopId: 'stop-c', latitude: 37.1, longitude: -2.2 }
  ];
  const times = buildTripStopTimes(stops, POLYLINE, depart, arrive);

  it('reports the current segment and the next stop ahead', () => {
    const progress = resolveTripProgress(
      { latitude: 36.95, longitude: -2.05 },
      POLYLINE,
      times
    );

    expect(progress.fraction).toBeCloseTo(0.25, 1);
    expect(progress.currentStopIndex).toBe(0);
    expect(progress.nextStopIndex).toBe(1);
    expect(progress.nextStop?.stopId).toBe('stop-b');
  });

  it('marks the journey as completed past the last stop', () => {
    const progress = resolveTripProgress(
      { latitude: 37.12, longitude: -2.22 },
      POLYLINE,
      times
    );

    expect(progress.fraction).toBe(1);
    expect(progress.nextStopIndex).toBe(-1);
    expect(progress.completed).toBeTrue();
  });

  it('stays at the origin before the first stop', () => {
    const progress = resolveTripProgress(
      { latitude: 36.88, longitude: -1.99 },
      POLYLINE,
      times
    );

    expect(progress.fraction).toBe(0);
    expect(progress.currentStopIndex).toBe(-1);
    expect(progress.nextStopIndex).toBe(0);
  });
});

describe('slicePolylineBetweenPoints', () => {
  it('trims the polyline to the projections of both segment endpoints', () => {
    const beyondStart = { latitude: 36.8, longitude: -1.9 };
    const beyondEnd = { latitude: 37.2, longitude: -2.3 };
    const polyline = [beyondStart, REVERSE_START, MIDPOINT, REVERSE_END, beyondEnd];

    const sliced = slicePolylineBetweenPoints(polyline, REVERSE_START, REVERSE_END);

    // Both endpoints are vertices of the polyline: the cut keeps the stretch
    // between them (endpoints interpolated onto their own positions).
    expect(sliced.length).toBe(3);
    expect(sliced[0].latitude).toBeCloseTo(REVERSE_START.latitude, 4);
    expect(sliced[0].longitude).toBeCloseTo(REVERSE_START.longitude, 4);
    expect(sliced[1]).toEqual(MIDPOINT);
    expect(sliced[sliced.length - 1].latitude).toBeCloseTo(REVERSE_END.latitude, 4);
    expect(sliced[sliced.length - 1].longitude).toBeCloseTo(REVERSE_END.longitude, 4);
  });

  it('interpolates the cut points when endpoints fall between vertices', () => {
    const sliced = slicePolylineBetweenPoints(POLYLINE, MIDPOINT, REVERSE_END);

    // Cut starts exactly at the middle vertex and ends at the last one.
    expect(sliced.length).toBe(2);
    expect(sliced[0].latitude).toBeCloseTo(MIDPOINT.latitude, 4);
    expect(sliced[1].latitude).toBeCloseTo(REVERSE_END.latitude, 4);
  });

  it('falls back to the whole polyline when the stretch cannot be resolved', () => {
    expect(slicePolylineBetweenPoints([], REVERSE_START, REVERSE_END)).toEqual([]);
    expect(slicePolylineBetweenPoints([MIDPOINT], MIDPOINT, REVERSE_END)).toEqual([MIDPOINT]);
    // Destination projecting before the origin means the geometry runs against
    // the travel order: keep the full polyline instead of cutting nonsense.
    expect(slicePolylineBetweenPoints(POLYLINE, REVERSE_END, REVERSE_START)).toBe(POLYLINE);
  });
});
