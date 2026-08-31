import { Observable, of } from 'rxjs';
import {
  NearbyStopsHttpClient,
  buildNearbyStopResults,
  loadNearbyStopRecords
} from '@core/services/nearby-stops.loader';

const INDEX_PATH = 'assets/data/stop-directory/index.json';
const FIRST_CHUNK_PATH = 'assets/data/stop-directory/chunks/consortium-1.json';
const SECOND_CHUNK_PATH = 'assets/data/stop-directory/chunks/consortium-2.json';

class NearbyStopsHttpClientStub implements NearbyStopsHttpClient {
  private readonly responses = new Map<string, unknown>();

  setResponse(url: string, response: unknown): void {
    this.responses.set(url, response);
  }

  get<T>(url: string): Observable<T> {
    if (!this.responses.has(url)) {
      throw new Error(`Unexpected test request: ${url}`);
    }

    return of(this.responses.get(url) as T);
  }
}

describe('nearby stops loader', () => {
  it('retains the same local stop id from different consortiums', async () => {
    const http = new NearbyStopsHttpClientStub();
    http.setResponse(INDEX_PATH, {
      chunks: [
        { path: 'chunks/consortium-1.json' },
        { path: 'chunks/consortium-2.json' }
      ]
    });
    http.setResponse(FIRST_CHUNK_PATH, {
      stops: [buildChunkStop(1, '119', 'Sevilla stop', 37.4, -5.9)]
    });
    http.setResponse(SECOND_CHUNK_PATH, {
      stops: [buildChunkStop(2, '119', 'Cádiz stop', 36.5, -6.2)]
    });

    const records = await loadNearbyStopRecords(http, INDEX_PATH);

    expect(records.length).toBe(2);
    expect(records.map((record) => [record.consortiumId, record.stopId])).toEqual([
      [1, '119'],
      [2, '119']
    ]);
  });

  it('keeps nearby results distinct when consortiums reuse a local stop id', () => {
    const records = [
      buildRecord(1, '119', 'Sevilla stop', 37.4, -5.9),
      buildRecord(2, '119', 'Cádiz stop', 37.4005, -5.9005)
    ];

    const results = buildNearbyStopResults(
      records,
      { latitude: 37.4, longitude: -5.9 },
      2,
      10_000
    );

    expect(results.length).toBe(2);
    expect(results.map((result) => result.consortiumId)).toEqual([1, 2]);
  });
});

function buildChunkStop(
  consortiumId: number,
  stopId: string,
  name: string,
  latitude: number,
  longitude: number
) {
  return {
    consortiumId,
    stopId,
    stopCode: stopId,
    name,
    municipality: name,
    municipalityId: String(consortiumId),
    nucleus: name,
    nucleusId: String(consortiumId),
    zone: null,
    location: { latitude, longitude }
  };
}

function buildRecord(
  consortiumId: number,
  stopId: string,
  name: string,
  latitude: number,
  longitude: number
) {
  return {
    consortiumId,
    stopId,
    stopCode: stopId,
    name,
    municipality: name,
    municipalityId: String(consortiumId),
    nucleus: name,
    nucleusId: String(consortiumId),
    zone: null,
    latitude,
    longitude
  };
}
