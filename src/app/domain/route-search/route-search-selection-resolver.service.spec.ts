import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { RouteSearchSelectionResolverService } from './route-search-selection-resolver.service';
import { StopDirectoryService, StopDirectoryOption } from '../../data/stops/stop-directory.service';
import { StopConnectionsService, StopConnection } from '../../data/route-search/stop-connections.service';
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
  constructor(private readonly connections: ReadonlyMap<string, StopConnection>) {}

  getConnections() {
    return of(this.connections);
  }
}

describe('RouteSearchSelectionResolverService', () => {
  const originOption: StopDirectoryOption = {
    id: 'origin-group',
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
    id: 'destination-group',
    code: 'destination-code',
    name: 'Destination Stop',
    municipality: 'Destination City',
    municipalityId: 'mun-destination',
    nucleus: 'Destination',
    nucleusId: 'nuc-destination',
    consortiumId: 7,
    stopIds: ['100']
  };

  function setup(connections: ReadonlyMap<string, StopConnection>) {
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
    const connections = new Map<string, StopConnection>([
      [
        '100',
        {
          stopId: '100',
          originStopIds: ['74'],
          lineSignatures: [{ lineId: 'L1', lineCode: '040', direction: 0 }]
        }
      ]
    ]);

    const service = setup(connections);

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
    const service = setup(new Map());

    service
      .resolveFromSlugs('invalid', 'destination-stop--c7s100', '2025-10-08')
      .subscribe((selection) => {
        expect(selection).toBeNull();
        done();
      });
  });

  it('returns a selection with no matches when connections are empty', (done) => {
    const connections = new Map<string, StopConnection>();
    const service = setup(connections);

    service
      .resolveFromSlugs('origin-stop--c7s74', 'destination-stop--c7s100', '2025-10-08')
      .subscribe((selection) => {
        expect(selection).not.toBeNull();
        const resolved = selection as RouteSearchSelection;
        expect(resolved.lineMatches.length).toBe(0);
        done();
      });
  });
});
