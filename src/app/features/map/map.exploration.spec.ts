import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { GeolocationService } from '@core/services/geolocation.service';
import {
  NearbyStopRecord,
  NearbyStopResult,
  NearbyStopsService
} from '@core/services/nearby-stops.service';
import { StopDirectoryRecord, StopDirectoryService } from '@data/stops/stop-directory.service';
import { RouteOverlayFacade, RouteOverlayState } from '@domain/map/route-overlay.facade';
import { MapComponent } from '@features/map/map.component';
import {
  LeafletMapService,
  MapCreateOptions,
  MapHandle,
  MapRoutePolyline,
  MapStopMarker,
  MapStopSelectHandler
} from '@shared/map/leaflet-map.service';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): Observable<Record<string, string>> {
    return of({});
  }
}

class MapHandleStub implements MapHandle {
  readonly renderedStops: readonly MapStopMarker[][] = [];
  readonly focusedPoints: readonly GeoCoordinateStub[][] = [];
  stopSelectHandler: MapStopSelectHandler | undefined;
  setViewCount = 0;
  userLocationRenderCount = 0;
  routeRenderCount = 0;
  invalidationCount = 0;
  destroyed = false;

  setView(): void {
    this.setViewCount += 1;
  }

  renderUserLocation(): void {
    this.userLocationRenderCount += 1;
  }

  renderStops(stops: readonly MapStopMarker[], onSelect?: MapStopSelectHandler): void {
    (this.renderedStops as MapStopMarker[][]).push([...stops]);
    this.stopSelectHandler = onSelect;
  }

  fitToCoordinates(points: readonly GeoCoordinateStub[]): void {
    (this.focusedPoints as GeoCoordinateStub[][]).push([...points]);
  }

  renderRoutes(_routes: readonly MapRoutePolyline[], _activeRouteId: string | null): void {
    this.routeRenderCount += 1;
  }

  invalidateSize(): void {
    this.invalidationCount += 1;
  }

  destroy(): void {
    this.destroyed = true;
  }
}

class LeafletMapServiceStub {
  readonly handle = new MapHandleStub();
  options: MapCreateOptions | null = null;

  create(_container: HTMLElement, options: MapCreateOptions): MapHandle {
    this.options = options;
    return this.handle;
  }
}

class NearbyStopsServiceStub {
  allStops: readonly NearbyStopRecord[] = [];
  nearbyResults: readonly NearbyStopResult[] = [];

  async getAllStops(): Promise<readonly NearbyStopRecord[]> {
    return this.allStops;
  }

  async findClosestStops(): Promise<readonly NearbyStopResult[]> {
    return this.nearbyResults;
  }
}

class GeolocationServiceStub {
  async getCurrentPosition(): Promise<GeolocationPosition> {
    return buildPosition(37.389, -5.984);
  }
}

class StopDirectoryServiceStub {
  private readonly records = new Map<string, StopDirectoryRecord>();

  addRecord(record: StopDirectoryRecord): void {
    this.records.set(record.stopId, record);
  }

  getStopById(stopId: string): Observable<StopDirectoryRecord | null> {
    return of(this.records.get(stopId) ?? null);
  }
}

class RouterStub {
  readonly navigate = jasmine.createSpy('navigate').and.resolveTo(true);
}

class RouteOverlayFacadeStub {
  readonly refresh = jasmine.createSpy('refresh');

  watchOverlay(): Observable<RouteOverlayState> {
    return of({
      status: 'idle',
      routes: [],
      errorKey: null,
      selectionKey: null,
      selectionSummary: null
    } satisfies RouteOverlayState);
  }
}

interface GeoCoordinateStub {
  readonly latitude: number;
  readonly longitude: number;
}

interface MapComponentAccess {
  locate(): Promise<void>;
}

const NETWORK_STOPS: readonly NearbyStopRecord[] = Object.freeze([
  {
    stopId: 'sevilla:001',
    name: 'Prado de San Sebastián',
    latitude: 37.377,
    longitude: -5.986
  },
  {
    stopId: 'malaga:002',
    name: 'Estación de Málaga',
    latitude: 36.721,
    longitude: -4.421
  },
  {
    stopId: 'granada:003',
    name: 'Estación de Granada',
    latitude: 37.188,
    longitude: -3.609
  }
]);

function buildPosition(latitude: number, longitude: number): GeolocationPosition {
  const coords = {
    latitude,
    longitude,
    accuracy: 0,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
    toJSON: () => ({})
  } satisfies GeolocationCoordinates;

  return {
    coords,
    timestamp: Date.now(),
    toJSON: () => ({ coords, timestamp: Date.now() })
  } satisfies GeolocationPosition;
}

describe('MapComponent network exploration', () => {
  let fixture: ComponentFixture<MapComponent>;
  let component: MapComponent;
  let mapService: LeafletMapServiceStub;
  let nearbyStops: NearbyStopsServiceStub;
  let stopDirectory: StopDirectoryServiceStub;
  let router: RouterStub;

  beforeEach(async () => {
    spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });

    mapService = new LeafletMapServiceStub();
    nearbyStops = new NearbyStopsServiceStub();
    nearbyStops.allStops = NETWORK_STOPS;
    stopDirectory = new StopDirectoryServiceStub();
    router = new RouterStub();

    await TestBed.configureTestingModule({
      imports: [
        MapComponent,
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } })
      ],
      providers: [
        { provide: LeafletMapService, useValue: mapService },
        { provide: NearbyStopsService, useValue: nearbyStops },
        { provide: GeolocationService, useClass: GeolocationServiceStub },
        { provide: StopDirectoryService, useValue: stopDirectory },
        { provide: Router, useValue: router },
        { provide: RouteOverlayFacade, useClass: RouteOverlayFacadeStub },
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setDefaultLang('es');
    translate.use('es');

    fixture = TestBed.createComponent(MapComponent);
    component = fixture.componentInstance;
  });

  it('renders and fits the complete stop network when the map opens', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mapService.handle.renderedStops).toHaveSize(1);
    expect(mapService.handle.renderedStops[0]).toEqual([
      { id: 'sevilla:001', coordinate: { latitude: 37.377, longitude: -5.986 } },
      { id: 'malaga:002', coordinate: { latitude: 36.721, longitude: -4.421 } },
      { id: 'granada:003', coordinate: { latitude: 37.188, longitude: -3.609 } }
    ]);
    expect(mapService.handle.focusedPoints.at(-1)).toEqual([
      { latitude: 37.377, longitude: -5.986 },
      { latitude: 36.721, longitude: -4.421 },
      { latitude: 37.188, longitude: -3.609 }
    ]);
    expect(mapService.handle.stopSelectHandler).toEqual(jasmine.any(Function));
  });

  it('navigates a selected marker to the canonical stop detail route', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    mapService.handle.stopSelectHandler?.('malaga:002');

    expect(router.navigate).toHaveBeenCalledOnceWith(['/', 'stop-detail', 'malaga:002']);
  });

  it('keeps the full stop layer when geolocation focuses nearby stops', async () => {
    const nearbyRecord: StopDirectoryRecord = {
      consortiumId: 7,
      stopId: 'sevilla:001',
      stopCode: '001',
      name: 'Prado de San Sebastián',
      municipality: 'Sevilla',
      municipalityId: 'sevilla',
      nucleus: 'Centro',
      nucleusId: 'centro',
      zone: 'A',
      location: { latitude: 37.377, longitude: -5.986 }
    };

    nearbyStops.nearbyResults = [
      { id: nearbyRecord.stopId, name: nearbyRecord.name, distanceInMeters: 150 }
    ];
    stopDirectory.addRecord(nearbyRecord);

    fixture.detectChanges();
    await fixture.whenStable();

    const networkRenderCount = mapService.handle.renderedStops.length;
    const access = component as unknown as MapComponentAccess;
    await access.locate();

    expect(mapService.handle.renderedStops.length).toBe(networkRenderCount);
    expect(mapService.handle.renderedStops.at(-1)).toHaveSize(NETWORK_STOPS.length);
    expect(mapService.handle.focusedPoints.at(-1)).toEqual([
      { latitude: 37.377, longitude: -5.986 },
      { latitude: 37.389, longitude: -5.984 }
    ]);
  });
});
