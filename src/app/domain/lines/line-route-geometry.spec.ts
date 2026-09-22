import type { RouteLineCoordinate, RouteLineStop } from '@data/route-search/route-lines-api.service';
import {
  buildLineStopCoordinates,
  buildStopNucleusOrdinals,
  orientCoordinatesTowards,
  selectLineDirectionStops,
  selectPrimaryLineDirectionStops,
  selectSegmentStopIds
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

  it('selects the requested direction and keeps its canonical order', () => {
    const result = selectLineDirectionStops([
      stop('outbound-b', 0, 2, 37.2, -2.2),
      stop('return-a', 1, 1, 38.1, -3.1),
      stop('outbound-a', 0, 1, 37.1, -2.1),
      stop('return-b', 1, 2, 38.2, -3.2)
    ], 1);

    expect(result.map((entry) => entry.stopId)).toEqual(['return-a', 'return-b']);
  });

  it('falls back to the primary direction when the requested direction is unavailable', () => {
    const result = selectLineDirectionStops([
      stop('a', 0, 1, 37.1, -2.1),
      stop('b', 0, 2, 37.2, -2.2),
      stop('c', 1, 1, 38.1, -3.1)
    ], 9);

    expect(result.map((entry) => entry.stopId)).toEqual(['a', 'b']);
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

  it('builds coordinates only from the requested direction when it exists', () => {
    const result = buildLineStopCoordinates([
      stop('outbound-a', 0, 1, 37.1, -2.1),
      stop('outbound-b', 0, 2, 37.2, -2.2),
      stop('return-a', 1, 1, 38.1, -3.1),
      stop('return-b', 1, 2, 38.2, -3.2)
    ], 1);

    expect(result).toEqual([
      { latitude: 38.1, longitude: -3.1 },
      { latitude: 38.2, longitude: -3.2 }
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

  describe('orientCoordinatesTowards', () => {
    const reference: RouteLineCoordinate = { latitude: 38.2, longitude: -3.2 };
    const route: readonly RouteLineCoordinate[] = [
      { latitude: 37.1, longitude: -2.1 },
      { latitude: 37.5, longitude: -2.5 },
      { latitude: 38.1, longitude: -3.1 }
    ];

    it('keeps the original order when the start is already the closest point', () => {
      const result = orientCoordinatesTowards(route, { latitude: 37.2, longitude: -2.2 });

      expect(result).toEqual(route);
    });

    it('reverses the route when its end is closer to the reference stop', () => {
      const result = orientCoordinatesTowards(route, reference);

      expect(result[0]).toEqual({ latitude: 38.1, longitude: -3.1 });
      expect(result[result.length - 1]).toEqual({ latitude: 37.1, longitude: -2.1 });
    });

    it('does not mutate the input when reversing', () => {
      orientCoordinatesTowards(route, reference);

      expect(route[0]).toEqual({ latitude: 37.1, longitude: -2.1 });
    });

    it('returns the coordinates untouched when no reference is provided', () => {
      expect(orientCoordinatesTowards(route, null)).toEqual(route);
    });

    it('returns the coordinates untouched when fewer than two points exist', () => {
      const single = [{ latitude: 37.1, longitude: -2.1 }];

      expect(orientCoordinatesTowards(single, reference)).toEqual(single);
    });
  });

  describe('selectSegmentStopIds', () => {
    it('returns candidate ids intersected with the displayed stops ordered by stop order', () => {
      const stops = [
        stop('c', 1, 3, 37.3, -2.3),
        stop('a', 1, 1, 37.1, -2.1),
        stop('b', 1, 2, 37.2, -2.2)
      ];

      expect(selectSegmentStopIds(stops, ['b', 'a', 'missing'])).toEqual(['a', 'b']);
      expect(selectSegmentStopIds(stops, ['c'])).toEqual(['c']);
    });

    it('returns an empty list when nothing matches', () => {
      expect(selectSegmentStopIds([stop('a', 1, 1, 37.1, -2.1)], ['x'])).toEqual([]);
      expect(selectSegmentStopIds([], ['x'])).toEqual([]);
    });
  });
});

describe('buildStopNucleusOrdinals', () => {
  const withNucleus = (base: RouteLineStop, nucleusId: string): RouteLineStop => ({
    ...base,
    nucleusId
  });

  it('numbers stops per nucleus in travel order, closest to the origin first', () => {
    const stops = [
      withNucleus(stop('gangosa-1', 0, 1, 37.1, -2.1), 'n-gangosa'),
      withNucleus(stop('vicar-1', 0, 2, 37.2, -2.2), 'n-vicar'),
      withNucleus(stop('gangosa-2', 0, 3, 37.3, -2.3), 'n-gangosa'),
      withNucleus(stop('gangosa-3', 0, 4, 37.4, -2.4), 'n-gangosa'),
      withNucleus(stop('vicar-2', 0, 5, 37.5, -2.5), 'n-vicar')
    ];

    const ordinals = buildStopNucleusOrdinals(stops);

    expect(ordinals.get('gangosa-1')).toBe(1);
    expect(ordinals.get('gangosa-2')).toBe(2);
    expect(ordinals.get('gangosa-3')).toBe(3);
    expect(ordinals.get('vicar-1')).toBe(1);
    expect(ordinals.get('vicar-2')).toBe(2);
  });

  it('reverses the numbering when the travel order is reversed', () => {
    const stops = [
      withNucleus(stop('gangosa-3', 1, 1, 37.4, -2.4), 'n-gangosa'),
      withNucleus(stop('gangosa-2', 1, 2, 37.3, -2.3), 'n-gangosa'),
      withNucleus(stop('gangosa-1', 1, 3, 37.1, -2.1), 'n-gangosa')
    ];

    const ordinals = buildStopNucleusOrdinals(stops);

    expect(ordinals.get('gangosa-3')).toBe(1);
    expect(ordinals.get('gangosa-1')).toBe(3);
  });

  it('omits stops without a nucleus identifier', () => {
    const stops = [
      withNucleus(stop('known', 0, 1, 37.1, -2.1), 'n-gangosa'),
      withNucleus(stop('unknown', 0, 2, 37.2, -2.2), '')
    ];

    const ordinals = buildStopNucleusOrdinals(stops);

    expect(ordinals.get('known')).toBe(1);
    expect(ordinals.has('unknown')).toBeFalse();
  });
});
