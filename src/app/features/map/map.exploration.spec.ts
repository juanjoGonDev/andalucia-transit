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
import { buildStopIdentity } from '@core/services/stop-identity.util';
import { StopDirectoryRecord, StopDirectoryService } from '@data/stops/stop-directory.service';
import { RouteOverlayFacade, RouteOverlayState } from '@domain/map/route-overlay.facade';
import { MapSearchTarget } from '@features/map/map-search.util';
import { MapComponent } from '@features/map/map.component';
import {
  LeafletMapService,
  MapCreateOptions,
  MapHandle,
  MapRoutePolyline,
  MapStopInteractionOptions,
  MapStopMarker,
  MapViewportSettledHandler
} from '@shared/map/leaflet-map.service';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): Observable<Record<string, string>> {
    return of({});
  }
}

interface MapFocusCall {
  readonly stopId: string;
  readonly zoom: number;
  readonly animate: boolean;
}

class MapHandleStub implements MapHandle {
  readonly renderedStops: readonly MapStopMarker[][] = [];
  readonly focusedPoints: readonly GeoCoordinateStub[][] = [];
  readonly restrictedPoints: readonly GeoCoordinateStub[][] = [];
  readonly highlightedStopIds: (string | null)[] = [];
  readonly focusCalls: MapFocusCall[] = [];
  interactions: MapStopInteractionOptions | undefined;
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

  renderStops(
    stops: readonly MapStopMarker[],
    interactions?: MapStopInteractionOptions
  ): void {
    (this.renderedStops as MapStopMarker[][]).push([...stops]);
    this.interactions = interactions;
  }

  fitToCoordinates(points: readonly GeoCoordinateStub[]): void {
    (this.focusedPoints as GeoCoordinateStub[][]).push([...points]);
  }

  restrictToCoordinates(points: readonly GeoCoordinateStub[]): void {
    (this.restrictedPoints as GeoCoordinateStub[][]).push([...points]);
  }

  highlightStop(stopId: string | null): void {
    this.highlightedStopIds.push(stopId);
  }

  focusStop(stopId: string, zoom: number, animate = false): boolean {
    this.focusCalls.push({ stopId, zoom, animate });
    return true;
  }

  renderRoutes(_routes: readonly MapRoutePolyline[], _activeRouteId: string | null): void {
    this.routeRenderCount += 1;
  }

  onViewportSettled(_handler: MapViewportSettledHandler): () => void {
    return () => undefined;
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
    this.records.set(buildStopIdentity(record.consortiumId, record.stopId), record);
  }

  getStopBySignature(
    consortiumId: number,
    stopId: string
  ): Observable<StopDirectoryRecord | null> {
    return of(this.records.get(buildStopIdentity(consortiumId, stopId)) ?? null);
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
  selectSearchTarget(target: MapSearchTarget): void;
  setStopHighlight(stopId: string | null): void;
}

const SEVILLE_CONSORTIUM_ID = 7;
const MALAGA_CONSORTIUM_ID = 4;
const GRANADA_CONSORTIUM_ID = 2;
const SEVILLE_STOP_ID = 'sevilla:001';
const MALAGA_STOP_ID = 'malaga:002';
const GRANADA_STOP_ID = 'granada:003';

const NETWORK_STOPS: readonly NearbyStopRecord[] = Object.freeze([
  {
    consortiumId: SEVILLE_CONSORTIUM_ID,
    stopId: SEVILLE_STOP_ID,
    stopCode: '001',
    name: 'Prado de San Sebastián',
    municipality: 'Sevilla',
    municipalityId: 'sevilla',
    nucleus: 'Centro',
    nucleusId: 'centro',
    zone: 'A',
    latitude: 37.377,
    longitude: -5.986
  },
  {
    consortiumId: MALAGA_CONSORTIUM_ID,
    stopId: MALAGA_STOP_ID,
    stopCode: '002',
    name: 'Estación de Málaga',
    municipality: 'Málaga',
    municipalityId: 'malaga',
    nucleus: 'Centro',
    nucleusId: 'centro',
    zone: 'A',
    latitude: 36.721,
    longitude: -4.421
  },
  {
    consortiumId: GRANADA_CONSORTIUM_ID,
    stopId: GRANADA_STOP_ID,
    stopCode: '003',
    name: 'Estación de Granada',
    municipality: 'Granada',
    municipalityId: 'granada',
    nucleus: 'Centro',
    nucleusId: 'centro',
    zone: 'A',
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

function buildMediaQueryList(matches: boolean, media: string): MediaQueryList {
  return {
    matches,
    media,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => true
  } satisfies MediaQueryList;
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

  it('renders, bounds and fits the complete stop network when the map opens', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mapService.handle.renderedStops).toHaveSize(1);
    expect(mapService.handle.renderedStops[0]).toEqual([
      {
        id: buildStopIdentity(SEVILLE_CONSORTIUM_ID, SEVILLE_STOP_ID),
        name: 'Prado de San Sebastián',
        code: '001',
        municipality: 'Sevilla',
        coordinate: { latitude: 37.377, longitude: -5.986 }
      },
      {
        id: buildStopIdentity(MALAGA_CONSORTIUM_ID, MALAGA_STOP_ID),
        name: 'Estación de Málaga',
        code: '002',
        municipality: 'Málaga',
        coordinate: { latitude: 36.721, longitude: -4.421 }
      },
      {
        id: buildStopIdentity(GRANADA_CONSORTIUM_ID, GRANADA_STOP_ID),
        name: 'Estación de Granada',
        code: '003',
        municipality: 'Granada',
        coordinate: { latitude: 37.188, longitude: -3.609 }
      }
    ]);
    expect(mapService.handle.restrictedPoints.at(-1)).toEqual([
      { latitude: 37.377, longitude: -5.986 },
      { latitude: 36.721, longitude: -4.421 },
      { latitude: 37.188, longitude: -3.609 }
    ]);
    expect(mapService.handle.focusedPoints.at(-1)).toEqual([
      { latitude: 37.377, longitude: -5.986 },
      { latitude: 36.721, longitude: -4.421 },
      { latitude: 37.188, longitude: -3.609 }
    ]);
    expect(mapService.handle.interactions).toBeDefined();
  });

  it('navigates from the marker popover action with consortium context', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    mapService.handle.interactions?.onDetails(
      buildStopIdentity(MALAGA_CONSORTIUM_ID, MALAGA_STOP_ID)
    );

    expect(router.navigate).toHaveBeenCalledOnceWith(
      ['/', 'stop-detail', MALAGA_STOP_ID],
      { queryParams: { consortiumId: String(MALAGA_CONSORTIUM_ID) } }
    );
  });

  it('focuses stop search targets with motion and forwards list highlight to the marker layer', async () => {
    spyOn(window, 'matchMedia').and.callFake((query) => buildMediaQueryList(false, query));
    fixture.detectChanges();
    await fixture.whenStable();

    const access = component as unknown as MapComponentAccess;
    const markerId = buildStopIdentity(SEVILLE_CONSORTIUM_ID, SEVILLE_STOP_ID);
    access.selectSearchTarget({
      kind: 'stop',
      id: markerId,
      name: 'Prado de San Sebastián',
      code: '001',
      municipality: 'Sevilla',
      nucleus: 'Centro',
      zone: 'A',
      coordinate: { latitude: 37.377, longitude: -5.986 }
    });
    access.setStopHighlight(markerId);
    access.setStopHighlight(null);

    expect(mapService.handle.focusCalls).toEqual([
      { stopId: markerId, zoom: 15, animate: true }
    ]);
    expect(mapService.handle.highlightedStopIds).toEqual([markerId, null]);
  });

  it('focuses stop search targets without animation when reduced motion is requested', async () => {
    spyOn(window, 'matchMedia').and.callFake((query) => buildMediaQueryList(true, query));
    fixture.detectChanges();
    await fixture.whenStable();

    const access = component as unknown as MapComponentAccess;
    const markerId = buildStopIdentity(SEVILLE_CONSORTIUM_ID, SEVILLE_STOP_ID);

    access.selectSearchTarget({
      kind: 'stop',
      id: markerId,
      name: 'Prado de San Sebastián',
      code: '001',
      municipality: 'Sevilla',
      nucleus: 'Centro',
      zone: 'A',
      coordinate: { latitude: 37.377, longitude: -5.986 }
    });

    expect(mapService.handle.focusCalls).toEqual([
      { stopId: markerId, zoom: 15, animate: false }
    ]);
  });

  it('fits area search targets without replacing the stop layer', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const access = component as unknown as MapComponentAccess;
    const networkRenderCount = mapService.handle.renderedStops.length;
    const areaCoordinates = [
      { latitude: 37.377, longitude: -5.986 },
      { latitude: 37.39, longitude: -5.99 }
    ];

    access.selectSearchTarget({
      kind: 'area',
      id: 'municipality|7|sevilla',
      areaKind: 'municipality',
      name: 'Sevilla',
      context: null,
      coordinates: areaCoordinates
    });

    expect(mapService.handle.renderedStops.length).toBe(networkRenderCount);
    expect(mapService.handle.focusedPoints.at(-1)).toEqual(areaCoordinates);
  });

  it('keeps the full stop layer when geolocation focuses nearby stops', async () => {
    const nearbyRecord: StopDirectoryRecord = {
      consortiumId: SEVILLE_CONSORTIUM_ID,
      stopId: SEVILLE_STOP_ID,
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
      {
        consortiumId: nearbyRecord.consortiumId,
        id: nearbyRecord.stopId,
        name: nearbyRecord.name,
        distanceInMeters: 150
      }
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
