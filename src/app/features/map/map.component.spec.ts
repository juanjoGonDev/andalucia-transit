import { PLATFORM_ID } from '@angular/core';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  flushMicrotasks,
  tick
} from '@angular/core/testing';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable, Subject, of, throwError } from 'rxjs';
import { GeolocationService } from '@core/services/geolocation.service';
import {
  NearbyStopRecord,
  NearbyStopResult,
  NearbyStopsService
} from '@core/services/nearby-stops.service';
import { buildStopIdentity } from '@core/services/stop-identity.util';
import {
  RouteLineDetail,
  RouteLineSummary,
  RouteLinesApiService
} from '@data/route-search/route-lines-api.service';
import { StopDirectoryRecord, StopDirectoryService } from '@data/stops/stop-directory.service';
import {
  RouteOverlayFacade,
  RouteOverlaySelectionSummary,
  RouteOverlayState
} from '@domain/map/route-overlay.facade';
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

class MapHandleStub implements MapHandle {
  readonly viewCenters: GeoCoordinateStub[] = [];
  readonly viewZoomLevels: number[] = [];
  readonly userLocations: GeoCoordinateStub[] = [];
  readonly renderedStops: readonly MapStopMarker[][] = [];
  readonly focusedPoints: readonly GeoCoordinateStub[][] = [];
  readonly restrictedPoints: readonly GeoCoordinateStub[][] = [];
  readonly highlightedStopIds: (string | null)[] = [];
  readonly renderedRoutes: readonly {
    routes: readonly MapRoutePolyline[];
    activeRouteId: string | null;
  }[] = [];
  interactions: MapStopInteractionOptions | undefined;
  destroyed = false;
  invalidationCount = 0;
  viewportListenerRemoved = false;
  private viewportHandler: MapViewportSettledHandler | null = null;

  setView(center: GeoCoordinateStub, zoom: number): void {
    this.viewCenters.push(center);
    this.viewZoomLevels.push(zoom);
  }

  renderUserLocation(coordinate: GeoCoordinateStub): void {
    this.userLocations.push(coordinate);
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

  focusStop(_stopId: string, _zoom: number, _animate = false): boolean {
    return true;
  }

  renderRoutes(routes: readonly MapRoutePolyline[], activeRouteId: string | null): void {
    (
      this.renderedRoutes as {
        routes: readonly MapRoutePolyline[];
        activeRouteId: string | null;
      }[]
    ).push({
      routes: [...routes],
      activeRouteId
    });
  }

  onViewportSettled(handler: MapViewportSettledHandler): () => void {
    this.viewportHandler = handler;
    handler(DEFAULT_CENTER);

    return () => {
      this.viewportHandler = null;
      this.viewportListenerRemoved = true;
    };
  }

  emitViewportSettled(center: GeoCoordinateStub): void {
    this.viewportHandler?.(center);
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
  container: HTMLElement | null = null;
  options: MapCreateOptions | null = null;

  create(container: HTMLElement, options: MapCreateOptions): MapHandle {
    this.container = container;
    this.options = options;
    return this.handle;
  }
}

class GeolocationServiceStub {
  private position: GeolocationPosition | null = buildPosition(37.39, -5.98);
  private error: unknown = null;

  setPosition(latitude: number, longitude: number): void {
    this.position = buildPosition(latitude, longitude);
  }

  failWith(error: unknown): void {
    this.error = error;
  }

  async getCurrentPosition(): Promise<GeolocationPosition> {
    if (this.error) {
      throw this.error;
    }

    if (!this.position) {
      throw new Error('position unavailable');
    }

    return this.position;
  }
}

class NearbyStopsServiceStub {
  allStops: readonly NearbyStopRecord[] = [];
  results: readonly NearbyStopResult[] = [];

  async getAllStops(): Promise<readonly NearbyStopRecord[]> {
    return this.allStops;
  }

  async findClosestStops(): Promise<readonly NearbyStopResult[]> {
    return this.results;
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

class RouteOverlayFacadeStub {
  private readonly subject = new Subject<RouteOverlayState>();
  readonly refresh = jasmine.createSpy('refresh');

  watchOverlay(): Observable<RouteOverlayState> {
    return this.subject.asObservable();
  }

  emit(state: RouteOverlayState): void {
    this.subject.next(state);
  }
}

class RouteLinesApiServiceStub {
  readonly getLinesNearLocation = jasmine
    .createSpy('getLinesNearLocation')
    .and.returnValue(of<readonly RouteLineSummary[]>([]));
  readonly getLineDetail = jasmine.createSpy('getLineDetail').and.callFake(
    (_consortiumId: number, lineId: string) =>
      of<RouteLineDetail>({
        lineId,
        code: lineId,
        name: lineId,
        mode: 'Autobús',
        coordinates: Object.freeze([])
      })
  );
}

interface MapComponentAccess {
  locate(): Promise<void>;
  stops(): readonly MapStopViewStub[];
  errorKey(): string | null;
  refreshRoutes(): void;
}

interface MapStopViewStub {
  readonly id: string;
  readonly consortiumId: number;
  readonly stopId: string;
}

interface MapRouteViewAccess {
  routeViews(): readonly {
    readonly id: string;
    readonly stopCountTranslationKey: string;
    readonly stopCountValue: string;
    readonly distanceTranslationKey: string;
    readonly distanceValue: string;
  }[];
}

interface MapRouteSelectionAccess {
  toggleRoute(routeId: string): void;
  activeRouteId(): string | null;
  routeLiveMessage(): string;
}

interface MapFocusedLinesAccess {
  focusedLines(): readonly RouteLineSummary[];
  focusedLinesStatus(): string;
  focusedLinesErrorKey(): string | null;
  activeFocusedLineId(): string | null;
  focusedLinePreviewErrorKey(): string | null;
  toggleFocusedLine(lineId: string): void;
  retryFocusedLines(): void;
}

interface GeoCoordinateStub {
  readonly latitude: number;
  readonly longitude: number;
}

const DEFAULT_CENTER = { latitude: 37.389092, longitude: -5.984459 };
const DEFAULT_ZOOM = 7;
const ROUTE_LENGTH_METERS = 750;
const MAP_MIN_ZOOM = 6;
const MAP_MAX_ZOOM = 17;
const NEARBY_DISTANCE_METERS = 150;
const FOCUSED_LINES_DEBOUNCE_MS = 250;
const FOCUSED_LINE: RouteLineSummary = Object.freeze({
  lineId: '177',
  code: 'M-110',
  name: 'Málaga-Torremolinos-Benalmádena Costa',
  mode: 'Autobús',
  priority: 0
});

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

function permissionDeniedError(): GeolocationPositionError {
  return {
    code: 1,
    message: 'denied',
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3
  } satisfies GeolocationPositionError;
}

function createNetworkStop(
  consortiumId: number,
  latitude: number,
  longitude: number,
  stopId = `stop-${consortiumId}`
): NearbyStopRecord {
  return {
    consortiumId,
    stopId,
    stopCode: stopId,
    name: stopId,
    municipality: 'Municipality',
    municipalityId: 'municipality',
    nucleus: 'Nucleus',
    nucleusId: 'nucleus',
    zone: null,
    latitude,
    longitude
  } satisfies NearbyStopRecord;
}

describe('MapComponent', () => {
  let fixture: ComponentFixture<MapComponent>;
  let component: MapComponent;
  let mapService: LeafletMapServiceStub;
  let geolocation: GeolocationServiceStub;
  let nearbyStops: NearbyStopsServiceStub;
  let stopDirectory: StopDirectoryServiceStub;
  let overlayFacade: RouteOverlayFacadeStub;
  let routeLines: RouteLinesApiServiceStub;

  beforeEach(async () => {
    spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });

    mapService = new LeafletMapServiceStub();
    geolocation = new GeolocationServiceStub();
    nearbyStops = new NearbyStopsServiceStub();
    stopDirectory = new StopDirectoryServiceStub();
    overlayFacade = new RouteOverlayFacadeStub();
    routeLines = new RouteLinesApiServiceStub();

    await TestBed.configureTestingModule({
      imports: [
        MapComponent,
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } })
      ],
      providers: [
        { provide: LeafletMapService, useValue: mapService },
        { provide: GeolocationService, useValue: geolocation },
        { provide: NearbyStopsService, useValue: nearbyStops },
        { provide: StopDirectoryService, useValue: stopDirectory },
        { provide: RouteOverlayFacade, useValue: overlayFacade },
        { provide: RouteLinesApiService, useValue: routeLines },
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setDefaultLang('es');
    translate.use('es');

    fixture = TestBed.createComponent(MapComponent);
    component = fixture.componentInstance;
  });

  it('creates the map view on init with default configuration', async () => {
    emitIdleOverlayState(overlayFacade);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mapService.container).toBeTruthy();
    expect(mapService.options).toEqual(
      jasmine.objectContaining({
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        minZoom: MAP_MIN_ZOOM,
        maxZoom: MAP_MAX_ZOOM
      })
    );
  });

  it('removes the viewport listener when the component is destroyed', async () => {
    emitIdleOverlayState(overlayFacade);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.destroy();

    expect(mapService.handle.viewportListenerRemoved).toBeTrue();
    expect(mapService.handle.destroyed).toBeTrue();
  });

  it('requests the user location and renders nearby stops', async () => {
    const stopRecord: StopDirectoryRecord = {
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

    nearbyStops.results = [
      {
        consortiumId: stopRecord.consortiumId,
        id: stopRecord.stopId,
        name: stopRecord.name,
        distanceInMeters: NEARBY_DISTANCE_METERS
      }
    ];
    stopDirectory.addRecord(stopRecord);

    emitIdleOverlayState(overlayFacade);
    fixture.detectChanges();
    await fixture.whenStable();

    const access = component as unknown as MapComponentAccess;
    await access.locate();

    expect(mapService.handle.userLocations.length).toBe(1);
    expect(mapService.handle.renderedStops.at(-1)).toEqual([
      {
        id: buildStopIdentity(stopRecord.consortiumId, stopRecord.stopId),
        name: stopRecord.name,
        code: stopRecord.stopCode,
        municipality: stopRecord.municipality,
        coordinate: stopRecord.location
      }
    ]);
    expect(access.stops()).toEqual([
      jasmine.objectContaining({
        id: buildStopIdentity(stopRecord.consortiumId, stopRecord.stopId),
        consortiumId: stopRecord.consortiumId,
        stopId: stopRecord.stopId
      })
    ]);
  });

  it('surfaces an error key when location permission is denied', async () => {
    geolocation.failWith(permissionDeniedError());

    emitIdleOverlayState(overlayFacade);
    fixture.detectChanges();
    await fixture.whenStable();

    const access = component as unknown as MapComponentAccess;
    await access.locate();

    expect(access.errorKey()).toBe('map.errors.permissionDenied');
    expect(mapService.handle.renderedStops.at(-1) ?? []).toHaveSize(0);
  });

  it('discovers focused-area lines from the settled map without geolocation', fakeAsync(() => {
    nearbyStops.allStops = [createNetworkStop(7, DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude)];
    routeLines.getLinesNearLocation.and.returnValue(of([FOCUSED_LINE]));

    emitIdleOverlayState(overlayFacade);
    fixture.detectChanges();
    flushMicrotasks();
    tick(FOCUSED_LINES_DEBOUNCE_MS);

    const access = component as unknown as MapFocusedLinesAccess;

    expect(routeLines.getLinesNearLocation).toHaveBeenCalledOnceWith(7, DEFAULT_CENTER);
    expect(access.focusedLinesStatus()).toBe('ready');
    expect(access.focusedLines()).toEqual([FOCUSED_LINE]);
  }));

  it('cancels stale focused-area requests when the viewport changes', fakeAsync(() => {
    const firstResponse = new Subject<readonly RouteLineSummary[]>();
    const secondResponse = new Subject<readonly RouteLineSummary[]>();
    const secondCenter = { latitude: 36.7213, longitude: -4.4214 };
    const staleLine: RouteLineSummary = { ...FOCUSED_LINE, lineId: 'stale', code: 'STALE' };
    const currentLine: RouteLineSummary = { ...FOCUSED_LINE, lineId: 'current', code: 'CURRENT' };

    nearbyStops.allStops = [
      createNetworkStop(1, DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude),
      createNetworkStop(4, secondCenter.latitude, secondCenter.longitude)
    ];
    routeLines.getLinesNearLocation.and.callFake(
      (_consortiumId: number, coordinate: GeoCoordinateStub) =>
        coordinate.latitude === DEFAULT_CENTER.latitude ? firstResponse : secondResponse
    );

    emitIdleOverlayState(overlayFacade);
    fixture.detectChanges();
    flushMicrotasks();
    tick(FOCUSED_LINES_DEBOUNCE_MS);

    mapService.handle.emitViewportSettled(secondCenter);
    tick(FOCUSED_LINES_DEBOUNCE_MS);
    secondResponse.next([currentLine]);
    secondResponse.complete();
    firstResponse.next([staleLine]);
    firstResponse.complete();

    const access = component as unknown as MapFocusedLinesAccess;

    expect(routeLines.getLinesNearLocation).toHaveBeenCalledTimes(2);
    expect(access.focusedLines()).toEqual([currentLine]);
  }));

  it('surfaces focused-area errors and retries the same viewport', fakeAsync(() => {
    nearbyStops.allStops = [createNetworkStop(7, DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude)];
    routeLines.getLinesNearLocation.and.returnValues(
      throwError(() => new Error('failure')),
      of([FOCUSED_LINE])
    );

    emitIdleOverlayState(overlayFacade);
    fixture.detectChanges();
    flushMicrotasks();
    tick(FOCUSED_LINES_DEBOUNCE_MS);

    const access = component as unknown as MapFocusedLinesAccess;
    expect(access.focusedLinesStatus()).toBe('error');
    expect(access.focusedLinesErrorKey()).toBe('map.focusedLines.error');

    access.retryFocusedLines();
    tick(FOCUSED_LINES_DEBOUNCE_MS);

    expect(routeLines.getLinesNearLocation).toHaveBeenCalledTimes(2);
    expect(access.focusedLines()).toEqual([FOCUSED_LINE]);
  }));

  it('previews official geometry for a focused-area line and fits the map', fakeAsync(() => {
    const coordinates = Object.freeze([
      { latitude: 36.7213, longitude: -4.4214 },
      { latitude: 36.7192, longitude: -4.4238 },
      { latitude: 36.7168, longitude: -4.4261 }
    ]);
    nearbyStops.allStops = [createNetworkStop(4, DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude)];
    routeLines.getLinesNearLocation.and.returnValue(of([FOCUSED_LINE]));
    routeLines.getLineDetail.and.returnValue(
      of({
        lineId: FOCUSED_LINE.lineId,
        code: FOCUSED_LINE.code,
        name: FOCUSED_LINE.name,
        mode: FOCUSED_LINE.mode,
        coordinates
      })
    );

    emitIdleOverlayState(overlayFacade);
    fixture.detectChanges();
    flushMicrotasks();
    tick(FOCUSED_LINES_DEBOUNCE_MS);

    const access = component as unknown as MapFocusedLinesAccess;
    access.toggleFocusedLine(FOCUSED_LINE.lineId);
    flushMicrotasks();

    const lastRender = mapService.handle.renderedRoutes.at(-1);
    expect(routeLines.getLineDetail).toHaveBeenCalledOnceWith(4, FOCUSED_LINE.lineId);
    expect(access.activeFocusedLineId()).toBe(FOCUSED_LINE.lineId);
    expect(lastRender?.routes).toContain(
      jasmine.objectContaining({ id: `focused-line:${FOCUSED_LINE.lineId}`, coordinates })
    );
    expect(lastRender?.activeRouteId).toBe(`focused-line:${FOCUSED_LINE.lineId}`);
    expect(mapService.handle.focusedPoints.at(-1)).toEqual([...coordinates]);
  }));

  it('does not render a focused-line preview when official geometry is absent', fakeAsync(() => {
    nearbyStops.allStops = [createNetworkStop(4, DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude)];
    routeLines.getLinesNearLocation.and.returnValue(of([FOCUSED_LINE]));

    emitIdleOverlayState(overlayFacade);
    fixture.detectChanges();
    flushMicrotasks();
    tick(FOCUSED_LINES_DEBOUNCE_MS);

    const access = component as unknown as MapFocusedLinesAccess;
    access.toggleFocusedLine(FOCUSED_LINE.lineId);
    flushMicrotasks();

    expect(access.activeFocusedLineId()).toBeNull();
    expect(access.focusedLinePreviewErrorKey()).toBe('map.focusedLines.previewError');
    expect(mapService.handle.renderedRoutes.at(-1)?.routes).toEqual([]);
  }));

  it('renders route overlays when overlay facade returns routes', async () => {
    const state = buildRouteOverlayState({
      status: 'ready',
      routes: [
        {
          id: 'route-1',
          lineId: 'line-1',
          lineCode: 'M-111',
          direction: 1,
          destinationName: 'Centro',
          coordinates: [
            { latitude: 37.2, longitude: -5.9 },
            { latitude: 37.3, longitude: -6.0 }
          ],
          stopCount: 2,
          lengthInMeters: ROUTE_LENGTH_METERS
        }
      ],
      selectionKey: 'selection-1',
      errorKey: null
    });

    emitIdleOverlayState(overlayFacade);
    fixture.detectChanges();
    await fixture.whenStable();

    overlayFacade.emit(state);
    await fixture.whenStable();

    const lastRender = mapService.handle.renderedRoutes.at(-1);

    expect(lastRender).toBeTruthy();
    expect(lastRender?.routes.length).toBe(1);
    expect(lastRender?.routes[0]?.id).toBe('route-1');
  });

  it('formats route distance metadata for display', async () => {
    const state = buildRouteOverlayState({
      status: 'ready',
      routes: [
        {
          id: 'route-2',
          lineId: 'line-2',
          lineCode: 'M-200',
          direction: 2,
          destinationName: 'Campus',
          coordinates: [
            { latitude: 37.25, longitude: -5.95 },
            { latitude: 37.26, longitude: -5.96 }
          ],
          stopCount: 2,
          lengthInMeters: ROUTE_LENGTH_METERS
        }
      ],
      selectionKey: 'selection-2',
      errorKey: null
    });

    emitIdleOverlayState(overlayFacade);
    fixture.detectChanges();
    await fixture.whenStable();

    overlayFacade.emit(state);
    await fixture.whenStable();

    const access = component as unknown as MapRouteViewAccess;
    const views = access.routeViews();

    expect(views.length).toBe(1);
    expect(views[0]?.stopCountTranslationKey).toBe('map.routes.stopCount.other');
    expect(views[0]?.stopCountValue).toBe('2');
    expect(views[0]?.distanceTranslationKey).toBe('map.routes.distance.meters');
    expect(views[0]?.distanceValue).toBe('750');
  });

  it('selects the singular stop count translation when only one stop is present', async () => {
    const state = buildRouteOverlayState({
      status: 'ready',
      routes: [
        {
          id: 'route-3',
          lineId: 'line-3',
          lineCode: 'M-300',
          direction: 1,
          destinationName: 'Plaza',
          coordinates: [
            { latitude: 37.2, longitude: -5.9 },
            { latitude: 37.21, longitude: -5.91 }
          ],
          stopCount: 1,
          lengthInMeters: ROUTE_LENGTH_METERS
        }
      ],
      selectionKey: 'selection-3',
      errorKey: null
    });

    emitIdleOverlayState(overlayFacade);
    fixture.detectChanges();
    await fixture.whenStable();

    overlayFacade.emit(state);
    await fixture.whenStable();

    const access = component as unknown as MapRouteViewAccess;
    const views = access.routeViews();

    expect(views.length).toBe(1);
    expect(views[0]?.stopCountTranslationKey).toBe('map.routes.stopCount.one');
    expect(views[0]?.stopCountValue).toBe('1');
  });

  it('announces route selection and clearing when toggled', async () => {
    const state = buildRouteOverlayState({
      status: 'ready',
      routes: [
        {
          id: 'announce-route',
          lineId: 'line-announce',
          lineCode: 'M-401',
          direction: 1,
          destinationName: 'Centro',
          coordinates: [
            { latitude: 37.2, longitude: -5.9 },
            { latitude: 37.25, longitude: -5.95 }
          ],
          stopCount: 3,
          lengthInMeters: ROUTE_LENGTH_METERS
        }
      ],
      selectionKey: 'selection-announce',
      errorKey: null
    });

    emitIdleOverlayState(overlayFacade);
    fixture.detectChanges();
    await fixture.whenStable();

    overlayFacade.emit(state);
    await fixture.whenStable();

    const access = component as unknown as MapRouteSelectionAccess;
    access.toggleRoute('announce-route');
    await fixture.whenStable();

    expect(access.routeLiveMessage()).toBe('map.routes.announcements.selected');

    access.toggleRoute('announce-route');
    await fixture.whenStable();

    expect(access.routeLiveMessage()).toBe('map.routes.announcements.cleared');
  });

  it('announces highlight clearing when overlay selection changes', async () => {
    const translate = TestBed.inject(TranslateService);
    const instantSpy = spyOn(translate, 'instant').and.callThrough();
    const readyState = buildRouteOverlayState({
      status: 'ready',
      routes: [
        {
          id: 'announce-route',
          lineId: 'line-announce',
          lineCode: 'M-401',
          direction: 1,
          destinationName: 'Centro',
          coordinates: [
            { latitude: 37.2, longitude: -5.9 },
            { latitude: 37.25, longitude: -5.95 }
          ],
          stopCount: 3,
          lengthInMeters: ROUTE_LENGTH_METERS
        }
      ],
      selectionKey: 'selection-announce',
      errorKey: null
    });
    const loadingState = buildRouteOverlayState({
      status: 'loading',
      routes: [],
      selectionKey: 'selection-new',
      errorKey: null
    });

    emitIdleOverlayState(overlayFacade);
    fixture.detectChanges();
    await fixture.whenStable();

    overlayFacade.emit(readyState);
    await fixture.whenStable();

    const access = component as unknown as MapRouteSelectionAccess;
    access.toggleRoute('announce-route');
    await fixture.whenStable();

    overlayFacade.emit(loadingState);
    await fixture.whenStable();

    expect(access.activeRouteId()).toBeNull();
    expect(access.routeLiveMessage()).toBe('map.routes.announcements.loading');
    expect(instantSpy).toHaveBeenCalledWith('map.routes.announcements.cleared');
  });

  it('announces overlay loading status changes', async () => {
    emitIdleOverlayState(overlayFacade);
    fixture.detectChanges();
    await fixture.whenStable();

    const loadingState = buildRouteOverlayState({
      status: 'loading',
      routes: [],
      selectionKey: 'loading-selection',
      errorKey: null
    });

    overlayFacade.emit(loadingState);
    await fixture.whenStable();

    const access = component as unknown as MapRouteSelectionAccess;

    expect(access.routeLiveMessage()).toBe('map.routes.announcements.loading');
  });

  it('re-announces loading status when selection changes without status changes', async () => {
    const translate = TestBed.inject(TranslateService);
    const instantSpy = spyOn(translate, 'instant').and.callThrough();

    emitIdleOverlayState(overlayFacade);
    fixture.detectChanges();
    await fixture.whenStable();

    const firstState = buildRouteOverlayState({
      status: 'loading',
      routes: [],
      selectionKey: 'loading-selection-one',
      errorKey: null
    });
    const secondState = buildRouteOverlayState({
      status: 'loading',
      routes: [],
      selectionKey: 'loading-selection-two',
      errorKey: null
    });

    overlayFacade.emit(firstState);
    await fixture.whenStable();

    expect(instantSpy).toHaveBeenCalledWith('map.routes.announcements.loading');

    instantSpy.calls.reset();

    overlayFacade.emit(secondState);
    await fixture.whenStable();

    expect(instantSpy).toHaveBeenCalledWith('map.routes.announcements.loading');
  });

  it('announces overlay ready status with pluralized count', async () => {
    emitIdleOverlayState(overlayFacade);
    fixture.detectChanges();
    await fixture.whenStable();

    const readyState = buildRouteOverlayState({
      status: 'ready',
      routes: [
        {
          id: 'ready-route-one',
          lineId: 'line-ready-one',
          lineCode: 'M-101',
          direction: 0,
          destinationName: 'Centro',
          coordinates: [
            { latitude: 37.2, longitude: -5.9 },
            { latitude: 37.22, longitude: -5.92 }
          ],
          stopCount: 4,
          lengthInMeters: ROUTE_LENGTH_METERS
        },
        {
          id: 'ready-route-two',
          lineId: 'line-ready-two',
          lineCode: 'M-102',
          direction: 1,
          destinationName: 'Santa Justa',
          coordinates: [
            { latitude: 37.24, longitude: -5.94 },
            { latitude: 37.26, longitude: -5.96 }
          ],
          stopCount: 5,
          lengthInMeters: ROUTE_LENGTH_METERS
        }
      ],
      selectionKey: 'ready-selection',
      errorKey: null
    });

    overlayFacade.emit(readyState);
    await fixture.whenStable();

    const access = component as unknown as MapRouteSelectionAccess;

    expect(access.routeLiveMessage()).toBe('map.routes.announcements.loaded.other');
  });

  it('announces overlay empty state when ready without routes', async () => {
    emitIdleOverlayState(overlayFacade);
    fixture.detectChanges();
    await fixture.whenStable();

    const emptyState = buildRouteOverlayState({
      status: 'ready',
      routes: [],
      selectionKey: 'ready-empty',
      errorKey: null
    });

    overlayFacade.emit(emptyState);
    await fixture.whenStable();

    const access = component as unknown as MapRouteSelectionAccess;

    expect(access.routeLiveMessage()).toBe('map.routes.announcements.empty');
  });

  it('re-announces empty state when selection changes with identical counts', async () => {
    const translate = TestBed.inject(TranslateService);
    const instantSpy = spyOn(translate, 'instant').and.callThrough();

    emitIdleOverlayState(overlayFacade);
    fixture.detectChanges();
    await fixture.whenStable();

    const firstState = buildRouteOverlayState({
      status: 'ready',
      routes: [],
      selectionKey: 'ready-empty-one',
      errorKey: null
    });
    const secondState = buildRouteOverlayState({
      status: 'ready',
      routes: [],
      selectionKey: 'ready-empty-two',
      errorKey: null
    });

    overlayFacade.emit(firstState);
    await fixture.whenStable();

    expect(instantSpy).toHaveBeenCalledWith('map.routes.announcements.empty');

    instantSpy.calls.reset();

    overlayFacade.emit(secondState);
    await fixture.whenStable();

    expect(instantSpy).toHaveBeenCalledWith('map.routes.announcements.empty');
  });

  it('announces overlay errors when state enters error status', async () => {
    emitIdleOverlayState(overlayFacade);
    fixture.detectChanges();
    await fixture.whenStable();

    const errorState = buildRouteOverlayState({
      status: 'error',
      routes: [],
      selectionKey: 'error-selection',
      errorKey: 'map.routes.error'
    });

    overlayFacade.emit(errorState);
    await fixture.whenStable();

    const access = component as unknown as MapRouteSelectionAccess;

    expect(access.routeLiveMessage()).toBe('map.routes.error');
  });

  it('refreshes overlay data when refreshRoutes is invoked', () => {
    emitIdleOverlayState(overlayFacade);
    fixture.detectChanges();

    const access = component as unknown as MapComponentAccess;
    access.refreshRoutes();

    expect(overlayFacade.refresh).toHaveBeenCalled();
  });
});

function emitIdleOverlayState(facade: RouteOverlayFacadeStub): void {
  facade.emit(
    buildRouteOverlayState({ status: 'idle', routes: [], selectionKey: null, errorKey: null })
  );
}

function buildRouteOverlayState(
  overrides: Partial<RouteOverlayState> &
    Pick<RouteOverlayState, 'status' | 'routes' | 'selectionKey' | 'errorKey'>
): RouteOverlayState {
  const summary: RouteOverlaySelectionSummary | null =
    overrides.status === 'idle'
      ? null
      : { originName: 'Origin', destinationName: 'Destination' };

  return {
    status: overrides.status,
    routes: overrides.routes,
    errorKey: overrides.errorKey ?? null,
    selectionKey: overrides.selectionKey,
    selectionSummary: overrides.selectionKey ? summary : null
  } satisfies RouteOverlayState;
}
