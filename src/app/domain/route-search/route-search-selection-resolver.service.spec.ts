import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { RouteSearchSelectionResolverService } from '@domain/route-search/route-search-selection-resolver.service';
import { RouteSearchSelection } from '@domain/route-search/route-search-state.service';
import {
  StopConnection,
  StopConnectionsFacade,
  buildStopConnectionKey
} from '@domain/route-search/stop-connections.facade';
import {
  StopDirectoryFacade,
  StopDirectoryOption,
  StopDirectoryStopSignature
} from '@domain/stops/stop-directory.facade';

class StopDirectoryFacadeStub {
  constructor(private readonly options: Record<string, StopDirectoryOption | null>) {}

  getOptionByStopId(stopId: string) {
    return of(this.options[stopId] ?? null);
  }

  getOptionByStopSignature(_: number, stopId: string) {
    return this.getOptionByStopId(stopId);
  }
}

class StopConnectionsFacadeStub {
  readonly signatureBatches: StopDirectoryStopSignature[][] = [];

  constructor(
    private readonly response: ReadonlyMap<string, StopConnection> = new Map<string, StopConnection>()
  ) {}

  getConnections(signatures: readonly StopDirectoryStopSignature[]) {
    this.signatureBatches.push([...signatures]);
    return of(this.response);
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

  function setup(connections: ReadonlyMap<string, StopConnection>) {
    const connectionsFacade = new StopConnectionsFacadeStub(connections);

    TestBed.configureTestingModule({
      providers: [
        RouteSearchSelectionResolverService,
        { provide: StopDirectoryFacade, useValue: new StopDirectoryFacadeStub({ '74': originOption, '75': originOption, '100': destinationOption }) },
        { provide: StopConnectionsFacade, useValue: connectionsFacade }
      ]
    });

    return {
      service: TestBed.inject(RouteSearchSelectionResolverService),
      connectionsFacade
    };
  }

  it('resolves a selection from valid slugs and connections', (done) => {
    const { service } = setup(forwardConnectionsForOrigin());

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
    const { service } = setup(new Map<string, StopConnection>());

    service
      .resolveFromSlugs('invalid', 'destination-stop--c7s100', '2025-10-08')
      .subscribe((selection) => {
        expect(selection).toBeNull();
        done();
      });
  });

  it('returns a selection with no matches when connections are empty', (done) => {
    const { service } = setup(new Map<string, StopConnection>());

    service
      .resolveFromSlugs('origin-stop--c7s74', 'destination-stop--c7s100', '2025-10-08')
      .subscribe((selection) => {
        expect(selection).not.toBeNull();
        const resolved = selection as RouteSearchSelection;
        expect(resolved.lineMatches.length).toBe(0);
        done();
      });
  });

  it('requests forward reachability once, using only the origin signatures', (done) => {
    // Stop connections are forward-only now: CTAN numbers each sentido's
    // `orden` along its own travel, so backward lookups produced matches of the
    // opposite direction whose stops sit on the other carriageway.
    const { service, connectionsFacade } = setup(forwardConnectionsForOrigin());

    service
      .resolveFromSlugs('origin-stop--c7s74', 'destination-stop--c7s100', '2025-10-08')
      .subscribe((selection) => {
        expect(selection).not.toBeNull();
        expect(connectionsFacade.signatureBatches).toEqual([
          [
            { consortiumId: 7, stopId: '74' },
            { consortiumId: 7, stopId: '75' }
          ]
        ]);
        done();
      });
  });
});

function forwardConnectionsForOrigin(): ReadonlyMap<string, StopConnection> {
  return new Map<string, StopConnection>([
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
}
