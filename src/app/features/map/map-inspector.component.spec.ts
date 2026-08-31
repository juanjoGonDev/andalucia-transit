import { PLATFORM_ID, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { Observable, lastValueFrom, of, throwError } from 'rxjs';
import { GeolocationService } from '@core/services/geolocation.service';
import { NearbyStopRecord, NearbyStopsService } from '@core/services/nearby-stops.service';
import {
  RouteLineSummary,
  RouteLinesApiService
} from '@data/route-search/route-lines-api.service';
import { StopDirectoryService } from '@data/stops/stop-directory.service';
import { RouteOverlayFacade, RouteOverlayState } from '@domain/map/route-overlay.facade';
import { GeoCoordinate } from '@domain/utils/geo-distance.util';
import { MapComponent } from '@features/map/map.component';
import { LeafletMapService } from '@shared/map/leaflet-map.service';

class EmptyTranslateLoader implements TranslateLoader {
  getTranslation(): Observable<Record<string, string>> {
    return of({});
  }
}

class RouteLinesApiStub {
  readonly getLinesNearLocation = jasmine
    .createSpy('getLinesNearLocation')
    .and.returnValue(throwError(() => new Error('geographic line lookup unavailable')));
  readonly getLinesForStops = jasmine
    .createSpy('getLinesForStops')
    .and.returnValue(of<readonly RouteLineSummary[]>([]));
}

interface FocusedLinesLoadState {
  readonly status: 'idle' | 'loading' | 'ready' | 'error';
  readonly consortiumId: number | null;
  readonly lines: readonly RouteLineSummary[];
  readonly errorKey: string | null;
}

interface MapFocusedLinesAccess {
  networkStopRecords: readonly NearbyStopRecord[];
  readonly focusedLinesErrorKey: WritableSignal<string | null>;
  loadFocusedLines(center: GeoCoordinate): Observable<FocusedLinesLoadState>;
}

const IDLE_OVERLAY_STATE: RouteOverlayState = {
  status: 'idle',
  routes: [],
  errorKey: null,
  selectionKey: null,
  selectionSummary: null
};

const FOCUSED_LINE: RouteLineSummary = Object.freeze({
  lineId: '380',
  code: 'M-380',
  name: 'Almería - Aguadulce - El Ejido',
  mode: 'Autobús',
  priority: 0
});

const MAP_CENTER: GeoCoordinate = Object.freeze({ latitude: 36.817, longitude: -2.58 });

const NETWORK_STOP: NearbyStopRecord = Object.freeze({
  consortiumId: 4,
  stopId: '625',
  stopCode: '625',
  name: 'La Gangosa',
  municipality: 'Vícar',
  municipalityId: 'municipality-vicar',
  nucleus: 'La Gangosa',
  nucleusId: 'nucleus-la-gangosa',
  zone: null,
  latitude: MAP_CENTER.latitude,
  longitude: MAP_CENTER.longitude
});

describe('MapComponent inspector', () => {
  let fixture: ComponentFixture<MapComponent>;
  let routeLines: RouteLinesApiStub;

  beforeEach(async () => {
    routeLines = new RouteLinesApiStub();

    await TestBed.configureTestingModule({
      imports: [
        MapComponent,
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: EmptyTranslateLoader } })
      ],
      providers: [
        { provide: LeafletMapService, useValue: {} },
        { provide: GeolocationService, useValue: {} },
        { provide: NearbyStopsService, useValue: { getAllStops: async () => [] } },
        { provide: StopDirectoryService, useValue: {} },
        { provide: RouteLinesApiService, useValue: routeLines },
        {
          provide: RouteOverlayFacade,
          useValue: {
            watchOverlay: () => of(IDLE_OVERLAY_STATE),
            refresh: jasmine.createSpy('refresh')
          }
        },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate').and.resolveTo(true) } },
        { provide: PLATFORM_ID, useValue: 'server' }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MapComponent);
    fixture.detectChanges();
  });

  it('starts every inspector section closed behind an accessible icon trigger', () => {
    const inspectors = Array.from(
      fixture.nativeElement.querySelectorAll('details.map__inspector') as NodeListOf<HTMLDetailsElement>
    );

    expect(inspectors).toHaveSize(3);
    expect(inspectors.every((inspector) => !inspector.open)).toBeTrue();
    expect(
      inspectors.every((inspector) => Boolean(inspector.querySelector('summary')?.getAttribute('aria-label')))
    ).toBeTrue();
  });

  it('keeps only one inspector section expanded at a time', () => {
    const inspectors = Array.from(
      fixture.nativeElement.querySelectorAll('details.map__inspector') as NodeListOf<HTMLDetailsElement>
    );
    const firstTrigger = inspectors[0]?.querySelector('summary') as HTMLElement | null;
    const secondTrigger = inspectors[1]?.querySelector('summary') as HTMLElement | null;

    firstTrigger?.click();
    fixture.detectChanges();
    expect(inspectors[0]?.open).toBeTrue();

    secondTrigger?.click();
    fixture.detectChanges();

    expect(inspectors[0]?.open).toBeFalse();
    expect(inspectors[1]?.open).toBeTrue();
    expect(inspectors[2]?.open).toBeFalse();
  });

  it('recovers focused lines from the nearest stop when geographic lookup fails', async () => {
    routeLines.getLinesForStops.and.returnValue(of([FOCUSED_LINE]));
    const access = fixture.componentInstance as unknown as MapFocusedLinesAccess;
    access.networkStopRecords = [NETWORK_STOP];

    const state = await lastValueFrom(access.loadFocusedLines(MAP_CENTER));

    expect(routeLines.getLinesNearLocation).toHaveBeenCalledOnceWith(4, MAP_CENTER);
    expect(routeLines.getLinesForStops).toHaveBeenCalledOnceWith(4, ['625']);
    expect(state).toEqual({
      status: 'ready',
      consortiumId: 4,
      lines: [FOCUSED_LINE],
      errorKey: null
    });
  });

  it('renders terminal focused-line failures as a toast instead of inspector content', () => {
    const access = fixture.componentInstance as unknown as MapFocusedLinesAccess;
    access.focusedLinesErrorKey.set('map.focusedLines.error');
    fixture.detectChanges();

    const toast = fixture.nativeElement.querySelector('.map__toast--error') as HTMLElement | null;
    const inlineError = fixture.nativeElement.querySelector(
      '.map__inspector--lines .map__panel-error'
    ) as HTMLElement | null;
    const retryButton = toast?.querySelector('button') as HTMLButtonElement | null;

    expect(toast).not.toBeNull();
    expect(toast?.getAttribute('role')).toBe('alert');
    expect(retryButton).not.toBeNull();
    expect(inlineError).toBeNull();
  });
});
