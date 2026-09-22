import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import type { CatalogNucleusEntry } from '@data/catalog/consortium-catalog.service';
import { ConsortiumCatalogService } from '@data/catalog/consortium-catalog.service';
import type {
  RouteLineDetail,
  RouteLineStop
} from '@data/route-search/route-lines-api.service';
import { RouteLinesApiService } from '@data/route-search/route-lines-api.service';
import { LineRouteWorkspaceService } from '@domain/lines/line-route-workspace.service';

class RouteLinesApiServiceStub {
  detail: RouteLineDetail = {
    lineId: 'line-1',
    code: 'L1',
    name: 'Line One',
    mode: 'Bus',
    coordinates: [
      { latitude: 36.9, longitude: -5.9 },
      { latitude: 37, longitude: -5.8 }
    ]
  };

  stops: readonly RouteLineStop[] = [
    stop('outbound-a', 0, 1, 37.1, -2.1),
    stop('outbound-b', 0, 2, 37.2, -2.2),
    stop('return-a', 1, 1, 38.1, -3.1),
    stop('return-b', 1, 2, 38.2, -3.2)
  ];

  getLineDetail() {
    return of(this.detail);
  }

  getLineStops() {
    return of(this.stops);
  }
}

class ConsortiumCatalogServiceStub {
  nuclei: readonly CatalogNucleusEntry[] = [
    { id: 'nucleus-outbound-a', municipalityId: 'm-1', zone: null, name: 'La Gangosa' },
    { id: 'nucleus-outbound-b', municipalityId: 'm-1', zone: null, name: 'La Gangosa' },
    { id: 'nucleus-return-a', municipalityId: 'm-2', zone: null, name: 'Vícar' },
    { id: 'nucleus-return-b', municipalityId: 'm-2', zone: null, name: 'Vícar' }
  ];

  nucleiError: unknown | null = null;

  loadNuclei() {
    if (this.nucleiError) {
      return throwError(() => this.nucleiError);
    }

    return of(this.nuclei);
  }
}

describe('LineRouteWorkspaceService', () => {
  let routeLines: RouteLinesApiServiceStub;
  let catalog: ConsortiumCatalogServiceStub;
  let service: LineRouteWorkspaceService;

  beforeEach(() => {
    routeLines = new RouteLinesApiServiceStub();
    catalog = new ConsortiumCatalogServiceStub();
    TestBed.configureTestingModule({
      providers: [
        LineRouteWorkspaceService,
        { provide: RouteLinesApiService, useValue: routeLines },
        { provide: ConsortiumCatalogService, useValue: catalog }
      ]
    });
    service = TestBed.inject(LineRouteWorkspaceService);
  });

  it('prefers direction-specific stop geometry for schedule disclosures', (done) => {
    service.load({ consortiumId: 7, lineId: 'line-1', direction: 1 }).subscribe((view) => {
      expect(view.stops.map((entry) => entry.stopId)).toEqual(['return-a', 'return-b']);
      expect(view.coordinates).toEqual([
        { latitude: 38.1, longitude: -3.1 },
        { latitude: 38.2, longitude: -3.2 }
      ]);
      expect(view.resolvedDirection).toBe(1);
      done();
    });
  });

  it('keeps official geometry for the generic line-detail workspace', (done) => {
    service.load({ consortiumId: 7, lineId: 'line-1' }).subscribe((view) => {
      expect(view.stops.map((entry) => entry.stopId)).toEqual(['outbound-a', 'outbound-b']);
      expect(view.coordinates).toEqual(routeLines.detail.coordinates);
      done();
    });
  });

  it('falls back to oriented official geometry when a selected direction has insufficient coordinates', (done) => {
    routeLines.stops = [
      stop('outbound-a', 0, 1, 37.1, -2.1),
      stop('outbound-b', 0, 2, 37.2, -2.2),
      stop('return-only', 1, 1, 38.1, -3.1)
    ];

    service.load({ consortiumId: 7, lineId: 'line-1', direction: 1 }).subscribe((view) => {
      expect(view.stops.map((entry) => entry.stopId)).toEqual(['return-only']);
      expect(view.coordinates).toEqual([...routeLines.detail.coordinates].reverse());
      done();
    });
  });

  it('orients the official geometry towards the searched direction when stop coordinates are missing', (done) => {
    routeLines.detail = {
      ...routeLines.detail,
      coordinates: [
        { latitude: 37, longitude: -2 },
        { latitude: 37.05, longitude: -2.05 },
        { latitude: 38, longitude: -3 }
      ]
    };
    routeLines.stops = [
      stop('outbound-a', 0, 1, 36.95, -1.95),
      stop('outbound-b', 0, 2, 36.96, -1.94),
      stop('return-only', 1, 1, 37.99, -2.99)
    ];

    service.load({ consortiumId: 7, lineId: 'line-1', direction: 1 }).subscribe((view) => {
      expect(view.stops.map((entry) => entry.stopId)).toEqual(['return-only']);
      expect(view.coordinates[0]).toEqual({ latitude: 38, longitude: -3 });
      expect(view.coordinates[view.coordinates.length - 1]).toEqual({ latitude: 37, longitude: -2 });
      done();
    });
  });

  it('always orients stop-based geometry towards the searched direction first stop', (done) => {
    routeLines.stops = [
      stop('outbound-a', 0, 1, 37.1, -2.1),
      stop('outbound-b', 0, 2, 37.2, -2.2),
      stop('return-a', 1, 1, 38.1, -3.1),
      stop('return-b', 1, 2, 38.2, -3.2)
    ];

    service.load({ consortiumId: 7, lineId: 'line-1', direction: 1 }).subscribe((view) => {
      expect(view.coordinates[0]).toEqual({ latitude: 38.1, longitude: -3.1 });
      expect(view.coordinates[view.coordinates.length - 1]).toEqual({ latitude: 38.2, longitude: -3.2 });
      done();
    });
  });

  it('exposes the searched origin and destination stops that are displayed', (done) => {
    service
      .load({
        consortiumId: 7,
        lineId: 'line-1',
        direction: 1,
        segment: {
          originStopIds: ['return-a', 'not-displayed'],
          destinationStopIds: ['return-b']
        }
      })
      .subscribe((view) => {
        expect(view.originStopIds).toEqual(['return-a']);
        expect(view.destinationStopIds).toEqual(['return-b']);
        done();
      });
  });

  it('keeps empty segment ids when the workspace is not search-scoped', (done) => {
    service.load({ consortiumId: 7, lineId: 'line-1' }).subscribe((view) => {
      expect(view.originStopIds).toEqual([]);
      expect(view.destinationStopIds).toEqual([]);
      done();
    });
  });
describe('nucleus ordinals', () => {
  it('enriches stops with their ordinal and nucleus name in travel order', (done) => {
    const withNucleus = (
      stopId: string,
      direction: number,
      order: number,
      nucleusId: string,
      latitude: number,
      longitude: number
    ): RouteLineStop => ({ ...stop(stopId, direction, order, latitude, longitude), nucleusId });

    routeLines.stops = [
      withNucleus('gangosa-1', 0, 1, 'n-gangosa', 37.1, -2.1),
      withNucleus('gangosa-2', 0, 2, 'n-gangosa', 37.2, -2.2),
      withNucleus('vicar-1', 0, 3, 'n-vicar', 37.3, -2.3),
      withNucleus('vicar-1-return', 1, 1, 'n-vicar', 38.3, -3.3),
      withNucleus('gangosa-2-return', 1, 2, 'n-gangosa', 38.2, -3.2),
      withNucleus('gangosa-1-return', 1, 3, 'n-gangosa', 38.1, -3.1)
    ];
    catalog.nuclei = [
      { id: 'n-gangosa', municipalityId: 'm-1', zone: null, name: 'La Gangosa' },
      { id: 'n-vicar', municipalityId: 'm-2', zone: null, name: 'Vícar' }
    ];

    service.load({ consortiumId: 7, lineId: 'line-1' }).subscribe((view) => {
      expect(view.stops.map((entry) => entry.stopId)).toEqual(['gangosa-1', 'gangosa-2', 'vicar-1']);
      expect(view.stops.map((entry) => entry.nucleusOrdinal)).toEqual([1, 2, 1]);
      expect(view.stops.map((entry) => entry.nucleusName)).toEqual([
        'La Gangosa',
        'La Gangosa',
        'Vícar'
      ]);

      service.load({ consortiumId: 7, lineId: 'line-1', direction: 1 }).subscribe((returnView) => {
        expect(returnView.stops.map((entry) => entry.nucleusOrdinal)).toEqual([1, 1, 2]);
        expect(returnView.stops.map((entry) => entry.nucleusName)).toEqual([
          'Vícar',
          'La Gangosa',
          'La Gangosa'
        ]);
        done();
      });
    });
  });

  it('marks stops without a resolvable nucleus as unknown', (done) => {
    catalog.nuclei = [{ id: 'nucleus-outbound-b', municipalityId: 'm-1', zone: null, name: 'La Gangosa' }];

    service.load({ consortiumId: 7, lineId: 'line-1' }).subscribe((view) => {
      expect(view.stops[0]?.nucleusName).toBeNull();
      expect(view.stops[0]?.nucleusOrdinal).toBeNull();
      expect(view.stops[1]?.nucleusOrdinal).toBe(1);
      done();
    });
  });

  it('keeps loading without ordinals when the catalog fails', (done) => {
    catalog.nucleiError = new Error('offline');

    service.load({ consortiumId: 7, lineId: 'line-1' }).subscribe((view) => {
      expect(view.stops.length).toBe(2);
      expect(view.stops.every((entry) => entry.nucleusName === null && entry.nucleusOrdinal === null)).toBeTrue();
      done();
    });
  });
});
});

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
    nucleusId: `nucleus-${stopId}`,
    zoneId: null,
    latitude,
    longitude,
    name: stopId
  };
}



