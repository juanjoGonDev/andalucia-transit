import { TestBed } from '@angular/core/testing';
import { GeoCoordinate } from '@domain/utils/geo-distance.util';
import { RideStopsIndexService } from './ride-stops-index.service';

const CENTER: GeoCoordinate = { latitude: 36.719472, longitude: -4.363551 };

function chunkBody(stops: Record<string, unknown>[]): { stops: Record<string, unknown>[] } {
  return { stops };
}

function jsonResponse(body: unknown, status = 200): {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
} {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body)
  };
}

describe('RideStopsIndexService', () => {
  let service: RideStopsIndexService;
  let fetchSpy: jasmine.Spy;

  function locate(bodies: Record<number, unknown>): void {
    fetchSpy.and.callFake((url: string) => {
      const match = /consortium-(\d+)\.json/.exec(url);
      const id = match ? Number(match[1]) : 0;

      if (!(id in bodies)) {
        return Promise.resolve(jsonResponse(null, 404));
      }

      return Promise.resolve(jsonResponse(bodies[id]));
    });
  }

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RideStopsIndexService);
    fetchSpy = spyOn(window, 'fetch');
  });

  it('maps directory rows to candidates and filters them by radius', async () => {
    locate({
      1: chunkBody([
        {
          consortiumId: 1,
          stopId: 'A1',
          name: 'Near stop',
          location: { latitude: CENTER.latitude + 0.0005, longitude: CENTER.longitude }
        },
        {
          consortiumId: 1,
          stopId: 'A2',
          name: 'Far stop',
          location: { latitude: CENTER.latitude + 0.005, longitude: CENTER.longitude }
        }
      ])
    });

    const found = await service.stopsWithin(CENTER, 100);

    expect(found.length).toBe(1);
    expect(found[0].stopId).toBe('A1');
    expect(found[0].stopName).toBe('Near stop');
    expect(found[0].consortiumId).toBe(1);
  });

  it('scans with a 700 m radius by default', async () => {
    locate({
      1: chunkBody([
        {
          consortiumId: 1,
          stopId: 'IN',
          name: 'Inside',
          location: { latitude: CENTER.latitude + 0.005, longitude: CENTER.longitude }
        },
        {
          consortiumId: 1,
          stopId: 'OUT',
          name: 'Outside',
          location: { latitude: CENTER.latitude + 0.007, longitude: CENTER.longitude }
        }
      ])
    });

    const found = await service.stopsWithin(CENTER);

    expect(found.map((stop) => stop.stopId)).toEqual(['IN']);
  });

  it('treats missing chunks as empty and skips rows without coordinates', async () => {
    locate({
      2: chunkBody([{ consortiumId: 2, stopId: 'NO-GEO', name: 'No location' }]),
      3: chunkBody([
        {
          consortiumId: 3,
          stopId: 'OK',
          name: 'Located',
          location: { latitude: CENTER.latitude, longitude: CENTER.longitude + 0.0005 }
        }
      ])
    });

    const found = await service.stopsWithin(CENTER, 150);

    expect(found.map((stop) => stop.stopId)).toEqual(['OK']);
  });

  it('caches chunk payloads across scans within a session', async () => {
    locate({});

    await service.stopsWithin(CENTER);
    await service.stopsWithin(CENTER);

    expect(fetchSpy).toHaveBeenCalledTimes(9);
  });
});
