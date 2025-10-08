import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { StopDirectoryService, StopDirectoryOption } from './stop-directory.service';
import { APP_CONFIG_TOKEN } from '../../core/tokens/app-config.token';
import { APP_CONFIG } from '../../core/config';

interface DirectoryIndexResponse {
  readonly metadata: {
    readonly generatedAt: string;
    readonly timezone: string;
    readonly providerName: string;
    readonly consortiums: readonly DirectoryConsortiumSummary[];
    readonly totalStops: number;
  };
  readonly chunks: readonly DirectoryChunkDescriptor[];
  readonly searchIndex: readonly DirectorySearchEntry[];
}

interface DirectoryConsortiumSummary {
  readonly id: number;
  readonly name: string;
  readonly shortName: string;
}

interface DirectoryChunkDescriptor {
  readonly id: string;
  readonly consortiumId: number;
  readonly path: string;
  readonly stopCount: number;
}

interface DirectorySearchEntry {
  readonly stopId: string;
  readonly stopCode: string;
  readonly name: string;
  readonly municipality: string;
  readonly municipalityId: string;
  readonly nucleus: string;
  readonly nucleusId: string;
  readonly consortiumId: number;
  readonly chunkId: string;
}

interface DirectoryChunkResponse {
  readonly metadata: {
    readonly generatedAt: string;
    readonly timezone: string;
    readonly providerName: string;
    readonly consortiumId: number;
    readonly consortiumName: string;
    readonly stopCount: number;
  };
  readonly stops: readonly DirectoryChunkStop[];
}

interface DirectoryChunkStop {
  readonly consortiumId: number;
  readonly stopId: string;
  readonly stopCode: string;
  readonly name: string;
  readonly municipality: string;
  readonly municipalityId: string;
  readonly nucleus: string;
  readonly nucleusId: string;
  readonly zone: string | null;
  readonly location: {
    readonly latitude: number;
    readonly longitude: number;
  };
}

describe('StopDirectoryService', () => {
  let service: StopDirectoryService;
  let http: HttpTestingController;

  const indexResponse: DirectoryIndexResponse = {
    metadata: {
      generatedAt: '2025-02-01T05:00:00.000Z',
      timezone: 'Europe/Madrid',
      providerName: 'CTAN',
      consortiums: [{ id: 7, name: 'Jaén', shortName: 'CTJA' }],
      totalStops: 4
    },
    chunks: [
      {
        id: 'consortium-7',
        consortiumId: 7,
        path: 'chunks/consortium-7.json',
        stopCount: 5
      }
    ],
    searchIndex: [
      buildSearchEntry('01', 'Estación Central', 'Jaén', 'Jaén', 'nuc-j-01'),
      buildSearchEntry('02', 'Hospital Provincial', 'Jaén', 'Jaén Centro', 'nuc-j-02'),
      buildSearchEntry('02B', 'Hospital Provincial', 'Jaén', 'Jaén Centro', 'nuc-j-02'),
      buildSearchEntry('02C', 'Hospital Provincial', 'Martos', 'Martos', 'nuc-m-02'),
      buildSearchEntry('03', 'Museo Íbero', 'Jaén', 'Jaén', 'nuc-j-03')
    ]
  } satisfies DirectoryIndexResponse;

  const chunkResponse: DirectoryChunkResponse = {
    metadata: {
      generatedAt: '2025-02-01T05:00:00.000Z',
      timezone: 'Europe/Madrid',
      providerName: 'CTAN',
      consortiumId: 7,
      consortiumName: 'Jaén',
    stopCount: 5
    },
    stops: [
      buildChunkStop('01', 'Estación Central', 'Jaén', 'Jaén', 'nuc-j-01'),
      buildChunkStop('02', 'Hospital Provincial', 'Jaén', 'Jaén Centro', 'nuc-j-02'),
      buildChunkStop('02B', 'Hospital Provincial', 'Jaén', 'Jaén Centro', 'nuc-j-02'),
      buildChunkStop('02C', 'Hospital Provincial', 'Martos', 'Martos', 'nuc-m-02'),
      buildChunkStop('03', 'Museo Íbero', 'Jaén', 'Jaén', 'nuc-j-03')
    ]
  } satisfies DirectoryChunkResponse;

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

  afterEach(() => {
    http.verify();
  });

  it('returns an empty result when the query is shorter than the minimum length', async () => {
    const promise = firstValueFrom(service.searchStops({ query: 'a', limit: 5 }));

    expectIndexRequest();

    const options = await promise;
    expect(options).toEqual([]);
  });

  it('searches stops when the query meets the minimum length', async () => {
    const promise = firstValueFrom(service.searchStops({ query: 'hos', limit: 5 }));

    expectIndexRequest();

    const options = await promise;

    expect(options).toEqual([
      {
        id: '02',
        code: '02',
        name: 'Hospital Provincial',
        municipality: 'Jaén',
        municipalityId: 'mun-02',
        nucleus: 'Jaén Centro',
        nucleusId: 'nuc-j-02',
        consortiumId: 7,
        stopIds: ['02', '02B']
      },
      {
        id: '02C',
        code: '02C',
        name: 'Hospital Provincial',
        municipality: 'Martos',
        municipalityId: 'mun-02C',
        nucleus: 'Martos',
        nucleusId: 'nuc-m-02',
        consortiumId: 7,
        stopIds: ['02C']
      }
    ] satisfies readonly StopDirectoryOption[]);
  });

  it('returns include stop identifiers even without a long query', async () => {
    const promise = firstValueFrom(
      service.searchStops({ query: '', limit: 5, includeStopIds: ['01', '03'] })
    );

    expectIndexRequest();

    const options = await promise;

    expect(options).toEqual([
      {
        id: '01',
        code: '01',
        name: 'Estación Central',
        municipality: 'Jaén',
        municipalityId: 'mun-01',
        nucleus: 'Jaén',
        nucleusId: 'nuc-j-01',
        consortiumId: 7,
        stopIds: ['01']
      },
      {
        id: '03',
        code: '03',
        name: 'Museo Íbero',
        municipality: 'Jaén',
        municipalityId: 'mun-03',
        nucleus: 'Jaén',
        nucleusId: 'nuc-j-03',
        consortiumId: 7,
        stopIds: ['03']
      }
    ] satisfies readonly StopDirectoryOption[]);
  });

  it('collapses stops with identical names within the same municipality', async () => {
    const promise = firstValueFrom(service.searchStops({ query: 'hospital', limit: 5 }));

    expectIndexRequest();

    const options = await promise;

    expect(options.length).toBe(2);
    expect(options[0].stopIds).toEqual(['02', '02B']);
    expect(options[1].stopIds).toEqual(['02C']);
  });

  it('matches queries regardless of diacritics', async () => {
    const promise = firstValueFrom(service.searchStops({ query: 'ibero', limit: 5 }));

    expectIndexRequest();

    const options = await promise;

    expect(options).toEqual([
      {
        id: '03',
        code: '03',
        name: 'Museo Íbero',
        municipality: 'Jaén',
        municipalityId: 'mun-03',
        nucleus: 'Jaén',
        nucleusId: 'nuc-j-03',
        consortiumId: 7,
        stopIds: ['03']
      }
    ] satisfies readonly StopDirectoryOption[]);
  });

  it('excludes include-only stops when the query filters results', async () => {
    const promise = firstValueFrom(
      service.searchStops({ query: 'hospital', limit: 5, includeStopIds: ['01'] })
    );

    expectIndexRequest();

    const options = await promise;

    expect(options.every((option) => option.id !== '01')).toBeTrue();
  });

  it('loads full stop metadata on demand from chunk files', async () => {
    const promise = firstValueFrom(service.getStopById('03'));

    expectIndexRequest();
    expectChunkRequest('consortium-7');

    const stop = await promise;

    expect(stop?.stopId).toBe('03');
    expect(stop?.name).toBe('Museo Íbero');
    expect(stop?.location.latitude).toBeCloseTo(37.7);
  });

  it('returns the grouped option for a stop identifier', async () => {
    const promise = firstValueFrom(service.getOptionByStopId('02B'));

    expectIndexRequest();

    const option = await promise;

    expect(option).toEqual({
      id: '02',
      code: '02',
      name: 'Hospital Provincial',
      municipality: 'Jaén',
      municipalityId: 'mun-02',
      nucleus: 'Jaén Centro',
      nucleusId: 'nuc-j-02',
      consortiumId: 7,
      stopIds: ['02', '02B']
    } satisfies StopDirectoryOption);
  });

  function expectIndexRequest(): void {
    http
      .expectOne(APP_CONFIG.data.snapshots.stopDirectoryPath)
      .flush(indexResponse);
  }

  function expectChunkRequest(chunkId: string): void {
    const basePath = APP_CONFIG.data.snapshots.stopDirectoryPath.replace(/index\.json$/, '');
    http
      .expectOne(`${basePath}chunks/${chunkId}.json`)
      .flush(chunkResponse);
  }
});

function buildSearchEntry(
  stopId: string,
  name: string,
  municipality: string,
  nucleus: string,
  nucleusId: string
): DirectorySearchEntry {
  return {
    stopId,
    stopCode: stopId,
    name,
    municipality,
    municipalityId: `mun-${stopId}`,
    nucleus,
    nucleusId,
    consortiumId: 7,
    chunkId: 'consortium-7'
  } satisfies DirectorySearchEntry;
}

function buildChunkStop(
  stopId: string,
  name: string,
  municipality: string,
  nucleus: string,
  nucleusId: string
): DirectoryChunkStop {
  return {
    consortiumId: 7,
    stopId,
    stopCode: stopId,
    name,
    municipality,
    municipalityId: `mun-${stopId}`,
    nucleus,
    nucleusId,
    zone: null,
    location: {
      latitude: 37.7,
      longitude: -3.7
    }
  } satisfies DirectoryChunkStop;
}
