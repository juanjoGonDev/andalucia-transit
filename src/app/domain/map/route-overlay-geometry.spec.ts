import { buildRouteSegmentCoordinates, RouteOverlayGeometryRequest } from './route-overlay-geometry';

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

function buildStop(
  stopId: string,
  direction: number,
  order: number,
  latitude: number,
  longitude: number
) {
  return { stopId, direction, order, latitude, longitude } as const;
}
