import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '@core/config';
import { APP_CONFIG_TOKEN } from '@core/tokens/app-config.token';
import {
  StopDirectoryOption,
  StopDirectoryRecord,
  StopDirectoryService
} from '@data/stops/stop-directory.service';

const INDEX_RESPONSE = {
  metadata: {
    generatedAt: '2026-08-27T00:00:00.000Z',
    timezone: 'Europe/Madrid',
    providerName: 'CTAN',
    consortiums: [
      { id: 7, name: 'Sevilla', shortName: 'CTAS' },
      { id: 8, name: 'Almería', shortName: 'CTAL' }
    ],
    totalStops: 2
  },
  chunks: [
    {
      id: 'consortium-7',
      consortiumId: 7,
      path: 'chunks/consortium-7.json',
      stopCount: 1
    },
    {
      id: 'consortium-8',
      consortiumId: 8,
      path: 'chunks/consortium-8.json',
      stopCount: 1
    }
  ],
  searchIndex: [
    {
      stopId: '119',
      stopCode: '119',
      name: 'Plaza Nueva',
      municipality: 'Sevilla',
      municipalityId: 'sevilla',
      nucleus: 'Centro',
      nucleusId: 'sevilla-centro',
      consortiumId: 7,
      chunkId: 'consortium-7'
    },
    {
      stopId: '119',
      stopCode: '119',
      name: 'Avenida del Mediterráneo',
      municipality: 'Almería',
      municipalityId: 'almeria',
      nucleus: 'Almería',
      nucleusId: 'almeria-centro',
      consortiumId: 8,
      chunkId: 'consortium-8'
    }
  ]
} as const;

const ALMERIA_CHUNK = {
  metadata: {
    generatedAt: '2026-08-27T00:00:00.000Z',
    timezone: 'Europe/Madrid',
    providerName: 'CTAN',
    consortiumId: 8,
    consortiumName: 'Almería',
    stopCount: 1
  },
  stops: [
    {
      consortiumId: 8,
      stopId: '119',
      stopCode: '119',
      name: 'Avenida del Mediterráneo',
      municipality: 'Almería',
      municipalityId: 'almeria',
      nucleus: 'Almería',
      nucleusId: 'almeria-centro',
      zone: 'A',
      location: { latitude: 36.834, longitude: -2.463 }
    }
  ]
} as const;

describe('StopDirectoryService canonical identity', () => {
  let service: StopDirectoryService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        StopDirectoryService,
        { provide: APP_CONFIG_TOKEN, useValue: APP_CONFIG }
      ]
    });

    service = TestBed.inject(StopDirectoryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('does not resolve an ambiguous local stop id to an arbitrary consortium', () => {
    let emitted: StopDirectoryRecord | null | undefined;
    service.getStopById('119').subscribe((record) => {
      emitted = record;
    });

    flushIndex();

    http.expectNone(chunkUrl('consortium-7'));
    http.expectNone(chunkUrl('consortium-8'));
    expect(emitted).toBeNull();
  });

  it('does not expose an ambiguous local stop id as a canonical option', () => {
    let emitted: StopDirectoryOption | null | undefined;
    service.getOptionByStopId('119').subscribe((option) => {
      emitted = option;
    });

    flushIndex();

    expect(emitted).toBeNull();
  });

  it('still resolves the same local id when consortium identity is supplied', () => {
    let emitted: StopDirectoryRecord | null | undefined;
    service.getStopBySignature(8, '119').subscribe((record) => {
      emitted = record;
    });

    flushIndex();
    http.expectOne(chunkUrl('consortium-8')).flush(ALMERIA_CHUNK);

    expect(emitted).toEqual(
      jasmine.objectContaining({
        consortiumId: 8,
        stopId: '119',
        municipality: 'Almería'
      })
    );
  });

  function flushIndex(): void {
    http.expectOne(APP_CONFIG.data.snapshots.stopDirectoryPath).flush(INDEX_RESPONSE);
  }

  function chunkUrl(chunkId: string): string {
    const basePath = APP_CONFIG.data.snapshots.stopDirectoryPath.replace(/index\.json$/, '');
    return `${basePath}chunks/${chunkId}.json`;
  }
});
