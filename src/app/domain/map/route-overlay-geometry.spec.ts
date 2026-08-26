import {
  RouteOverlayGeometryRequest,
  buildRouteDirectionIndicators,
  buildRouteSegmentCoordinates,
  calculateRouteLengthInMeters
} from '@domain/map/route-overlay-geometry';
import { calculateDistanceInMeters } from '@domain/utils/geo-distance.util';

const DIRECTION_FORWARD = 1;
const DIRECTION_BACKWARD = 2;

describe('buildRouteSegmentCoordinates', () => {
  it('returns coordinates spanning origin to destination in order', () => {
    const request: RouteOverlayGeometryRequest = {
      stops: [
        buildStop('A', DIRECTION_FORWARD, 1, 37.0, -5.0),
        buildStop('B', DIRECTION_FORWARD, 2, 37.1, -5.1),
        buildStop('C', DIRECTION_FORWARD, 3, 37.2, -5.2),
        buildStop('D', DIRECTION_FORWARD, 4, 37.3, -5.3)
      ],
      originStopIds: ['B'],
      destinationStopIds: ['D'],
      direction: DIRECTION_FORWARD
    };

    const result = buildRouteSegmentCoordinates(request);

    expect(result).toEqual([
      { latitude: 37.1, longitude: -5.1 },
      { latitude: 37.2, longitude: -5.2 },
      { latitude: 37.3, longitude: -5.3 }
    ]);
  });

  it('falls back to remaining stops when destination is not present after origin', () => {
    const request: RouteOverlayGeometryRequest = {
      stops: [
        buildStop('A', DIRECTION_FORWARD, 1, 37.0, -5.0),
        buildStop('B', DIRECTION_FORWARD, 2, 37.1, -5.1),
        buildStop('C', DIRECTION_FORWARD, 3, 37.2, -5.2)
      ],
      originStopIds: ['B'],
      destinationStopIds: ['Z'],
      direction: DIRECTION_FORWARD
    };

    const result = buildRouteSegmentCoordinates(request);

    expect(result).toEqual([
      { latitude: 37.1, longitude: -5.1 },
      { latitude: 37.2, longitude: -5.2 }
    ]);
  });

  it('returns empty coordinates when origin is missing in the requested direction', () => {
    const request: RouteOverlayGeometryRequest = {
      stops: [
        buildStop('A', DIRECTION_BACKWARD, 1, 37.0, -5.0),
        buildStop('B', DIRECTION_BACKWARD, 2, 37.1, -5.1)
      ],
      originStopIds: ['A'],
      destinationStopIds: ['B'],
      direction: DIRECTION_FORWARD
    };

    const result = buildRouteSegmentCoordinates(request);

    expect(result).toEqual([]);
  });
});

describe('calculateRouteLengthInMeters', () => {
  it('returns zero length when fewer than two coordinates are provided', () => {
    expect(calculateRouteLengthInMeters([])).toBe(0);
    expect(
      calculateRouteLengthInMeters([{ latitude: 37.1, longitude: -5.1 }])
    ).toBe(0);
  });

  it('sums the distances between sequential coordinates', () => {
    const coordinates = [
      { latitude: 37.0, longitude: -5.0 },
      { latitude: 37.1, longitude: -5.1 },
      { latitude: 37.2, longitude: -5.2 }
    ] as const;

    const expectedLength =
      calculateDistanceInMeters(coordinates[0], coordinates[1]) +
      calculateDistanceInMeters(coordinates[1], coordinates[2]);

    expect(calculateRouteLengthInMeters(coordinates)).toBeCloseTo(expectedLength, 6);
  });
});

describe('buildRouteDirectionIndicators', () => {
  it('returns no indicators without a usable route segment', () => {
    expect(buildRouteDirectionIndicators([])).toEqual([]);
    expect(buildRouteDirectionIndicators([{ latitude: 37, longitude: -5 }])).toEqual([]);
    expect(
      buildRouteDirectionIndicators(
        [
          { latitude: 37, longitude: -5 },
          { latitude: 37, longitude: -5 }
        ],
        2
      )
    ).toEqual([]);
  });

  it('samples route segments and follows coordinate order', () => {
    const indicators = buildRouteDirectionIndicators(
      [
        { latitude: 37, longitude: -5 },
        { latitude: 37, longitude: -4 },
        { latitude: 38, longitude: -4 }
      ],
      2
    );

    expect(indicators).toEqual([
      {
        coordinate: { latitude: 37, longitude: -4.5 },
        rotationDegrees: 0
      },
      {
        coordinate: { latitude: 37.5, longitude: -4 },
        rotationDegrees: -90
      }
    ]);
  });

  it('caps the number of direction indicators', () => {
    const indicators = buildRouteDirectionIndicators(
      [
        { latitude: 37, longitude: -5 },
        { latitude: 37, longitude: -4.5 },
        { latitude: 37.1, longitude: -4 },
        { latitude: 37.2, longitude: -3.5 }
      ],
      2
    );

    expect(indicators).toHaveSize(2);
    expect(buildRouteDirectionIndicators(indicators.map((item) => item.coordinate), 0)).toEqual([]);
  });
});

function buildStop(
  stopId: string,
  direction: number,
  order: number,
  latitude: number,
  longitude: number
) {
  return { stopId, direction, order, latitude, longitude } as const;
}
