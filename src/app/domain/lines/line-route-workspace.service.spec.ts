import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
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

describe('LineRouteWorkspaceService', () => {
  let routeLines: RouteLinesApiServiceStub;
  let service: LineRouteWorkspaceService;

  beforeEach(() => {
    routeLines = new RouteLinesApiServiceStub();
    TestBed.configureTestingModule({
      providers: [
        LineRouteWorkspaceService,
        { provide: RouteLinesApiService, useValue: routeLines }
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

  it('falls back to official geometry when a selected direction has insufficient coordinates', (done) => {
    routeLines.stops = [
      stop('outbound-a', 0, 1, 37.1, -2.1),
      stop('outbound-b', 0, 2, 37.2, -2.2),
      stop('return-only', 1, 1, 38.1, -3.1)
    ];

    service.load({ consortiumId: 7, lineId: 'line-1', direction: 1 }).subscribe((view) => {
      expect(view.stops.map((entry) => entry.stopId)).toEqual(['return-only']);
      expect(view.coordinates).toEqual(routeLines.detail.coordinates);
      done();
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
