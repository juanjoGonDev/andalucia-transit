import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { RouteSearchSelectionResolverService } from './route-search-selection-resolver.service';
import {
  StopDirectoryService,
  StopDirectoryOption,
  StopDirectoryStopSignature
} from '../../data/stops/stop-directory.service';
import {
  StopConnectionsService,
  StopConnection,
  STOP_CONNECTION_DIRECTION,
  StopConnectionDirection,
  buildStopConnectionKey
} from '../../data/route-search/stop-connections.service';
import { RouteSearchSelection } from './route-search-state.service';

class StopDirectoryServiceStub {
  constructor(private readonly options: Record<string, StopDirectoryOption | null>) {}

  getOptionByStopId(stopId: string) {
    return of(this.options[stopId] ?? null);
  }

  getOptionByStopSignature(_: number, stopId: string) {
    return this.getOptionByStopId(stopId);
  }
}

class StopConnectionsServiceStub {
  constructor(
    private readonly responses: Partial<Record<StopConnectionDirection, ReadonlyMap<string, StopConnection>>>
  ) {}

  getConnections(
    _: readonly StopDirectoryStopSignature[],
    direction: StopConnectionDirection
  ) {
    return of(this.responses[direction] ?? new Map<string, StopConnection>());
  }
}

describe('RouteSearchSelectionResolverService', () => {
  const originOption: StopDirectoryOption = {
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

  const destinationOption: StopDirectoryOption = {
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

  function setup(
    connections: Partial<Record<StopConnectionDirection, ReadonlyMap<string, StopConnection>>>
  ) {
    TestBed.configureTestingModule({
      providers: [
        RouteSearchSelectionResolverService,
        { provide: StopDirectoryService, useValue: new StopDirectoryServiceStub({ '74': originOption, '75': originOption, '100': destinationOption }) },
        { provide: StopConnectionsService, useValue: new StopConnectionsServiceStub(connections) }
      ]
    });

    return TestBed.inject(RouteSearchSelectionResolverService);
  }

  it('resolves a selection from valid slugs and connections', (done) => {
    const forwardConnections = new Map<string, StopConnection>([
      [
        buildStopConnectionKey(7, '100'),
        {
          consortiumId: 7,
          stopId: '100',
          originStopIds: ['74'],
          lineSignatures: [{ lineId: 'L1', lineCode: '040', direction: 0 }]
        }
      ]
    ]);

    const service = setup({ [STOP_CONNECTION_DIRECTION.Forward]: forwardConnections });

    service
      .resolveFromSlugs('origin-stop--c7s74', 'destination-stop--c7s100', '2025-10-08')
      .subscribe((selection) => {
        expect(selection).not.toBeNull();
        const resolved = selection as RouteSearchSelection;
        expect(resolved.lineMatches.length).toBe(1);
        expect(resolved.lineMatches[0].originStopIds).toEqual(['74']);
        expect(resolved.queryDate.getFullYear()).toBe(2025);
        done();
      });
  });

  it('returns null when slugs are invalid', (done) => {
    const service = setup({});

    service
      .resolveFromSlugs('invalid', 'destination-stop--c7s100', '2025-10-08')
      .subscribe((selection) => {
        expect(selection).toBeNull();
        done();
      });
  });

  it('returns a selection with no matches when connections are empty', (done) => {
    const service = setup({ [STOP_CONNECTION_DIRECTION.Forward]: new Map() });

    service
      .resolveFromSlugs('origin-stop--c7s74', 'destination-stop--c7s100', '2025-10-08')
      .subscribe((selection) => {
        expect(selection).not.toBeNull();
        const resolved = selection as RouteSearchSelection;
        expect(resolved.lineMatches.length).toBe(0);
        done();
      });
  });

  it('resolves a selection when only backward connections are available', (done) => {
    const backwardConnections = new Map<string, StopConnection>([
      [
        buildStopConnectionKey(7, '100'),
        {
          consortiumId: 7,
          stopId: '100',
          originStopIds: ['75'],
          lineSignatures: [{ lineId: 'L2', lineCode: '041', direction: 1 }]
        }
      ]
    ]);

    const service = setup({ [STOP_CONNECTION_DIRECTION.Backward]: backwardConnections });

    service
      .resolveFromSlugs('origin-stop--c7s75', 'destination-stop--c7s100', '2025-10-08')
      .subscribe((selection) => {
        expect(selection).not.toBeNull();
        const resolved = selection as RouteSearchSelection;
        expect(resolved.lineMatches.length).toBe(1);
        expect(resolved.lineMatches[0].originStopIds).toEqual(['75']);
        expect(resolved.lineMatches[0].lineCode).toBe('041');
        done();
      });
  });
});
