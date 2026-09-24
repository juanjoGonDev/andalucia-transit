import {
  buildPolylineLengths,
  buildTripStopTimes,
  projectPointOnPolyline,
  resolveTripProgress
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
