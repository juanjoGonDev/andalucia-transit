import type { RouteLineStop } from '@data/route-search/route-lines-api.service';
import {
  buildLineStopCoordinates,
  selectPrimaryLineDirectionStops
} from '@domain/lines/line-route-geometry';

function stop(
  stopId: string,
  direction: number,
  order: number,
  latitude: number,
  longitude: number
): RouteLineStop {
  return {
    stopId,
    lineId: 'line-1',
    direction,
    order,
    nucleusId: 'nucleus-1',
    zoneId: 'A',
    latitude,
    longitude,
    name: `Stop ${stopId}`
  };
}

describe('line route geometry', () => {
  it('selects the longest direction and sorts it by stop order', () => {
    const result = selectPrimaryLineDirectionStops([
      stop('b', 1, 2, 37.2, -2.2),
      stop('c', 1, 3, 37.3, -2.3),
      stop('a', 1, 1, 37.1, -2.1),
      stop('x', 2, 1, 38.1, -3.1)
    ]);

    expect(result.map((entry) => entry.stopId)).toEqual(['a', 'b', 'c']);
  });

  it('uses the lowest direction as deterministic tie breaker', () => {
    const result = selectPrimaryLineDirectionStops([
      stop('b1', 2, 1, 38.1, -3.1),
      stop('b2', 2, 2, 38.2, -3.2),
      stop('a1', 1, 1, 37.1, -2.1),
      stop('a2', 1, 2, 37.2, -2.2)
    ]);

    expect(result.map((entry) => entry.stopId)).toEqual(['a1', 'a2']);
  });

  it('builds deduplicated coordinates from the canonical selected direction', () => {
    const result = buildLineStopCoordinates([
      stop('a', 1, 1, 37.1, -2.1),
      stop('b', 1, 2, 37.1, -2.1),
      stop('c', 1, 3, 37.3, -2.3)
    ]);

    expect(result).toEqual([
      { latitude: 37.1, longitude: -2.1 },
      { latitude: 37.3, longitude: -2.3 }
    ]);
  });

  it('returns no drawable route when fewer than two distinct coordinates remain', () => {
    expect(buildLineStopCoordinates([stop('a', 1, 1, 37.1, -2.1)])).toEqual([]);
    expect(
      buildLineStopCoordinates([
        stop('a', 1, 1, 37.1, -2.1),
        stop('b', 1, 2, 37.1, -2.1)
      ])
    ).toEqual([]);
  });
});
