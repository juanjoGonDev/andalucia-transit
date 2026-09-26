import { WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import {
  TranslateCompiler,
  TranslateLoader,
  TranslateModule,
  TranslateService,
} from '@ngx-translate/core';
import { TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler';
import { of } from 'rxjs';
import {
  LineRouteWorkspaceService,
  LineRouteWorkspaceViewModel,
} from '@domain/lines/line-route-workspace.service';
import { LiveTripService, LiveTripState } from '@domain/trip/live-trip.service';
import { buildTripStopTimes } from '@domain/trip/trip-progress.util';
import { TRIP_SESSION_STORAGE_KEY, TripSessionRecord } from '@domain/trip/trip-session.storage';
import { LeafletMapService, MapCreateOptions, MapHandle } from '@shared/map/leaflet-map.service';
import { RouteMapComponent } from '@shared/map/route-map/route-map.component';
import { TripComponent } from './trip.component';

class TranslateTestingLoader implements TranslateLoader {
  getTranslation(): ReturnType<TranslateLoader['getTranslation']> {
    return of({
      'navigation.trip': 'Viaje en directo',
      'trip.headline': 'Línea {lineCode} · hacia {destination}',
      'trip.eta': 'Llegada en {time}',
      'trip.locating': 'Buscando tu ubicación GPS…',
      'trip.unavailable': 'No se pudo obtener tu posición.',
      'trip.completed': 'Has llegado a {destination}',
      'trip.endTracking': 'Finalizar seguimiento',
      'trip.recenter': 'Centrar la vista en tu posición actual',
      'trip.announcementNextStop': 'Siguiente parada: {stop}. Llegada en {time}.',
      'trip.backLabel': 'Volver',
      'trip.viewToggle': 'Cambiar entre listado y mapa',
      'trip.viewList': 'Ver listado de paradas',
      'trip.viewMap': 'Ver mapa en tiempo real',
      'trip.mapLabel': 'Mapa del trayecto en tiempo real',
      'trip.groupStops': '{count, plural, one {# parada} other {# paradas}}',
      'trip.stopNumber': 'Parada {number}',
      'trip.stopEta': 'Llegada en {time}',
      'trip.stopPassed': 'Parada ya recorrida',
      'trip.stopCurrent': 'Estás en esta parada',
      'trip.stopInfoClose': 'Cerrar la información de la parada',
      'trip.viewStop': 'Ver parada',
      'countdown.hour': '{value, plural, one {# hora} other {# horas}}',
      'countdown.minute': '{value, plural, one {# minuto} other {# minutos}}',
      'countdown.second': '{value, plural, one {# segundo} other {# segundos}}',
    });
  }
}

const SESSION: TripSessionRecord = {
  departureId: 'service-7',
  consortiumId: 3,
  lineId: 'line-7',
  lineCode: '040',
  direction: 1,
  destination: 'Almería Estación',
  originStopId: 'par-001',
  destinationStopId: 'par-999',
  originName: 'La Gangosa',
  destinationName: 'Almería Estación',
  departTime: '2026-09-21T14:05:00.000Z',
  arriveTime: '2026-09-21T14:40:00.000Z',
};

const WORKSPACE_STOPS = [
  {
    stopId: 'par-001',
    name: 'La Gangosa',
    latitude: 36.9,
    longitude: -2.0,
    nucleusName: 'Vícar',
    nucleusOrdinal: 1,
  },
  {
    stopId: 'par-050',
    name: 'Vícar Centro',
    latitude: 37.0,
    longitude: -2.1,
    nucleusName: 'Vícar',
    nucleusOrdinal: 2,
  },
  {
    stopId: 'par-999',
    name: 'Almería Estación',
    latitude: 37.1,
    longitude: -2.2,
    nucleusName: 'Almería',
    nucleusOrdinal: 1,
  },
];

const POLYLINE = [
  { latitude: 36.9, longitude: -2.0 },
  { latitude: 37.0, longitude: -2.1 },
  { latitude: 37.1, longitude: -2.2 },
];

const PLAN_SPAN_MS =
  new Date(SESSION.arriveTime).getTime() - new Date(SESSION.departTime).getTime();

const STOP_TIMES = buildTripStopTimes(
  WORKSPACE_STOPS.map((stop) => ({
    stopId: stop.stopId,
    latitude: stop.latitude,
    longitude: stop.longitude,
  })),
  POLYLINE,
  new Date(SESSION.departTime),
  new Date(SESSION.arriveTime),
);

class LineRouteWorkspaceServiceStub {
  load(): ReturnType<LineRouteWorkspaceService['load']> {
    return of({
      detail: {
        lineId: SESSION.lineId,
        code: SESSION.lineCode,
        name: 'Línea 040',
        mode: 'Bus',
        coordinates: POLYLINE,
      },
      stops: WORKSPACE_STOPS.map((stop) => ({
        stopId: stop.stopId,
        name: stop.name,
        latitude: stop.latitude,
        longitude: stop.longitude,
        municipalityId: 'mun-1',
        nucleusName: stop.nucleusName,
        nucleusOrdinal: stop.nucleusOrdinal,
      })),
      coordinates: POLYLINE,
      resolvedDirection: 1,
      originStopIds: [SESSION.originStopId],
      destinationStopIds: [SESSION.destinationStopId],
    } as unknown as LineRouteWorkspaceViewModel);
  }
}

class LiveTripServiceStub {
  readonly state: WritableSignal<LiveTripState> = signal<LiveTripState>({
    status: 'idle',
    session: null,
    userPosition: null,
    accuracyMeters: null,
    progress: null,
    etaMs: 0,
    stopTimes: [],
    planSpanMs: 0,
    progressAt: null,
  });
  readonly startSpy = jasmine.createSpy('startTracking');
  readonly stopSpy = jasmine.createSpy('stopTracking');

  startTracking(session: TripSessionRecord): void {
    this.startSpy(session);
  }

  stopTracking(): void {
    this.stopSpy();
  }
}

class TripMapHandleStub implements MapHandle {
  readonly setView = jasmine.createSpy('setView');
  readonly panTo = jasmine.createSpy('panTo');
  readonly renderUserLocation = jasmine.createSpy('renderUserLocation');
  readonly renderStops = jasmine.createSpy('renderStops');
  readonly fitToCoordinates = jasmine.createSpy('fitToCoordinates');
  readonly restrictToCoordinates = jasmine.createSpy('restrictToCoordinates');
  readonly highlightStop = jasmine.createSpy('highlightStop');
  readonly centerStop = jasmine.createSpy('centerStop').and.returnValue(true);
  readonly focusStop = jasmine.createSpy('focusStop').and.returnValue(true);
  readonly renderRoutes = jasmine.createSpy('renderRoutes');
  readonly invalidateSize = jasmine.createSpy('invalidateSize');
  readonly destroy = jasmine.createSpy('destroy');

  onViewportSettled(): () => void {
    return () => undefined;
  }

  onUserPanStarted(): () => void {
    return () => undefined;
  }
}

class LeafletMapServiceStub {
  readonly handle = new TripMapHandleStub();
  readonly create = jasmine
    .createSpy<(container: HTMLElement, options: MapCreateOptions) => MapHandle>('create')
    .and.callFake(() => this.handle);
}

describe('TripComponent', () => {
  let fixture: ComponentFixture<TripComponent>;
  let trips: LiveTripServiceStub;
  let router: Router;
  let maps: LeafletMapServiceStub;

  function trackingState(overrides: Partial<LiveTripState> = {}): LiveTripState {
    return {
      status: 'tracking',
      session: SESSION,
      userPosition: { latitude: 37.0, longitude: -2.0998 },
      accuracyMeters: 12,
      progress: {
        fraction: 0.52,
        currentStopIndex: 1,
        nextStopIndex: 2,
        nextStop: STOP_TIMES[2],
        completed: false,
      },
      etaMs: 14 * 60_000,
      stopTimes: STOP_TIMES,
      planSpanMs: PLAN_SPAN_MS,
      progressAt: Date.now(),
      ...overrides,
    };
  }

  async function create(): Promise<void> {
    trips = new LiveTripServiceStub();
    maps = new LeafletMapServiceStub();
    window.localStorage.setItem(TRIP_SESSION_STORAGE_KEY, JSON.stringify(SESSION));

    await TestBed.configureTestingModule({
      imports: [
        TripComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: TranslateTestingLoader },
          compiler: { provide: TranslateCompiler, useClass: TranslateMessageFormatCompiler },
        }),
      ],
      providers: [
        provideRouter([]),
        { provide: LiveTripService, useValue: trips },
        { provide: LineRouteWorkspaceService, useClass: LineRouteWorkspaceServiceStub },
        { provide: LeafletMapService, useValue: maps },
      ],
    }).compileComponents();

    TestBed.inject(TranslateService).use('es');
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(TripComponent);
    fixture.detectChanges();
    trips.state.set(trackingState());
    fixture.detectChanges();
  }

  afterEach(() => {
    window.localStorage.removeItem(TRIP_SESSION_STORAGE_KEY);
    TestBed.resetTestingModule();
  });

  it('starts tracking from the stored session and shows the sticky destination with ETA', async () => {
    await create();

    expect(trips.startSpy).toHaveBeenCalled();

    const sticky = fixture.debugElement.query(By.css('.trip__sticky'));
    expect(sticky.nativeElement.textContent).toContain('Almería Estación');
    expect(sticky.nativeElement.textContent).toContain('Llegada en 16 minutos');
  });

  it('shows the same GPS-anchored countdown in the sticky and the destination row', async () => {
    await create();

    const stickyEta = fixture.debugElement.query(By.css('.trip__sticky-eta')).nativeElement
      .textContent;
    const rows = fixture.debugElement.queryAll(By.css('.trip__stop'));
    const destinationCountdown = rows[rows.length - 1]
      .query(By.css('.trip__stop-countdown'))
      .nativeElement.textContent.trim();

    // Both numbers derive from the same GPS projection of the trip progress:
    // the sticky header and the destination timeline row never disagree.
    expect(stickyEta).toContain('16 minutos');
    expect(destinationCountdown).toBe('16m');
  });

  it('announces the next stop with its own countdown, not the destination ETA', async () => {
    await create();

    // A first transition primes the announcer without speaking.
    trips.state.set(
      trackingState({
        progress: {
          fraction: 0.4,
          currentStopIndex: 0,
          nextStopIndex: 1,
          nextStop: STOP_TIMES[1],
          completed: false,
        },
      }),
    );
    fixture.detectChanges();

    // Reaching the next stop announces it with the countdown its row shows.
    trips.state.set(trackingState());
    fixture.detectChanges();

    const live = fixture.debugElement.query(By.css('[aria-live="polite"]'));
    expect(live.nativeElement.textContent).toContain('Siguiente parada: Almería Estación');
    expect(live.nativeElement.textContent).toContain('Llegada en 16 minutos');
  });

  it('places the recenter GPS button inside the sticky destination block', async () => {
    await create();

    const recenter = fixture.debugElement.query(By.css('.trip__sticky .trip__recenter'));
    expect(recenter).not.toBeNull();
  });

  it('renders the full timeline with passed, current and pending stops and partial fills', async () => {
    await create();

    const rows = fixture.debugElement.queryAll(By.css('.trip__stop'));
    expect(rows.length).toBe(3);
    expect(rows[0].nativeElement.className).toContain('trip__stop--passed');
    expect(rows[1].nativeElement.className).toContain('trip__stop--current');
    expect(rows[2].nativeElement.className).toContain('trip__stop--next');

    const fills = (
      Array.from(fixture.nativeElement.querySelectorAll('.trip__segment-fill')) as HTMLElement[]
    ).map((node) => node.style.height);
    expect(fills[0]).toBe('100%');
    expect(parseFloat(fills[1])).toBeGreaterThan(0);
    expect(parseFloat(fills[1])).toBeLessThan(100);
  });

  it('groups consecutive stops of the same nucleus under a single header with ordinals', async () => {
    await create();

    const headers = fixture.debugElement.queryAll(By.css('.trip__group-header'));
    expect(headers.length).toBe(1);
    expect(headers[0].nativeElement.textContent).toContain('Vícar');
    expect(headers[0].nativeElement.textContent).toContain('2 paradas');

    const ordinals = (
      Array.from(fixture.nativeElement.querySelectorAll('.trip__stop-ordinal')) as HTMLElement[]
    ).map((node) => node.textContent?.trim());
    expect(ordinals).toEqual(['1', '2']);
  });

  it('shows GPS-based countdowns for upcoming stops instead of timetable clocks', async () => {
    await create();

    const countdowns = (
      Array.from(fixture.nativeElement.querySelectorAll('.trip__stop-countdown')) as HTMLElement[]
    ).map((node) => node.textContent?.trim() ?? '');
    // Only the upcoming stop keeps a countdown; passed/current stops show icons.
    expect(countdowns.length).toBe(1);
    expect(countdowns[0]).toMatch(/^\d+(s|m|h)$/);
  });

  it('opens a stop information panel when a timeline row is tapped', async () => {
    await create();

    const rows = fixture.debugElement.queryAll(By.css('.trip__stop-content'));
    rows[2].nativeElement.click();
    fixture.detectChanges();

    const info = fixture.debugElement.query(By.css('.trip__info'));
    expect(info).not.toBeNull();
    expect(info.nativeElement.textContent).toContain('Almería Estación');
    expect(info.nativeElement.textContent).toContain('Parada 1');
  });

  it('announces the arrival when the trip completes', async () => {
    await create();

    trips.state.set(
      trackingState({
        status: 'completed',
        progress: {
          fraction: 1,
          currentStopIndex: 2,
          nextStopIndex: -1,
          nextStop: null,
          completed: true,
        },
        etaMs: 0,
      }),
    );
    fixture.detectChanges();

    const sticky = fixture.debugElement.query(By.css('.trip__sticky'));
    expect(sticky.nativeElement.textContent).toContain('Has llegado a Almería Estación');

    const live = fixture.debugElement.query(By.css('[aria-live="polite"]'));
    expect(live.nativeElement.textContent).toContain('Has llegado');
  });

  it('treats a zero countdown as arrival even while the status is still tracking', async () => {
    await create();

    trips.state.set(trackingState({ etaMs: 0 }));
    fixture.detectChanges();

    const sticky = fixture.debugElement.query(By.css('.trip__sticky'));
    expect(sticky.nativeElement.textContent).toContain('Has llegado a Almería Estación');
    expect(sticky.nativeElement.textContent).not.toContain('0 segundos');
  });

  it('registers as layout content so the timeline keeps layout gutters and bottom clearance (E7)', async () => {
    await create();

    const section = fixture.debugElement.query(By.css('section.trip'));
    expect(section.nativeElement.classList.contains('app-layout__surface')).toBeTrue();
    expect(section.nativeElement.classList.contains('app-layout__surface--plain')).toBeTrue();
    expect(section.nativeElement.classList.contains('app-layout__surface--hero')).toBeFalse();
    expect(section.query(By.css('.utility-container .app-layout__body'))).not.toBeNull();
  });

  it('ends tracking and returns home from the footer action', async () => {
    await create();
    spyOn(router, 'navigate').and.resolveTo(true);

    fixture.debugElement.query(By.css('.trip__end')).nativeElement.click();

    expect(trips.stopSpy).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('renders the live map with camera following enabled for the user position', async () => {
    await create();

    const viewButtons = fixture.debugElement.queryAll(By.css('.trip__view-button'));
    viewButtons[1].nativeElement.click();
    fixture.detectChanges();

    const map = fixture.debugElement.query(By.directive(RouteMapComponent));
    expect(map).not.toBeNull();
    expect((map.componentInstance as RouteMapComponent).followUser).toBeTrue();
    expect((map.componentInstance as RouteMapComponent).userPosition).toEqual({
      latitude: 37.0,
      longitude: -2.0998
    });
  });

  it('recenters the live map on the user position from the sticky action', async () => {
    await create();

    const viewButtons = fixture.debugElement.queryAll(By.css('.trip__view-button'));
    viewButtons[1].nativeElement.click();
    fixture.detectChanges();
    maps.handle.setView.calls.reset();

    fixture.debugElement.query(By.css('.trip__sticky .trip__recenter')).nativeElement.click();

    expect(maps.handle.setView).toHaveBeenCalledWith(
      { latitude: 37.0, longitude: -2.0998 },
      16,
      true
    );
  });
});
