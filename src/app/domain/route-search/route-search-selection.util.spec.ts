import {
  StopConnection,
  buildStopConnectionKey
} from '../../data/route-search/stop-connections.service';
import { StopDirectoryOption } from '../../data/stops/stop-directory.service';
import {
  collectRouteLineMatches,
  createRouteSearchSelection
} from './route-search-selection.util';
import { RouteSearchLineMatch } from './route-search-state.service';

describe('route-search-selection.util', () => {
  const origin: StopDirectoryOption = {
    id: '7:74',
    code: 'origin-code',
    name: 'Origin Stop',
    municipality: 'Origin City',
    municipalityId: 'mun-origin',
    nucleus: 'Origin',
    nucleusId: 'nuc-origin',
    consortiumId: 7,
    stopIds: ['74', '75']
  };

  const destination: StopDirectoryOption = {
    id: '7:100',
    code: 'destination-code',
    name: 'Destination Stop',
    municipality: 'Destination City',
    municipalityId: 'mun-destination',
    nucleus: 'Destination',
    nucleusId: 'nuc-destination',
    consortiumId: 7,
    stopIds: ['100']
  };

  it('collects line matches ordered by origin and destination preference', () => {
    const connections = new Map<string, StopConnection>([
      [
        buildStopConnectionKey(7, '100'),
        {
          consortiumId: 7,
          stopId: '100',
          originStopIds: ['75', '74'],
          lineSignatures: [
            { lineId: 'L1', lineCode: '040', direction: 0 },
            { lineId: 'L2', lineCode: '041', direction: 1 }
          ]
        }
      ]
    ]);

    const matches = collectRouteLineMatches(origin, destination, connections);

    expect(matches).toEqual([
      {
        lineId: 'L1',
        lineCode: '040',
        direction: 0,
        originStopIds: ['74', '75'],
        destinationStopIds: ['100']
      },
      {
        lineId: 'L2',
        lineCode: '041',
        direction: 1,
        originStopIds: ['74', '75'],
        destinationStopIds: ['100']
      }
    ] satisfies readonly RouteSearchLineMatch[]);
  });

  it('creates a selection snapshot with cloned matches and dates', () => {
    const matches: RouteSearchLineMatch[] = [
      {
        lineId: 'L3',
        lineCode: '050',
        direction: 0,
        originStopIds: ['74'],
        destinationStopIds: ['100']
      }
    ];

    const referenceDate = new Date('2025-10-08T00:00:00Z');

    const selection = createRouteSearchSelection(origin, destination, matches, referenceDate);

    expect(selection.origin).toBe(origin);
    expect(selection.destination).toBe(destination);
    expect(selection.queryDate.getTime()).toBe(referenceDate.getTime());
    expect(selection.lineMatches).not.toBe(matches);
    expect(Object.isFrozen(selection.lineMatches)).toBeTrue();
    expect(selection.lineMatches[0].originStopIds).toEqual(['74']);
    expect(selection.lineMatches[0]).not.toBe(matches[0]);
  });

  it('returns an empty collection when no connections are available', () => {
    const connections = new Map<string, StopConnection>();

    const matches = collectRouteLineMatches(origin, destination, connections);

    expect(matches).toEqual([]);
  });
});
