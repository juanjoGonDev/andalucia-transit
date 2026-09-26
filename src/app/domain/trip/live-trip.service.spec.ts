import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { GeolocationService } from '@core/services/geolocation.service';
import { GeoCoordinate } from '@domain/utils/geo-distance.util';
import { LiveTripService, TRIP_ETA_TICK_MS } from './live-trip.service';
import { TRIP_SESSION_STORAGE_KEY, TripSessionRecord } from './trip-session.storage';

const NOW = new Date('2026-09-21T14:10:00.000Z');

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

const STOPS: readonly (GeoCoordinate & { stopId: string })[] = [
  { stopId: 'par-001', latitude: 36.9, longitude: -2.0 },
  { stopId: 'par-050', latitude: 37.0, longitude: -2.1 },
  { stopId: 'par-999', latitude: 37.1, longitude: -2.2 },
];

const POLYLINE: readonly GeoCoordinate[] = [
  { latitude: 36.9, longitude: -2.0 },
  { latitude: 37.0, longitude: -2.1 },
  { latitude: 37.1, longitude: -2.2 },
];

class GeolocationServiceStub {
  positionHandler: ((position: GeolocationPosition) => void) | null = null;
  errorHandler: ((error: GeolocationPositionError) => void) | null = null;
  stopCalls = 0;
  lastOptions: PositionOptions | undefined;

  watchPosition(
    onPosition: (position: GeolocationPosition) => void,
    onError?: (error: GeolocationPositionError) => void,
    options?: PositionOptions,
  ): () => void {
    this.positionHandler = onPosition;
    this.errorHandler = onError ?? null;
    this.lastOptions = options;
    return () => {
      this.stopCalls += 1;
    };
  }

  emit(latitude: number, longitude: number, accuracy = 12): void {
    this.positionHandler?.({
      coords: {
        latitude,
        longitude,
        accuracy,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    } as GeolocationPosition);
  }
}

describe('LiveTripService', () => {
  let gps: GeolocationServiceStub;

  function configure(): LiveTripService {
    gps = new GeolocationServiceStub();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: GeolocationService, useValue: gps }],
    });
    return TestBed.inject(LiveTripService);
  }

  afterEach(() => window.localStorage.removeItem(TRIP_SESSION_STORAGE_KEY));

  it('starts a high-accuracy watch, persists the session and waits for a fix', () => {
    const service = configure();

    service.startTracking(SESSION, STOPS, POLYLINE);

    expect(window.localStorage.getItem(TRIP_SESSION_STORAGE_KEY)).not.toBeNull();
    expect(gps.lastOptions?.enableHighAccuracy).toBeTrue();
    const state = service.state();
    expect(state.status).toBe('locating');
    expect(state.progress).toBeNull();
  });

  it('tracks progress between stops with an ETA anchored to the GPS position', () => {
    spyOn(Date, 'now').and.callFake(() => NOW.getTime());
    const service = configure();
    service.startTracking(SESSION, STOPS, POLYLINE);

    gps.emit(37.0, -2.1003);

    const state = service.state();
    const planSpanMs =
      new Date(SESSION.arriveTime).getTime() - new Date(SESSION.departTime).getTime();
    expect(state.status).toBe('tracking');
    expect(state.progress?.fraction).toBeGreaterThan(0.45);
    expect(state.progress?.fraction).toBeLessThan(0.55);
    expect(state.progress?.nextStop?.stopId).toBe('par-999');
    // The countdown follows the projected position, not the raw timetable: about half
    // of the planned span remains when the fix sits halfway along the polyline.
    expect(state.planSpanMs).toBe(planSpanMs);
    expect(state.progressAt).toBe(NOW.getTime());
    expect(state.etaMs).toBeGreaterThan(0.4 * planSpanMs);
    expect(state.etaMs).toBeLessThan(0.6 * planSpanMs);
    expect(state.accuracyMeters).toBe(12);
    service.stopTracking();
  });

  it('completes the trip when a fix lands within the arrival radius of the destination', () => {
    const service = configure();
    service.startTracking(SESSION, STOPS, POLYLINE);

    gps.emit(37.10005, -2.20005);

    const state = service.state();
    expect(state.status).toBe('completed');
    expect(state.progress?.completed).toBeTrue();
    expect(state.etaMs).toBe(0);
    expect(window.localStorage.getItem(TRIP_SESSION_STORAGE_KEY)).toBeNull();
  });

  it('marks the trip completed at the destination and clears the stored session', () => {
    const service = configure();
    service.startTracking(SESSION, STOPS, POLYLINE);

    gps.emit(37.1, -2.2);

    expect(service.state().status).toBe('completed');
    expect(service.state().progress?.completed).toBeTrue();
    expect(window.localStorage.getItem(TRIP_SESSION_STORAGE_KEY)).toBeNull();
  });

  it('degrades gracefully when the device cannot deliver GPS', () => {
    const service = configure();
    service.startTracking(SESSION, STOPS, POLYLINE);

    gps.errorHandler?.({ code: 1, message: 'denied' } as GeolocationPositionError);

    expect(service.state().status).toBe('unavailable');
    expect(service.state().progress).toBeNull();
    expect(service.state().etaMs).toBeGreaterThanOrEqual(0);
    service.stopTracking();
  });

  it('updates the ETA on a regular tick so the countdown keeps moving', fakeAsync(() => {
    const service = configure();
    const virtualStart = new Date(Date.now());
    const tickingSession: TripSessionRecord = {
      ...SESSION,
      departTime: virtualStart.toISOString(),
      arriveTime: new Date(virtualStart.getTime() + 30 * 60_000).toISOString(),
    };
    service.startTracking(tickingSession, STOPS, POLYLINE);
    const initial = service.state().etaMs;

    tick(TRIP_ETA_TICK_MS);

    expect(service.state().etaMs).toBe(initial - TRIP_ETA_TICK_MS);
    service.stopTracking();
  }));

  it('stops the watch and clears the session when tracking ends', () => {
    const service = configure();
    service.startTracking(SESSION, STOPS, POLYLINE);

    service.stopTracking();

    expect(gps.stopCalls).toBe(1);
    expect(service.state().status).toBe('idle');
    expect(window.localStorage.getItem(TRIP_SESSION_STORAGE_KEY)).toBeNull();
  });
});
