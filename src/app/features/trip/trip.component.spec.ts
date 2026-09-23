import { WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { TranslateCompiler, TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslateMessageFormatCompiler } from 'ngx-translate-messageformat-compiler';
import { of } from 'rxjs';
import {
  LineRouteWorkspaceService,
  LineRouteWorkspaceViewModel
} from '@domain/lines/line-route-workspace.service';
import { LiveTripService, LiveTripState } from '@domain/trip/live-trip.service';
import { buildTripStopTimes } from '@domain/trip/trip-progress.util';
import { TRIP_SESSION_STORAGE_KEY, TripSessionRecord } from '@domain/trip/trip-session.storage';
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
      'trip.recenter': 'Centrar la línea temporal en la parada actual',
      'trip.announcementNextStop': 'Siguiente parada: {stop}. Llegada en {time}.',
      'trip.backLabel': 'Volver',
      'countdown.minute': '{value, plural, one {# minuto} other {# minutos}}'
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
  arriveTime: '2026-09-21T14:40:00.000Z'
};

const WORKSPACE_STOPS = [
  { stopId: 'par-001', name: 'La Gangosa', latitude: 36.9, longitude: -2.0 },
  { stopId: 'par-050', name: 'Vícar Centro', latitude: 37.0, longitude: -2.1 },
  { stopId: 'par-999', name: 'Almería Estación', latitude: 37.1, longitude: -2.2 }
];

const POLYLINE = [
  { latitude: 36.9, longitude: -2.0 },
  { latitude: 37.0, longitude: -2.1 },
  { latitude: 37.1, longitude: -2.2 }
];

const STOP_TIMES = buildTripStopTimes(
  WORKSPACE_STOPS.map((stop) => ({ stopId: stop.stopId, latitude: stop.latitude, longitude: stop.longitude })),
  POLYLINE,
  new Date(SESSION.departTime),
  new Date(SESSION.arriveTime)
);

class LineRouteWorkspaceServiceStub {
  load(): ReturnType<LineRouteWorkspaceService['load']> {
    return of({
      detail: {
        lineId: SESSION.lineId,
        code: SESSION.lineCode,
        name: 'Línea 040',
        mode: 'Bus',
        coordinates: POLYLINE
      },
      stops: WORKSPACE_STOPS.map((stop) => ({
        stopId: stop.stopId,
        name: stop.name,
        latitude: stop.latitude,
        longitude: stop.longitude,
        municipalityId: 'mun-1'
      })),
      coordinates: POLYLINE,
      resolvedDirection: 1,
      originStopIds: [SESSION.originStopId],
      destinationStopIds: [SESSION.destinationStopId]
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
    stopTimes: []
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

describe('TripComponent', () => {
  let fixture: ComponentFixture<TripComponent>;
  let trips: LiveTripServiceStub;
  let router: Router;

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
        completed: false
      },
      etaMs: 14 * 60_000,
      stopTimes: STOP_TIMES,
      ...overrides
    };
  }

  async function create(): Promise<void> {
    trips = new LiveTripServiceStub();
    window.localStorage.setItem(TRIP_SESSION_STORAGE_KEY, JSON.stringify(SESSION));

    await TestBed.configureTestingModule({
      imports: [
        TripComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: TranslateTestingLoader },
          compiler: { provide: TranslateCompiler, useClass: TranslateMessageFormatCompiler }
        })
      ],
      providers: [
        provideRouter([]),
        { provide: LiveTripService, useValue: trips },
        { provide: LineRouteWorkspaceService, useClass: LineRouteWorkspaceServiceStub }
      ]
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
    expect(sticky.nativeElement.textContent).toContain('Llegada en 14 minutos');
  });

  it('renders the full timeline with passed, current and pending stops and partial fills', async () => {
    await create();

    const rows = fixture.debugElement.queryAll(By.css('.trip__stop'));
    expect(rows.length).toBe(3);
    expect(rows[0].nativeElement.className).toContain('trip__stop--passed');
    expect(rows[1].nativeElement.className).toContain('trip__stop--current');
    expect(rows[2].nativeElement.className).toContain('trip__stop--next');

    const fills = (Array.from(
      fixture.nativeElement.querySelectorAll('.trip__segment-fill')
    ) as HTMLElement[]).map((node) => node.style.height);
    expect(fills[0]).toBe('100%');
    expect(parseFloat(fills[1])).toBeGreaterThan(0);
    expect(parseFloat(fills[1])).toBeLessThan(100);
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
          completed: true
        },
        etaMs: 0
      })
    );
    fixture.detectChanges();

    const sticky = fixture.debugElement.query(By.css('.trip__sticky'));
    expect(sticky.nativeElement.textContent).toContain('Has llegado a Almería Estación');

    const live = fixture.debugElement.query(By.css('[aria-live="polite"]'));
    expect(live.nativeElement.textContent).toContain('Has llegado');
  });

  it('registers as layout content so the timeline keeps layout gutters and bottom clearance (E7)', async () => {
    await create();

    const section = fixture.debugElement.query(By.css('section.trip'));
    expect(section.nativeElement.classList.contains('app-layout__surface')).toBeTrue();
    expect(section.query(By.css('.utility-container .app-layout__body'))).not.toBeNull();
  });

  it('ends tracking and returns home from the footer action', async () => {
    await create();
    spyOn(router, 'navigate').and.resolveTo(true);

    fixture.debugElement.query(By.css('.trip__end')).nativeElement.click();

    expect(trips.stopSpy).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });
});
