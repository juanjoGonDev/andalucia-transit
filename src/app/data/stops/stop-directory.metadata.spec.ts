import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '@core/config';
import { APP_CONFIG_TOKEN } from '@core/tokens/app-config.token';
import { StopDirectoryService } from '@data/stops/stop-directory.service';

const CONSORTIUM_ID = 8;
const SENTINEL_STOP_ID = '79';
const LEGITIMATE_STOP_ID = '80';
const CHUNK_ID = 'consortium-8';
const CHUNK_PATH = `chunks/${CHUNK_ID}.json`;

describe('StopDirectoryService stop metadata', () => {
  let service: StopDirectoryService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [StopDirectoryService, { provide: APP_CONFIG_TOKEN, useValue: APP_CONFIG }]
    });

    service = TestBed.inject(StopDirectoryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('removes the CTAN NN sentinel from search options', async () => {
    const resultPromise = firstValueFrom(service.searchStops({ query: 'prado', limit: 5 }));

    flushIndex();

    const options = await resultPromise;

    expect(options).toHaveSize(1);
    expect(options[0]?.id).toBe(`${CONSORTIUM_ID}:${SENTINEL_STOP_ID}`);
    expect(options[0]?.nucleus).toBe('');
  });

  it('does not let the raw NN sentinel create a search match', async () => {
    const resultPromise = firstValueFrom(service.searchStops({ query: 'nn', limit: 5 }));

    flushIndex();

    const options = await resultPromise;

    expect(options).toEqual([]);
  });

  it('normalizes the sentinel in full chunk records while preserving real nuclei', async () => {
    const sentinelPromise = firstValueFrom(
      service.getStopBySignature(CONSORTIUM_ID, SENTINEL_STOP_ID)
    );
    const legitimatePromise = firstValueFrom(
      service.getStopBySignature(CONSORTIUM_ID, LEGITIMATE_STOP_ID)
    );

    flushIndex();
    flushChunk();

    const [sentinel, legitimate] = await Promise.all([sentinelPromise, legitimatePromise]);

    expect(sentinel?.nucleus).toBe('');
    expect(legitimate?.nucleus).toBe('Centro');
  });

  function flushIndex(): void {
    http.expectOne(APP_CONFIG.data.snapshots.stopDirectoryPath).flush({
      metadata: {
        generatedAt: '2026-08-31T05:00:00.000Z',
        timezone: 'Europe/Madrid',
        providerName: 'CTAN',
        consortiums: [{ id: CONSORTIUM_ID, name: 'Almería', shortName: 'CTAL' }],
        totalStops: 2
      },
      chunks: [
        {
          id: CHUNK_ID,
          consortiumId: CONSORTIUM_ID,
          path: CHUNK_PATH,
          stopCount: 2
        }
      ],
      searchIndex: [
        createSearchEntry(SENTINEL_STOP_ID, 'La Gangosa - Av. Prado', ' NN '),
        createSearchEntry(LEGITIMATE_STOP_ID, 'Plaza Central', 'Centro')
      ]
    });
  }

  function flushChunk(): void {
    const basePath = APP_CONFIG.data.snapshots.stopDirectoryPath.replace(/index\.json$/, '');
    http.expectOne(`${basePath}${CHUNK_PATH}`).flush({
      metadata: {
        generatedAt: '2026-08-31T05:00:00.000Z',
        timezone: 'Europe/Madrid',
        providerName: 'CTAN',
        consortiumId: CONSORTIUM_ID,
        consortiumName: 'Almería',
        stopCount: 2
      },
      stops: [
        createChunkEntry(SENTINEL_STOP_ID, 'La Gangosa - Av. Prado', ' nN '),
        createChunkEntry(LEGITIMATE_STOP_ID, 'Plaza Central', 'Centro')
      ]
    });
  }
});

function createSearchEntry(stopId: string, name: string, nucleus: string) {
  return {
    stopId,
    stopCode: stopId,
    name,
    municipality: 'Vícar',
    municipalityId: 'vicar',
    nucleus,
    nucleusId: `nucleus-${stopId}`,
    consortiumId: CONSORTIUM_ID,
    chunkId: CHUNK_ID
  };
}

function createChunkEntry(stopId: string, name: string, nucleus: string) {
  return {
    consortiumId: CONSORTIUM_ID,
    stopId,
    stopCode: stopId,
    name,
    municipality: 'Vícar',
    municipalityId: 'vicar',
    nucleus,
    nucleusId: `nucleus-${stopId}`,
    zone: null,
    location: { latitude: 36.831, longitude: -2.642 }
  };
}
