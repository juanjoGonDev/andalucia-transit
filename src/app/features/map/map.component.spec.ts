import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

import { MapComponent } from './map.component';
import {
  LeafletMapService,
  MapCreateOptions,
  MapHandle,
  MapStopMarker
} from '../../shared/map/leaflet-map.service';
import { GeolocationService } from '../../core/services/geolocation.service';
import { NearbyStopResult, NearbyStopsService } from '../../core/services/nearby-stops.service';
import { StopDirectoryRecord, StopDirectoryService } from '../../data/stops/stop-directory.service';

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
  destroyed = false;
  invalidationCount = 0;

  setView(center: GeoCoordinateStub, zoom: number): void {
    this.viewCenters.push(center);
    this.viewZoomLevels.push(zoom);
  }

  renderUserLocation(coordinate: GeoCoordinateStub): void {
    this.userLocations.push(coordinate);
  }

  renderStops(stops: readonly MapStopMarker[]): void {
    (this.renderedStops as MapStopMarker[][]).push([...stops]);
  }

  fitToCoordinates(points: readonly GeoCoordinateStub[]): void {
    (this.focusedPoints as GeoCoordinateStub[][]).push([...points]);
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
  results: readonly NearbyStopResult[] = [];

  async findClosestStops(): Promise<readonly NearbyStopResult[]> {
    return this.results;
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

interface MapComponentAccess {
  locate(): Promise<void>;
  stops(): readonly MapStopViewStub[];
  errorKey(): string | null;
}

interface MapStopViewStub {
  readonly id: string;
  readonly commands: readonly string[];
}

interface GeoCoordinateStub {
  readonly latitude: number;
  readonly longitude: number;
}

const DEFAULT_CENTER = { latitude: 37.389092, longitude: -5.984459 };
const DEFAULT_ZOOM = 7;
const MAP_MIN_ZOOM = 6;
const MAP_MAX_ZOOM = 17;
const NEARBY_DISTANCE_METERS = 150;

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

describe('MapComponent', () => {
  let fixture: ComponentFixture<MapComponent>;
  let component: MapComponent;
  let mapService: LeafletMapServiceStub;
  let geolocation: GeolocationServiceStub;
  let nearbyStops: NearbyStopsServiceStub;
  let stopDirectory: StopDirectoryServiceStub;

  beforeEach(async () => {
    spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });

    mapService = new LeafletMapServiceStub();
    geolocation = new GeolocationServiceStub();
    nearbyStops = new NearbyStopsServiceStub();
    stopDirectory = new StopDirectoryServiceStub();

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
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MapComponent);
    component = fixture.componentInstance;
  });

  it('creates the map view on init with default configuration', async () => {
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
      { id: 'sevilla:001', name: stopRecord.name, distanceInMeters: NEARBY_DISTANCE_METERS }
    ];
    stopDirectory.addRecord(stopRecord);

    fixture.detectChanges();
    await fixture.whenStable();

    const access = component as unknown as MapComponentAccess;
    await access.locate();

    expect(mapService.handle.userLocations.length).toBe(1);
    expect(mapService.handle.renderedStops.at(-1)).toEqual([
      { id: 'sevilla:001', coordinate: stopRecord.location }
    ]);
    expect(access.stops().length).toBe(1);
    expect(access.stops()[0]?.commands).toEqual(['/', 'stop-detail', 'sevilla:001']);
  });

  it('surfaces an error key when location permission is denied', async () => {
    geolocation.failWith(permissionDeniedError());

    fixture.detectChanges();
    await fixture.whenStable();

    const access = component as unknown as MapComponentAccess;
    await access.locate();

    expect(access.errorKey()).toBe('map.errors.permissionDenied');
    expect(mapService.handle.renderedStops.length).toBe(0);
  });
});
