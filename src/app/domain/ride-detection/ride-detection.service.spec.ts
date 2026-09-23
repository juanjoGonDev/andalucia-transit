import { TestBed } from '@angular/core/testing';
import { RideLineDirectionCandidate } from '@domain/ride-detection/ride-candidates.util';
import { RideDetectionService } from './ride-detection.service';

const USER = { latitude: 36.719472, longitude: -4.363551 };

function fixturePosition(speed: number, bearing: number, t: number, offset = 0): GeolocationPosition {
  return {
    coords: {
      speed,
      heading: bearing,
      latitude: USER.latitude + offset,
      longitude: USER.longitude + offset * 0.8,
      accuracy: 15,
      altitude: null,
      altitudeAccuracy: null,
      toJSON: () => ({})
    } as GeolocationCoordinates,
    timestamp: t
  } as GeolocationPosition;
}

describe('RideDetectionService', () => {
  let service: RideDetectionService;
  let watchHandlers: ((position: GeolocationPosition) => void)[];

  beforeEach(() => {
    watchHandlers = [];

    spyOn(navigator.geolocation, 'watchPosition').and.callFake((onPosition) => {
      if (onPosition) {
        watchHandlers.push(onPosition as (position: GeolocationPosition) => void);
      }
      return 7;
    });
    spyOn(navigator.geolocation, 'clearWatch');

    // Karma Chromium exposes navigator.permissions; grant geolocation so start() proceeds.
    spyOn(navigator.permissions, 'query').and.resolveTo({
      state: 'granted'
    } as PermissionStatus);

    TestBed.configureTestingModule({});
    service = TestBed.inject(RideDetectionService);
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  function emit(samples: GeolocationPosition[]): void {
    for (const sample of samples) {
      for (const handler of watchHandlers) {
        handler(sample);
      }
    }
  }

  it('stays idle for slow movement', async () => {
    service.configure({
      stopsIndex: jasmine.createSpy('stopsIndex').and.resolveTo([])
    });
    await service.start();

    const now = Date.now();
    emit([
      fixturePosition(1, 90, now - 8_000),
      fixturePosition(1.4, 90, now - 6_000),
      fixturePosition(0.8, 90, now - 4_000),
      fixturePosition(1.1, 90, now - 2_000),
      fixturePosition(1, 90, now)
    ]);

    expect(service.phase()).toBe('idle');
  });

  it('proposes candidates when vehicle motion persists over the corridor', async () => {
    const stopsIndex = jasmine.createSpy('stopsIndex').and.resolveTo([
      {
        consortiumId: 3,
        stopId: '10',
        stopName: 'Cercanía',
        location: USER,
        distanceMeters: 30
      }
    ]);

    service.configure({
      stopsIndex,
      directions: {
        fetchDirections: async (): Promise<readonly RideLineDirectionCandidate[]> => [
          {
            lineId: 'line-e',
            lineCode: 'M-370',
            direction: 1,
            destinationName: 'Este',
            upcomingStops: []
          }
        ]
      }
    });

    await service.start();

    const now = Date.now();
    const samples = [0, 1, 2, 4, 7, 10].map((index, i) =>
      fixturePosition(12, 90, now - (6 - i) * 5_000, 0.0001 * index)
    );
    emit(samples);

    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(service.phase()).toBe('proposing');
    expect(service.proposals().length).toBeGreaterThan(0);
    expect(service.proposals()[0]?.lineCode).toBe('M-370');
  });

  it('clears proposals on dismiss and keeps the watcher alive', async () => {
    service.configure({
      stopsIndex: jasmine.createSpy('stopsIndex').and.resolveTo([
        {
          consortiumId: 3,
          stopId: '10',
          stopName: 'Cercanía',
          location: USER,
          distanceMeters: 30
        }
      ]),
      directions: {
        fetchDirections: jasmine
          .createSpy('fetchDirections')
          .and.resolveTo([
            {
              lineId: 'line-e',
              lineCode: 'M-370',
              direction: 1,
              destinationName: 'Este',
              upcomingStops: []
            }
          ])
      }
    });
    await service.start();

    const now = Date.now();
    emit([0, 1, 2, 4, 7].map((index, i) => fixturePosition(12, 90, now - (5 - i) * 5_000, 0.0001 * index)));

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(service.phase()).toBe('proposing');

    service.dismiss();

    expect(service.phase()).toBe('idle');
    expect(service.proposals().length).toBe(0);
  });
});
