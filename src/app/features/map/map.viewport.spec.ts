import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { Observable, of, throwError } from 'rxjs';
import { GeolocationService } from '@core/services/geolocation.service';
import {
  NearbyStopRecord,
  NearbyStopResult,
  NearbyStopsService
} from '@core/services/nearby-stops.service';
import { RouteLineSummary, RouteLinesApiService } from '@data/route-search/route-lines-api.service';
import { StopDirectoryRecord, StopDirectoryService } from '@data/stops/stop-directory.service';
import { RouteOverlayFacade, RouteOverlayState } from '@domain/map/route-overlay.facade';
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

const DEFAULT_CENTER = { latitude: 37.389092, longitude: -5.984459 };
const SECOND_CENTER = { latitude: 36.75, longitude: -2.69 };
const VIEWPORT_DEBOUNCE_MS = 250;

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): Observable<Record<string, string>> {
    return of({});
  }
}

class MapHandleStub implements MapHandle {
  private viewportHandler: MapViewportSettledHandler | null = null;

  setView(): void {}
  renderUserLocation(): void {}
  renderStops(_stops: readonly MapStopMarker[], _interactions?: MapStopInteractionOptions): void {}
  fitToCoordinates(): void {}
  restrictToCoordinates(): void {}
  highlightStop(): void {}
  focusStop(): boolean {
    return true;
  }
  renderRoutes(_routes: readonly MapRoutePolyline[], _activeRouteId: string | null): void {}
  invalidateSize(): void {}
  destroy(): void {}

  onViewportSettled(handler: MapViewportSettledHandler): () => void {
    this.viewportHandler = handler;
    handler(DEFAULT_CENTER);
    return () => {
      this.viewportHandler = null;
    };
  }

  emitViewportSettled(center: GeoCoordinateStub): void {
    this.viewportHandler?.(center);
  }
}

class LeafletMapServiceStub {
  readonly handle = new MapHandleStub();

  create(_container: HTMLElement, _options: MapCreateOptions): MapHandle {
    return this.handle;
  }
}

class GeolocationServiceStub {
  async getCurrentPosition(): Promise<GeolocationPosition> {
    throw new Error('Geolocation is not part of viewport exploration tests');
  }
}

class NearbyStopsServiceStub {
  readonly findClosestStops = jasmine.createSpy('findClosestStops');
  allStops: readonly NearbyStopRecord[] = [];

  async getAllStops(): Promise<readonly NearbyStopRecord[]> {
    return this.allStops;
  }
}

class StopDirectoryServiceStub {
  private readonly records = new Map<string, StopDirectoryRecord>();

  add(record: StopDirectoryRecord): void {
    this.records.set(`${record.consortiumId}:${record.stopId}`, record);
  }

  getStopBySignature(consortiumId: number, stopId: string): Observable<StopDirectoryRecord | null> {
    return of(this.records.get(`${consortiumId}:${stopId}`) ?? null);
  }
}

class RouteOverlayFacadeStub {
  readonly refresh = jasmine.createSpy('refresh');

  watchOverlay(): Observable<RouteOverlayState> {
    return of({
      status: 'idle',
      routes: Object.freeze([]),
      errorKey: null,
      selectionKey: null,
      selectionSummary: null
    });
  }
}

class RouteLinesApiServiceStub {
  readonly getLinesNearLocation = jasmine
    .createSpy('getLinesNearLocation')
    .and.returnValue(of<readonly RouteLineSummary[]>([]));
  readonly getLinesForStops = jasmine
    .createSpy('getLinesForStops')
    .and.returnValue(of<readonly RouteLineSummary[]>([]));
  readonly getLineDetail = jasmine.createSpy('getLineDetail');
}

interface MapViewportAccess {
  stops(): readonly { readonly stopId: string }[];
  viewportStopsStatus(): string;
  focusedLines(): readonly RouteLineSummary[];
  focusedLinesStatus(): string;
}

interface GeoCoordinateStub {
  readonly latitude: number;
  readonly longitude: number;
}

interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
}

function createDeferred<T>(): Deferred<T> {
  let resolvePromise!: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });

  return { promise, resolve: resolvePromise };
}

function networkStop(
  consortiumId: number,
  stopId: string,
  coordinate: GeoCoordinateStub
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
    latitude: coordinate.latitude,
    longitude: coordinate.longitude
  };
}

function directoryStop(record: NearbyStopRecord): StopDirectoryRecord {
  return {
    consortiumId: record.consortiumId,
    stopId: record.stopId,
    stopCode: record.stopCode,
    name: record.name,
    municipality: record.municipality,
    municipalityId: record.municipalityId,
    nucleus: record.nucleus,
    nucleusId: record.nucleusId,
    zone: record.zone,
    location: { latitude: record.latitude, longitude: record.longitude }
  };
}

function nearbyResult(record: NearbyStopRecord, distanceInMeters = 100): NearbyStopResult {
  return {
    consortiumId: record.consortiumId,
    id: record.stopId,
    name: record.name,
    distanceInMeters
  };
}

describe('MapComponent viewport exploration', () => {
  let fixture: ComponentFixture<MapComponent>;
  let mapService: LeafletMapServiceStub;
  let nearbyStops: NearbyStopsServiceStub;
  let stopDirectory: StopDirectoryServiceStub;
  let routeLines: RouteLinesApiServiceStub;

  beforeEach(async () => {
    spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });

    mapService = new LeafletMapServiceStub();
    nearbyStops = new NearbyStopsServiceStub();
    stopDirectory = new StopDirectoryServiceStub();
    routeLines = new RouteLinesApiServiceStub();

    await TestBed.configureTestingModule({
      imports: [
        MapComponent,
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } })
      ],
      providers: [
        { provide: LeafletMapService, useValue: mapService },
        { provide: GeolocationService, useClass: GeolocationServiceStub },
        { provide: NearbyStopsService, useValue: nearbyStops },
        { provide: StopDirectoryService, useValue: stopDirectory },
        { provide: RouteOverlayFacade, useClass: RouteOverlayFacadeStub },
        { provide: RouteLinesApiService, useValue: routeLines },
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MapComponent);
  });

  it('keeps the latest viewport nearby stops when an older lookup resolves later', fakeAsync(() => {
    const firstStop = networkStop(7, 'sevilla-stop', DEFAULT_CENTER);
    const secondStop = networkStop(4, 'almeria-stop', SECOND_CENTER);
    const firstLookup = createDeferred<readonly NearbyStopResult[]>();
    const secondLookup = createDeferred<readonly NearbyStopResult[]>();

    nearbyStops.allStops = [firstStop, secondStop];
    stopDirectory.add(directoryStop(firstStop));
    stopDirectory.add(directoryStop(secondStop));
    nearbyStops.findClosestStops.and.callFake((coordinate: GeoCoordinateStub) =>
      coordinate.latitude === DEFAULT_CENTER.latitude ? firstLookup.promise : secondLookup.promise
    );

    fixture.detectChanges();
    flushMicrotasks();
    tick(VIEWPORT_DEBOUNCE_MS);

    mapService.handle.emitViewportSettled(SECOND_CENTER);
    tick(VIEWPORT_DEBOUNCE_MS);

    secondLookup.resolve([nearbyResult(secondStop)]);
    flushMicrotasks();
    firstLookup.resolve([nearbyResult(firstStop)]);
    flushMicrotasks();

    const access = fixture.componentInstance as unknown as MapViewportAccess;

    expect(nearbyStops.findClosestStops).toHaveBeenCalledWith(SECOND_CENTER);
    expect(access.viewportStopsStatus()).toBe('ready');
    expect(access.stops().map((stop) => stop.stopId)).toEqual(['almeria-stop']);
  }));

  it('falls back to official stop lines when the geographic CTAN request fails', fakeAsync(() => {
    const nearestStop = networkStop(4, 'almeria-stop', DEFAULT_CENTER);
    const fallbackLine: RouteLineSummary = {
      lineId: 'line-1',
      code: 'M-101',
      name: 'Almería - Poniente',
      mode: 'Autobús',
      priority: 0
    };

    nearbyStops.allStops = [nearestStop];
    nearbyStops.findClosestStops.and.returnValue(Promise.resolve([]));
    routeLines.getLinesNearLocation.and.returnValue(throwError(() => new Error('network')));
    routeLines.getLinesForStops.and.returnValue(of([fallbackLine]));

    fixture.detectChanges();
    flushMicrotasks();
    tick(VIEWPORT_DEBOUNCE_MS);
    flushMicrotasks();

    const access = fixture.componentInstance as unknown as MapViewportAccess;

    expect(routeLines.getLinesNearLocation).toHaveBeenCalledOnceWith(4, DEFAULT_CENTER);
    expect(routeLines.getLinesForStops).toHaveBeenCalledOnceWith(4, ['almeria-stop']);
    expect(access.focusedLinesStatus()).toBe('ready');
    expect(access.focusedLines()).toEqual([fallbackLine]);
  }));
});
