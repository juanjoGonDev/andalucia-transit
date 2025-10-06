import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { StopDirectoryService, StopDirectoryOption, StopSearchRequest } from './stop-directory.service';
import { APP_CONFIG_TOKEN } from '../../core/tokens/app-config.token';
import { APP_CONFIG } from '../../core/config';

interface DirectoryResponse {
  readonly metadata: {
    readonly generatedAt: string;
    readonly timezone: string;
  };
  readonly stops: readonly DirectoryEntry[];
}

interface DirectoryEntry {
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

  const directoryResponse: DirectoryResponse = {
    metadata: {
      generatedAt: '2025-01-01T05:00:00.000Z',
      timezone: 'Europe/Madrid'
    },
    stops: [
      buildEntry('01', 'Estación De Autobuses De Jaén', 'Jaén', 'Jaén'),
      buildEntry('02', 'Plaza De La Constitución', 'Jaén', 'Jaén'),
      buildEntry('03', 'Hospital Universitario', 'La Guardia de Jaén', 'Jaén'),
      buildEntry('04', 'Museo Íbero', 'Jaén', 'Jaén')
    ]
  };

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

  it('returns stops sorted by name when no query is provided', async () => {
    const request: StopSearchRequest = { query: '', limit: 3 };
    const promise = firstValueFrom(service.searchStops(request));

    expectDirectoryRequest();

    const results = await promise;

    expect(results.map((stop) => stop.name)).toEqual([
      'Estación De Autobuses De Jaén',
      'Hospital Universitario',
      'Museo Íbero'
    ]);
  });

  it('filters stops using the provided query, include and exclude filters', async () => {
    const request: StopSearchRequest = {
      query: 'jaén',
      limit: 5,
      includeStopIds: ['01', '02', '03'],
      excludeStopId: '02'
    };
    const promise = firstValueFrom(service.searchStops(request));

    expectDirectoryRequest();

    const results = await promise;

    expect(results).toEqual([
      toOption(directoryResponse.stops[0]),
      toOption(directoryResponse.stops[2])
    ]);
  });

  it('returns an empty array when limit is zero or fewer', async () => {
    const promise = firstValueFrom(service.searchStops({ query: '', limit: 0 }));

    expectDirectoryRequest();

    const results = await promise;

    expect(results).toEqual([]);
  });

  it('returns stop metadata when searching by identifier', async () => {
    const promise = firstValueFrom(service.getStopById('03'));

    expectDirectoryRequest();

    const result = await promise;

    expect(result?.stopId).toBe('03');
    expect(result?.name).toBe('Hospital Universitario');
  });

  function expectDirectoryRequest(): void {
    http
      .expectOne(APP_CONFIG.data.snapshots.stopDirectoryPath)
      .flush(directoryResponse);
  }
});

function buildEntry(
  stopId: string,
  name: string,
  municipality: string,
  nucleus: string
): DirectoryEntry {
  return {
    consortiumId: 7,
    stopId,
    stopCode: stopId,
    name,
    municipality,
    municipalityId: `mun-${stopId}`,
    nucleus,
    nucleusId: `nuc-${stopId}`,
    zone: null,
    location: {
      latitude: 37.7,
      longitude: -3.7
    }
  } satisfies DirectoryEntry;
}

function toOption(entry: DirectoryEntry): StopDirectoryOption {
  return {
    id: entry.stopId,
    code: entry.stopCode,
    name: entry.name,
    municipality: entry.municipality,
    nucleus: entry.nucleus,
    consortiumId: entry.consortiumId
  } satisfies StopDirectoryOption;
}
