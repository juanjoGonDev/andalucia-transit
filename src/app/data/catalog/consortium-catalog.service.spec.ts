import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ConsortiumCatalogEntry,
  ConsortiumCatalogService
} from '@data/catalog/consortium-catalog.service';

const CATALOG_PATH = 'assets/data/catalog/index.json';

describe('ConsortiumCatalogService', () => {
  let service: ConsortiumCatalogService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(ConsortiumCatalogService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads and sorts traveler-readable consortium areas from the canonical catalog', () => {
    let result: readonly ConsortiumCatalogEntry[] = [];
    service.loadConsortiums().subscribe((entries) => {
      result = entries;
    });

    const request = http.expectOne(CATALOG_PATH);
    request.flush({
      metadata: {
        consortiums: [
          { id: 9, name: 'Costa de Huelva', shortName: 'CTHU' },
          { id: 6, name: 'Área de Almería', shortName: 'CTAL' }
        ]
      }
    });

    expect(result.map((entry) => entry.id)).toEqual([6, 9]);
    expect(result.map((entry) => entry.name)).toEqual(['Área de Almería', 'Costa de Huelva']);
  });

  it('ignores malformed catalog entries', () => {
    let result: readonly ConsortiumCatalogEntry[] = [];
    service.loadConsortiums().subscribe((entries) => {
      result = entries;
    });

    http.expectOne(CATALOG_PATH).flush({
      consortia: [
        { id: 6, name: 'Área de Almería', shortName: 'CTAL' },
        { id: 'invalid', name: 'Broken' },
        null
      ]
    });

    expect(result).toEqual([{ id: 6, name: 'Área de Almería', shortName: 'CTAL' }]);
  });
});
